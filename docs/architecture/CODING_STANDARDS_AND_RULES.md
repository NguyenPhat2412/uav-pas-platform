# Quy tắc Kiến trúc, Coding Standards, Bảo mật & Kiểm thử — UAV PAS Platform

> Tài liệu này là **quy chuẩn bắt buộc (Rulebook)** cho toàn bộ hệ thống `uav-pas-platform` (Backend, Database, Frontend, CI/CD). Mọi tính năng mới hoặc chỉnh sửa đều phải tuân thủ nghiêm ngặt các quy tắc dưới đây và được bảo vệ tự động bởi `ArchitecturePackageTest`, `EntityDtoBoundaryTest`, `Spotless`, và `JaCoCo`.

---

## 1. Quy tắc Tầng Persistence — Hibernate Generic DAO Thuần (Cấm Spring Data JPA)

1. **Loại bỏ hoàn toàn Spring Data JPA**:
   - **CẤM** khai báo `spring-boot-starter-data-jpa` trong `backend/pom.xml`.
   - Chỉ sử dụng `spring-boot-starter-jdbc` + `spring-boot-hibernate` (Hibernate ORM 7 + `spring-orm`).
   - **CẤM** import `JpaRepository`, `org.springframework.data.jpa.*`, hoặc `com.uav.platform.repository.*` trong toàn bộ `backend/src/main/java`.
2. **Cấu trúc phân thư mục chuẩn hóa**:
   ```text
   backend/src/main/java/com/uav/platform/
   ├── config/HibernateConfig.java               # Bean sharedEntityManager & mở Hibernate SessionFactory
   ├── dao/
   │   ├── base/
   │   │   ├── IGenericDao.java                  # Interface DAO gốc IGenericDao<PK, T>
   │   │   ├── HibernateGenericDao.java          # Lớp cha Hibernate Session DAO<PK, T>
   │   │   ├── HibernateSpecification.java       # Criteria API Specification thuần Hibernate
   │   │   └── HibernateSearchQueryParser.java   # Parser FIQL/RSQL Search, Sort & Pagination nhúng trong DAO
   │   ├── <feature>/I<Entity>Dao.java           # 76 interface DAO theo chuẩn I*Dao
   │   └── impl/<feature>/<Entity>DaoImpl.java   # 76 lớp cài đặt @Repository
   ├── specification/<feature>/*Specifications.java
   ├── service/<feature>/*Service.java
   ├── service/impl/<feature>/*ServiceImpl.java
   ├── controller/<feature>/*Controller.java
   ├── entity/<feature>/*.java
   ├── dto/{request,response,record}/<feature>/*.java
   └── mapper/<feature>/*Mapper.java
   ```
3. **Quy chuẩn viết lớp DAO bắt buộc**:
   - Mọi interface DAO đặt tên `I<Entity>Dao` trong `com.uav.platform.dao.<feature>` và kế thừa `IGenericDao<PK, Entity>`.
   - Mọi implementation đặt tên `<Entity>DaoImpl` trong `com.uav.platform.dao.impl.<feature>`, gắn `@Repository`, kế thừa `HibernateGenericDao<PK, Entity>`, khai báo SLF4J `Logger`, và inject `EntityManager` qua constructor:
     ```java
     @Repository
     public class MissionDaoImpl extends HibernateGenericDao<Long, Mission> implements IMissionDao {
         private static final Logger logger = LoggerFactory.getLogger(MissionDaoImpl.class);

         public MissionDaoImpl(final EntityManager entityManager) {
             super(Mission.class, entityManager);
         }
     }
     ```
   - Mọi truy vấn chạy qua `currentSession()` (`entityManager.unwrap(Session.class)`), dùng `hql(...)`, `hqlMutation(...)`, `nativeSql(...)`, `nativeMutation(...)`, `withEntityGraph(...)`, `setLockMode(LockModeType.PESSIMISTIC_WRITE)`.
   - **Cấm cú pháp Spring Data `@Query` không hợp lệ với HQL thuần** (ví dụ: dùng `LIKE concat('%', :param, '%')`, không dùng `LIKE %:param%`; dùng `Object.class` rồi ép `((Number) v).longValue()` khi `nativeSql` trả số).
4. **Nhúng Search Language, Sorting & Pagination trực tiếp trong `HibernateGenericDao`**:
   - Mọi DAO kế thừa sẵn:
     - `search(String query, Integer lowerLimit, Integer upperLimit, String orderBy, String orderType)`
     - `getCount(String query)`
   - Hỗ trợ cú pháp FIQL/RSQL: `;` (AND), `,` (OR), `==`, `!=`, `>=`, `<=`, `>`, `<`, `:` (contains không phân biệt hoa/thường), `~` (wildcard `*`), truy cập quan hệ lồng nhau (`customer.username==...`), kiểm tra null (`field==null`, `field!=null`), sắp xếp `ASC`/`DESC` và phân trang `lowerLimit`/`upperLimit`.

---

## 2. Quy tắc Entity Lifecycle (`@PrePersist` & `@PreUpdate`)

1. Các entity chuẩn kế thừa `BaseEntity` (`com.uav.platform.common.entity.BaseEntity`) đã có sẵn `@PrePersist onCreate()` và `@PreUpdate onUpdate()`.
2. Mọi entity độc lập (không kế thừa `BaseEntity`) có cột thời gian (`createdAt`, `updatedAt`) **bắt buộc** khai báo `@PrePersist void onCreate()` (chỉ gán mặc định nếu null) và `@PreUpdate void onPersist()` (cập nhật `updatedAt`).
3. **Không đưa logic nghiệp vụ vào Entity**: Entity chỉ chứa dữ liệu, getter/setter và lifecycle callback (`@PrePersist`/`@PreUpdate`). Quy tắc này được kiểm tra tự động bởi `EntityDtoBoundaryTest`.

