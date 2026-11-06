"""KV260 Vitis AI (.xmodel) verifier, DPU inference wrapper, NMS, and WGS84 ground projection."""

from __future__ import annotations

from dataclasses import dataclass
from glob import glob
import hashlib
import hmac
import logging
import math
from pathlib import Path
import time
from typing import Any, Callable, Optional, Sequence

logger = logging.getLogger(__name__)

# Official SHA-256 digests documented in edge/kv260/README.md
KNOWN_KV260_MODEL_SHA256: dict[str, str] = {
    "yolo11s_kd_dpu.xmodel": (
        "20dc97aae118b24dc23edfb1d707a519cf97edc8c79b6419b4c08e9c4eb49176"
    ),
    "yolov8_human_kv260_b3136.xmodel": (
        "c10bd89ab28ec4b4797a5a96949b8c591367ffb9b4fa7d4f33f34dbb2d75a09e"
    ),
}

DEFAULT_SAR_LABELS: tuple[str, ...] = (
    "person",
    "bicycle",
    "car",
    "motorcycle",
    "airplane",
    "bus",
    "train",
    "truck",
    "boat",
)

# WGS84 ellipsoid constants
_WGS84_A = 6378137.0
_WGS84_F = 1.0 / 298.257223563
_WGS84_E2 = _WGS84_F * (2.0 - _WGS84_F)


class ModelIntegrityError(RuntimeError):
    """Raised when an .xmodel file is missing, unreadable, or fails SHA-256 verification."""


class DpuUnavailableError(RuntimeError):
    """Raised when Vitis AI (xir/vart) DPU runtime is unavailable and no custom predictor is set."""


@dataclass(frozen=True)
class ModelVerificationResult:
    """Outcome of verifying a compiled Vitis AI .xmodel binary."""

    path: Path
    sha256: str
    expected_sha256: str
    size_bytes: int
    verified: bool


@dataclass(frozen=True)
class LetterboxParams:
    """Aspect-ratio-preserving resize & pad geometry for YOLO DPU input tensors."""

    orig_width: int
    orig_height: int
    target_width: int
    target_height: int
    scale: float
    resized_width: int
    resized_height: int
    pad_left: float
    pad_top: float


@dataclass(frozen=True)
class RawBoxCandidate:
    """Candidate detection in model input pixel space [x1, y1, x2, y2] prior to NMS."""

    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float
    class_id: int = 0
    label: str = "person"
    tracking_id: Optional[str] = None


@dataclass(frozen=True)
class GroundProjectionContext:
    """Aircraft & gimbal state required to project image pixels onto WGS84 ground coordinates."""

    uav_lat: float
    uav_lon: float
    altitude_agl_m: float
    gimbal_pitch_deg: float = -90.0
    gimbal_yaw_deg: float = 0.0
    roll_deg: float = 0.0
    hfov_deg: float = 78.0
    vfov_deg: float = 48.0
    max_slant_range_m: float = 2500.0


def _clamp(val: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, val))


def compute_file_sha256(file_path: Path | str, *, chunk_size: int = 1024 * 1024) -> str:
    """Stream a file from disk and return its lowercase hexadecimal SHA-256 digest."""
    path = Path(file_path)
    if not path.is_file():
        raise ModelIntegrityError(f"Model file not found: {path}")

    hasher = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(chunk_size)
            if not chunk:
                break
            hasher.update(chunk)
    return hasher.hexdigest().lower()


def verify_model_sha256(
    model_path: Path | str,
    expected_sha256: Optional[str] = None,
) -> ModelVerificationResult:
    """Verify an .xmodel file against an explicit digest or KNOWN_KV260_MODEL_SHA256."""
    path = Path(model_path)
    if not path.is_file():
        raise ModelIntegrityError(f"Model file does not exist: {path}")

    size_bytes = path.stat().st_size
    if size_bytes <= 0:
        raise ModelIntegrityError(f"Model file is empty: {path}")

    resolved_expected = expected_sha256.strip().lower() if expected_sha256 else None
    if not resolved_expected:
        resolved_expected = KNOWN_KV260_MODEL_SHA256.get(path.name)
    if not resolved_expected:
        raise ModelIntegrityError(
            f"No expected SHA-256 configured or registered for model {path.name!r}"
        )

    actual_sha256 = compute_file_sha256(path)
    if not hmac.compare_digest(actual_sha256, resolved_expected):
        raise ModelIntegrityError(
            f"SHA-256 mismatch for {path.name}: expected {resolved_expected}, got {actual_sha256}"
        )

    return ModelVerificationResult(
        path=path,
        sha256=actual_sha256,
        expected_sha256=resolved_expected,
        size_bytes=size_bytes,
        verified=True,
    )


