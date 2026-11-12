package com.uav.platform.service.devicekey;

import com.uav.platform.dto.record.devicekey.DevicePrincipal;
import com.uav.platform.dto.request.devicekey.CreateDeviceKeyRequest;
import com.uav.platform.dto.response.devicekey.CreatedDeviceKeyResponse;
import com.uav.platform.dto.response.devicekey.DeviceKeyResponse;

import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

public interface DeviceKeyService {
    List<DeviceKeyResponse> list();

    /** The full key is returned in this response only. */
    CreatedDeviceKeyResponse create(CreateDeviceKeyRequest request, String actor);

    DeviceKeyResponse revoke(Long id, String actor);

    /** Valid (known, not revoked, not expired) key, or empty. Never says why it failed. */
    Optional<DevicePrincipal> authenticate(String rawKey);

    /** True when the authentication is a device principal (not a user). */
    boolean isDevice(Authentication authentication);

    /** SpEL guard for the telemetry endpoint: device scope and UAV binding. */
    boolean canWriteTelemetry(Authentication authentication, Long uavId);
}
