# Pure Hibernate Generic DAO Architecture & AES-256-GCM Security

> **Scope**: Authoritative backend architecture reference for the `uav-pas-platform` persistence layer (`backend/src/main/java/com/uav/platform/dao/`), entity lifecycle hooks, AES-256-GCM encryption at rest (PII + binary documents), and JaCoCo test coverage enforcement.

---

## 1. Pure Hibernate Generic DAO Layer (Zero Spring Data JPA)

The backend strictly bans `spring-boot-starter-data-jpa`, `JpaRepository`, and `org.springframework.data.jpa.*`. All persistence executes directly on Hibernate ORM 6+ `Session` / `CriteriaBuilder` / HQL / Native SQL through a unified Generic DAO hierarchy enforced by `ArchitecturePackageTest.persistenceLayerUsesHibernateDaosWithoutSpringDataRepositories()`.

### 1.1. Core Class Hierarchy & Wiring

| Component | Path | Responsibility |
|---|---|---|
| `HibernateConfig` | `com.uav.platform.config.HibernateConfig` | Exposes transaction-bound shared `EntityManager` (`SharedEntityManagerCreator`), unwraps Hibernate `SessionFactory`, and opens stateless/new sessions when required. |
| `IGenericDao<PK, T>` | `com.uav.platform.dao.base.IGenericDao` | Canonical persistence contract: `create`, `save`, `update`, `delete`, `deleteByPk`, `getById`, `getAll`, embedded FIQL `search(...)` & `getCount(...)`, `HibernateSpecification<T>` criteria queries, batch mutations, and `flush`/`refresh`. |
| `HibernateGenericDao<PK, T>` | `com.uav.platform.dao.base.HibernateGenericDao` | Abstract base class constructed via `protected HibernateGenericDao(Class<T> entityClass, final EntityManager entityManager)`. Unwraps `Session` (`entityManager.unwrap(Session.class)`) and provides protected helpers (`hql`, `hqlMutation`, `nativeSql`, `nativeMutation`, `withEntityGraph`, `findAllWithGraph`, `findByIdWithGraph`, `withLock`, `toPage`, `appendPageableSort`). |
| `HibernateSpecification<T>` | `com.uav.platform.dao.base.HibernateSpecification` | Functional interface (`toPredicate(Root<T>, CriteriaQuery<?>, CriteriaBuilder)`) with null-safe combinators (`where`, `and`, `or`, `not`, `allOf`, `anyOf`, `unrestricted`). Zero Spring Data JPA dependency. |
| `HibernateSearchQueryParser` | `com.uav.platform.dao.base.HibernateSearchQueryParser` | Embedded FIQL/RSQL parser converting string queries directly into Criteria `HibernateSpecification<T>` predicates with automatic type conversion and `LEFT JOIN` path resolution. |

### 1.2. Concrete Feature DAOs (76 Interfaces / 76 Implementations)

Every domain module follows the strict naming and package convention enforced by `ArchitecturePackageTest`:
- **Interface**: `com.uav.platform.dao.<feature>.I<Entity>Dao extends IGenericDao<PK, T>` (76 files across 30 feature packages).
- **Implementation**: `com.uav.platform.dao.impl.<feature>.<Entity>DaoImpl extends HibernateGenericDao<PK, T> implements I<Entity>Dao` (76 files), annotated with `@Repository` and constructor-injected with `final EntityManager entityManager`.

Example (`ProviderDocumentDaoImpl`):
```java
@Repository
public class ProviderDocumentDaoImpl extends HibernateGenericDao<Long, ProviderDocument>
        implements IProviderDocumentDao {

    public ProviderDocumentDaoImpl(final EntityManager entityManager) {
        super(ProviderDocument.class, entityManager);
    }

    @Override
    public Optional<ProviderDocument> findByIdAndProviderId(Long id, Long providerId) {
        return hql(
                        "select e from ProviderDocument e left join fetch e.mediaAsset "
                                + "where e.id = :id and e.provider.id = :providerId")
                .setParameter("id", id)
                .setParameter("providerId", providerId)
                .uniqueResultOptional();
    }
}
```

**Feature packages covered (30 modules, 76 DAO pairs)**:
`airspace`, `assistant`, `audit`, `auth`, `billing`, `devicekey`, `i18n`, `infrastructure`, `inventory`, `maintenance`, `marketplace`, `media`, `mission`, `notification`, `permission`, `project`, `role`, `sar`, `security`, `settings`, `simulation`, `station`, `storage`, `support`, `training`, `uav`, `user`, `weather`, `webhook`.

### 1.3. Embedded FIQL Search, Dynamic Sorting & Pagination

