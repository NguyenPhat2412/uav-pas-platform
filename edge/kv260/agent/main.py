"""Production CLI & systemd daemon entrypoint for the Kria KV260 Edge AI & MAVLink Agent."""

from __future__ import annotations

import argparse
import logging
import os
from pathlib import Path
import signal
import sys
import threading
import time
from typing import Any, Optional, Sequence

from .cloud_client import CloudApiError, CloudClient
from .config import EDGE_ROOT_DIR, EdgeAgentConfig
from .dpu_detector import (
    GroundProjectionContext,
    ModelIntegrityError,
    VitisAiDpuEngine,
    read_kv260_soc_temperature_c,
    verify_all_known_models,
)
from .mavlink_bridge import MavlinkTelemetryAssembler, PymavlinkReceiver
from .offline_spool import OfflineSpool

logger = logging.getLogger("uav_kv260_agent")


class Kv260GatewayRuntime:
    """Coordinates MAVLink telemetry ingestion, Vitis AI DPU tasks, and SQLite spool replay."""

    def __init__(
        self,
        config: EdgeAgentConfig,
        *,
        spool: Optional[OfflineSpool] = None,
        cloud_client: Optional[CloudClient] = None,
        assembler: Optional[MavlinkTelemetryAssembler] = None,
        dpu_engine: Optional[VitisAiDpuEngine] = None,
    ) -> None:
        self.config = config
        self.stop_event = threading.Event()

        self.spool = spool or OfflineSpool(
            config.spool_db_path,
            max_rows=config.spool_max_rows,
        )
        self.cloud = cloud_client or CloudClient(
            config.uav_api_base_url,
            device_key=config.uav_device_key,
            bearer_token=config.uav_bearer_token,
            timeout_sec=config.http_timeout_sec,
            tls_verify=config.tls_verify,
            tls_ca_bundle=config.tls_ca_bundle,
            spool=self.spool,
        )
        self.assembler = assembler or MavlinkTelemetryAssembler(
            mission_id=config.mission_id,
            use_utc_timestamps=config.telemetry_use_utc,
        )
        self.dpu = dpu_engine or VitisAiDpuEngine(
            config.model_path,
            expected_sha256=config.model_expected_sha256,
            confidence_threshold=config.confidence_threshold,
            nms_iou_threshold=config.nms_iou_threshold,
            lazy_load_dpu=True,
        )

        self.mavlink_receiver: Optional[PymavlinkReceiver] = None
        self._video_cap: Any = None
        self._last_telemetry_ts = 0.0
        self._last_ai_poll_ts = 0.0
        self._last_spool_flush_ts = 0.0

    def start_io(self) -> None:
        """Connect live MAVLink socket/UART if pymavlink is installed and endpoint is configured."""
        if self.config.mavlink_endpoint and PymavlinkReceiver.is_available():
            self.mavlink_receiver = PymavlinkReceiver(
                self.config.mavlink_endpoint,
                self.assembler,
                stream_rate_hz=max(2, round(self.config.telemetry_hz * 2)),
            )
            try:
                connected = self.mavlink_receiver.connect(wait_heartbeat_timeout=3.0)
                logger.info(
                    "MAVLink endpoint %s initialized (heartbeat=%s)",
                    self.config.mavlink_endpoint,
                    connected,
                )
            except Exception as exc:
                logger.warning("Failed to open MAVLink endpoint %s: %s", self.config.mavlink_endpoint, exc)
                self.mavlink_receiver = None
        else:
            logger.info(
                "pymavlink not installed or MAVLINK_ENDPOINT empty; running without live autopilot socket"
            )

    def _build_projection_context(self) -> Optional[GroundProjectionContext]:
        st = self.assembler.state
        if st.latitude is None or st.longitude is None or st.altitude_agl_m is None:
            return None
        if st.altitude_agl_m <= 0.5:
            return None
        azimuth = st.heading_deg if st.heading_deg is not None else (st.yaw_deg or 0.0)
        return GroundProjectionContext(
            uav_lat=st.latitude,
            uav_lon=st.longitude,
            altitude_agl_m=st.altitude_agl_m,
            gimbal_pitch_deg=self.config.gimbal_pitch_deg,
            gimbal_yaw_deg=azimuth,
            roll_deg=0.0,
            hfov_deg=self.config.camera_hfov_deg,
            vfov_deg=self.config.camera_vfov_deg,
        )

    def _acquire_frame_for_task(self, task: dict[str, Any]) -> tuple[Any, Optional[bytes]]:
        """Decode image from task mediaId if present, otherwise capture from RTSP / V4L2 camera."""
        try:
            import cv2  # type: ignore
            import numpy as np
        except ImportError as exc:
            raise RuntimeError(
                "opencv-python-headless and numpy are required to decode camera/media frames"
            ) from exc

        media_id = task.get("mediaId")
        if media_id is not None:
            raw_bytes = self.cloud.download_media_bytes(int(media_id))
            arr = np.frombuffer(raw_bytes, dtype=np.uint8)
            frame = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            if frame is None:
                raise RuntimeError(f"Failed to decode image bytes for mediaId={media_id}")
            return frame, None

        source: Any = (
            int(self.config.camera_rtsp_or_dev)
            if self.config.camera_rtsp_or_dev.isdigit()
            else self.config.camera_rtsp_or_dev
        )
        if self._video_cap is None:
            self._video_cap = cv2.VideoCapture(source)
        ok, frame = self._video_cap.read()
        if not ok or frame is None:
            try:
                self._video_cap.release()
            except Exception:
                pass
            self._video_cap = None
            raise RuntimeError(f"Unable to read video frame from {self.config.camera_rtsp_or_dev}")

        encoded_ok, jpeg_buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 88])
        jpeg_bytes = bytes(jpeg_buf) if encoded_ok else None
        return frame, jpeg_bytes

    def _process_pending_ai_tasks(self) -> int:
        if self.config.mission_id is None or not self.config.uav_bearer_token:
            return 0

        try:
            tasks = self.cloud.fetch_pending_ai_tasks(self.config.mission_id)
        except CloudApiError as exc:
            logger.warning("Could not poll AI tasks for mission %s: %s", self.config.mission_id, exc)
            return 0

        completed = 0
        for task in tasks:
            if self.stop_event.is_set():
                break
            task_id = int(task["id"])
            task_conf = task.get("confidenceThreshold")
            projection = self._build_projection_context()

            try:
                if self.dpu._predictor is not None and task.get("mediaId") is None:
                    result_payload = self.dpu.infer_detections(
                        projection=projection,
                        confidence_threshold=float(task_conf) if task_conf is not None else None,
                    )
                else:
                    frame_bgr, captured_jpeg = self._acquire_frame_for_task(task)
                    result_payload = self.dpu.infer_detections(
                        orig_width=int(frame_bgr.shape[1]),
                        orig_height=int(frame_bgr.shape[0]),
                        frame_bgr=frame_bgr,
                        projection=projection,
                        confidence_threshold=float(task_conf) if task_conf is not None else None,
                    )
                    if captured_jpeg and result_payload.get("detections"):
                        try:
                            self.cloud.upload_detection_frame(
                                f"kv260_task_{task_id}.jpg",
                                captured_jpeg,
                                mission_id=self.config.mission_id,
                            )
                        except CloudApiError as up_exc:
                            logger.warning("Frame upload skipped for task %d: %s", task_id, up_exc)
            except Exception as exc:
                result_payload = {
                    "status": "FAILED",
                    "inferenceTimeMs": 0,
                    "fps": None,
                    "dpuUtilization": None,
                    "socTemperature": read_kv260_soc_temperature_c(),
                    "errorMessage": str(exc)[:500],
                    "detections": [],
                }

            try:
                self.cloud.submit_ai_task_results(task_id, result_payload)
                completed += 1
            except CloudApiError as exc:
                logger.error("Failed to submit AI results for task %d: %s", task_id, exc)

        return completed

    def run_once(self) -> dict[str, Any]:
        """Execute one deterministic cycle of MAVLink poll, telemetry push, AI poll, and spool drain."""
        now = time.monotonic()
        mav_packets = 0
        if self.mavlink_receiver is not None:
            mav_packets = self.mavlink_receiver.poll(max_messages=64, timeout=0.05)

        telemetry_pushed = False
        telemetry_spooled = False
        report = self.assembler.build_telemetry_report(mission_id=self.config.mission_id)
        if report is not None and (self.config.uav_device_key or self.config.uav_bearer_token):
            try:
                res = self.cloud.push_telemetry(self.config.uav_id, report)
                telemetry_pushed = res.delivered
                telemetry_spooled = res.spooled
                self._last_telemetry_ts = now
            except CloudApiError as exc:
                logger.error("Unrecoverable telemetry rejection: %s", exc)

        ai_processed = self._process_pending_ai_tasks()
        self._last_ai_poll_ts = now

        drain = self.cloud.flush_spool()
        self._last_spool_flush_ts = now

        return {
            "mavlinkPackets": mav_packets,
            "telemetryDelivered": telemetry_pushed,
            "telemetrySpooled": telemetry_spooled,
            "aiTasksProcessed": ai_processed,
            "spoolDelivered": drain.delivered,
            "spoolRemaining": drain.remaining,
        }

    def run_forever(self) -> None:
        """Continuous edge gateway loop until SIGINT/SIGTERM."""
        self.start_io()
        logger.info(
            "KV260 agent started: uav_id=%d mission_id=%s api=%s telemetry_hz=%.2f model=%s",
            self.config.uav_id,
            self.config.mission_id,
            self.config.uav_api_base_url,
            self.config.telemetry_hz,
            self.config.model_path.name,
        )

        try:
            while not self.stop_event.is_set():
                now = time.monotonic()

                if self.mavlink_receiver is not None:
                    self.mavlink_receiver.poll(max_messages=64, timeout=0.02)

                if (now - self._last_telemetry_ts) >= self.config.telemetry_interval_sec:
                    self._last_telemetry_ts = now
                    report = self.assembler.build_telemetry_report(mission_id=self.config.mission_id)
                    if report is not None and (self.config.uav_device_key or self.config.uav_bearer_token):
                        try:
                            self.cloud.push_telemetry(self.config.uav_id, report)
                        except CloudApiError as exc:
                            logger.error("Telemetry rejected by backend: %s", exc)

                if (now - self._last_ai_poll_ts) >= self.config.ai_poll_interval_sec:
                    self._last_ai_poll_ts = now
                    self._process_pending_ai_tasks()

                if (now - self._last_spool_flush_ts) >= self.config.spool_flush_interval_sec:
                    self._last_spool_flush_ts = now
                    if self.spool.ready_count() > 0:
                        self.cloud.flush_spool()

                self.stop_event.wait(timeout=0.02)
        finally:
            self.shutdown()

    def shutdown(self) -> None:
        """Flush ready offline queue entries and release hardware handles cleanly."""
        self.stop_event.set()
        try:
            if self.spool.ready_count() > 0:
                drain = self.cloud.flush_spool()
                logger.info(
                    "Shutdown spool drain: delivered=%d remaining=%d",
                    drain.delivered,
                    drain.remaining,
                )
        except Exception as exc:
            logger.debug("Final spool flush skipped: %s", exc)

        if self._video_cap is not None:
            try:
                self._video_cap.release()
            except Exception:
                pass
            self._video_cap = None

        if self.mavlink_receiver is not None:
            self.mavlink_receiver.close()
            self.mavlink_receiver = None

        self.dpu.close()
        self.spool.close()
        logger.info("KV260 agent stopped cleanly.")


