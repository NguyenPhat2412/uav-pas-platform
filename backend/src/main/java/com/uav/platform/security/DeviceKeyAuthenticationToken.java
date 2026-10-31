package com.uav.platform.security;

import com.uav.platform.dto.record.devicekey.DevicePrincipal;

import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** Authenticated device: carries only a SCOPE_ authority, never a user role. */
public class DeviceKeyAuthenticationToken extends AbstractAuthenticationToken {
    private final DevicePrincipal principal;

    public DeviceKeyAuthenticationToken(DevicePrincipal principal) {
        super(
                principal.scopes().stream()
                        .map(scope -> new SimpleGrantedAuthority("SCOPE_DEVICE_" + scope))
                        .toList());
        this.principal = principal;
        super.setAuthenticated(true);
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public DevicePrincipal getPrincipal() {
        return principal;
    }

    @Override
    public String getName() {
        return principal.name();
    }

    @Override
    public void setAuthenticated(boolean authenticated) {
        if (authenticated)
            throw new IllegalArgumentException(
                    "Device tokens are only trusted when built by the filter");
        super.setAuthenticated(false);
    }
}
