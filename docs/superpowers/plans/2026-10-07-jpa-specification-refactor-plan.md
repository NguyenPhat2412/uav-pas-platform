# Implementation Plan: Tái Cấu Trúc Data Access & Query Bằng Spring Data JPA Specification

- **Date:** 2026-10-07
- **Spec Reference:** `docs/superpowers/specs/2026-10-07-jpa-specification-refactor-design.md`
- **Working Directory:** `/Users/macbook/HK7/uav-pas-platform/backend`
- **Branch:** `feat/clean-architecture-auth`

---

## Task 1: Module `auth` - Chuẩn Hóa `UserSpecifications` & Package Layout
- **Files:**
  - Create: `backend/src/main/java/com/uav_pass/local/auth/specification/UserSpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/auth/service/impl/UserServiceImpl.java`
  - Update: `backend/src/main/java/com/uav_pass/local/auth/repository/specification/UserSpecification.java` (giữ adapter tương thích ngược nếu cần)
  - Create/Update: `backend/src/test/java/com/uav_pass/local/auth/specification/UserSpecificationsTest.java`
  - Update: `backend/src/test/java/com/uav_pass/local/auth/service/UserServiceTest.java`
- **Action:**
  1. Xây dựng `UserSpecifications` với các atomic static factory methods: `hasKeyword`, `hasRole`, `hasStatus`, `idIn`, `filter`.
  2. Null-safe: Trả về `null` khi tham số null/blank.
  3. Cập nhật `UserServiceImpl` gọi `UserSpecifications`.
  4. Viết unit test `UserSpecificationsTest` kiểm thử đầy đủ các nhánh.
  5. Chạy test: `./mvnw test -Dtest="UserSpecification*Test,UserServiceTest"`
  6. Git commit: `refactor(auth): migrate user query logic to atomic UserSpecifications`

---

## Task 2: Module `mission` - Tái Cấu Trúc `MissionSpecifications` & `MissionRepository`
- **Files:**
  - Create: `backend/src/main/java/com/uav_pass/local/mission/specification/MissionSpecifications.java`
  - Remove/Migrate: `backend/src/main/java/com/uav_pass/local/mission/repository/MissionSpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/mission/repository/MissionRepository.java`
  - Update: `backend/src/main/java/com/uav_pass/local/mission/service/impl/MissionServiceImpl.java`
  - Create: `backend/src/test/java/com/uav_pass/local/mission/specification/MissionSpecificationsTest.java`
  - Update: `backend/src/test/java/com/uav_pass/local/mission/service/Mission*Test.java`
- **Action:**
  1. Xây dựng `MissionSpecifications` trong package `specification/`:
     - `hasKeyword(String keyword)`
     - `hasStatus(MissionStatus status)`
     - `hasStatusIn(Collection<MissionStatus> statuses)`
     - `hasMissionType(MissionType missionType)`
     - `belongsToStation(Long stationId)`
     - `hasOperator(Long operatorId)`
     - `hasCustomer(Long customerId)`
     - `requestedOn(LocalDate date)`
     - `overlappingUav(Long uavId, Collection<MissionStatus> excluded, LocalDateTime start, LocalDateTime end)`
     - `overlappingOperator(Long operatorId, Collection<MissionStatus> excluded, LocalDateTime start, LocalDateTime end)`
  2. Cập nhật `MissionRepository`: Kế thừa `JpaSpecificationExecutor<Mission>`, thay thế hardcoded `@Query` kiểm tra trùng lịch UAV và Operator bằng hàm Specification `exists(...)`.
  3. Cập nhật `MissionServiceImpl`: Tinh gọn hàm `list(...)` bằng `Specification.where().and()`, loại bỏ if/else phân mảnh query. Thay thế `existsOverlappingUav`/`existsOverlappingOperator` bằng `missions.exists(...)`.
  4. Viết unit test `MissionSpecificationsTest` và cập nhật test liên quan.
  5. Chạy test: `./mvnw test -Dtest="Mission*Test"`
  6. Git commit: `refactor(mission): decouple mission queries and overlap checks to MissionSpecifications`

---

## Task 3: Module `uav` & `dashboard` - Specifications Cho UAV & Xóa Bỏ In-Memory Stream Filter
- **Files:**
  - Update: `backend/src/main/java/com/uav_pass/local/uav/repository/UavRepository.java`
  - Update: `backend/src/main/java/com/uav_pass/local/uav/repository/UavStatusHistoryRepository.java`
  - Create: `backend/src/main/java/com/uav_pass/local/uav/specification/UavSpecifications.java`
  - Create: `backend/src/main/java/com/uav_pass/local/uav/specification/UavStatusHistorySpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/uav/service/impl/UavServiceImpl.java`
  - Update: `backend/src/main/java/com/uav_pass/local/dashboard/service/impl/DashboardServiceImpl.java`
  - Create: `backend/src/test/java/com/uav_pass/local/uav/specification/UavSpecificationsTest.java`
