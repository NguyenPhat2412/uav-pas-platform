"""MAVLink v2 telemetry normalizer and optional pymavlink live UDP/UART receiver."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import logging
import math
import re
import time
from typing import Any, Callable, Mapping, Optional

logger = logging.getLogger(__name__)

# MAVLink sentinel constants
MAV_INT32_INVALID = 2147483647
MAV_UINT16_UNKNOWN = 65535
MAV_UINT8_UNKNOWN = 255
MAV_MODE_FLAG_SAFETY_ARMED = 0x80
MAV_MODE_FLAG_CUSTOM_MODE_ENABLED = 0x01

# MAV_AUTOPILOT values
MAV_AUTOPILOT_ARDUPILOTMEGA = 3
MAV_AUTOPILOT_PX4 = 12

# Non-aircraft MAV_TYPEs ignored when decoding HEARTBEAT flight modes
NON_VEHICLE_MAV_TYPES = frozenset({6, 18, 26, 27, 33})  # GCS, Onboard Controller, Gimbal, ADSB

ARDUPILOT_COPTER_MODES: dict[int, str] = {
    0: "STABILIZE",
    1: "ACRO",
    2: "ALT_HOLD",
    3: "AUTO",
    4: "GUIDED",
    5: "LOITER",
    6: "RTL",
    7: "CIRCLE",
    9: "LAND",
    11: "DRIFT",
    13: "SPORT",
    14: "FLIP",
    15: "AUTUNE",
    16: "POSHOLD",
    17: "BRAKE",
    18: "THROW",
    19: "AVOID_ADSB",
    20: "GUIDED_NOGPS",
    21: "SMART_RTL",
    22: "FLOWHOLD",
    23: "FOLLOW",
    24: "ZIGZAG",
    25: "SYSTEMID",
    27: "AUTO_RTL",
}

PX4_MAIN_MODES: dict[int, str] = {
    1: "MANUAL",
    2: "ALTCTL",
    3: "POSCTL",
    4: "AUTO",
    5: "ACRO",
    6: "OFFBOARD",
    7: "STABILIZED",
    8: "RATTITUDE",
}

PX4_AUTO_SUB_MODES: dict[int, str] = {
    1: "AUTO.READY",
    2: "AUTO.TAKEOFF",
    3: "AUTO.LOITER",
    4: "AUTO.MISSION",
    5: "AUTO.RTL",
    6: "AUTO.LAND",
    8: "AUTO.FOLLOW_TARGET",
    9: "AUTO.PRECLAND",
}

GPS_FIX_TO_RTK_STATUS: dict[int, str] = {
    0: "NONE",    # GPS_FIX_TYPE_NO_GPS
    1: "NONE",    # GPS_FIX_TYPE_NO_FIX
    2: "SINGLE",  # GPS_FIX_TYPE_2D_FIX
    3: "SINGLE",  # GPS_FIX_TYPE_3D_FIX
    4: "SINGLE",  # GPS_FIX_TYPE_DGPS / SBAS
    5: "FLOAT",   # GPS_FIX_TYPE_RTK_FLOAT
    6: "FIXED",   # GPS_FIX_TYPE_RTK_FIXED
    7: "FIXED",   # GPS_FIX_TYPE_STATIC
    8: "FIXED",   # GPS_FIX_TYPE_PPP
}


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def wrap_heading_deg(deg: float) -> float:
    """Normalize heading in degrees into [0.0, 360.0), satisfying @DecimalMin('0') @DecimalMax('360')."""
    wrapped = math.fmod(deg, 360.0)
    if wrapped < 0.0:
        wrapped += 360.0
    rounded = round(wrapped, 2)
    if rounded >= 360.0 or rounded == 0.0:
        return 0.0
    return rounded


def decode_flight_mode(autopilot: int, base_mode: int, custom_mode: int) -> str:
    """Decode PX4 or ArduPilot flight mode string from MAVLink HEARTBEAT fields."""
    if not (base_mode & MAV_MODE_FLAG_CUSTOM_MODE_ENABLED):
        return "ARMED" if (base_mode & MAV_MODE_FLAG_SAFETY_ARMED) else "DISARMED"

    if autopilot == MAV_AUTOPILOT_PX4:
        main_mode = (custom_mode >> 16) & 0xFF
        sub_mode = (custom_mode >> 24) & 0xFF
        if main_mode == 4 and sub_mode in PX4_AUTO_SUB_MODES:
            return PX4_AUTO_SUB_MODES[sub_mode]
        return PX4_MAIN_MODES.get(main_mode, f"PX4_CUSTOM_{main_mode}_{sub_mode}")

    if autopilot == MAV_AUTOPILOT_ARDUPILOTMEGA:
        return ARDUPILOT_COPTER_MODES.get(custom_mode, f"AP_MODE_{custom_mode}")

    return f"CUSTOM_{custom_mode}"


def format_local_datetime_iso(dt: Optional[datetime] = None, *, use_utc: bool = False) -> str:
    """Format a timestamp as naive ISO-8601 LocalDateTime string expected by Spring Boot Jackson."""
    if dt is None:
        dt = datetime.now(timezone.utc) if use_utc else datetime.now()
    elif dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None) if use_utc else dt.astimezone().replace(tzinfo=None)
    return dt.isoformat(timespec="milliseconds")


@dataclass
class VehicleKinematicState:
    """Fused vehicle pose & health assembled from asynchronous MAVLink v2 messages."""

    latitude: Optional[float] = None
    longitude: Optional[float] = None
    altitude_agl_m: Optional[float] = None
    altitude_msl_m: Optional[float] = None
    ground_speed_ms: Optional[float] = None
    vertical_speed_ms: Optional[float] = None
    heading_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    yaw_deg: Optional[float] = None
    battery_pct: Optional[int] = None
    battery_voltage_v: Optional[float] = None
    rtk_status: str = "NONE"
    fix_type: int = 0
    satellites: Optional[int] = None
    flight_mode: str = "UNKNOWN"
    armed: bool = False
    autopilot: int = 0
    last_position_at: Optional[float] = None
    last_heartbeat_at: Optional[float] = None


def _get_field(msg: Any, name: str, default: Any = None) -> Any:
    if isinstance(msg, Mapping):
        return msg.get(name, default)
    return getattr(msg, name, default)


def _get_msg_type(msg: Any) -> str:
    if isinstance(msg, Mapping):
        raw = msg.get("mavpackettype") or msg.get("type") or ""
        return str(raw).upper()
    if hasattr(msg, "get_type") and callable(msg.get_type):
        return str(msg.get_type()).upper()
    return ""


class MavlinkTelemetryAssembler:
    """Assembles MAVLink v2 packets into Backend TelemetryReportRequest JSON payloads."""

    def __init__(
        self,
        *,
        mission_id: Optional[int] = None,
        use_utc_timestamps: bool = False,
        clock: Callable[[], float] = time.time,
    ) -> None:
        self.mission_id = mission_id
        self.use_utc_timestamps = use_utc_timestamps
        self._clock = clock
        self.state = VehicleKinematicState()
        self._has_global_hdg = False

    def ingest_message(self, msg: Any) -> Optional[str]:
        """Update vehicle state from a dict or pymavlink message; returns processed message type."""
        msg_type = _get_msg_type(msg)
        if not msg_type or msg_type == "BAD_DATA":
            return None

        now = self._clock()
        if msg_type == "GLOBAL_POSITION_INT":
            self._handle_global_position_int(msg, now)
        elif msg_type == "SYS_STATUS":
            self._handle_sys_status(msg)
        elif msg_type == "BATTERY_STATUS":
            self._handle_battery_status(msg)
        elif msg_type == "ATTITUDE":
            self._handle_attitude(msg)
        elif msg_type == "GPS_RAW_INT":
            self._handle_gps_raw_int(msg, now)
        elif msg_type == "HEARTBEAT":
            self._handle_heartbeat(msg, now)
        elif msg_type == "VFR_HUD":
            self._handle_vfr_hud(msg)
        else:
            return None

        return msg_type

    def _handle_global_position_int(self, msg: Any, now: float) -> None:
        raw_lat = _get_field(msg, "lat")
        raw_lon = _get_field(msg, "lon")
        if raw_lat is not None and raw_lon is not None:
            lat_i = int(raw_lat)
            lon_i = int(raw_lon)
            if lat_i != MAV_INT32_INVALID and lon_i != MAV_INT32_INVALID:
                lat = lat_i * 1e-7
                lon = lon_i * 1e-7
                if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                    if not (lat_i == 0 and lon_i == 0 and self.state.fix_type < 2):
                        self.state.latitude = round(lat, 7)
                        self.state.longitude = round(lon, 7)
                        self.state.last_position_at = now

        rel_alt_mm = _get_field(msg, "relative_alt")
        if rel_alt_mm is not None:
            self.state.altitude_agl_m = round(
                _clamp(float(rel_alt_mm) / 1000.0, -100.0, 10000.0), 3
            )

        alt_mm = _get_field(msg, "alt")
        if alt_mm is not None:
            self.state.altitude_msl_m = round(float(alt_mm) / 1000.0, 3)

        vx_cms = _get_field(msg, "vx")
        vy_cms = _get_field(msg, "vy")
        if vx_cms is not None and vy_cms is not None:
            speed_ms = math.hypot(float(vx_cms), float(vy_cms)) / 100.0
            self.state.ground_speed_ms = round(_clamp(speed_ms, 0.0, 150.0), 3)

        vz_cms = _get_field(msg, "vz")
        if vz_cms is not None:
            self.state.vertical_speed_ms = round(float(vz_cms) / 100.0, 3)

        hdg_cdeg = _get_field(msg, "hdg")
        if hdg_cdeg is not None:
            hdg_i = int(hdg_cdeg)
            if 0 <= hdg_i < MAV_UINT16_UNKNOWN:
                self.state.heading_deg = wrap_heading_deg(hdg_i / 100.0)
                self._has_global_hdg = True
            else:
                self._has_global_hdg = False
                if self.state.yaw_deg is not None:
                    self.state.heading_deg = self.state.yaw_deg

    def _handle_sys_status(self, msg: Any) -> None:
        batt_rem = _get_field(msg, "battery_remaining")
        if batt_rem is not None:
            rem_i = int(batt_rem)
            if 0 <= rem_i <= 100:
                self.state.battery_pct = rem_i

        voltage_mv = _get_field(msg, "voltage_battery")
        if voltage_mv is not None:
            mv_i = int(voltage_mv)
            if 0 < mv_i < MAV_UINT16_UNKNOWN:
                self.state.battery_voltage_v = round(mv_i / 1000.0, 3)

    def _handle_battery_status(self, msg: Any) -> None:
        batt_rem = _get_field(msg, "battery_remaining")
        if batt_rem is not None:
            rem_i = int(batt_rem)
            if 0 <= rem_i <= 100:
                self.state.battery_pct = rem_i

        voltages = _get_field(msg, "voltages")
        if isinstance(voltages, (list, tuple)):
            valid_cells_mv = [int(v) for v in voltages if isinstance(v, (int, float)) and 0 < int(v) < MAV_UINT16_UNKNOWN]
            if valid_cells_mv:
                self.state.battery_voltage_v = round(sum(valid_cells_mv) / 1000.0, 3)

    def _handle_attitude(self, msg: Any) -> None:
        roll_rad = _get_field(msg, "roll")
        pitch_rad = _get_field(msg, "pitch")
        yaw_rad = _get_field(msg, "yaw")

        if roll_rad is not None:
            self.state.roll_deg = round(math.degrees(float(roll_rad)), 2)
        if pitch_rad is not None:
            self.state.pitch_deg = round(math.degrees(float(pitch_rad)), 2)
        if yaw_rad is not None:
            yaw_deg = wrap_heading_deg(math.degrees(float(yaw_rad)))
            self.state.yaw_deg = yaw_deg
            if not self._has_global_hdg or self.state.heading_deg is None:
                self.state.heading_deg = yaw_deg

    def _handle_gps_raw_int(self, msg: Any, now: float) -> None:
        fix_type = _get_field(msg, "fix_type")
        if fix_type is not None:
            ft_i = int(fix_type)
            self.state.fix_type = ft_i
            self.state.rtk_status = GPS_FIX_TO_RTK_STATUS.get(ft_i, "FIXED" if ft_i > 8 else "NONE")

        sats = _get_field(msg, "satellites_visible")
        if sats is not None:
            sats_i = int(sats)
            if sats_i == MAV_UINT8_UNKNOWN or sats_i < 0:
                self.state.satellites = None
            else:
                self.state.satellites = int(_clamp(sats_i, 0, 200))

        # Use GPS_RAW_INT coordinates only if fused GLOBAL_POSITION_INT has not populated position yet
        if self.state.latitude is None or self.state.longitude is None:
            raw_lat = _get_field(msg, "lat")
            raw_lon = _get_field(msg, "lon")
            if raw_lat is not None and raw_lon is not None and self.state.fix_type >= 2:
                lat_i = int(raw_lat)
                lon_i = int(raw_lon)
                if lat_i != MAV_INT32_INVALID and lon_i != MAV_INT32_INVALID:
                    lat = lat_i * 1e-7
                    lon = lon_i * 1e-7
                    if -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0:
                        self.state.latitude = round(lat, 7)
                        self.state.longitude = round(lon, 7)
                        self.state.last_position_at = now

    def _handle_heartbeat(self, msg: Any, now: float) -> None:
        raw_mav_type = _get_field(
            msg,
            "mav_type",
            _get_field(msg, "type_id", _get_field(msg, "type", 0)),
        )
        if isinstance(raw_mav_type, (int, float)):
            mav_type = int(raw_mav_type)
        elif isinstance(raw_mav_type, str) and raw_mav_type.strip().isdigit():
            mav_type = int(raw_mav_type.strip())
        else:
            mav_type = 0

        if mav_type in NON_VEHICLE_MAV_TYPES:
            return

        autopilot = int(_get_field(msg, "autopilot", 0))
        base_mode = int(_get_field(msg, "base_mode", 0))
        custom_mode = int(_get_field(msg, "custom_mode", 0))

        self.state.autopilot = autopilot
        self.state.armed = bool(base_mode & MAV_MODE_FLAG_SAFETY_ARMED)
        self.state.flight_mode = decode_flight_mode(autopilot, base_mode, custom_mode)
        self.state.last_heartbeat_at = now

    def _handle_vfr_hud(self, msg: Any) -> None:
        groundspeed = _get_field(msg, "groundspeed")
        if groundspeed is not None and self.state.ground_speed_ms is None:
            self.state.ground_speed_ms = round(_clamp(float(groundspeed), 0.0, 150.0), 3)
        heading = _get_field(msg, "heading")
        if heading is not None and self.state.heading_deg is None:
            self.state.heading_deg = wrap_heading_deg(float(heading))

    def has_valid_position(self) -> bool:
        return self.state.latitude is not None and self.state.longitude is not None

    def build_telemetry_report(
        self,
        *,
        mission_id: Optional[int] = None,
        recorded_at: Optional[datetime | str] = None,
    ) -> Optional[dict[str, Any]]:
        """
        Build a dict matching Backend TelemetryReportRequest.java 100% field-for-field.
        Returns None until valid latitude and longitude have been acquired.
        """
        if not self.has_valid_position():
            return None

        if isinstance(recorded_at, str):
            ts_str = recorded_at
        else:
            ts_str = format_local_datetime_iso(recorded_at, use_utc=self.use_utc_timestamps)

        effective_mission_id = self.mission_id if mission_id is None else mission_id

        return {
            "recordedAt": ts_str,
            "latitude": self.state.latitude,
            "longitude": self.state.longitude,
            "altitudeAglMeters": self.state.altitude_agl_m,
            "groundSpeedMs": self.state.ground_speed_ms,
            "headingDeg": self.state.heading_deg,
            "batteryPct": self.state.battery_pct,
            "rtkStatus": self.state.rtk_status,
            "satellites": self.state.satellites,
            "missionId": effective_mission_id,
        }


_SERIAL_BAUD_RE = re.compile(r"^(/dev/[^:]+|COM\d+):(\d+)$", re.IGNORECASE)


def parse_mavlink_endpoint(endpoint: str) -> tuple[str, Optional[int]]:
    """Split serial '/dev/ttyPS1:921600' into ('/dev/ttyPS1', 921600), leaving UDP/TCP URIs intact."""
    cleaned = endpoint.strip()
    match = _SERIAL_BAUD_RE.match(cleaned)
    if match:
        return match.group(1), int(match.group(2))
    return cleaned, None


class PymavlinkReceiver:
    """Live MAVLink v2 UDP / UART stream reader backed by optional pymavlink."""

    MESSAGE_TYPES = (
        "GLOBAL_POSITION_INT",
        "SYS_STATUS",
        "BATTERY_STATUS",
        "ATTITUDE",
        "GPS_RAW_INT",
        "HEARTBEAT",
        "VFR_HUD",
    )

    def __init__(
        self,
        endpoint: str,
        assembler: MavlinkTelemetryAssembler,
        *,
        source_system: int = 245,
        source_component: int = 191,
        stream_rate_hz: int = 4,
    ) -> None:
        self.endpoint = endpoint
        self.assembler = assembler
        self.source_system = source_system
        self.source_component = source_component
        self.stream_rate_hz = max(1, int(stream_rate_hz))
        self._conn: Any = None

    @staticmethod
    def is_available() -> bool:
        try:
            import pymavlink.mavutil  # noqa: F401

            return True
        except ImportError:
            return False

    def connect(self, *, wait_heartbeat_timeout: float = 5.0) -> bool:
        """Open UDP/serial MAVLink link and optionally wait for initial autopilot heartbeat."""
        try:
            from pymavlink import mavutil
        except ImportError as exc:
            raise RuntimeError(
                "pymavlink is required for live MAVLink sockets/UART; install edge/kv260/requirements.txt"
            ) from exc

        device, baud = parse_mavlink_endpoint(self.endpoint)
        kwargs: dict[str, Any] = {
            "source_system": self.source_system,
            "source_component": self.source_component,
        }
        if baud is not None:
            kwargs["baud"] = baud

        self._conn = mavutil.mavlink_connection(device, **kwargs)
        if wait_heartbeat_timeout > 0:
            hb = self._conn.wait_heartbeat(timeout=wait_heartbeat_timeout)
            if hb is None:
                logger.warning("No MAVLink HEARTBEAT received within %.1fs on %s", wait_heartbeat_timeout, self.endpoint)
                return False
            self.assembler.ingest_message(hb)
            try:
                self._conn.mav.request_data_stream_send(
                    self._conn.target_system,
                    self._conn.target_component,
                    mavutil.mavlink.MAV_DATA_STREAM_ALL,
                    self.stream_rate_hz,
                    1,
                )
            except Exception as exc:
                logger.debug("Unable to request MAVLink data stream: %s", exc)
        return True

    def poll(self, *, max_messages: int = 64, timeout: float = 0.02) -> int:
        """Drain up to max_messages pending packets from socket/UART into the assembler."""
        if self._conn is None:
            return 0

        processed = 0
        for idx in range(max_messages):
            msg = self._conn.recv_match(
                type=list(self.MESSAGE_TYPES),
                blocking=(idx == 0 and timeout > 0),
                timeout=timeout if idx == 0 else 0.0,
            )
            if msg is None:
                break
            if self.assembler.ingest_message(msg) is not None:
                processed += 1
        return processed

    def close(self) -> None:
        if self._conn is not None:
            try:
                self._conn.close()
            except Exception:
                pass
            self._conn = None
