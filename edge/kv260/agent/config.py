"""Typed configuration loader for the Kria KV260 Edge AI & MAVLink Gateway Agent."""

from __future__ import annotations

from dataclasses import dataclass
import os
from pathlib import Path
from typing import Mapping, Optional


EDGE_ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_PATH = EDGE_ROOT_DIR / "models" / "yolov8_human_kv260_b3136.xmodel"
DEFAULT_SPOOL_DB_PATH = EDGE_ROOT_DIR / "data" / "offline_spool.db"


def load_dotenv(dotenv_path: Path | str, *, override: bool = False) -> dict[str, str]:
    """Parse a simple .env file using pure standard library and populate os.environ."""
    path = Path(dotenv_path)
    loaded: dict[str, str] = {}
    if not path.is_file():
        return loaded

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in ("'", '"'):
            value = value[1:-1]
        elif " #" in value:
            value = value.split(" #", 1)[0].rstrip()

        loaded[key] = value
        if override or key not in os.environ:
            os.environ[key] = value

    return loaded


def _parse_bool(raw: Optional[str], default: bool) -> bool:
    if raw is None or raw.strip() == "":
        return default
    normalized = raw.strip().lower()
    if normalized in ("1", "true", "yes", "on"):
        return True
    if normalized in ("0", "false", "no", "off"):
        return False
    raise ValueError(f"Invalid boolean configuration value: {raw!r}")


def _parse_optional_int(raw: Optional[str], field_name: str) -> Optional[int]:
    if raw is None or raw.strip() == "":
        return None
    try:
        val = int(raw.strip())
    except ValueError as exc:
        raise ValueError(f"{field_name} must be an integer, got {raw!r}") from exc
    if val <= 0:
        raise ValueError(f"{field_name} must be > 0, got {val}")
    return val


def _parse_float_range(
    raw: Optional[str],
    default: float,
    field_name: str,
    *,
    min_val: Optional[float] = None,
    max_val: Optional[float] = None,
) -> float:
    if raw is None or raw.strip() == "":
        val = default
    else:
        try:
            val = float(raw.strip())
        except ValueError as exc:
            raise ValueError(f"{field_name} must be a number, got {raw!r}") from exc
    if min_val is not None and val < min_val:
        raise ValueError(f"{field_name} must be >= {min_val}, got {val}")
    if max_val is not None and val > max_val:
        raise ValueError(f"{field_name} must be <= {max_val}, got {val}")
    return val


def _clean_optional_str(raw: Optional[str]) -> Optional[str]:
    if raw is None:
        return None
    stripped = raw.strip()
    return stripped if stripped else None