def verify_all_known_models(
    models_dir: Path | str,
    *,
    configured_model_path: Optional[Path | str] = None,
    configured_expected_sha256: Optional[str] = None,
) -> list[ModelVerificationResult]:
    """
    Verify every .xmodel file present in models_dir plus an optional configured_model_path.
    Supports single-model SD cards as well as custom MODEL_EXPECTED_SHA256 digests, while
    requiring at least one valid .xmodel to exist and pass SHA-256 verification.
    """
    directory = Path(models_dir)
    results: list[ModelVerificationResult] = []
    verified_paths: set[Path] = set()

    cfg_resolved = Path(configured_model_path).resolve() if configured_model_path is not None else None

    if directory.is_dir():
        for candidate in sorted(directory.glob("*.xmodel")):
            cand_resolved = candidate.resolve()
            expected = (
                configured_expected_sha256
                if (cfg_resolved is not None and cand_resolved == cfg_resolved and configured_expected_sha256)
                else None
            )
            results.append(verify_model_sha256(candidate, expected))
            verified_paths.add(cand_resolved)

    if configured_model_path is not None:
        cfg_path = Path(configured_model_path)
        if cfg_resolved not in verified_paths:
            results.append(verify_model_sha256(cfg_path, configured_expected_sha256))
            if cfg_resolved is not None:
                verified_paths.add(cfg_resolved)

    if not results:
        if not directory.is_dir():
            raise ModelIntegrityError(f"Models directory does not exist: {directory}")
        raise ModelIntegrityError(f"No .xmodel files found in {directory}")

    return results


def compute_letterbox_params(
    orig_width: int,
    orig_height: int,
    target_width: int = 640,
    target_height: int = 640,
) -> LetterboxParams:
    """Compute scale and symmetric border padding for YOLO letterbox preprocessing."""
    if orig_width <= 0 or orig_height <= 0:
        raise ValueError(f"Invalid source frame size: {orig_width}x{orig_height}")
    if target_width <= 0 or target_height <= 0:
        raise ValueError(f"Invalid target input size: {target_width}x{target_height}")

    scale = min(target_width / orig_width, target_height / orig_height)
    resized_w = max(1, int(round(orig_width * scale)))
    resized_h = max(1, int(round(orig_height * scale)))
    pad_left = (target_width - resized_w) / 2.0
    pad_top = (target_height - resized_h) / 2.0

    return LetterboxParams(
        orig_width=orig_width,
        orig_height=orig_height,
        target_width=target_width,
        target_height=target_height,
        scale=scale,
        resized_width=resized_w,
        resized_height=resized_h,
        pad_left=pad_left,
        pad_top=pad_top,
    )


def letterbox_preprocess_image(
    image_bgr: Any,
    target_width: int = 640,
    target_height: int = 640,
    pad_value: int = 114,
) -> tuple[Any, LetterboxParams]:
    """
    Resize and pad an HxWx3 numpy image to (target_height, target_width, 3) RGB float32 [0..1].
    Uses OpenCV when installed, otherwise falls back to pure numpy nearest-neighbor sampling.
    """
    import numpy as np

    if image_bgr.ndim != 3 or image_bgr.shape[2] != 3:
        raise ValueError(f"Expected HxWx3 image array, got shape {getattr(image_bgr, 'shape', None)}")

    orig_h, orig_w = int(image_bgr.shape[0]), int(image_bgr.shape[1])
    params = compute_letterbox_params(orig_w, orig_h, target_width, target_height)

    try:
        import cv2

        resized = cv2.resize(
            image_bgr,
            (params.resized_width, params.resized_height),
            interpolation=cv2.INTER_LINEAR,
        )
        rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
    except ImportError:
        y_idx = np.linspace(0, orig_h - 1, params.resized_height).astype(np.int32)
        x_idx = np.linspace(0, orig_w - 1, params.resized_width).astype(np.int32)
        resized = image_bgr[np.ix_(y_idx, x_idx)]
        rgb = resized[..., ::-1]

    canvas = np.full((target_height, target_width, 3), pad_value, dtype=np.uint8)
    top = int(round(params.pad_top))
    left = int(round(params.pad_left))
    canvas[top : top + params.resized_height, left : left + params.resized_width] = rgb
    normalized = canvas.astype(np.float32) / 255.0
    return normalized, params