`IGenericDao` embeds dynamic search directly into every DAO without extra boilerplate:

```java
List<T> search(String query, Integer lowerLimit, Integer upperLimit, String orderBy, String orderType);
Integer getCount(String query);
```

**Supported FIQL/RSQL Grammar (`HibernateSearchQueryParser`)**:
- **Boolean composition**: `;` = `AND`, `,` = `OR` (top-level OR of AND groups).
- **Operators**:
  - `==` / `!=`: exact match and null checks (`field==null`, `field!=null`).
  - `>`, `>=`, `<`, `<=`: `Comparable` comparisons (numbers, `BigDecimal`, `LocalDate`, `LocalDateTime`, `Instant`).
  - `:`: case-insensitive substring match (`LOWER(field) LIKE '%val%'`).
  - `~`: wildcard match (`*` translated to `%`).
- **Nested association navigation**: dot notation (e.g., `customer.username==alice;status==COMPLETED`) automatically creates `LEFT JOIN`s.
- **Type coercion**: `String`, `Long`, `Integer`, `Short`, `Double`, `Float`, `BigDecimal`, `Boolean`, `Enum` (case-insensitive), `LocalDate`, `LocalDateTime`, `Instant`, `UUID`.
- **Sorting & Offset/Limit**: `orderBy` supports dot paths; `orderType` supports `ASC` (default) / `DESC`; `lowerLimit` sets `setFirstResult`, `upperLimit` sets `setMaxResults`.
- **Pessimistic Locking & Fetch Plans**: `withLock(query, LockModeType.PESSIMISTIC_WRITE)` for escrow/payout/dispatch concurrency safety; `withEntityGraph(...)` and `left join fetch` to eliminate N+1 queries.

---

## 2. JPA / Hibernate Entity Lifecycle (`@PrePersist` / `@PreUpdate`)

Timestamp auditing and invariants execute at the Hibernate entity lifecycle boundary rather than relying on Spring Data auditing listeners:

- **`BaseEntity`** (`com.uav.platform.common.entity.BaseEntity`, `@MappedSuperclass`):
  - `@PrePersist protected void onCreate()`: initializes `createdAt` and `updatedAt` to `LocalDateTime.now()`.
  - `@PreUpdate protected void onUpdate()`: refreshes `updatedAt = LocalDateTime.now()`.
  - Inherited by core domain entities including `AppUser`, `ProviderProfile`, `ProviderDocument`, `MarketplaceListing`, `Mission`, `MediaAsset`, `Invoice`, `ProviderWallet`, `ProviderPayout`, etc.
- **Standalone entities with explicit lifecycle hooks**: `AiRouterSettings`, `AssistantAttachment`, `AssistantConversation`, `AssistantMessage`, `PaymentTransaction`, `DeviceApiKey`, `MailOtpSettings`, `SessionRevocation`, `SupportMessage`, `SupportQuickReply`, `SupportThread`, `CustomerBillingProfile`, `WeatherProviderSettings`, `FinancialOutboxEvent`, `WebhookSubscription`.
- **Entity Listener**: `UserAccountPersistenceListener` (`@PrePersist`) enforces user account persistence invariants.

---

## 3. AES-256-GCM Encryption Architecture

All sensitive user PII, operational secrets, and uploaded compliance documents are encrypted at rest using **AES-256-GCM** (`AES/GCM/NoPadding`) with a fresh cryptographically random 12-byte (96-bit) IV per encryption operation and a 128-bit GCM authentication tag.

### 3.1. Cryptographic Primitives & Key Management

| Class | Role |
|---|---|
| `AesGcmCipher` (`com.uav.platform.common.util`) | Core authenticated cipher. Text format: `AES256GCM::v1::<Base64(12B IV \|\| ciphertext \|\| 16B tag)>`. Binary format: `8B magic ('UAVAES01') \|\| 12B IV \|\| ciphertext \|\| 16B tag`. |
| `AesCryptoRegistry` (`com.uav.platform.common.util`) | Holds the active `AesGcmCipher` derived via SHA-256 into a 256-bit AES key. |
| `AesCryptoConfig` (`com.uav.platform.config`) | Spring `@Configuration` initializing `AesCryptoRegistry` from `app.crypto.aes-secret` (falling back to `app.jwt.secret`). |
| `AesStringAttributeConverter` (`com.uav.platform.common.util`) | Transparent JPA `@Converter` encrypting on write (`convertToDatabaseColumn`) and decrypting on read (`convertToEntityAttribute`), seamlessly passing through legacy plaintext rows without `AES256GCM::v1::`. |
| `DocumentEncryptionServiceImpl` (`com.uav.platform.service.impl.security`) | Binary & text AES-256-GCM encryption facade (`encryptDocument`, `decryptDocument`, `shouldEncryptContentType`), throwing `DOCUMENT_DECRYPT_FAILED` on ciphertext tampering. |

