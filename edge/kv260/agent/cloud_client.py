"""Pure standard-library HTTP/TLS client for Spring Boot Telemetry, SAR AI, and Media APIs."""

from __future__ import annotations

from dataclasses import dataclass
import json
import logging
import socket
import ssl
import time
from typing import Any, Callable, Optional
import urllib.error
import urllib.parse
import urllib.request

from .offline_spool import (
    DrainReport,
    OfflineSpool,
    PermanentSpoolDrop,
    SPOOL_KIND_AI_RESULT,
    SPOOL_KIND_TELEMETRY,
    SpoolEntry,
)

logger = logging.getLogger(__name__)

RETRYABLE_HTTP_STATUSES = frozenset({408, 425, 429, 500, 502, 503, 504})


class CloudApiError(RuntimeError):
    """Structured HTTP or network failure when talking to the UAV-PAS Backend."""

    def __init__(
        self,
        message: str,
        *,
        status_code: Optional[int] = None,
        response_body: str = "",
        retryable: bool = False,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.response_body = response_body
        self.retryable = retryable


@dataclass(frozen=True)
class TelemetryPushResult:
    """Outcome of pushing one telemetry sample (either live 201 or spooled to SQLite)."""

    delivered: bool
    spooled: bool
    status_code: Optional[int] = None
    spool_id: Optional[int] = None
    flushed_from_spool: int = 0
    response: Optional[dict[str, Any]] = None
    error: Optional[str] = None


class CloudClient:
    """
    Zero-dependency urllib.request client aligned with Spring Security filter rules:
      - Telemetry POST uses X-Device-Key WITHOUT Authorization header (per DeviceKeyAuthenticationFilter).
      - AI & Media routes use Authorization: Bearer <token> WITHOUT X-Device-Key.
      - Presigned object-storage PUT/GET URLs omit both platform auth headers to preserve SigV4 signatures.
    """

    def __init__(
        self,
        base_url: str,
        *,
        device_key: Optional[str] = None,
        bearer_token: Optional[str] = None,
        timeout_sec: float = 8.0,
        tls_verify: bool = True,
        tls_ca_bundle: Optional[str] = None,
        spool: Optional[OfflineSpool] = None,
        clock: Optional[Callable[[], float]] = None,
        user_agent: str = "uav-kv260-edge-agent/1.0",
    ) -> None:
        cleaned_url = base_url.strip().rstrip("/")
        if not cleaned_url.startswith(("http://", "https://")):
            raise ValueError(f"base_url must start with http:// or https://, got {base_url!r}")

        self.base_url = cleaned_url
        self.device_key = device_key.strip() if device_key and device_key.strip() else None
        self.bearer_token = bearer_token.strip() if bearer_token and bearer_token.strip() else None
        self.timeout_sec = max(0.2, float(timeout_sec))
        self.spool = spool
        self._clock: Callable[[], float] = (
            clock if clock is not None else (spool.clock if spool is not None else time.time)
        )
        self.user_agent = user_agent
        self._ssl_context = self._build_ssl_context(tls_verify=tls_verify, ca_bundle=tls_ca_bundle)

    @staticmethod
    def _build_ssl_context(*, tls_verify: bool, ca_bundle: Optional[str]) -> ssl.SSLContext:
        if not tls_verify:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            return ctx
        return ssl.create_default_context(cafile=ca_bundle if ca_bundle else None)

    def _telemetry_headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": self.user_agent,
        }
        if self.device_key:
            headers["X-Device-Key"] = self.device_key
        elif self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        return headers

    def _service_headers(self, *, json_body: bool = True) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "User-Agent": self.user_agent,
        }
        if json_body:
            headers["Content-Type"] = "application/json"
        if self.bearer_token:
            headers["Authorization"] = f"Bearer {self.bearer_token}"
        return headers

    def _raw_request(
        self,
        method: str,
        url_or_path: str,
        *,
        headers: dict[str, str],
        body_bytes: Optional[bytes] = None,
    ) -> tuple[int, bytes]:
        if url_or_path.startswith(("http://", "https://")):
            full_url = url_or_path
        else:
            path = url_or_path if url_or_path.startswith("/") else f"/{url_or_path}"
            full_url = f"{self.base_url}{path}"

        req = urllib.request.Request(
            full_url,
            data=body_bytes,
            headers=headers,
            method=method.upper(),
        )
        open_kwargs: dict[str, Any] = {"timeout": self.timeout_sec}
        if full_url.startswith("https://"):
            open_kwargs["context"] = self._ssl_context

        try:
            with urllib.request.urlopen(req, **open_kwargs) as resp:
                status = int(resp.getcode() or 200)
                raw = resp.read()
                return status, raw
        except urllib.error.HTTPError as exc:
            status = int(exc.code)
            err_body = ""
            try:
                err_body = exc.read().decode("utf-8", errors="replace")
            except Exception:
                pass
            finally:
                try:
                    exc.close()
                except Exception:
                    pass
            retryable = status in RETRYABLE_HTTP_STATUSES
            raise CloudApiError(
                f"HTTP {status} on {method.upper()} {full_url}: {err_body[:240]}",
                status_code=status,
                response_body=err_body,
                retryable=retryable,
            ) from exc
        except (urllib.error.URLError, TimeoutError, socket.timeout, ConnectionError, OSError) as exc:
            raise CloudApiError(
                f"Network/timeout error on {method.upper()} {full_url}: {exc}",
                status_code=None,
                retryable=True,
            ) from exc

    def _json_request(
        self,
        method: str,
        url_or_path: str,
        *,
        headers: dict[str, str],
        payload: Optional[dict[str, Any]] = None,
    ) -> tuple[int, Any]:
        body = (
            json.dumps(payload, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            if payload is not None
            else (b"" if method.upper() in ("POST", "PUT", "PATCH") else None)
        )
        status, raw = self._raw_request(method, url_or_path, headers=headers, body_bytes=body)
        if not raw or status == 204:
            return status, None
        decoded = raw.decode("utf-8", errors="replace").strip()
        if not decoded:
            return status, None
        return status, json.loads(decoded)

    def _send_telemetry_direct(self, uav_id: int, payload: dict[str, Any]) -> tuple[int, Any]:
        return self._json_request(
            "POST",
            f"/api/v1/uavs/{int(uav_id)}/telemetry",
            headers=self._telemetry_headers(),
            payload=payload,
        )

    def _send_ai_result_direct(self, task_id: int, payload: dict[str, Any]) -> tuple[int, Any]:
        return self._json_request(
            "POST",
            f"/api/v1/ai/tasks/{int(task_id)}/results",
            headers=self._service_headers(json_body=True),
            payload=payload,
        )

    def _dispatch_spool_entry(self, entry: SpoolEntry) -> bool:
        try:
            if entry.kind == SPOOL_KIND_TELEMETRY:
                self._send_telemetry_direct(entry.target_id, entry.payload)
                return True
            if entry.kind == SPOOL_KIND_AI_RESULT:
                self._send_ai_result_direct(entry.target_id, entry.payload)
                return True
            raise PermanentSpoolDrop(f"Unknown spool entry kind: {entry.kind}")
        except CloudApiError as exc:
            # 409 on AI_TASK_RESULT means the task was already marked COMPLETED/FAILED earlier
            if entry.kind == SPOOL_KIND_AI_RESULT and exc.status_code == 409:
                logger.info("AI task %d already completed on server (409); acknowledging spool item", entry.target_id)
                return True
            if not exc.retryable:
                logger.error("Dropping non-retryable spooled %s (%s): %s", entry.kind, entry.target_id, exc)
                raise PermanentSpoolDrop(str(exc)) from exc
            raise

    def flush_spool(
        self,
        *,
        batch_size: int = 50,
        force_ready: bool = False,
        drain_all: bool = True,
    ) -> DrainReport:
        """
        Replay queued telemetry and AI detections in strict FIFO order when backoff allows.
        Loops across batches when drain_all=True so >50 queued rows flush completely upon recovery.
        """
        if self.spool is None:
            return DrainReport(inspected=0, delivered=0, dropped=0, failed=0, remaining=0)

        now = self._clock()
        total_inspected = 0
        total_delivered = 0
        total_dropped = 0
        total_failed = 0

        while True:
            batch = self.spool.drain_batch(
                self._dispatch_spool_entry,
                batch_size=batch_size,
                now=now,
                force_ready=force_ready,
                stop_on_first_failure=True,
            )
            total_inspected += batch.inspected
            total_delivered += batch.delivered
            total_dropped += batch.dropped
            total_failed += batch.failed

            if not drain_all:
                break
            if batch.failed > 0 or batch.remaining == 0 or (batch.delivered + batch.dropped) == 0:
                break

        return DrainReport(
            inspected=total_inspected,
            delivered=total_delivered,
            dropped=total_dropped,
            failed=total_failed,
            remaining=self.spool.count(),
        )

    def push_telemetry(
        self,
        uav_id: int,
        payload: dict[str, Any],
        *,
        spool_on_failure: bool = True,
    ) -> TelemetryPushResult:
        """
        Push a TelemetryReportRequest sample to POST /api/v1/uavs/{id}/telemetry.
        Honors exponential backoff during outages and guarantees strict FIFO across arbitrary queue depths.
        """
        # When older entries exist in the spool, enqueue first so this sample can never jump ahead
        # of rows 51..N, then drain all ready batches whose backoff has elapsed.
        if self.spool is not None and self.spool.count() > 0 and spool_on_failure:
            now = self._clock()
            row_id = self.spool.enqueue(
                SPOOL_KIND_TELEMETRY,
                uav_id,
                payload,
                now=now,
                schedule_backoff=False,
            )
            drain = self.flush_spool(force_ready=False, drain_all=True)
            if not self.spool.exists(row_id):
                return TelemetryPushResult(
                    delivered=True,
                    spooled=False,
                    status_code=201,
                    flushed_from_spool=max(0, drain.delivered - 1),
                )
            return TelemetryPushResult(
                delivered=False,
                spooled=True,
                spool_id=row_id,
                flushed_from_spool=drain.delivered,
                error="queued_behind_pending_spool",
            )

        try:
            status, body = self._send_telemetry_direct(uav_id, payload)
            return TelemetryPushResult(
                delivered=True,
                spooled=False,
                status_code=status,
                flushed_from_spool=0,
                response=body if isinstance(body, dict) else None,
            )
        except CloudApiError as exc:
            if exc.retryable and spool_on_failure and self.spool is not None:
                now = self._clock()
                row_id = self.spool.enqueue(
                    SPOOL_KIND_TELEMETRY,
                    uav_id,
                    payload,
                    error=str(exc),
                    now=now,
                    schedule_backoff=True,
                )
                logger.warning(
                    "Telemetry push failed (%s); spooled row_id=%d with initial backoff (queue_depth=%d)",
                    exc,
                    row_id,
                    self.spool.count(),
                )
                return TelemetryPushResult(
                    delivered=False,
                    spooled=True,
                    status_code=exc.status_code,
                    spool_id=row_id,
                    flushed_from_spool=0,
                    error=str(exc),
                )
            raise

    def fetch_pending_ai_tasks(
        self,
        mission_id: int,
        *,
        processing_node: Optional[str] = "KV260_EDGE",
    ) -> list[dict[str, Any]]:
        """
        Fetch pending SAR AI tasks via GET /api/v1/ai/missions/{missionId}/tasks.
        Filters to PENDING tasks assigned to KV260_EDGE (or unspecified processingNode).
        """
        _, data = self._json_request(
            "GET",
            f"/api/v1/ai/missions/{int(mission_id)}/tasks",
            headers=self._service_headers(json_body=False),
        )
        if not isinstance(data, list):
            return []

        pending: list[dict[str, Any]] = []
        for task in data:
            if not isinstance(task, dict):
                continue
            if task.get("status") != "PENDING":
                continue
            node = task.get("processingNode")
            if processing_node and node not in (None, processing_node):
                continue
            pending.append(task)
        return pending

    def download_media_bytes(self, media_id: int) -> bytes:
        """Obtain a short-lived signed download URL for media_id and fetch the raw asset bytes."""
        _, signed = self._json_request(
            "GET",
            f"/api/v1/media/{int(media_id)}/download-url",
            headers=self._service_headers(json_body=False),
        )
        if not isinstance(signed, dict) or not signed.get("url"):
            raise CloudApiError(f"Invalid signed download URL response for media {media_id}: {signed!r}")

        download_url = str(signed["url"])
        _, raw_bytes = self._raw_request(
            "GET",
            download_url,
            headers={"User-Agent": self.user_agent},
        )
        return raw_bytes

    def upload_detection_frame(
        self,
        filename: str,
        jpeg_bytes: bytes,
        mission_id: Optional[int] = None,
        *,
        content_type: str = "image/jpeg",
        visibility: str = "PRIVATE",
    ) -> dict[str, Any]:
        """
        Execute the 4-step MediaController presigned upload flow:
          1. POST /api/v1/media -> MediaAssetResponse (id)
          2. GET  /api/v1/media/{id}/upload-url -> SignedMediaUrlResponse (url)
          3. PUT  <presigned_url> -> raw JPEG bytes
          4. POST /api/v1/media/{id}/confirm -> confirmed MediaAssetResponse
        """
        if not jpeg_bytes:
            raise ValueError("jpeg_bytes must be non-empty")
        clean_name = filename.strip() or "kv260_detection.jpg"

        register_payload: dict[str, Any] = {
            "originalName": clean_name,
            "contentType": content_type,
            "size": len(jpeg_bytes),
            "type": "IMAGE",
            "linkedEntityType": "MISSION" if mission_id is not None else None,
            "linkedEntityId": str(mission_id) if mission_id is not None else None,
            "visibility": visibility,
        }

        _, asset = self._json_request(
            "POST",
            "/api/v1/media",
            headers=self._service_headers(json_body=True),
            payload=register_payload,
        )
        if not isinstance(asset, dict) or asset.get("id") is None:
            raise CloudApiError(f"Unexpected media register response: {asset!r}")

        media_id = int(asset["id"])
        _, signed = self._json_request(
            "GET",
            f"/api/v1/media/{media_id}/upload-url",
            headers=self._service_headers(json_body=False),
        )
        if not isinstance(signed, dict) or not signed.get("url"):
            raise CloudApiError(f"Unexpected signed upload URL response: {signed!r}")

        presigned_put_url = str(signed["url"])
        put_headers = {
            "If-None-Match": "*",
            "Content-Type": content_type,
            "Content-Length": str(len(jpeg_bytes)),
            "User-Agent": self.user_agent,
        }
        self._raw_request("PUT", presigned_put_url, headers=put_headers, body_bytes=jpeg_bytes)

        _, confirmed = self._json_request(
            "POST",
            f"/api/v1/media/{media_id}/confirm",
            headers=self._service_headers(json_body=False),
            payload=None,
        )
        return confirmed if isinstance(confirmed, dict) else asset

    def submit_ai_task_results(
        self,
        task_id: int,
        result_payload: dict[str, Any],
        *,
        spool_on_failure: bool = True,
    ) -> dict[str, Any]:
        """
        Submit KV260 inference output to POST /api/v1/ai/tasks/{id}/results.
        Falls back to SQLite OfflineSpool on 4G/LTE dropout or 5xx response while honoring backoff.
        """
        if self.spool is not None and self.spool.count() > 0 and spool_on_failure:
            now = self._clock()
            row_id = self.spool.enqueue(
                SPOOL_KIND_AI_RESULT,
                task_id,
                result_payload,
                now=now,
                schedule_backoff=False,
            )
            self.flush_spool(force_ready=False, drain_all=True)
            if not self.spool.exists(row_id):
                return {"id": int(task_id), "spooled": False}
            return {
                "id": int(task_id),
                "spooled": True,
                "spoolId": row_id,
            }

        try:
            _, resp = self._send_ai_result_direct(task_id, result_payload)
            return resp if isinstance(resp, dict) else {"id": int(task_id), "spooled": False}
        except CloudApiError as exc:
            if exc.retryable and spool_on_failure and self.spool is not None:
                now = self._clock()
                row_id = self.spool.enqueue(
                    SPOOL_KIND_AI_RESULT,
                    task_id,
                    result_payload,
                    error=str(exc),
                    now=now,
                    schedule_backoff=True,
                )
                logger.warning(
                    "AI result submission for task %d failed (%s); spooled row_id=%d",
                    task_id,
                    exc,
                    row_id,
                )
                return {
                    "id": int(task_id),
                    "spooled": True,
                    "spoolId": row_id,
                    "error": str(exc),
                }
            raise