def unletterbox_bbox_to_pixels(
    x1: float,
    y1: float,
    x2: float,
    y2: float,
    params: LetterboxParams,
) -> tuple[float, float, float, float]:
    """Map model-space [x1, y1, x2, y2] back to clamped original image pixel coordinates."""
    ox1 = _clamp((x1 - params.pad_left) / params.scale, 0.0, float(params.orig_width))
    oy1 = _clamp((y1 - params.pad_top) / params.scale, 0.0, float(params.orig_height))
    ox2 = _clamp((x2 - params.pad_left) / params.scale, 0.0, float(params.orig_width))
    oy2 = _clamp((y2 - params.pad_top) / params.scale, 0.0, float(params.orig_height))
    if ox2 < ox1:
        ox1, ox2 = ox2, ox1
    if oy2 < oy1:
        oy1, oy2 = oy2, oy1
    return ox1, oy1, ox2, oy2


def pixels_to_percentage_box(
    ox1: float,
    oy1: float,
    ox2: float,
    oy2: float,
    orig_width: int,
    orig_height: int,
) -> tuple[float, float, float, float]:
    """
    Convert original-frame pixel coordinates into Backend AiDetectionResultRequest percentages:
    (boxTop, boxLeft, boxWidth, boxHeight) each guaranteed within [0.0, 100.0].
    """
    box_left = _clamp((ox1 / orig_width) * 100.0, 0.0, 100.0)
    box_top = _clamp((oy1 / orig_height) * 100.0, 0.0, 100.0)
    box_width = _clamp(((ox2 - ox1) / orig_width) * 100.0, 0.0, 100.0 - box_left)
    box_height = _clamp(((oy2 - oy1) / orig_height) * 100.0, 0.0, 100.0 - box_top)
    return (
        round(box_top, 3),
        round(box_left, 3),
        round(box_width, 3),
        round(box_height, 3),
    )


def compute_iou(box_a: RawBoxCandidate, box_b: RawBoxCandidate) -> float:
    """Compute Intersection-over-Union (IoU) between two [x1, y1, x2, y2] boxes."""
    inter_x1 = max(box_a.x1, box_b.x1)
    inter_y1 = max(box_a.y1, box_b.y1)
    inter_x2 = min(box_a.x2, box_b.x2)
    inter_y2 = min(box_a.y2, box_b.y2)

    inter_w = max(0.0, inter_x2 - inter_x1)
    inter_h = max(0.0, inter_y2 - inter_y1)
    inter_area = inter_w * inter_h
    if inter_area <= 0.0:
        return 0.0

    area_a = max(0.0, box_a.x2 - box_a.x1) * max(0.0, box_a.y2 - box_a.y1)
    area_b = max(0.0, box_b.x2 - box_b.x1) * max(0.0, box_b.y2 - box_b.y1)
    union_area = area_a + area_b - inter_area
    if union_area <= 0.0:
        return 0.0
    return inter_area / union_area


def non_max_suppression(
    candidates: Sequence[RawBoxCandidate],
    *,
    confidence_threshold: float = 0.45,
    iou_threshold: float = 0.45,
    max_detections: int = 100,
) -> list[RawBoxCandidate]:
    """Perform class-aware Non-Maximum Suppression sorted by descending confidence."""
    filtered = [
        c
        for c in candidates
        if c.confidence >= confidence_threshold and (c.x2 > c.x1) and (c.y2 > c.y1)
    ]
    filtered.sort(key=lambda c: c.confidence, reverse=True)

    kept: list[RawBoxCandidate] = []
    for cand in filtered:
        suppressed = False
        for existing in kept:
            if existing.class_id == cand.class_id and existing.label == cand.label:
                if compute_iou(existing, cand) > iou_threshold:
                    suppressed = True
                    break
        if not suppressed:
            kept.append(cand)
            if len(kept) >= max_detections:
                break
    return kept


