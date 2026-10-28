package com.uav.platform.modules.devicekey.dto.response;

/** Returned once by the create call: the full key cannot be retrieved again. */
public record CreatedDeviceKeyResponse(DeviceKeyResponse key, String secret) {}
