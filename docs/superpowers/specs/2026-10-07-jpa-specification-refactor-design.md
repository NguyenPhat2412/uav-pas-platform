# Design Spec: Tái Cấu Trúc Data Access & Query Bằng Spring Data JPA Specification

- **Date:** 2026-10-07
- **Branch:** `feat/clean-architecture-auth`
- **Scope:** Toàn bộ tầng Data Access và Query của UAV PAS Platform Backend (`com.uav_pass.local.*`)
- **Status:** Approved

---

## 1. Bối Cảnh & Vấn Đề Kiến Trúc Cần Giải Quyết

### 1.1 Hiện Trạng (Architectural Debt)
1. **Coupling tại Repository**: Các Interface Repository đang gánh vác nhiều trách nhiệm ngoài vai trò In-Memory Collection:
   - Hardcoded `@Query` cho việc kiểm tra trùng lặp thời gian, trạng thái, người vận hành (`existsOverlappingUav`, `existsOverlappingOperator` trong `MissionRepository`).
   - Lọc và phân trang bị phân nhánh rải rác trong tầng Service bằng nhiều if/else gọi các phương thức repository riêng biệt (`findByCustomerId`, `findByOperatorId`, `findAll`).
   - Truy vấn đếm và lọc trong `DashboardServiceImpl` sử dụng Java Stream `findAll().stream().filter(...)` nạp toàn bộ bản ghi UAV vào RAM thay vì tính toán trực tiếp trên database.
2. **Thiếu tính tái sử dụng (Composability)**:
   - Các logic tìm kiếm keyword, kiểm tra trạng thái, thời gian bị viết cứng hoặc lặp lại ở nhiều nơi.
   - Chưa có một Specification Factory thống nhất theo chuẩn Domain-Driven Design (DDD) cho các thực thể: `Uav`, `Station`, `Equipment`, `InventoryMovement`, `MediaAsset`, `AuditLog`, `Mission`, `AppUser`.

### 1.2 Mục Tiêu Thiết Kế
1. **Tách rời 100% logic Query/Search/Filter** sang tầng `Specification` độc lập.
2. **Repository về đúng vai trò thuần túy**: Chỉ kế thừa `JpaRepository<Entity, ID>` và `JpaSpecificationExecutor<Entity>`, không chứa chuỗi JPQL/SQL hardcode hay các method đếm thủ công.
3. **Nâng cao khả năng kết hợp (Composability)**: Cho phép kết hợp động các điều kiện lọc thông qua `Specification.where().and()`.
4. **Cải thiện tính dễ kiểm thử (Testability)**: Mỗi Specification được kiểm thử độc lập ở tầng Unit Test với `CriteriaBuilder` mock mà không cần database hay Spring context.
5. **ZERO BREAKING CHANGES**: Giữ nguyên 100% API Contracts (Endpoint URLs, HTTP Status Codes, Response JSON formats) và đảm bảo 100% test suite hiện tại vượt qua.

---

## 2. Cấu Trúc Gói & Quy Ước Đặt Tên (Modular Layout)

Áp dụng quy ước thiết kế cho tất cả các domain feature trong `com.uav_pass.local.*`:

```text
backend/src/main/java/com/uav_pass/local/
├── common/
│   ├── dto/ (PageResponse, ErrorResponse,...)
│   └── entity/ (BaseEntity, Identifiable,...)
├── <feature>/ (auth, mission, uav, station, inventory, media, audit, dashboard)
│   ├── controller/ (<Feature>Controller.java)
│   ├── dto/ (<Feature>Request, <Feature>Response, <Feature>Filter,...)
│   ├── entity/ (<Feature>.java, <Feature>Status.java,...)
│   ├── repository/
│   │   └── <Feature>Repository.java (kế thừa JpaRepository & JpaSpecificationExecutor)
│   ├── specification/
│   │   └── <Feature>Specifications.java (final class, private ctor, static factory methods)
│   └── service/
│       ├── <Feature>Service.java (Interface use-case)
│       └── impl/
│           └── <Feature>ServiceImpl.java (Triển khai use-case, compose Specification)
```