def project_pixel_to_wgs84(
    *,
    uav_lat: float,
    uav_lon: float,
    altitude_agl_m: float,
    u_px: float,
    v_px: float,
    img_width: int,
    img_height: int,
    hfov_deg: float = 78.0,
    vfov_deg: float = 48.0,
    gimbal_pitch_deg: float = -90.0,
    gimbal_yaw_deg: float = 0.0,
    roll_deg: float = 0.0,
    max_slant_range_m: float = 2500.0,
) -> Optional[tuple[float, float]]:
    """
    Project image pixel (u_px, v_px) onto local tangent ground plane and convert to WGS84 (lat, lon).

    Conventions:
      - u_px in [0, img_width] (left -> right), v_px in [0, img_height] (top -> bottom)
      - gimbal_pitch_deg: -90.0 = straight down (nadir), -45.0 = 45 deg downward, 0.0 = horizon
      - gimbal_yaw_deg: true camera azimuth clockwise from North (0=N, 90=E, 180=S, 270=W)
      - Returns None when altitude_agl_m <= 0.5, ray points above ground, or slant range > max_slant_range_m.
    """
    if img_width <= 0 or img_height <= 0:
        raise ValueError("img_width and img_height must be > 0")
    if not (-90.0 <= uav_lat <= 90.0) or not (-180.0 <= uav_lon <= 180.0):
        return None
    if altitude_agl_m is None or altitude_agl_m <= 0.5:
        return None

    cx = img_width / 2.0
    cy = img_height / 2.0
    nx = (u_px - cx) / cx
    ny = (v_px - cy) / cy

    # Ray in pinhole camera coordinates (+z optical axis, +x image right, +y image down)
    x_c = nx * math.tan(math.radians(hfov_deg) / 2.0)
    y_c = ny * math.tan(math.radians(vfov_deg) / 2.0)
    z_c = 1.0

    # Optional camera roll compensation around optical axis +z_c
    phi = math.radians(roll_deg)
    cos_phi = math.cos(phi)
    sin_phi = math.sin(phi)
    x_r = x_c * cos_phi - y_c * sin_phi
    y_r = x_c * sin_phi + y_c * cos_phi
    z_r = z_c

    # Pitch rotation from camera frame into horizontal Forward-Right-Down frame
    theta = math.radians(gimbal_pitch_deg)
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    forward = z_r * cos_t + y_r * sin_t
    right = x_r
    down = -z_r * sin_t + y_r * cos_t

    if down <= 1e-3:
        return None

    # Azimuth rotation into local NED (North-East-Down)
    psi = math.radians(gimbal_yaw_deg)
    cos_psi = math.cos(psi)
    sin_psi = math.sin(psi)
    ray_north = forward * cos_psi - right * sin_psi
    ray_east = forward * sin_psi + right * cos_psi
    ray_down = down

    scale = altitude_agl_m / ray_down
    offset_north_m = ray_north * scale
    offset_east_m = ray_east * scale

    slant_range_m = math.sqrt(
        offset_north_m * offset_north_m
        + offset_east_m * offset_east_m
        + altitude_agl_m * altitude_agl_m
    )
    if slant_range_m > max_slant_range_m:
        return None

    # WGS84 meridional & prime-vertical radii of curvature at UAV latitude
    lat_rad = math.radians(uav_lat)
    sin_lat = math.sin(lat_rad)
    cos_lat = max(1e-9, math.cos(lat_rad))
    w = math.sqrt(1.0 - _WGS84_E2 * sin_lat * sin_lat)
    r_meridional = _WGS84_A * (1.0 - _WGS84_E2) / (w * w * w)
    r_prime_vertical = _WGS84_A / w

    d_lat_deg = math.degrees(offset_north_m / r_meridional)
    d_lon_deg = math.degrees(offset_east_m / (r_prime_vertical * cos_lat))

    target_lat = _clamp(uav_lat + d_lat_deg, -90.0, 90.0)
    target_lon = ((uav_lon + d_lon_deg + 180.0) % 360.0) - 180.0
    return round(target_lat, 7), round(target_lon, 7)