---

## 3. Quy tắc Bảo mật & Mã hóa AES-256-GCM (User Data & Documents)

1. **Thuật toán chuẩn**: `AES/GCM/NoPadding` khóa 256-bit (dẫn xuất SHA-256 từ `app.crypto.aes-secret`, fallback `app.jwt.secret`), IV ngẫu nhiên 12 byte, auth tag 128-bit (`AesGcmCipher` + `AesCryptoRegistry` + `AesCryptoConfig`).
2. **Mã hóa dữ liệu nhạy cảm người dùng (User PII at rest)**:
   - Áp dụng `@Convert(converter = AesStringAttributeConverter.class)` với định dạng `AES256GCM::v1::<Base64(IV||Ciphertext+Tag)>` (tương thích ngược đọc plaintext cũ):
     - `AppUser`: `totpSecret`, `pendingTotpSecret`
     - `CustomerBillingProfile`: `taxCode`, `billingAddress`, `billingEmail`, `emergencyContactName`, `emergencyContactPhone`
     - `ProviderProfile`: `taxOrIdNumber`, `flightLicenseNumber`, `bankAccountNumber`, `bankAccountHolder`, `contactPhone`
   - Mọi cột mã hóa phải có độ rộng đủ lớn (`VARCHAR(512)` / `VARCHAR(1024)`) thông qua Flyway migration (`V68__widen_aes_encrypted_user_columns.sql`) và **không** được dùng trong mệnh đề SQL `WHERE` so khớp bằng trực tiếp.
3. **Mã hóa tài liệu / hồ sơ tải lên (Documents at rest)**:
   - Thông qua `DocumentEncryptionService` / `DocumentEncryptionServiceImpl` với header nhận diện 8-byte `UAVAES01`.
   - `HybridObjectStorageServiceImpl` tự động mã hóa AES-256-GCM khi upload tài liệu (`application/pdf`, Office, CSV, TXT, JSON, XML, ZIP) và giải mã trong suốt khi đọc stream (`openStream`), đồng thời phát hiện giả mạo (tamper detection) qua GCM auth tag.

---

## 4. Quy tắc Ranh giới Kiến trúc (Layer Boundaries)

1. **Controller** chỉ phụ thuộc vào **Service interface** và **Request/Response DTO records**; **CẤM** import trực tiếp `.service.impl.`, `.dao.`, `.entity.`, `.mapper.`.
2. Mọi đường dẫn API trong Controller phải khai báo hằng số trong `ApiRoutes` (không viết chuỗi path cứng trong `@GetMapping`/`@PostMapping`/...).
3. Mọi DTO nằm trong `dto/{request,response,record}/<feature>[/<sub-domain>]` và dùng Java `record`.
4. Mọi thay đổi schema Database bắt buộc viết Flyway migration tuần tự (`V<N>__<mo_ta>.sql`), chạy `HIBERNATE_DDL_AUTO=validate` (không dùng `update`/`create` trên Staging/Production).

---

## 5. Quy tắc Kiểm thử JUnit & Độ phủ JaCoCo (> 80%)

1. **Ngưỡng bắt buộc**: Độ phủ JUnit (`JaCoCo`) phải đạt **> 80%** cho **tất cả các tầng**:
   - Tầng **DAO** (`com.uav.platform.dao.*`) > 80%
   - Tầng **Service** (`com.uav.platform.service.*`) > 80%
   - Tầng **REST Controller** (`com.uav.platform.controller.*`) > 80%
   - **Tổng thể Backend (TOTAL)** > 80%
2. **Lệnh xác minh bắt buộc trước khi commit/deploy**:
   ```bash
   cd backend && ./mvnw clean spotless:apply test spotless:check
   ```
3. Format mã nguồn Java tuân thủ tuyệt đối Spotless (Google Java Format AOSP).

---

## 6. Quy tắc Quản lý Tài liệu (Docs) & Luồng Xác minh Nhà cung cấp (Provider KYC)

1. Mọi quy trình xác minh nhà cung cấp và quản lý giấy tờ phải bám sát đặc tả tại [PROVIDER_VERIFICATION_DOCS_WORKFLOW.md](../workflows/PROVIDER_VERIFICATION_DOCS_WORKFLOW.md):
   - Trạng thái hồ sơ: `DRAFT` → `PENDING_REVIEW` → `VERIFIED` / `REJECTED` / `SUSPENDED`.
   - Trạng thái từng giấy tờ (`ProviderDocumentStatus`): `PENDING` → `APPROVED` / `REJECTED`.
   - Hồ sơ cá nhân tối thiểu 5 loại giấy tờ bắt buộc; hồ sơ doanh nghiệp tối thiểu 7 loại giấy tờ bắt buộc.
   - Giấy tờ đã `APPROVED` bị khóa xóa (`DOCUMENT_LOCKED`).
2. Giao diện Admin Portal (`admin/`), Operations Portal (`operations/`) và Customer Portal (`customer/`) phải:
   - Hiển thị rõ quy trình 4 bước, danh mục giấy tờ bắt buộc, trạng thái từng giấy tờ, nút xem/tải tệp và ghi chú phản hồi của quản trị viên.
   - Giữ đồng bộ 100% khóa đa ngôn ngữ (`vi.json`, `en.json`, `ja.json`), tuân thủ giới hạn `<= 300` dòng/component và kiểm tra `typecheck`, `lint`, `architecture:check`, `next build` trước khi bàn giao.
