package com.uav.platform.service.impl.devicekey;

import com.uav.platform.dto.record.devicekey.DevicePrincipal;
import com.uav.platform.dto.request.devicekey.CreateDeviceKeyRequest;
import com.uav.platform.dto.response.devicekey.CreatedDeviceKeyResponse;
import com.uav.platform.dto.response.devicekey.DeviceKeyResponse;
import com.uav.platform.entity.devicekey.DeviceApiKey;
import com.uav.platform.entity.uav.Uav;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.enums.devicekey.DeviceKeyScope;
import com.uav.platform.enums.devicekey.DeviceKeyStatus;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.devicekey.DeviceApiKeyRepository;
import com.uav.platform.repository.uav.UavRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.devicekey.DeviceKeyService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service("deviceKeyService")
@RequiredArgsConstructor
public class DeviceKeyServiceImpl implements DeviceKeyService {
    /** last_used_at is refreshed at most once per window to keep the hot path write-free. */
    static final Duration TOUCH_INTERVAL = Duration.ofMinutes(1);

    private final DeviceApiKeyRepository keys;
    private final UavRepository uavs;
    private final AuditLogService audit;

    @Override
    @Transactional(readOnly = true)
    public List<DeviceKeyResponse> list() {
        List<DeviceApiKey> all = keys.findAllByOrderByCreatedAtDescIdDesc();
        Map<Long, String> serials = serials(all.stream().map(DeviceApiKey::getUavId).toList());
        LocalDateTime now = LocalDateTime.now();
        return all.stream().map(k -> toResponse(k, serials, now)).toList();
    }

    @Override
    @Transactional
    public CreatedDeviceKeyResponse create(CreateDeviceKeyRequest request, String actor) {
        if (request.uavId() != null && !uavs.existsById(request.uavId()))
            throw SystemException.notFound("UAV not found").at("uavId");
        LocalDateTime now = LocalDateTime.now();
        if (request.expiresAt() != null && !request.expiresAt().isAfter(now))
            throw SystemException.badRequest(
                            "Expiry must be in the future", "DEVICE_KEY_EXPIRY_PAST")
                    .at("expiresAt");
        String secret = DeviceKeyOperations.generate();
        DeviceApiKey saved =
                keys.save(
                        DeviceKeyOperations.create(
                                request.name().trim(),
                                request.uavId(),
                                DeviceKeyOperations.visiblePrefix(secret),
                                DeviceKeyOperations.sha256Hex(secret),
                                DeviceKeyScope.TELEMETRY_WRITE.name(),
                                actor,
                                now,
                                request.expiresAt()));
        audit.record(
                null,
                actor,
                AuditAction.CREATE,
                "DEVICE_API_KEY",
                saved.getId().toString(),
                "prefix="
                        + saved.getKeyPrefix()
                        + ",uav="
                        + (saved.getUavId() == null ? "ANY" : saved.getUavId())
                        + ",scopes="
                        + saved.getScopes());
        return new CreatedDeviceKeyResponse(
                toResponse(saved, serials(List.of(nullSafe(saved.getUavId()))), now), secret);
    }

    @Override
    @Transactional
    public DeviceKeyResponse revoke(Long id, String actor) {
        DeviceApiKey key =
                keys.findById(id)
                        .orElseThrow(() -> SystemException.notFound("Device key not found"));
        LocalDateTime now = LocalDateTime.now();
        if (key.getRevokedAt() == null) {
            key.setRevokedAt(now);
            keys.save(key);
            audit.record(
                    null,
                    actor,
                    AuditAction.REVOKE,
                    "DEVICE_API_KEY",
                    key.getId().toString(),
                    "prefix=" + key.getKeyPrefix());
        }
        return toResponse(key, serials(List.of(nullSafe(key.getUavId()))), now);
    }

    @Override
    @Transactional
    public Optional<DevicePrincipal> authenticate(String rawKey) {
        if (!DeviceKeyOperations.wellFormed(rawKey)) return Optional.empty();
        String hash = DeviceKeyOperations.sha256Hex(rawKey);
        Optional<DeviceApiKey> found = keys.findByKeyHash(hash);
        if (found.isEmpty()) return Optional.empty();
        DeviceApiKey key = found.get();
        LocalDateTime now = LocalDateTime.now();
        if (!DeviceKeyOperations.hashesEqual(key.getKeyHash(), hash)
                || DeviceKeyOperations.status(key, now) != DeviceKeyStatus.ACTIVE)
            return Optional.empty();
        if (key.getLastUsedAt() == null || key.getLastUsedAt().isBefore(now.minus(TOUCH_INTERVAL)))
            keys.touch(key.getId(), now, now.minus(TOUCH_INTERVAL));
        return Optional.of(
                new DevicePrincipal(key.getId(), key.getKeyPrefix(), key.getUavId(), scopes(key)));
    }

    @Override
    public boolean isDevice(Authentication authentication) {
        return authentication != null && authentication.getPrincipal() instanceof DevicePrincipal;
    }

    @Override
    public boolean canWriteTelemetry(Authentication authentication, Long uavId) {
        if (authentication == null
                || !authentication.isAuthenticated()
                || !(authentication.getPrincipal() instanceof DevicePrincipal device)) return false;
        return device.scopes().contains(DeviceKeyScope.TELEMETRY_WRITE.name())
                && uavId != null
                && (device.uavId() == null || device.uavId().equals(uavId));
    }

    private static Set<String> scopes(DeviceApiKey key) {
        if (key.getScopes() == null) return Set.of();
        Set<String> known =
                Arrays.stream(DeviceKeyScope.values()).map(Enum::name).collect(Collectors.toSet());
        return Arrays.stream(key.getScopes().split(","))
                .map(String::trim)
                .filter(known::contains)
                .collect(Collectors.toUnmodifiableSet());
    }

    private static Long nullSafe(Long id) {
        return id == null ? -1L : id;
    }

    private Map<Long, String> serials(Collection<Long> ids) {
        List<Long> wanted = ids.stream().filter(id -> id != null && id > 0).distinct().toList();
        if (wanted.isEmpty()) return Map.of();
        return uavs.findAllById(wanted).stream()
                .collect(Collectors.toMap(Uav::getId, Uav::getSerialNumber, (a, b) -> a));
    }

    private DeviceKeyResponse toResponse(
            DeviceApiKey k, Map<Long, String> serials, LocalDateTime now) {
        return new DeviceKeyResponse(
                k.getId(),
                k.getName(),
                k.getUavId(),
                k.getUavId() == null ? null : serials.get(k.getUavId()),
                DeviceKeyOperations.KEY_PREFIX + k.getKeyPrefix(),
                List.copyOf(scopes(k)),
                DeviceKeyOperations.status(k, now).name(),
                k.getCreatedBy(),
                k.getCreatedAt(),
                k.getLastUsedAt(),
                k.getExpiresAt(),
                k.getRevokedAt());
    }
}