def read_kv260_soc_temperature_c(
    thermal_glob: str = "/sys/class/thermal/thermal_zone*/temp",
) -> Optional[float]:
    """Read Zynq UltraScale+ MPSoC temperature from Linux sysfs thermal zones, or None if unavailable."""
    temps_c: list[float] = []
    for path_str in sorted(glob(thermal_glob)):
        try:
            raw = Path(path_str).read_text(encoding="utf-8").strip()
            milli_c = float(raw)
            temp_c = milli_c / 1000.0 if abs(milli_c) > 200.0 else milli_c
            if -40.0 <= temp_c <= 150.0:
                temps_c.append(temp_c)
        except OSError:
            continue
        except ValueError:
            continue

    if not temps_c:
        return None
    return round(max(temps_c), 2)


def decode_yolo_output_tensor(
    output_tensor: Any,
    *,
    confidence_threshold: float = 0.45,
    class_labels: Sequence[str] = DEFAULT_SAR_LABELS,
) -> list[RawBoxCandidate]:
    """
    Decode YOLOv8 / YOLO11 raw head tensor of shape (1, 4+C, N) or (1, N, 4+C) into RawBoxCandidates.
    """
    import numpy as np

    arr = np.asarray(output_tensor, dtype=np.float32)
    if arr.ndim == 3 and arr.shape[0] == 1:
        arr = arr[0]
    if arr.ndim != 2:
        raise ValueError(f"Unsupported YOLO head tensor shape: {arr.shape}")

    # YOLOv8/YOLO11 default head is (4 + num_classes, num_anchors), e.g. (5, 8400) or (84, 8400)
    if arr.shape[1] < 5 <= arr.shape[0] or (arr.shape[0] < arr.shape[1] and arr.shape[0] <= 256):
        arr = arr.T  # -> (num_anchors, 4 + num_classes)

    if arr.shape[1] < 5:
        raise ValueError(f"Expected >= 5 columns [cx, cy, w, h, cls...], got {arr.shape}")

    boxes_xywh = arr[:, :4]
    class_scores = arr[:, 4:]
    best_class_ids = np.argmax(class_scores, axis=1)
    best_scores = class_scores[np.arange(class_scores.shape[0]), best_class_ids]

    keep_indices = np.nonzero(best_scores >= confidence_threshold)[0]
    candidates: list[RawBoxCandidate] = []
    for idx in keep_indices:
        cx, cy, w, h = (float(v) for v in boxes_xywh[idx])
        score = float(_clamp(float(best_scores[idx]), 0.0, 1.0))
        cls_id = int(best_class_ids[idx])
        label = class_labels[cls_id] if 0 <= cls_id < len(class_labels) else f"class_{cls_id}"
        candidates.append(
            RawBoxCandidate(
                x1=cx - w / 2.0,
                y1=cy - h / 2.0,
                x2=cx + w / 2.0,
                y2=cy + h / 2.0,
                confidence=score,
                class_id=cls_id,
                label=label,
            )
        )
    return candidates


