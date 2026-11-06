"""SQLite3 WAL-mode store-and-forward offline queue with ring eviction and backoff."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
import sqlite3
import threading
import time
from typing import Any, Callable, Iterable, Optional


SPOOL_KIND_TELEMETRY = "TELEMETRY"
SPOOL_KIND_AI_RESULT = "AI_TASK_RESULT"


class PermanentSpoolDrop(Exception):
    """Raised by a replay dispatcher when an item is permanently invalid or already applied."""


@dataclass(frozen=True)
class SpoolEntry:
    """One persisted store-and-forward payload awaiting delivery."""

    id: int
    kind: str
    target_id: int
    payload: dict[str, Any]
    attempts: int
    next_retry_at: float
    last_error: Optional[str]
    created_at: float


@dataclass(frozen=True)
class DrainReport:
    """Summary of one FIFO replay batch."""

    inspected: int
    delivered: int
    dropped: int
    failed: int
    remaining: int


class OfflineSpool:
    """Bounded SQLite3 WAL queue for resilient 4G/LTE telemetry and SAR AI delivery."""

    def __init__(
        self,
        db_path: Path | str,
        *,
        max_rows: int = 10000,
        base_backoff_sec: float = 1.0,
        max_backoff_sec: float = 300.0,
        clock: Callable[[], float] = time.time,
    ) -> None:
        if max_rows < 1:
            raise ValueError(f"max_rows must be >= 1, got {max_rows}")
        if base_backoff_sec <= 0:
            raise ValueError(f"base_backoff_sec must be > 0, got {base_backoff_sec}")
        if max_backoff_sec < base_backoff_sec:
            raise ValueError("max_backoff_sec must be >= base_backoff_sec")

        self._db_str = str(db_path)
        if self._db_str != ":memory:":
            Path(self._db_str).parent.mkdir(parents=True, exist_ok=True)

        self.max_rows = max_rows
        self.base_backoff_sec = base_backoff_sec
        self.max_backoff_sec = max_backoff_sec
        self._clock = clock
        self._lock = threading.RLock()
        self._evicted_total = 0

        self._conn = sqlite3.connect(
            self._db_str,
            timeout=10.0,
            isolation_level=None,
            check_same_thread=False,
        )
        self._conn.row_factory = sqlite3.Row
        self._init_schema()

    def _init_schema(self) -> None:
        with self._lock:
            self._conn.execute("PRAGMA journal_mode=WAL;")
            self._conn.execute("PRAGMA synchronous=NORMAL;")
            self._conn.execute("PRAGMA busy_timeout=5000;")
            self._conn.execute(
                """
                CREATE TABLE IF NOT EXISTS spool_queue (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    kind TEXT NOT NULL,
                    target_id INTEGER NOT NULL,
                    payload_json TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    next_retry_at REAL NOT NULL DEFAULT 0.0,
                    last_error TEXT,
                    created_at REAL NOT NULL
                );
                """
            )
            self._conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_spool_ready
                ON spool_queue (next_retry_at, id);
                """
            )

    @property
    def clock(self) -> Callable[[], float]:
        return self._clock

    @property
    def evicted_total(self) -> int:
        with self._lock:
            return self._evicted_total

    def exists(self, row_id: int) -> bool:
        with self._lock:
            row = self._conn.execute(
                "SELECT 1 FROM spool_queue WHERE id = ? LIMIT 1;",
                (int(row_id),),
            ).fetchone()
            return row is not None

    def journal_mode(self) -> str:
        with self._lock:
            row = self._conn.execute("PRAGMA journal_mode;").fetchone()
            return str(row[0]).lower() if row else ""

    def compute_backoff_sec(self, attempts: int) -> float:
        exponent = max(0, attempts - 1)
        delay = self.base_backoff_sec * (2.0**exponent)
        return min(self.max_backoff_sec, delay)

    def enqueue(
        self,
        kind: str,
        target_id: int,
        payload: dict[str, Any],
        *,
        error: Optional[str] = None,
        now: Optional[float] = None,
        schedule_backoff: bool = False,
    ) -> int:
        """Persist a payload to SQLite and enforce the bounded ring-buffer row limit."""
        if not kind or not kind.strip():
            raise ValueError("kind must be non-empty")
        serialized = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
        ts = float(self._clock() if now is None else now)
        init_attempts = 1 if schedule_backoff else 0
        init_next_retry = ts + self.compute_backoff_sec(1) if schedule_backoff else 0.0

        with self._lock:
            self._conn.execute("BEGIN IMMEDIATE;")
            try:
                cur = self._conn.execute(
                    """
                    INSERT INTO spool_queue (
                        kind, target_id, payload_json, attempts, next_retry_at, last_error, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        kind.strip(),
                        int(target_id),
                        serialized,
                        init_attempts,
                        init_next_retry,
                        error,
                        ts,
                    ),
                )
                inserted_id = int(cur.lastrowid)

                total_row = self._conn.execute("SELECT COUNT(*) FROM spool_queue;").fetchone()
                total = int(total_row[0]) if total_row else 0
                overflow = total - self.max_rows
                if overflow > 0:
                    del_cur = self._conn.execute(
                        """
                        DELETE FROM spool_queue
                        WHERE id IN (
                            SELECT id FROM spool_queue ORDER BY id ASC LIMIT ?
                        );
                        """,
                        (overflow,),
                    )
                    self._evicted_total += max(0, del_cur.rowcount)

                self._conn.execute("COMMIT;")
                return inserted_id
            except Exception:
                self._conn.execute("ROLLBACK;")
                raise

    def count(self) -> int:
        with self._lock:
            row = self._conn.execute("SELECT COUNT(*) FROM spool_queue;").fetchone()
            return int(row[0]) if row else 0

    def ready_count(self, *, now: Optional[float] = None, force_ready: bool = False) -> int:
        if force_ready:
            return self.count()
        ts = self._clock() if now is None else now
        with self._lock:
            head = self._conn.execute(
                "SELECT next_retry_at FROM spool_queue ORDER BY id ASC LIMIT 1;"
            ).fetchone()
            if head is None or float(head["next_retry_at"]) > float(ts):
                return 0
            row = self._conn.execute(
                "SELECT COUNT(*) FROM spool_queue WHERE next_retry_at <= ?;",
                (float(ts),),
            ).fetchone()
            return int(row[0]) if row else 0

    def peek_ready(
        self,
        batch_size: int = 50,
        *,
        now: Optional[float] = None,
        force_ready: bool = False,
    ) -> list[SpoolEntry]:
        """Return up to batch_size entries in strict head-of-line FIFO order."""
        if batch_size < 1:
            return []
        ts = self._clock() if now is None else now

        with self._lock:
            rows = self._conn.execute(
                """
                SELECT id, kind, target_id, payload_json, attempts, next_retry_at, last_error, created_at
                FROM spool_queue
                ORDER BY id ASC
                LIMIT ?;
                """,
                (int(batch_size),),
            ).fetchall()

        entries: list[SpoolEntry] = []
        for r in rows:
            next_retry = float(r["next_retry_at"])
            if not force_ready and next_retry > float(ts):
                break
            entries.append(
                SpoolEntry(
                    id=int(r["id"]),
                    kind=str(r["kind"]),
                    target_id=int(r["target_id"]),
                    payload=json.loads(r["payload_json"]),
                    attempts=int(r["attempts"]),
                    next_retry_at=next_retry,
                    last_error=r["last_error"],
                    created_at=float(r["created_at"]),
                )
            )
        return entries

    def ack(self, row_id: int) -> bool:
        """Delete a successfully replayed entry from the queue."""
        with self._lock:
            cur = self._conn.execute("DELETE FROM spool_queue WHERE id = ?;", (int(row_id),))
            return cur.rowcount > 0

    def ack_many(self, row_ids: Iterable[int]) -> int:
        ids = [int(i) for i in row_ids]
        if not ids:
            return 0
        placeholders = ",".join("?" for _ in ids)
        with self._lock:
            cur = self._conn.execute(
                f"DELETE FROM spool_queue WHERE id IN ({placeholders});",
                ids,
            )
            return max(0, cur.rowcount)

    def mark_failed(
        self,
        row_id: int,
        error: str,
        *,
        now: Optional[float] = None,
    ) -> Optional[float]:
        """Increment retry attempt count and schedule exponential backoff."""
        ts = self._clock() if now is None else now
        truncated_err = (error or "replay_failed")[:500]

        with self._lock:
            row = self._conn.execute(
                "SELECT attempts FROM spool_queue WHERE id = ?;",
                (int(row_id),),
            ).fetchone()
            if row is None:
                return None

            new_attempts = int(row["attempts"]) + 1
            next_retry = float(ts) + self.compute_backoff_sec(new_attempts)
            self._conn.execute(
                """
                UPDATE spool_queue
                SET attempts = ?, next_retry_at = ?, last_error = ?
                WHERE id = ?;
                """,
                (new_attempts, next_retry, truncated_err, int(row_id)),
            )
            return next_retry

    def drain_batch(
        self,
        dispatcher: Callable[[SpoolEntry], bool],
        *,
        batch_size: int = 50,
        now: Optional[float] = None,
        force_ready: bool = False,
        stop_on_first_failure: bool = True,
    ) -> DrainReport:
        """Replay ready entries in FIFO order using dispatcher callback."""
        entries = self.peek_ready(batch_size=batch_size, now=now, force_ready=force_ready)
        delivered = 0
        dropped = 0
        failed = 0

        for entry in entries:
            try:
                ok = dispatcher(entry)
            except PermanentSpoolDrop:
                self.ack(entry.id)
                dropped += 1
                continue
            except Exception as exc:
                self.mark_failed(entry.id, str(exc), now=now)
                failed += 1
                if stop_on_first_failure:
                    break
                continue

            if ok:
                self.ack(entry.id)
                delivered += 1
            else:
                self.mark_failed(entry.id, "dispatcher_returned_false", now=now)
                failed += 1
                if stop_on_first_failure:
                    break

        return DrainReport(
            inspected=len(entries),
            delivered=delivered,
            dropped=dropped,
            failed=failed,
            remaining=self.count(),
        )

    def close(self) -> None:
        with self._lock:
            self._conn.close()

    def __enter__(self) -> "OfflineSpool":
        return self

    def __exit__(self, exc_type: Any, exc: Any, tb: Any) -> None:
        self.close()