@dataclass(frozen=True)
class EdgeAgentConfig:
    """Immutable runtime configuration for the KV260 gateway daemon."""

    uav_api_base_url: str = "http://localhost:8080"
    uav_device_key: Optional[str] = None
    uav_bearer_token: Optional[str] = None
    uav_id: int = 1
    mission_id: Optional[int] = None
    mavlink_endpoint: str = "udpin:0.0.0.0:14550"
    spool_db_path: Path = DEFAULT_SPOOL_DB_PATH
    spool_max_rows: int = 10000
    telemetry_hz: float = 2.0
    ai_poll_interval_sec: float = 2.0
    spool_flush_interval_sec: float = 5.0
    http_timeout_sec: float = 8.0
    tls_verify: bool = True
    tls_ca_bundle: Optional[str] = None
    model_path: Path = DEFAULT_MODEL_PATH
    model_expected_sha256: Optional[str] = None
    camera_rtsp_or_dev: str = "/dev/video0"
    camera_hfov_deg: float = 78.0
    camera_vfov_deg: float = 48.0
    gimbal_pitch_deg: float = -90.0
    confidence_threshold: float = 0.45
    nms_iou_threshold: float = 0.45
    telemetry_use_utc: bool = False

    def __post_init__(self) -> None:
        normalized_url = self.uav_api_base_url.strip().rstrip("/")
        if not normalized_url.startswith(("http://", "https://")):
            raise ValueError(
                f"UAV_API_BASE_URL must start with http:// or https://, got {self.uav_api_base_url!r}"
            )
        object.__setattr__(self, "uav_api_base_url", normalized_url)

        if self.uav_id <= 0:
            raise ValueError(f"UAV_ID must be > 0, got {self.uav_id}")
        if self.mission_id is not None and self.mission_id <= 0:
            raise ValueError(f"MISSION_ID must be > 0 when set, got {self.mission_id}")
        if self.spool_max_rows < 1:
            raise ValueError(f"SPOOL_MAX_ROWS must be >= 1, got {self.spool_max_rows}")
        if not (0.05 <= self.telemetry_hz <= 50.0):
            raise ValueError(f"TELEMETRY_HZ must be in [0.05, 50.0], got {self.telemetry_hz}")
        if not (1.0 <= self.camera_hfov_deg < 180.0):
            raise ValueError(f"CAMERA_HFOV_DEG must be in [1.0, 180.0), got {self.camera_hfov_deg}")
        if not (1.0 <= self.camera_vfov_deg < 180.0):
            raise ValueError(f"CAMERA_VFOV_DEG must be in [1.0, 180.0), got {self.camera_vfov_deg}")
        if not (0.0 < self.confidence_threshold <= 1.0):
            raise ValueError(
                f"AI_CONFIDENCE_THRESHOLD must be in (0.0, 1.0], got {self.confidence_threshold}"
            )
        if not (0.0 < self.nms_iou_threshold <= 1.0):
            raise ValueError(
                f"AI_NMS_IOU_THRESHOLD must be in (0.0, 1.0], got {self.nms_iou_threshold}"
            )

    @property
    def telemetry_interval_sec(self) -> float:
        return 1.0 / self.telemetry_hz

    @classmethod
    def from_env(
        cls,
        env: Optional[Mapping[str, str]] = None,
        *,
        dotenv_path: Optional[Path | str] = None,
    ) -> "EdgeAgentConfig":
        """Load configuration from an optional .env file and environment mapping."""
        if dotenv_path is not None:
            load_dotenv(dotenv_path)
        elif env is None:
            default_dotenv = EDGE_ROOT_DIR / ".env"
            if default_dotenv.is_file():
                load_dotenv(default_dotenv)

        source = os.environ if env is None else env

        raw_uav_id = source.get("UAV_ID", "1").strip()
        try:
            uav_id = int(raw_uav_id)
        except ValueError as exc:
            raise ValueError(f"UAV_ID must be an integer, got {raw_uav_id!r}") from exc

        raw_max_rows = source.get("SPOOL_MAX_ROWS", "10000").strip()
        try:
            spool_max_rows = int(raw_max_rows)
        except ValueError as exc:
            raise ValueError(f"SPOOL_MAX_ROWS must be an integer, got {raw_max_rows!r}") from exc

        spool_raw = _clean_optional_str(source.get("SPOOL_DB_PATH"))
        spool_path = Path(spool_raw) if spool_raw else DEFAULT_SPOOL_DB_PATH
        if not spool_path.is_absolute() and str(spool_path) != ":memory:":
            spool_path = (EDGE_ROOT_DIR / spool_path).resolve()

        model_raw = _clean_optional_str(source.get("MODEL_PATH"))
        model_path = Path(model_raw) if model_raw else DEFAULT_MODEL_PATH
        if not model_path.is_absolute():
            model_path = (EDGE_ROOT_DIR / model_path).resolve()

        expected_sha = _clean_optional_str(source.get("MODEL_EXPECTED_SHA256"))
        if expected_sha is not None:
            expected_sha = expected_sha.lower()

        return cls(
            uav_api_base_url=source.get("UAV_API_BASE_URL", "http://localhost:8080"),
            uav_device_key=_clean_optional_str(source.get("UAV_DEVICE_KEY")),
            uav_bearer_token=_clean_optional_str(source.get("UAV_BEARER_TOKEN")),
            uav_id=uav_id,
            mission_id=_parse_optional_int(source.get("MISSION_ID"), "MISSION_ID"),
            mavlink_endpoint=source.get("MAVLINK_ENDPOINT", "udpin:0.0.0.0:14550").strip(),
            spool_db_path=spool_path,
            spool_max_rows=spool_max_rows,
            telemetry_hz=_parse_float_range(
                source.get("TELEMETRY_HZ"), 2.0, "TELEMETRY_HZ", min_val=0.05, max_val=50.0
            ),
            ai_poll_interval_sec=_parse_float_range(
                source.get("AI_POLL_INTERVAL_SEC"), 2.0, "AI_POLL_INTERVAL_SEC", min_val=0.2
            ),
            spool_flush_interval_sec=_parse_float_range(
                source.get("SPOOL_FLUSH_INTERVAL_SEC"), 5.0, "SPOOL_FLUSH_INTERVAL_SEC", min_val=0.2
            ),
            http_timeout_sec=_parse_float_range(
                source.get("HTTP_TIMEOUT_SEC"), 8.0, "HTTP_TIMEOUT_SEC", min_val=0.5, max_val=120.0
            ),
            tls_verify=_parse_bool(source.get("UAV_TLS_VERIFY"), True),
            tls_ca_bundle=_clean_optional_str(source.get("UAV_TLS_CA_BUNDLE")),
            model_path=model_path,
            model_expected_sha256=expected_sha,
            camera_rtsp_or_dev=source.get("CAMERA_RTSP_OR_DEV", "/dev/video0").strip(),
            camera_hfov_deg=_parse_float_range(
                source.get("CAMERA_HFOV_DEG"), 78.0, "CAMERA_HFOV_DEG", min_val=1.0, max_val=179.9
            ),
            camera_vfov_deg=_parse_float_range(
                source.get("CAMERA_VFOV_DEG"), 48.0, "CAMERA_VFOV_DEG", min_val=1.0, max_val=179.9
            ),
            gimbal_pitch_deg=_parse_float_range(
                source.get("GIMBAL_PITCH_DEG"), -90.0, "GIMBAL_PITCH_DEG", min_val=-120.0, max_val=45.0
            ),
            confidence_threshold=_parse_float_range(
                source.get("AI_CONFIDENCE_THRESHOLD"),
                0.45,
                "AI_CONFIDENCE_THRESHOLD",
                min_val=0.01,
                max_val=1.0,
            ),
            nms_iou_threshold=_parse_float_range(
                source.get("AI_NMS_IOU_THRESHOLD"),
                0.45,
                "AI_NMS_IOU_THRESHOLD",
                min_val=0.01,
                max_val=1.0,
            ),
            telemetry_use_utc=_parse_bool(source.get("TELEMETRY_USE_UTC"), False),
        )