class VitisAiDpuEngine:
    """
    Pluggable Vitis AI DPUCZDX8G (B3136) execution wrapper for Xilinx Kria KV260.
    Always verifies .xmodel SHA-256 integrity prior to initializing the DPU runner.
    """

    def __init__(
        self,
        model_path: Path | str,
        *,
        expected_sha256: Optional[str] = None,
        input_width: int = 640,
        input_height: int = 640,
        confidence_threshold: float = 0.45,
        nms_iou_threshold: float = 0.45,
        class_labels: Sequence[str] = DEFAULT_SAR_LABELS,
        predictor: Optional[Callable[[int, int], Sequence[RawBoxCandidate]]] = None,
        lazy_load_dpu: bool = True,
    ) -> None:
        self.verification = verify_model_sha256(model_path, expected_sha256)
        self.model_path = self.verification.path
        self.input_width = input_width
        self.input_height = input_height
        self.confidence_threshold = confidence_threshold
        self.nms_iou_threshold = nms_iou_threshold
        self.class_labels = tuple(class_labels)
        self._predictor = predictor

        self._graph: Any = None
        self._runner: Any = None
        self._input_scale: float = 1.0
        self._output_scales: list[float] = []
        self._tracking_seq: int = 0

        if not lazy_load_dpu and self._predictor is None:
            self._ensure_dpu_runner()

    @staticmethod
    def is_vitis_ai_available() -> bool:
        try:
            import vart  # type: ignore  # noqa: F401
            import xir  # type: ignore  # noqa: F401

            return True
        except ImportError:
            return False

    def _ensure_dpu_runner(self) -> None:
        if self._runner is not None or self._predictor is not None:
            return
        try:
            import vart  # type: ignore
            import xir  # type: ignore
        except ImportError as exc:
            raise DpuUnavailableError(
                "Xilinx Vitis AI Python bindings (xir/vart) are not installed on this host. "
                "Deploy on Kria KV260 Ubuntu 22.04 with Vitis AI runtime or supply a test predictor."
            ) from exc

        self._graph = xir.Graph.deserialize(str(self.model_path))
        root = self._graph.get_root_subgraph()
        dpu_subgraphs = [
            sg
            for sg in root.toposort_child_subgraph()
            if sg.has_attr("device") and str(sg.get_attr("device")).upper() == "DPU"
        ]
        if not dpu_subgraphs:
            raise DpuUnavailableError(f"No DPU subgraph found inside {self.model_path.name}")

        self._runner = vart.Runner.create_runner(dpu_subgraphs[0], "run")
        input_tensors = self._runner.get_input_tensors()
        output_tensors = self._runner.get_output_tensors()

        if input_tensors:
            in_shape = tuple(input_tensors[0].dims)
            if len(in_shape) == 4:
                self.input_height = int(in_shape[1])
                self.input_width = int(in_shape[2])
            if input_tensors[0].has_attr("fix_point"):
                self._input_scale = float(2 ** int(input_tensors[0].get_attr("fix_point")))

        self._output_scales = []
        for out_t in output_tensors:
            if out_t.has_attr("fix_point"):
                self._output_scales.append(float(2 ** (-int(out_t.get_attr("fix_point")))))
            else:
                self._output_scales.append(1.0)

    def _run_hardware_dpu(
        self, frame_bgr: Any, conf_thresh: float
    ) -> tuple[list[RawBoxCandidate], LetterboxParams, float]:
        import numpy as np

        self._ensure_dpu_runner()
        rgb_float, lb_params = letterbox_preprocess_image(
            frame_bgr, self.input_width, self.input_height
        )

        input_tensors = self._runner.get_input_tensors()
        output_tensors = self._runner.get_output_tensors()

        in_dims = tuple(input_tensors[0].dims)
        quantized_in = np.clip(
            np.round(rgb_float * self._input_scale), -128, 127
        ).astype(np.int8)
        in_buf = [quantized_in.reshape(in_dims)]
        out_buf = [np.empty(tuple(t.dims), dtype=np.int8) for t in output_tensors]

        dpu_t0 = time.perf_counter()
        job_id = self._runner.execute_async(in_buf, out_buf)
        self._runner.wait(job_id)
        dpu_exec_s = max(0.0, time.perf_counter() - dpu_t0)

        dequantized_outputs = [
            buf.astype(np.float32) * scale for buf, scale in zip(out_buf, self._output_scales)
        ]
        raw_candidates = decode_yolo_output_tensor(
            dequantized_outputs[0],
            confidence_threshold=conf_thresh,
            class_labels=self.class_labels,
        )
        return raw_candidates, lb_params, dpu_exec_s

    def infer_detections(
        self,
        *,
        orig_width: int = 1920,
        orig_height: int = 1080,
        frame_bgr: Any = None,
        projection: Optional[GroundProjectionContext] = None,
        confidence_threshold: Optional[float] = None,
    ) -> dict[str, Any]:
        """
        Execute one inference pass, perform NMS + pixel-to-WGS84 ground projection, and return
        an exact Backend AiTaskResultRequest payload dictionary.
        """
        eff_conf = (
            self.confidence_threshold
            if confidence_threshold is None
            else float(_clamp(confidence_threshold, 0.01, 1.0))
        )
        t0 = time.perf_counter()
        dpu_exec_s: Optional[float] = None

        try:
            if self._predictor is not None:
                if frame_bgr is not None and hasattr(frame_bgr, "shape"):
                    orig_height = int(frame_bgr.shape[0])
                    orig_width = int(frame_bgr.shape[1])
                lb_params = compute_letterbox_params(
                    orig_width, orig_height, self.input_width, self.input_height
                )
                raw_candidates = list(self._predictor(self.input_width, self.input_height))
            else:
                if frame_bgr is None:
                    raise ValueError("frame_bgr numpy array is required for hardware Vitis AI DPU execution")
                raw_candidates, lb_params, dpu_exec_s = self._run_hardware_dpu(frame_bgr, eff_conf)

            kept = non_max_suppression(
                raw_candidates,
                confidence_threshold=eff_conf,
                iou_threshold=self.nms_iou_threshold,
            )

            elapsed_s = max(1e-6, time.perf_counter() - t0)
            inference_ms = int(_clamp(round(elapsed_s * 1000.0), 0, 600000))
            fps = round(_clamp(1.0 / elapsed_s, 0.0, 1000.0), 2)
            dpu_util: Optional[float] = (
                round(_clamp((dpu_exec_s / elapsed_s) * 100.0, 0.0, 100.0), 1)
                if dpu_exec_s is not None
                else None
            )
            soc_temp = read_kv260_soc_temperature_c()

            detections_payload: list[dict[str, Any]] = []
            for box in kept:
                ox1, oy1, ox2, oy2 = unletterbox_bbox_to_pixels(
                    box.x1, box.y1, box.x2, box.y2, lb_params
                )
                box_top, box_left, box_width, box_height = pixels_to_percentage_box(
                    ox1, oy1, ox2, oy2, lb_params.orig_width, lb_params.orig_height
                )

                # Project bottom-center for ground targets (person/car/etc.) or center for nadir
                target_u = (ox1 + ox2) / 2.0
                target_v = (oy1 + oy2) / 2.0 if (projection and projection.gimbal_pitch_deg <= -80.0) else oy2

                lat: Optional[float] = None
                lon: Optional[float] = None
                if projection is not None:
                    projected = project_pixel_to_wgs84(
                        uav_lat=projection.uav_lat,
                        uav_lon=projection.uav_lon,
                        altitude_agl_m=projection.altitude_agl_m,
                        u_px=target_u,
                        v_px=target_v,
                        img_width=lb_params.orig_width,
                        img_height=lb_params.orig_height,
                        hfov_deg=projection.hfov_deg,
                        vfov_deg=projection.vfov_deg,
                        gimbal_pitch_deg=projection.gimbal_pitch_deg,
                        gimbal_yaw_deg=projection.gimbal_yaw_deg,
                        roll_deg=projection.roll_deg,
                        max_slant_range_m=projection.max_slant_range_m,
                    )
                    if projected is not None:
                        lat, lon = projected

                self._tracking_seq += 1
                tracking_id = (box.tracking_id or f"kv260-{self._tracking_seq:05d}")[:40]
                label = (box.label.strip() or "object")[:60]

                detections_payload.append(
                    {
                        "label": label,
                        "confidence": round(_clamp(box.confidence, 0.0, 1.0), 4),
                        "boxTop": box_top,
                        "boxLeft": box_left,
                        "boxWidth": box_width,
                        "boxHeight": box_height,
                        "latitude": lat,
                        "longitude": lon,
                        "trackingId": tracking_id,
                    }
                )

            return {
                "status": "COMPLETED",
                "inferenceTimeMs": inference_ms,
                "fps": fps,
                "dpuUtilization": dpu_util,
                "socTemperature": soc_temp,
                "errorMessage": None,
                "detections": detections_payload,
            }
        except Exception as exc:
            elapsed_ms = int(_clamp(round((time.perf_counter() - t0) * 1000.0), 0, 600000))
            return {
                "status": "FAILED",
                "inferenceTimeMs": elapsed_ms,
                "fps": None,
                "dpuUtilization": None,
                "socTemperature": read_kv260_soc_temperature_c(),
                "errorMessage": str(exc)[:500],
                "detections": [],
            }

    def close(self) -> None:
        self._runner = None
        self._graph = None