### Quy Ước Đặt Tên
- **Specification Class:** `<Feature>Specifications` (số nhiều có đuôi 's', ví dụ: `UserSpecifications`, `MissionSpecifications`, `UavSpecifications`).
- **Factory Methods:** 
  - `hasKeyword(String keyword)`: Tìm kiếm không phân biệt hoa thường (lower-case), trim khoảng trắng.
  - `hasStatus(<Enum> status)`: Lọc theo Enum trạng thái.
  - `hasStatusIn(Collection<<Enum>> statuses)`: Lọc theo tập trạng thái.
  - `belongsTo<Parent>(Long parentId)`: Lọc theo liên kết cha.
  - `createdBetween(LocalDateTime from, LocalDateTime to)`: Lọc khoảng thời gian.
  - `idIn(Collection<Long> ids)`: Lọc theo danh sách ID (trả về `cb.disjunction()` khi tập rỗng).
- **Quy tắc Null-Safe:** Nếu tham số truyền vào là `null` hoặc chuỗi rỗng (`isBlank()`), method **PHẢI trả về `null`** để Spring Data JPA tự động bỏ qua khi gọi `.and()`.

---

## 3. Thiết Kế Chi Tiết Từng Module

### 3.1 Module `auth` (User Aggregate)
- **Specification:** `com.uav_pass.local.auth.specification.UserSpecifications`
  - `hasKeyword(String keyword)`: Tìm kiếm LIKE case-insensitive trên `username`, `email`, `fullName`.
  - `hasRole(UserRole role)`: So khớp `role`.
  - `hasStatus(UserStatus status)`: So khớp `status`.
  - `idIn(Collection<Long> ids)`: Hỗ trợ data scoping.
  - `filter(String keyword, UserRole role)`: Hàm tiện ích composite tương thích ngược.
- **Repository:** `UserRepository` extends `JpaRepository<AppUser, Long>, JpaSpecificationExecutor<AppUser>`.
- **Service:** `UserServiceImpl` sử dụng `UserSpecifications.hasKeyword(keyword).and(UserSpecifications.hasRole(role))`.

### 3.2 Module `mission` (Mission Aggregate)
- **Specification:** `com.uav_pass.local.mission.specification.MissionSpecifications`
  - `hasKeyword(String keyword)`: Tìm kiếm LIKE case-insensitive trên `code`, `title`, `customer.fullName`, `customer.username`.
  - `hasStatus(MissionStatus status)`
  - `hasStatusIn(Collection<MissionStatus> statuses)`
  - `hasMissionType(MissionType missionType)`
  - `belongsToStation(Long stationId)`
  - `hasOperator(Long operatorId)`
  - `hasCustomer(Long customerId)`
  - `requestedOn(LocalDate date)`
  - `overlappingUav(Long uavId, Collection<MissionStatus> excluded, LocalDateTime start, LocalDateTime end)`
  - `overlappingOperator(Long operatorId, Collection<MissionStatus> excluded, LocalDateTime start, LocalDateTime end)`
- **Repository:** `MissionRepository` extends `JpaRepository<Mission, Long>, JpaSpecificationExecutor<Mission>`.
  - Xóa bỏ hoặc thay thế `@Query` hardcoded: `existsOverlappingUav`, `existsOverlappingOperator`.
- **Service:** `MissionServiceImpl`
  - Đơn giản hóa hàm `list(...)` bằng `Specification.where(...)` linh hoạt, không cần if/else gọi `findByCustomerId`/`findByOperatorId`.
  - Hàm `validateOverlap` gọi `missions.exists(MissionSpecifications.overlappingUav(...))` và `missions.exists(MissionSpecifications.overlappingOperator(...))`.

### 3.3 Module `uav` (UAV Aggregate & Status History)
- **Specification:** `com.uav_pass.local.uav.specification.UavSpecifications`
  - `hasKeyword(String keyword)`: LIKE case-insensitive trên `model`, `serialNumber`, `manufacturer`.
  - `hasStatus(UavStatus status)`
  - `belongsToStation(Long stationId)`
- **Specification:** `com.uav_pass.local.uav.specification.UavStatusHistorySpecifications`
  - `belongsToUav(Long uavId)`
  - `hasStatus(UavStatus status)`
- **Repositories:**
  - `UavRepository` extends `JpaRepository<Uav, Long>, JpaSpecificationExecutor<Uav>`.
  - `UavStatusHistoryRepository` extends `JpaRepository<UavStatusHistory, Long>, JpaSpecificationExecutor<UavStatusHistory>`.
