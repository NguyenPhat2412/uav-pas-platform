package com.uav.platform.modules.devicekey.dto.record;

import java.util.Set;

/** The authenticated device behind a valid X-Device-Key; uavId null means any UAV. */
public record DevicePrincipal(Long keyId, String keyPrefix, Long uavId, Set<String> scopes) {
    public String name() {
        return "device:" + keyPrefix;
    }
}