- **Action:**
  1. Thêm `JpaSpecificationExecutor<Uav>` vào `UavRepository` và `JpaSpecificationExecutor<UavStatusHistory>` vào `UavStatusHistoryRepository`.
  2. Tạo `UavSpecifications` (`hasKeyword`, `hasStatus`, `belongsToStation`, `hasModel`).
  3. Tạo `UavStatusHistorySpecifications` (`belongsToUav`, `hasStatus`).
  4. Cập nhật `DashboardServiceImpl`: Thay thế anti-pattern `uavs.findAll().stream().filter(...)` bằng query đếm chuẩn database: `uavs.count(UavSpecifications.hasStatus(...))`.
  5. Viết unit test `UavSpecificationsTest`.
  6. Chạy test: `./mvnw test -Dtest="Uav*Test,Dashboard*Test"`
  7. Git commit: `refactor(uav): introduce UavSpecifications and optimize dashboard status counts`

---

## Task 4: Module `station` - Specifications Cho Trạm Mặt Đất
- **Files:**
  - Update: `backend/src/main/java/com/uav_pass/local/station/repository/StationRepository.java`
  - Create: `backend/src/main/java/com/uav_pass/local/station/specification/StationSpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/station/service/impl/StationServiceImpl.java`
  - Create: `backend/src/test/java/com/uav_pass/local/station/specification/StationSpecificationsTest.java`
- **Action:**
  1. Thêm `JpaSpecificationExecutor<Station>` vào `StationRepository`.
  2. Tạo `StationSpecifications` (`hasKeyword`, `hasStatus`, `idIn`).
  3. Cập nhật `StationServiceImpl` hỗ trợ query Specification.
  4. Viết unit test `StationSpecificationsTest`.
  5. Chạy test: `./mvnw test -Dtest="Station*Test"`
  6. Git commit: `refactor(station): introduce StationSpecifications for station dynamic queries`

---

## Task 5: Module `inventory` - Specifications Cho Thiết Bị & Biến Động Kho
- **Files:**
  - Update: `backend/src/main/java/com/uav_pass/local/inventory/repository/EquipmentRepository.java`
  - Update: `backend/src/main/java/com/uav_pass/local/inventory/repository/InventoryMovementRepository.java`
  - Create: `backend/src/main/java/com/uav_pass/local/inventory/specification/EquipmentSpecifications.java`
  - Create: `backend/src/main/java/com/uav_pass/local/inventory/specification/InventoryMovementSpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/inventory/service/impl/InventoryServiceImpl.java`
  - Create: `backend/src/test/java/com/uav_pass/local/inventory/specification/EquipmentSpecificationsTest.java`
- **Action:**
  1. Thêm `JpaSpecificationExecutor` vào `EquipmentRepository` và `InventoryMovementRepository`.
  2. Tạo `EquipmentSpecifications` (`hasKeyword`, `hasType`, `hasStatus`) và `InventoryMovementSpecifications` (`belongsToEquipment`, `hasMovementType`, `hasAction`).
  3. Cập nhật `InventoryServiceImpl` sử dụng Specifications.
  4. Viết unit test `EquipmentSpecificationsTest`.
  5. Chạy test: `./mvnw test -Dtest="Inventory*Test"`
  6. Git commit: `refactor(inventory): add EquipmentSpecifications and InventoryMovementSpecifications`

---

## Task 6: Modules `media` & `audit` - Specifications Cho Media Assets & Audit Logs
- **Files:**
  - Update: `backend/src/main/java/com/uav_pass/local/media/repository/MediaAssetRepository.java`
  - Create: `backend/src/main/java/com/uav_pass/local/media/specification/MediaAssetSpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/media/service/impl/MediaServiceImpl.java`
  - Update: `backend/src/main/java/com/uav_pass/local/audit/repository/AuditLogRepository.java`
  - Create: `backend/src/main/java/com/uav_pass/local/audit/specification/AuditLogSpecifications.java`
  - Update: `backend/src/main/java/com/uav_pass/local/audit/service/impl/AuditLogServiceImpl.java`
  - Create: `backend/src/test/java/com/uav_pass/local/media/specification/MediaAssetSpecificationsTest.java`
  - Create: `backend/src/test/java/com/uav_pass/local/audit/specification/AuditLogSpecificationsTest.java`
- **Action:**
  1. Kế thừa `JpaSpecificationExecutor` cho `MediaAssetRepository` và `AuditLogRepository`.
  2. Tạo `MediaAssetSpecifications` và `AuditLogSpecifications`.
  3. Cập nhật `MediaServiceImpl` và `AuditLogServiceImpl`.
  4. Viết unit tests cho cả hai Specification classes.
  5. Chạy test: `./mvnw test -Dtest="Media*Test,Audit*Test"`
  6. Git commit: `refactor(media,audit): introduce MediaAssetSpecifications and AuditLogSpecifications`

---

## Task 7: Tổng Kiểm Thử Toàn Diện (Full Regression Testing)
- **Action:**
  1. Chạy toàn bộ test suite: `./mvnw clean test`
  2. Đảm bảo 100% test cases pass, 0 failure, 0 error.
  3. Kiểm tra code formatting, không còn warning linter.
  4. Hoàn tất mục tiêu và báo cáo nghiệm thu chi tiết.