- **Service & Dashboard:**
  - `UavServiceImpl` sử dụng `UavSpecifications`.
  - `DashboardServiceImpl` thay thế `uavs.findAll().stream().filter(...)` bằng:
    `uavs.count(UavSpecifications.hasStatus(UavStatus.AVAILABLE))` và `uavs.count(UavSpecifications.hasStatus(UavStatus.MAINTENANCE))`.

### 3.4 Module `station` (Station Aggregate)
- **Specification:** `com.uav_pass.local.station.specification.StationSpecifications`
  - `hasKeyword(String keyword)`: LIKE case-insensitive trên `code`, `name`, `address`.
  - `hasStatus(StationStatus status)`
- **Repository:** `StationRepository` extends `JpaRepository<Station, Long>, JpaSpecificationExecutor<Station>`.
- **Service:** `StationServiceImpl` gọi `findAll(spec, pageable)`.

### 3.5 Module `inventory` (Equipment & Movement)
- **Specification:** `com.uav_pass.local.inventory.specification.EquipmentSpecifications`
  - `hasKeyword(String keyword)`: LIKE case-insensitive trên `name`, `serialNumber`, `model`.
  - `hasType(EquipmentType type)`
  - `hasStatus(EquipmentStatus status)`
- **Specification:** `com.uav_pass.local.inventory.specification.InventoryMovementSpecifications`
  - `belongsToEquipment(Long equipmentId)`
  - `hasMovementType(InventoryMovementType type)`
  - `hasAction(InventoryAction action)`
- **Repositories:**
  - `EquipmentRepository` extends `JpaRepository<Equipment, Long>, JpaSpecificationExecutor<Equipment>`.
  - `InventoryMovementRepository` extends `JpaRepository<InventoryMovement, Long>, JpaSpecificationExecutor<InventoryMovement>`.
- **Service:** `InventoryServiceImpl` tích hợp Specifications cho truy vấn danh sách và lịch sử kho.

### 3.6 Module `media` (Media Asset)
- **Specification:** `com.uav_pass.local.media.specification.MediaAssetSpecifications`
  - `hasKeyword(String keyword)`: LIKE case-insensitive trên `fileName`, `originalFileName`.
  - `hasUploader(String uploadedBy)`
  - `hasMimeType(String mimeType)`
  - `hasStatus(MediaStatus status)`
- **Repository:** `MediaAssetRepository` extends `JpaRepository<MediaAsset, Long>, JpaSpecificationExecutor<MediaAsset>`.
- **Service:** `MediaServiceImpl` gọi `findAll(spec, pageable)`.

### 3.7 Module `audit` (Audit Log)
- **Specification:** `com.uav_pass.local.audit.specification.AuditLogSpecifications`
  - `hasActor(String actor)`
  - `hasAction(AuditAction action)`
  - `hasTargetType(String targetType)`
  - `hasTargetId(String targetId)`
  - `createdBetween(LocalDateTime from, LocalDateTime to)`
- **Repository:** `AuditLogRepository` extends `JpaRepository<AuditLog, Long>, JpaSpecificationExecutor<AuditLog>`.
- **Service:** `AuditLogServiceImpl` gọi `findAll(spec, pageable)`.

---

## 4. Chiến Lược Kiểm Thử (Testing Strategy)
1. **Unit Test Cho Từng Specification Factory (`*SpecificationsTest.java`)**:
   - Sử dụng Mockito mock `Root`, `CriteriaQuery`, `CriteriaBuilder`.
   - Kiểm tra nhánh `null`/`blank` trả về `null`.
   - Kiểm tra nhánh có giá trị sinh đúng Predicate (`cb.equal`, `cb.like`, `cb.and`, `cb.or`).
2. **Cập Nhật Service Unit Tests**:
   - Khớp nối mock repository gọi `findAll(any(Specification.class), any(Pageable.class))` hoặc `exists(any(Specification.class))`.
3. **Regression Tests**:
   - Chạy toàn bộ 153+ tests hiện có để chứng minh zero breaking changes.

---

## 5. Tiêu Chuẩn Nghiệm Thu (Definition of Done)
1. 100% dynamic search/filter query chuyển sang Spring Data JPA Specification.
2. 100% Repository interfaces tuân thủ nguyên lý DDD.
3. Không còn in-memory streaming filter trong Dashboard hay Service.
4. Toàn bộ test suite pass 100% (0 failures, 0 errors).
5. Các commit git nguyên tử (atomic commits) theo từng module.
