package com.uav.platform.dto.response.devicekey;

/** Returned once by the create call: the full key cannot be retrieved again. */
public record CreatedDeviceKeyResponse(DeviceKeyResponse key, String secret) {}
