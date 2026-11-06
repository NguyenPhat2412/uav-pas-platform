"""Unit and local HTTP integration test suite for the Kria KV260 Edge AI & MAVLink Agent."""

from __future__ import annotations

from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
import os
from pathlib import Path
import re
import tempfile
import threading
import time
from typing import Any
import unittest

from agent.cloud_client import CloudClient
from agent.config import EDGE_ROOT_DIR, EdgeAgentConfig, load_dotenv
from agent.dpu_detector import (
    GroundProjectionContext,
    KNOWN_KV260_MODEL_SHA256,
    ModelIntegrityError,
    RawBoxCandidate,
    VitisAiDpuEngine,
    compute_iou,
    compute_letterbox_params,
    decode_yolo_output_tensor,
    non_max_suppression,
    pixels_to_percentage_box,
    project_pixel_to_wgs84,
    read_kv260_soc_temperature_c,
    unletterbox_bbox_to_pixels,
    verify_all_known_models,
    verify_model_sha256,
)
from agent.main import Kv260GatewayRuntime, main as cli_main
from agent.mavlink_bridge import (
    MAV_AUTOPILOT_ARDUPILOTMEGA,
    MAV_AUTOPILOT_PX4,
    MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
    MAV_MODE_FLAG_SAFETY_ARMED,
    MavlinkTelemetryAssembler,
    parse_mavlink_endpoint,
    wrap_heading_deg,
)
from agent.offline_spool import (
    OfflineSpool,
    PermanentSpoolDrop,
    SPOOL_KIND_AI_RESULT,
    SPOOL_KIND_TELEMETRY,
)


def _haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371008.8
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


class FakeMavlinkPacket:
    """Mimics pymavlink MAVLink_message objects (get_type() + attribute fields)."""

    def __init__(self, msg_type: str, **fields: Any) -> None:
        self._msg_type = msg_type
        for k, v in fields.items():
            setattr(self, k, v)

    def get_type(self) -> str:
        return self._msg_type


