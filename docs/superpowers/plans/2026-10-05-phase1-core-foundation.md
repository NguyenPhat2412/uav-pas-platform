# UAV PAS Phase 1 Core Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the Phase 1 foundation described in the supplied UAV PAS specification: identity and permissions, station and UAV fleet management, inventory, media, dashboard, and audit history.

**Architecture:** Keep the existing Spring Boot layered structure under `com.uav_pass.local`. Each Phase 1 module owns an entity, repository, service, DTOs, controller, and focused tests. Cross-cutting audit events and storage are exposed through small interfaces so domain services remain testable.

**Tech Stack:** Java 21, Spring Boot 4.1.1, Spring Data JPA, Spring Security/JWT, PostgreSQL, H2 test database, Next.js 16, React 19, AWS SDK S3-compatible storage.

**Spec:** `docs/superpowers/specs/2026-10-05-phase1-core-foundation.md`

## Scope boundaries

- In scope: User & Access, Station, UAV Fleet, Inventory & Equipment, Media, Basic Dashboard, Audit Log.
- Out of scope: Mission booking, Search & Rescue, AI processing, Payment, e-learning, quizzes, certificates, training qualification and authorization.
- All module routes use `/api/v1` and require JWT unless explicitly public.
- Production PostgreSQL configuration remains separate from the H2 test profile.

## Tasks

- [x] Add permission model and method-level authorization.
- [x] Add station CRUD and audit events.
- [x] Add UAV CRUD, station assignment, maintenance and status history.
- [x] Add inventory equipment, stock movements, reserve/release and transfer history.
- [x] Add S3-compatible media metadata and signed upload/download URLs.
- [x] Add permission-aware dashboard aggregation.
- [x] Add audit log persistence and read API.
- [x] Add frontend dashboard/admin screens for the Phase 1 flow.
- [x] Run backend, frontend, and end-to-end verification; update this plan.

## Current verification and remaining work

- Backend unit, MockMvc, context, access-control integration, storage-signature and role-template tests pass (`118` tests).
- Frontend production build and lint pass with `/operations` management screens.
- Docker Compose builds and runs PostgreSQL, MinIO, backend and frontend; PostgreSQL compatibility migration adds `manual_locked` to existing development databases.
- Runtime flow verified against PostgreSQL/MinIO: register/login, permission grant/revoke, lock/unlock, role changes, create station/UAV/equipment, station assignment, stock in/reserve/release, maintenance, signed upload/download, dashboard aggregation and audit log.
- Residual release checks: browser-level visual/keyboard/mobile QA requires a browser surface (none is available in this session); production S3 policy/CORS values must be supplied through deployment environment variables; high-volume concurrent stock load testing remains a release-hardening activity.