def _run_verify_models_cli(
    models_dir: Path,
    *,
    configured_model: Optional[Path] = None,
    configured_expected_sha256: Optional[str] = None,
) -> int:
    try:
        results = verify_all_known_models(
            models_dir,
            configured_model_path=configured_model,
            configured_expected_sha256=configured_expected_sha256,
        )
        for res in results:
            size_mb = res.size_bytes / (1024.0 * 1024.0)
            print(
                f"[VERIFIED] {res.path.name} ({size_mb:.2f} MiB) sha256={res.sha256}"
            )
        print(f"All {len(results)} KV260 Vitis AI .xmodel file(s) passed SHA-256 verification.")
        return 0
    except ModelIntegrityError as exc:
        print(f"[FAILED] Model verification error: {exc}", file=sys.stderr)
        return 1


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python3 -m agent.main",
        description="Kria KV260 Edge AI & MAVLink Ground-Station Gateway Agent",
    )
    parser.add_argument(
        "--verify-models",
        action="store_true",
        help="Verify SHA-256 integrity of KV260 .xmodel binaries in models/ and exit.",
    )
    parser.add_argument(
        "--models-dir",
        type=Path,
        default=EDGE_ROOT_DIR / "models",
        help="Directory containing compiled KV260 .xmodel files (default: edge/kv260/models).",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run a single telemetry/AI/spool cycle and exit.",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=None,
        help="Optional path to .env configuration file.",
    )
    parser.add_argument(
        "--log-level",
        default="INFO",
        choices=("DEBUG", "INFO", "WARNING", "ERROR"),
        help="Logging verbosity level (default: INFO).",
    )
    return parser


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)

    logging.basicConfig(
        level=getattr(logging, args.log_level),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    if args.verify_models:
        explicit_model_env = bool(os.environ.get("MODEL_PATH", "").strip())
        cfg = EdgeAgentConfig.from_env(dotenv_path=args.env_file)
        explicit_model_env = explicit_model_env or bool(os.environ.get("MODEL_PATH", "").strip())
        configured_model = (
            cfg.model_path
            if (explicit_model_env or cfg.model_expected_sha256 is not None)
            else None
        )
        return _run_verify_models_cli(
            args.models_dir,
            configured_model=configured_model,
            configured_expected_sha256=cfg.model_expected_sha256,
        )

    try:
        config = EdgeAgentConfig.from_env(dotenv_path=args.env_file)
        runtime = Kv260GatewayRuntime(config)
    except (ValueError, ModelIntegrityError) as exc:
        logger.error("Startup validation failed: %s", exc)
        return 1

    def _handle_signal(signum: int, _frame: Any) -> None:
        sig_name = signal.Signals(signum).name
        logger.info("Received %s; initiating graceful shutdown...", sig_name)
        runtime.stop_event.set()

    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)

    if args.once:
        try:
            runtime.start_io()
            summary = runtime.run_once()
            logger.info("Single-cycle summary: %s", summary)
        finally:
            runtime.shutdown()
        return 0

    runtime.run_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