class ConfigTests(unittest.TestCase):
    def test_load_dotenv_and_typed_config(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            env_file = Path(tmp) / "agent.env"
            env_file.write_text(
                "\n".join(
                    [
                        "# Comment line",
                        "UAV_API_BASE_URL=https://edge-gw.example.com/",
                        "UAV_DEVICE_KEY='dk_secret_123'",
                        'UAV_BEARER_TOKEN="jwt_token_abc"',
                        "UAV_ID=7",
                        "MISSION_ID=42",
                        "MAVLINK_ENDPOINT=/dev/ttyPS1:921600",
                        "TELEMETRY_HZ=5.0",
                        "SPOOL_MAX_ROWS=250",
                    ]
                ),
                encoding="utf-8",
            )
            parsed = load_dotenv(env_file, override=False)
            cfg = EdgeAgentConfig.from_env(env=parsed)

            self.assertEqual(cfg.uav_api_base_url, "https://edge-gw.example.com")
            self.assertEqual(cfg.uav_device_key, "dk_secret_123")
            self.assertEqual(cfg.uav_bearer_token, "jwt_token_abc")
            self.assertEqual(cfg.uav_id, 7)
            self.assertEqual(cfg.mission_id, 42)
            self.assertEqual(cfg.mavlink_endpoint, "/dev/ttyPS1:921600")
            self.assertAlmostEqual(cfg.telemetry_hz, 5.0)
            self.assertAlmostEqual(cfg.telemetry_interval_sec, 0.2)
            self.assertEqual(cfg.spool_max_rows, 250)

    def test_invalid_config_rejected(self) -> None:
        with self.assertRaises(ValueError):
            EdgeAgentConfig(uav_api_base_url="ftp://invalid")
        with self.assertRaises(ValueError):
            EdgeAgentConfig(uav_id=0)
        with self.assertRaises(ValueError):
            EdgeAgentConfig(telemetry_hz=200.0)


class OfflineSpoolTests(unittest.TestCase):
    def test_persistence_wal_mode_and_fifo_drain(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / "spool.db"
            now = [1000.0]

            with OfflineSpool(db_path, max_rows=100, clock=lambda: now[0]) as spool:
                self.assertEqual(spool.journal_mode(), "wal")
                spool.enqueue(SPOOL_KIND_TELEMETRY, 1, {"seq": 1})
                spool.enqueue(SPOOL_KIND_TELEMETRY, 1, {"seq": 2})
                spool.enqueue(SPOOL_KIND_AI_RESULT, 99, {"seq": 3})
                self.assertEqual(spool.count(), 3)

            # Reopen SQLite file from disk to verify crash/restart persistence
            reopened = OfflineSpool(db_path, max_rows=100, clock=lambda: now[0])
            try:
                self.assertEqual(reopened.count(), 3)
                seen_seqs: list[int] = []

                def _deliver(entry: Any) -> bool:
                    seen_seqs.append(entry.payload["seq"])
                    return True

                report = reopened.drain_batch(_deliver, batch_size=10)
                self.assertEqual(seen_seqs, [1, 2, 3])
                self.assertEqual(report.delivered, 3)
                self.assertEqual(report.remaining, 0)
                self.assertEqual(reopened.count(), 0)
            finally:
                reopened.close()

    def test_exponential_backoff_retry_and_permanent_drop(self) -> None:
        now = [5000.0]
        with OfflineSpool(
            ":memory:",
            max_rows=50,
            base_backoff_sec=2.0,
            max_backoff_sec=10.0,
            clock=lambda: now[0],
        ) as spool:
            spool.enqueue(SPOOL_KIND_TELEMETRY, 1, {"seq": 10})

            # Attempt 1 fails -> backoff 2.0s (next_retry_at = 5002.0)
            r1 = spool.drain_batch(lambda _e: False)
            self.assertEqual(r1.failed, 1)
            self.assertEqual(spool.ready_count(), 0)

            now[0] = 5001.5
            self.assertEqual(spool.ready_count(), 0)

            # At 5002.0 item becomes ready again; Attempt 2 fails -> backoff 4.0s (5006.0)
            now[0] = 5002.0
            self.assertEqual(spool.ready_count(), 1)
            r2 = spool.drain_batch(lambda _e: False)
            self.assertEqual(r2.failed, 1)
            self.assertEqual(spool.ready_count(), 0)

            # At 5006.0 item succeeds -> queue empty
            now[0] = 5006.0
            r3 = spool.drain_batch(lambda _e: True)
            self.assertEqual(r3.delivered, 1)
            self.assertEqual(spool.count(), 0)

            # Permanent drop removes poisoned entry without retrying
            spool.enqueue(SPOOL_KIND_AI_RESULT, 55, {"bad": True})

            def _poison(_e: Any) -> bool:
                raise PermanentSpoolDrop("400 Bad Request")

            r4 = spool.drain_batch(_poison)
            self.assertEqual(r4.dropped, 1)
            self.assertEqual(spool.count(), 0)

    def test_ring_buffer_max_rows_eviction(self) -> None:
        with OfflineSpool(":memory:", max_rows=5) as spool:
            for seq in range(1, 13):
                spool.enqueue(SPOOL_KIND_TELEMETRY, 1, {"seq": seq})

            self.assertEqual(spool.count(), 5)
            self.assertEqual(spool.evicted_total, 7)
            entries = spool.peek_ready(batch_size=10)
            self.assertEqual([e.payload["seq"] for e in entries], [8, 9, 10, 11, 12])


class MavlinkTelemetryAssemblerTests(unittest.TestCase):
    EXPECTED_TELEMETRY_KEYS = {
        "recordedAt",
        "latitude",
        "longitude",
        "altitudeAglMeters",
        "groundSpeedMs",
        "headingDeg",
        "batteryPct",
        "rtkStatus",
        "satellites",
        "missionId",
    }

    def test_unit_conversions_and_exact_dto_schema_parity(self) -> None:
        assembler = MavlinkTelemetryAssembler(mission_id=19)
        self.assertIsNone(assembler.build_telemetry_report())

        # PX4 AUTO.MISSION heartbeat (main_mode=4, sub_mode=4, armed)
        px4_custom_mode = (4 << 16) | (4 << 24)
        assembler.ingest_message(
            FakeMavlinkPacket(
                "HEARTBEAT",
                type=2,  # MAV_TYPE_QUADROTOR
                autopilot=MAV_AUTOPILOT_PX4,
                base_mode=MAV_MODE_FLAG_CUSTOM_MODE_ENABLED | MAV_MODE_FLAG_SAFETY_ARMED,
                custom_mode=px4_custom_mode,
            )
        )
        self.assertTrue(assembler.state.armed)
        self.assertEqual(assembler.state.flight_mode, "AUTO.MISSION")

        # Ground-station HEARTBEAT (MAV_TYPE_GCS=6) must NOT overwrite vehicle flight mode
        assembler.ingest_message(
            {"mavpackettype": "HEARTBEAT", "type": 6, "autopilot": 0, "base_mode": 0, "custom_mode": 0}
        )
        assembler.ingest_message(
            FakeMavlinkPacket("HEARTBEAT", type=6, autopilot=0, base_mode=0, custom_mode=0)
        )
        self.assertEqual(assembler.state.flight_mode, "AUTO.MISSION")

        # GPS_RAW_INT with RTK Fixed (6) and 18 satellites
        assembler.ingest_message(
            {
                "type": "GPS_RAW_INT",
                "fix_type": 6,
                "satellites_visible": 18,
                "lat": 210285110,
                "lon": 1058541670,
            }
        )
        # SYS_STATUS battery 82%, 22.8V (22800 mV)
        assembler.ingest_message(
            {
                "type": "SYS_STATUS",
                "battery_remaining": 82,
                "voltage_battery": 22800,
            }
        )
        # GLOBAL_POSITION_INT: lat/lon 1e-7, relative_alt 64500 mm -> 64.5m, vx=600 vy=800 cm/s -> 10.0 m/s, hdg=35990 cdeg -> 359.9 deg
        assembler.ingest_message(
            FakeMavlinkPacket(
                "GLOBAL_POSITION_INT",
                lat=210285110,
                lon=1058541670,
                alt=78200,
                relative_alt=64500,
                vx=600,
                vy=800,
                vz=-120,
                hdg=35990,
            )
        )

        payload = assembler.build_telemetry_report()
        self.assertIsNotNone(payload)
        assert payload is not None

        # Exact 10-field parity with Backend TelemetryReportRequest.java
        self.assertEqual(set(payload.keys()), self.EXPECTED_TELEMETRY_KEYS)
        parsed_dt = datetime.fromisoformat(payload["recordedAt"])
        self.assertIsNone(parsed_dt.tzinfo)  # LocalDateTime requires naive ISO-8601

        self.assertAlmostEqual(payload["latitude"], 21.028511, places=6)
        self.assertAlmostEqual(payload["longitude"], 105.854167, places=6)
        self.assertAlmostEqual(payload["altitudeAglMeters"], 64.5, places=3)
        self.assertAlmostEqual(payload["groundSpeedMs"], 10.0, places=3)
        self.assertAlmostEqual(payload["headingDeg"], 359.9, places=2)
        self.assertEqual(payload["batteryPct"], 82)
        self.assertRegex(payload["rtkStatus"], r"^(NONE|SINGLE|FLOAT|FIXED)$")
        self.assertEqual(payload["rtkStatus"], "FIXED")
        self.assertEqual(payload["satellites"], 18)
        self.assertEqual(payload["missionId"], 19)
        self.assertAlmostEqual(assembler.state.battery_voltage_v or 0.0, 22.8, places=2)

    def test_heading_wrap_attitude_fallback_and_ardupilot_modes(self) -> None:
        self.assertEqual(wrap_heading_deg(360.0), 0.0)
        self.assertEqual(wrap_heading_deg(359.999), 0.0)
        self.assertEqual(wrap_heading_deg(-0.001), 0.0)
        self.assertEqual(wrap_heading_deg(-90.0), 270.0)
        self.assertEqual(wrap_heading_deg(725.25), 5.25)

        assembler = MavlinkTelemetryAssembler()
        # ArduPilot LOITER mode (custom_mode=5)
        assembler.ingest_message(
            {
                "type": "HEARTBEAT",
                "mavpackettype": "HEARTBEAT",
                "autopilot": MAV_AUTOPILOT_ARDUPILOTMEGA,
                "base_mode": MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
                "custom_mode": 5,
            }
        )
        # Note dict 'type' key collision handled via FakeMavlinkPacket too:
        assembler.ingest_message(
            FakeMavlinkPacket(
                "HEARTBEAT",
                type=2,
                autopilot=MAV_AUTOPILOT_ARDUPILOTMEGA,
                base_mode=MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
                custom_mode=5,
            )
        )
        self.assertEqual(assembler.state.flight_mode, "LOITER")

        # ATTITUDE yaw = -pi/2 rad -> 270 deg
        assembler.ingest_message(
            {
                "mavpackettype": "ATTITUDE",
                "roll": 0.1,
                "pitch": -0.2,
                "yaw": -math.pi / 2.0,
            }
        )
        # GLOBAL_POSITION_INT with unknown hdg = 65535 must fall back to ATTITUDE yaw (270.0 deg)
        assembler.ingest_message(
            {
                "mavpackettype": "GLOBAL_POSITION_INT",
                "lat": 160544070,
                "lon": 1082021670,
                "relative_alt": 50000,
                "vx": 0,
                "vy": 0,
                "hdg": 65535,
            }
        )
        # BATTERY_STATUS with 6S LiPo cells and GPS_RAW_INT with RTK Float (5) & unknown satellites (255)
        assembler.ingest_message(
            {
                "mavpackettype": "BATTERY_STATUS",
                "battery_remaining": 67,
                "voltages": [3800, 3800, 3800, 3800, 3800, 3800, 65535, 65535],
            }
        )
        assembler.ingest_message(
            {
                "mavpackettype": "GPS_RAW_INT",
                "fix_type": 5,
                "satellites_visible": 255,
            }
        )

        report = assembler.build_telemetry_report()
        assert report is not None
        self.assertEqual(report["headingDeg"], 270.0)
        self.assertEqual(report["rtkStatus"], "FLOAT")
        self.assertIsNone(report["satellites"])
        self.assertEqual(report["batteryPct"], 67)
        self.assertAlmostEqual(assembler.state.battery_voltage_v or 0.0, 22.8, places=2)

        dev, baud = parse_mavlink_endpoint("/dev/ttyPS1:921600")
        self.assertEqual((dev, baud), ("/dev/ttyPS1", 921600))
        udp_ep, udp_baud = parse_mavlink_endpoint("udpin:0.0.0.0:14550")
        self.assertEqual((udp_ep, udp_baud), ("udpin:0.0.0.0:14550", None))


class DpuDetectorTests(unittest.TestCase):
    def test_verify_real_or_temp_xmodel_sha256_and_tamper_rejection(self) -> None:
        models_dir = EDGE_ROOT_DIR / "models"
        if models_dir.is_dir() and any(models_dir.glob("*.xmodel")):
            verified = verify_all_known_models(models_dir)
            self.assertEqual(len(verified), len(KNOWN_KV260_MODEL_SHA256))
            for item in verified:
                self.assertTrue(item.verified)
                self.assertEqual(item.sha256, KNOWN_KV260_MODEL_SHA256[item.path.name])

        with tempfile.TemporaryDirectory() as tmp:
            fake_model = Path(tmp) / "yolov8_human_kv260_b3136.xmodel"
            fake_model.write_bytes(b"corrupted-xmodel-payload")
            with self.assertRaises(ModelIntegrityError):
                verify_model_sha256(fake_model)

    def test_nms_and_letterbox_coordinate_restoration(self) -> None:
        candidates = [
            RawBoxCandidate(100, 100, 200, 260, confidence=0.92, class_id=0, label="person"),
            RawBoxCandidate(105, 104, 202, 258, confidence=0.76, class_id=0, label="person"),
            RawBoxCandidate(420, 120, 500, 260, confidence=0.81, class_id=0, label="person"),
            RawBoxCandidate(102, 102, 200, 260, confidence=0.88, class_id=8, label="boat"),
            RawBoxCandidate(10, 10, 40, 40, confidence=0.20, class_id=0, label="person"),
        ]
        self.assertGreater(compute_iou(candidates[0], candidates[1]), 0.8)

        kept = non_max_suppression(candidates, confidence_threshold=0.45, iou_threshold=0.45)
        self.assertEqual(len(kept), 3)
        self.assertEqual([round(c.confidence, 2) for c in kept], [0.92, 0.88, 0.81])

        lb = compute_letterbox_params(1920, 1080, 640, 640)
        self.assertEqual((lb.resized_width, lb.resized_height), (640, 360))
        self.assertAlmostEqual(lb.pad_top, 140.0)
        # Center 64x72 box in letterboxed 640x640 corresponds to center 10%x20% of 1920x1080
        ox1, oy1, ox2, oy2 = unletterbox_bbox_to_pixels(288.0, 284.0, 352.0, 356.0, lb)
        top, left, width, height = pixels_to_percentage_box(ox1, oy1, ox2, oy2, 1920, 1080)
        self.assertAlmostEqual(left, 45.0, places=2)
        self.assertAlmostEqual(top, 40.0, places=2)
        self.assertAlmostEqual(width, 10.0, places=2)
        self.assertAlmostEqual(height, 20.0, places=2)

    def test_pixel_to_wgs84_ground_projection_geometry(self) -> None:
        uav_lat, uav_lon = 21.028511, 105.854167

        # 1. Nadir (-90 deg) principal point -> directly under UAV
        center_proj = project_pixel_to_wgs84(
            uav_lat=uav_lat,
            uav_lon=uav_lon,
            altitude_agl_m=100.0,
            u_px=960.0,
            v_px=540.0,
            img_width=1920,
            img_height=1080,
            hfov_deg=78.0,
            vfov_deg=48.0,
            gimbal_pitch_deg=-90.0,
            gimbal_yaw_deg=0.0,
        )
        self.assertEqual(center_proj, (uav_lat, uav_lon))

        # 2. Nadir facing North (yaw=0): top-center pixel (v=0) lies strictly North, right-center (u=1920) strictly East
        north_proj = project_pixel_to_wgs84(
            uav_lat=uav_lat,
            uav_lon=uav_lon,
            altitude_agl_m=100.0,
            u_px=960.0,
            v_px=0.0,
            img_width=1920,
            img_height=1080,
            hfov_deg=78.0,
            vfov_deg=48.0,
            gimbal_pitch_deg=-90.0,
            gimbal_yaw_deg=0.0,
        )
        east_proj = project_pixel_to_wgs84(
            uav_lat=uav_lat,
            uav_lon=uav_lon,
            altitude_agl_m=100.0,
            u_px=1920.0,
            v_px=540.0,
            img_width=1920,
            img_height=1080,
            hfov_deg=78.0,
            vfov_deg=48.0,
            gimbal_pitch_deg=-90.0,
            gimbal_yaw_deg=0.0,
        )
        assert north_proj is not None and east_proj is not None
        self.assertGreater(north_proj[0], uav_lat)
        self.assertAlmostEqual(north_proj[1], uav_lon, places=6)
        self.assertAlmostEqual(east_proj[0], uav_lat, places=6)
        self.assertGreater(east_proj[1], uav_lon)

        # 3. Oblique -45 deg pitch facing East (yaw=90 deg) at 80m AGL -> principal point hits 80m East
        oblique_east = project_pixel_to_wgs84(
            uav_lat=uav_lat,
            uav_lon=uav_lon,
            altitude_agl_m=80.0,
            u_px=960.0,
            v_px=540.0,
            img_width=1920,
            img_height=1080,
            gimbal_pitch_deg=-45.0,
            gimbal_yaw_deg=90.0,
        )
        assert oblique_east is not None
        self.assertAlmostEqual(oblique_east[0], uav_lat, places=6)
        self.assertGreater(oblique_east[1], uav_lon)
        dist_m = _haversine_meters(uav_lat, uav_lon, oblique_east[0], oblique_east[1])
        self.assertAlmostEqual(dist_m, 80.0, delta=0.25)

        # 4. Skyward ray (+5 deg above horizon) returns None safely
        sky_ray = project_pixel_to_wgs84(
            uav_lat=uav_lat,
            uav_lon=uav_lon,
            altitude_agl_m=80.0,
            u_px=960.0,
            v_px=540.0,
            img_width=1920,
            img_height=1080,
            gimbal_pitch_deg=5.0,
            gimbal_yaw_deg=0.0,
        )
        self.assertIsNone(sky_ray)

    def test_vitis_dpu_engine_result_schema_and_yolo_tensor_decoder(self) -> None:
        import hashlib

        with tempfile.TemporaryDirectory() as tmp:
            dummy_bytes = b"kv260-compiled-dpu-b3136-graph"
            digest = hashlib.sha256(dummy_bytes).hexdigest()
            model_file = Path(tmp) / "custom_sar.xmodel"
            model_file.write_bytes(dummy_bytes)

            # Verify YOLOv8/11 raw tensor decoder [1, 5, 3]
            fake_head = [
                [
                    [320.0, 100.0, 500.0],  # cx
                    [320.0, 100.0, 500.0],  # cy
                    [64.0, 40.0, 50.0],     # w
                    [128.0, 40.0, 50.0],    # h
                    [0.91, 0.12, 0.68],     # person score
                ]
            ]
            decoded = decode_yolo_output_tensor(fake_head, confidence_threshold=0.5)
            self.assertEqual(len(decoded), 2)

            engine = VitisAiDpuEngine(
                model_file,
                expected_sha256=digest,
                predictor=lambda _w, _h: decoded,
            )
            proj = GroundProjectionContext(
                uav_lat=16.054407,
                uav_lon=108.202167,
                altitude_agl_m=60.0,
                gimbal_pitch_deg=-90.0,
                gimbal_yaw_deg=0.0,
            )
            result = engine.infer_detections(orig_width=1920, orig_height=1080, projection=proj)

            self.assertEqual(
                set(result.keys()),
                {
                    "status",
                    "inferenceTimeMs",
                    "fps",
                    "dpuUtilization",
                    "socTemperature",
                    "errorMessage",
                    "detections",
                },
            )
            self.assertEqual(result["status"], "COMPLETED")
            # Zero fake hardware metrics: CPU/custom predictor must report dpuUtilization=None,
            # and missing sysfs thermal zones must return None instead of a hardcoded constant.
            self.assertIsNone(result["dpuUtilization"])
            self.assertIsNone(read_kv260_soc_temperature_c(str(Path(tmp) / "no_thermal_zone*")))
            mock_thermal = Path(tmp) / "thermal_zone0_temp"
            mock_thermal.write_text("54250\n", encoding="utf-8")
            self.assertEqual(read_kv260_soc_temperature_c(str(mock_thermal)), 54.25)

            self.assertEqual(len(result["detections"]), 2)
            det0 = result["detections"][0]
            self.assertEqual(
                set(det0.keys()),
                {
                    "label",
                    "confidence",
                    "boxTop",
                    "boxLeft",
                    "boxWidth",
                    "boxHeight",
                    "latitude",
                    "longitude",
                    "trackingId",
                },
            )
            self.assertEqual(det0["label"], "person")
            self.assertAlmostEqual(det0["latitude"], 16.054407, places=5)
            self.assertAlmostEqual(det0["longitude"], 108.202167, places=5)


class _MockPlatformState:
    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.telemetry_mode = "201"  # "201" | "503" | "timeout"
        self.ai_result_mode = "200"
        self.telemetry_http_attempts = 0
        self.telemetry_requests: list[dict[str, Any]] = []
        self.ai_result_requests: list[dict[str, Any]] = []
        self.uploaded_blobs: dict[int, bytes] = {}
        self.confirmed_media: set[int] = set()
        self.base_url: str = ""


class CloudClientIntegrationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.state = _MockPlatformState()
        state = self.state

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, format: str, *args: Any) -> None:  # noqa: A002
                return

            def _read_body(self) -> bytes:
                length = int(self.headers.get("Content-Length", "0"))
                return self.rfile.read(length) if length > 0 else b""

            def _send_json(self, code: int, obj: Any) -> None:
                data = json.dumps(obj).encode("utf-8")
                self.send_response(code)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def do_GET(self) -> None:
                if self.path == "/api/v1/ai/missions/42/tasks":
                    if self.headers.get("X-Device-Key") is not None:
                        self._send_json(403, {"error": "X-Device-Key forbidden on AI routes"})
                        return
                    if self.headers.get("Authorization") != "Bearer edge_jwt_token":
                        self._send_json(401, {"error": "Unauthorized"})
                        return
                    self._send_json(
                        200,
                        [
                            {
                                "id": 501,
                                "missionId": 42,
                                "mediaId": None,
                                "taskType": "PERSON_SEARCH",
                                "status": "PENDING",
                                "processingNode": "KV260_EDGE",
                                "confidenceThreshold": 0.5,
                            },
                            {
                                "id": 502,
                                "missionId": 42,
                                "mediaId": None,
                                "taskType": "OBJECT_DETECTION_YOLOV8S",
                                "status": "COMPLETED",
                                "processingNode": "KV260_EDGE",
                            },
                            {
                                "id": 503,
                                "missionId": 42,
                                "mediaId": None,
                                "taskType": "THERMAL_ANOMALY",
                                "status": "PENDING",
                                "processingNode": "CLOUD_GPU",
                            },
                        ],
                    )
                    return

                m_up = re.match(r"^/api/v1/media/(\d+)/upload-url$", self.path)
                if m_up:
                    mid = int(m_up.group(1))
                    self._send_json(
                        200,
                        {
                            "mediaId": mid,
                            "url": f"{state.base_url}/presigned-s3/put/{mid}?sig=abc",
                            "operation": "upload",
                            "expiresInSeconds": 900,
                        },
                    )
                    return

                self._send_json(404, {"error": "not_found"})

            def do_PUT(self) -> None:
                m_s3 = re.match(r"^/presigned-s3/put/(\d+)\?sig=abc$", self.path)
                if m_s3:
                    # Presigned S3/MinIO PUT must NOT carry platform Authorization or X-Device-Key,
                    # and MUST carry If-None-Match: * signed by S3CompatibleStorageService.java
                    if self.headers.get("Authorization") or self.headers.get("X-Device-Key"):
                        self._send_json(400, {"error": "SigV4 broken by unexpected auth header"})
                        return
                    if self.headers.get("If-None-Match") != "*":
                        self._send_json(403, {"error": "SignatureDoesNotMatch: missing If-None-Match: *"})
                        return
                    raw = self._read_body()
                    with state.lock:
                        state.uploaded_blobs[int(m_s3.group(1))] = raw
                    self.send_response(200)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                self._send_json(404, {"error": "not_found"})

            def do_POST(self) -> None:
                m_tel = re.match(r"^/api/v1/uavs/(\d+)/telemetry$", self.path)
                if m_tel:
                    with state.lock:
                        state.telemetry_http_attempts += 1
                    # Mirror Backend DeviceKeyAuthenticationFilter rules strictly
                    dev_key = self.headers.get("X-Device-Key")
                    auth_hdr = self.headers.get("Authorization")
                    if dev_key != "valid_device_key" or auth_hdr is not None:
                        self._send_json(401, {"error": "Invalid device key or forbidden Authorization"})
                        return

                    with state.lock:
                        mode = state.telemetry_mode
                    if mode == "503":
                        self._send_json(503, {"error": "Service Unavailable"})
                        return
                    if mode == "timeout":
                        time.sleep(0.45)
                        return

                    payload = json.loads(self._read_body().decode("utf-8"))
                    with state.lock:
                        state.telemetry_requests.append(
                            {
                                "uavId": int(m_tel.group(1)),
                                "deviceKey": dev_key,
                                "payload": payload,
                            }
                        )
                    self._send_json(201, {"uavId": int(m_tel.group(1)), **payload})
                    return

                if self.path == "/api/v1/media":
                    if self.headers.get("Authorization") != "Bearer edge_jwt_token":
                        self._send_json(401, {"error": "Unauthorized"})
                        return
                    req_json = json.loads(self._read_body().decode("utf-8"))
                    self._send_json(
                        201,
                        {
                            "id": 777,
                            "originalName": req_json["originalName"],
                            "contentType": req_json["contentType"],
                            "size": req_json["size"],
                            "type": req_json["type"],
                            "linkedEntityType": req_json["linkedEntityType"],
                            "linkedEntityId": req_json["linkedEntityId"],
                            "confirmed": False,
                        },
                    )
                    return

                m_conf = re.match(r"^/api/v1/media/(\d+)/confirm$", self.path)
                if m_conf:
                    mid = int(m_conf.group(1))
                    with state.lock:
                        state.confirmed_media.add(mid)
                    self._send_json(200, {"id": mid, "confirmed": True})
                    return

                m_res = re.match(r"^/api/v1/ai/tasks/(\d+)/results$", self.path)
                if m_res:
                    if self.headers.get("X-Device-Key") is not None:
                        self._send_json(403, {"error": "Device key forbidden on AI endpoint"})
                        return
                    if self.headers.get("Authorization") != "Bearer edge_jwt_token":
                        self._send_json(401, {"error": "Unauthorized"})
                        return
                    with state.lock:
                        rmode = state.ai_result_mode
                    if rmode == "503":
                        self._send_json(503, {"error": "AI service temporarily unavailable"})
                        return
                    body = json.loads(self._read_body().decode("utf-8"))
                    tid = int(m_res.group(1))
                    with state.lock:
                        state.ai_result_requests.append({"taskId": tid, "payload": body})
                    self._send_json(200, {"id": tid, "status": body["status"]})
                    return

                self._send_json(404, {"error": "not_found"})

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        port = self.server.server_address[1]
        self.state.base_url = f"http://127.0.0.1:{port}"
        self.server_thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.server_thread.start()

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.server_thread.join(timeout=2.0)

    def test_telemetry_device_key_backoff_and_65_row_strict_fifo_recovery(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            now = [10000.0]
            spool = OfflineSpool(
                Path(tmp) / "flight_spool.db",
                max_rows=200,
                base_backoff_sec=2.0,
                max_backoff_sec=30.0,
                clock=lambda: now[0],
            )
            try:
                client = CloudClient(
                    self.state.base_url,
                    device_key="valid_device_key",
                    bearer_token="edge_jwt_token",
                    timeout_sec=0.2,
                    spool=spool,
                    clock=lambda: now[0],
                )

                def _make_sample(seq: int) -> dict[str, Any]:
                    return {
                        "recordedAt": f"2026-11-05T13:40:{seq % 60:02d}.000",
                        "latitude": round(21.0 + seq * 0.001, 6),
                        "longitude": 105.81,
                        "altitudeAglMeters": 45.0,
                        "groundSpeedMs": 8.5,
                        "headingDeg": 90.0,
                        "batteryPct": 95,
                        "rtkStatus": "FIXED",
                        "satellites": 19,
                        "missionId": 42,
                        "seq": seq,
                    }

                # 1. Sample 1 hits 503 at t=10000.0 -> 1 HTTP attempt, spooled with initial 2.0s backoff (10002.0)
                self.state.telemetry_mode = "503"
                res1 = client.push_telemetry(3, _make_sample(1))
                self.assertFalse(res1.delivered)
                self.assertTrue(res1.spooled)
                self.assertEqual(spool.count(), 1)
                self.assertEqual(self.state.telemetry_http_attempts, 1)

                # 2. Samples 2..10 arrive during active backoff (t=10000.5 .. 10001.5) -> ZERO HTTP calls!
                for seq in range(2, 11):
                    now[0] = 10000.0 + seq * 0.15  # max 10001.5 < 10002.0
                    r = client.push_telemetry(3, _make_sample(seq))
                    self.assertFalse(r.delivered)
                    self.assertTrue(r.spooled)
                self.assertEqual(self.state.telemetry_http_attempts, 1)
                self.assertEqual(spool.count(), 10)

                # 3. At t=10002.0 backoff elapses, link now times out -> 1 probe on head-of-line (#1),
                #    backoff doubles to 4.0s (next_retry_at = 10006.0)
                now[0] = 10002.0
                self.state.telemetry_mode = "timeout"
                res11 = client.push_telemetry(3, _make_sample(11))
                self.assertFalse(res11.delivered)
                self.assertTrue(res11.spooled)
                self.assertEqual(self.state.telemetry_http_attempts, 2)
                self.assertEqual(spool.count(), 11)

                # 4. Samples 12..64 arrive while second backoff (10002.0..10006.0) is active -> ZERO HTTP calls!
                now[0] = 10003.5
                for seq in range(12, 65):
                    r = client.push_telemetry(3, _make_sample(seq))
                    self.assertFalse(r.delivered)
                    self.assertTrue(r.spooled)
                self.assertEqual(self.state.telemetry_http_attempts, 2)
                self.assertEqual(spool.count(), 64)
                self.assertEqual(len(self.state.telemetry_requests), 0)

                # 5. At t=10006.5 link recovers (201 Created); Sample 65 triggers multi-batch drain (>50 rows)
                #    delivering all 65 samples in strict 1..65 FIFO order!
                now[0] = 10006.5
                self.state.telemetry_mode = "201"
                res65 = client.push_telemetry(3, _make_sample(65))
                self.assertTrue(res65.delivered)
                self.assertFalse(res65.spooled)
                self.assertEqual(res65.flushed_from_spool, 64)
                self.assertEqual(spool.count(), 0)

                self.assertEqual(len(self.state.telemetry_requests), 65)
                delivered_seqs = [r["payload"]["seq"] for r in self.state.telemetry_requests]
                self.assertEqual(delivered_seqs, list(range(1, 66)))
                self.assertTrue(
                    all(r["deviceKey"] == "valid_device_key" for r in self.state.telemetry_requests)
                )
            finally:
                spool.close()

    def test_ai_tasks_presigned_media_upload_and_runtime_cycle(self) -> None:
        import hashlib

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            spool = OfflineSpool(tmp_path / "ai_spool.db")
            dummy_xmodel = tmp_path / "test.xmodel"
            dummy_xmodel.write_bytes(b"kv260-dpu-test-graph")
            digest = hashlib.sha256(b"kv260-dpu-test-graph").hexdigest()

            try:
                client = CloudClient(
                    self.state.base_url,
                    device_key="valid_device_key",
                    bearer_token="edge_jwt_token",
                    spool=spool,
                )

                # Test 4-step presigned JPEG upload flow
                jpeg_bytes = b"\xff\xd8\xff\xe0fake-jpeg-detection-frame\xff\xd9"
                confirmed = client.upload_detection_frame(
                    "sar_person_01.jpg", jpeg_bytes, mission_id=42
                )
                self.assertEqual(confirmed["id"], 777)
                self.assertTrue(confirmed["confirmed"])
                self.assertEqual(self.state.uploaded_blobs[777], jpeg_bytes)
                self.assertIn(777, self.state.confirmed_media)

                # Test fetch_pending_ai_tasks filters only PENDING + KV260_EDGE
                pending = client.fetch_pending_ai_tasks(42)
                self.assertEqual(len(pending), 1)
                self.assertEqual(pending[0]["id"], 501)

                # End-to-end Kv260GatewayRuntime.run_once() cycle
                cfg = EdgeAgentConfig(
                    uav_api_base_url=self.state.base_url,
                    uav_device_key="valid_device_key",
                    uav_bearer_token="edge_jwt_token",
                    uav_id=5,
                    mission_id=42,
                    mavlink_endpoint="",
                    spool_db_path=tmp_path / "ai_spool.db",
                    model_path=dummy_xmodel,
                    model_expected_sha256=digest,
                )
                dpu = VitisAiDpuEngine(
                    dummy_xmodel,
                    expected_sha256=digest,
                    predictor=lambda _w, _h: [
                        RawBoxCandidate(300, 300, 340, 380, confidence=0.93, class_id=0, label="person")
                    ],
                )
                assembler = MavlinkTelemetryAssembler(mission_id=42)
                assembler.ingest_message(
                    {
                        "mavpackettype": "GLOBAL_POSITION_INT",
                        "lat": 210285110,
                        "lon": 1058541670,
                        "relative_alt": 55000,
                        "vx": 300,
                        "vy": 400,
                        "hdg": 18000,
                    }
                )
                runtime = Kv260GatewayRuntime(
                    cfg,
                    spool=spool,
                    cloud_client=client,
                    assembler=assembler,
                    dpu_engine=dpu,
                )
                summary = runtime.run_once()
                self.assertTrue(summary["telemetryDelivered"])
                self.assertEqual(summary["aiTasksProcessed"], 1)
                self.assertEqual(len(self.state.ai_result_requests), 1)
                submitted = self.state.ai_result_requests[0]
                self.assertEqual(submitted["taskId"], 501)
                self.assertEqual(submitted["payload"]["status"], "COMPLETED")
                self.assertEqual(len(submitted["payload"]["detections"]), 1)
                self.assertIsNotNone(submitted["payload"]["detections"][0]["latitude"])
            finally:
                spool.close()

    def test_cli_verify_models_entrypoint_single_model_and_custom_sha256(self) -> None:
        import hashlib
        import shutil

        models_dir = EDGE_ROOT_DIR / "models"
        if models_dir.is_dir() and any(models_dir.glob("*.xmodel")):
            exit_code = cli_main(["--verify-models", "--models-dir", str(models_dir)])
            self.assertEqual(exit_code, 0)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)

            # 1. Single-model SD card simulation (only one known .xmodel present in models_dir)
            sd_models = tmp_path / "sd_models"
            sd_models.mkdir()
            src_human = models_dir / "yolov8_human_kv260_b3136.xmodel"
            if src_human.is_file():
                shutil.copy2(src_human, sd_models / src_human.name)
                res_single = verify_all_known_models(sd_models)
                self.assertEqual(len(res_single), 1)
                self.assertEqual(cli_main(["--verify-models", "--models-dir", str(sd_models)]), 0)

            # 2. Custom MODEL_PATH + MODEL_EXPECTED_SHA256 override via --env-file
            custom_dir = tmp_path / "custom_models"
            custom_dir.mkdir()
            custom_model = custom_dir / "finetuned_sar_kv260.xmodel"
            payload = b"custom-finetuned-dpu-b3136-binary"
            custom_sha = hashlib.sha256(payload).hexdigest()
            custom_model.write_bytes(payload)

            env_file = tmp_path / "custom.env"
            env_file.write_text(
                f"MODEL_PATH={custom_model}\nMODEL_EXPECTED_SHA256={custom_sha}\n",
                encoding="utf-8",
            )
            saved_env = os.environ.copy()
            try:
                os.environ.pop("MODEL_PATH", None)
                os.environ.pop("MODEL_EXPECTED_SHA256", None)
                rc_ok = cli_main(
                    ["--verify-models", "--models-dir", str(custom_dir), "--env-file", str(env_file)]
                )
                self.assertEqual(rc_ok, 0)

                # Wrong custom hash must fail with exit code 1
                bad_env = tmp_path / "bad.env"
                bad_env.write_text(
                    f"MODEL_PATH={custom_model}\nMODEL_EXPECTED_SHA256={'0' * 64}\n",
                    encoding="utf-8",
                )
                os.environ.pop("MODEL_PATH", None)
                os.environ.pop("MODEL_EXPECTED_SHA256", None)
                rc_bad = cli_main(
                    ["--verify-models", "--models-dir", str(custom_dir), "--env-file", str(bad_env)]
                )
                self.assertEqual(rc_bad, 1)

                # Empty directory with no configured model must fail with exit code 1
                empty_dir = tmp_path / "empty_models"
                empty_dir.mkdir()
                os.environ.pop("MODEL_PATH", None)
                os.environ.pop("MODEL_EXPECTED_SHA256", None)
                self.assertEqual(cli_main(["--verify-models", "--models-dir", str(empty_dir)]), 1)
            finally:
                os.environ.clear()
                os.environ.update(saved_env)


if __name__ == "__main__":
    unittest.main()
