# M4 Booking Flow Report

1. Customer chooses an active service returned by backend.
2. Customer enters mission type, title, requested date, start/end time, location, description, priority and notes.
3. Client rejects missing required fields and an end time not after start time.
4. Client calls backend availability for the selected interval. This is an advisory check; it is not a reservation.
5. Customer reviews the exact values.
6. One non-retried `POST /api/v1/missions` creates a server-confirmed draft.
7. Detail page offers `submit` only for `DRAFT`; cancellation only for `PENDING_CONFIRMATION`.

The form preserves state when the API rejects the mutation. Backend validation/conflict messages remain visible. Resource assignment, confirmation and scheduling remain Operations responsibilities.