### 3.2. Protected Database Columns (Transparent PII Encryption)

Widened via Flyway migration `V68__widen_aes_encrypted_user_columns.sql`:

| Entity | Table | Encrypted Columns (`@Convert(converter = AesStringAttributeConverter.class)`) |
|---|---|---|
| `AppUser` | `users` | `totp_secret` (`VARCHAR(512)`), `pending_totp_secret` (`VARCHAR(512)`) |
| `CustomerBillingProfile` | `customer_billing_profiles` | `tax_code`, `billing_address` (`VARCHAR(1024)`), `billing_email`, `emergency_contact_name`, `emergency_contact_phone` |
| `ProviderProfile` | `provider_profiles` | `tax_or_id_number`, `flight_license_number`, `contact_phone`, `bank_account_number`, `bank_account_holder` |

Domain-isolated operational secrets also use dedicated SHA-256 domain-separated `AesGcmCipher` instances:
- `SecretCipherOperations` (AI Router API keys)
- `GoogleDriveClientOperations` (Storage pool OAuth refresh tokens)
- `WeatherCipherOperations` (Weather provider API keys)
- `MailOtpSettingsServiceImpl` (SMTP credentials)

### 3.3. Protected Binary Documents in Object Storage

`HybridObjectStorageServiceImpl` automatically invokes `DocumentEncryptionServiceImpl`:
- **Auto-encrypted MIME prefixes**: `application/pdf`, `application/msword`, `application/vnd.openxmlformats-officedocument`, `application/vnd.ms-excel`, `application/json`, `application/xml`, `application/zip`, `text/`.
- **Write path (`uploadObject`)**: Reads stream bytes, seals with `UAVAES01` + 12B IV + AES-256-GCM ciphertext/tag, uploads sealed payload.
- **Read path (`maybeDecryptStream`)**: Detects `UAVAES01` magic header; verifies GCM tag and decrypts transparently; legacy unencrypted blobs remain readable without migration downtime.

---

## 4. Architecture Guardrails & JaCoCo Test Coverage

### 4.1. Automated Architecture Tests (`ArchitecturePackageTest`)
Every build verifies:
1. Zero `spring-boot-starter-data-jpa`, `JpaRepository`, `org.springframework.data.jpa`, or `com.uav.platform.repository` references anywhere in `pom.xml` or `src/main/java`.
2. Every `I*Dao` extends `IGenericDao` under `dao/`; every `*DaoImpl` extends `HibernateGenericDao`, is `@Repository`, and injects `final EntityManager entityManager` under `dao/impl/`.
3. Controllers only reference `ApiRoutes` constants, service interfaces, and DTOs (never DAOs, entities, or mappers).

### 4.2. Verification & JaCoCo Coverage Summary

> Commands:
> ```bash
> cd backend
> ./mvnw spotless:apply
> ./mvnw test jacoco:report
> ```

| Layer / Package | Target Threshold | Verified Line Coverage | Verified Instruction Coverage |
|---|---:|---:|---:|
| `com.uav.platform.dao.*` | > 80% | **97.30%** (1,766 / 1,815) | **94.21%** (6,133 / 6,510) |
| `com.uav.platform.service.*` | > 80% | **83.39%** (17,689 / 21,212) | **82.08%** (77,005 / 93,812) |
| `com.uav.platform.controller.*` | > 80% | **99.37%** (631 / 635) | **99.12%** (3,599 / 3,631) |
| **Overall Backend Bundle (1,004 classes)** | > 80% | **84.72%** (24,323 / 28,711) | **84.29%** (113,466 / 134,607) |

Full suite verification: **1,399 tests run, 0 failures, 0 errors** (204 Postgres/MinIO stabilization tests skipped when external Docker containers are not attached).

Key test suites covering this architecture:
- `ArchitecturePackageTest` — pure Hibernate & clean-layer package invariants.
- `HibernateGenericDaoAndSearchTest` — CRUD, FIQL search operators, sorting, pagination, specifications.
- `AllHibernateDaosIntegrationTest` — all 76 Hibernate DAO beans verified against real Hibernate `SessionFactory`.
- `AesUserAndDocumentEncryptionTest` — AES-256-GCM PII converters, binary `UAVAES01` round-trip, tamper detection.
- `MarketplaceAdminServiceImplTest` & `ProviderVerificationWorkflowIntegrationTest` — Provider KYC documents, required-document gating, individual document review, signed `downloadUrl` resolution, and RBAC/IDOR guards.
