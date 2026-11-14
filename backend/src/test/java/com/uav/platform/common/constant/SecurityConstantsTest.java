package com.uav.platform.common.constant;

import static org.assertj.core.api.Assertions.assertThat;

import com.uav.platform.enums.user.UserRole;

import org.junit.jupiter.api.Test;

class SecurityConstantsTest {

    @Test
    void defaultRoleStaysTheCustomerEnumValue() {
        assertThat(SecurityConstants.DEFAULT_ROLE).isEqualTo(UserRole.ROLE_PILOT.name());
    }

    @Test
    void businessZoneMatchesItsId() {
        assertThat(TimeConstants.BUSINESS_ZONE.getId()).isEqualTo(TimeConstants.BUSINESS_TIME_ZONE);
    }
}
