package com.uav.platform.modules.user.service.impl;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.user.dto.request.BillingProfileRequest;
import com.uav.platform.modules.user.dto.response.BillingProfileResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.entity.CustomerBillingProfile;
import com.uav.platform.modules.user.repository.CustomerBillingProfileRepository;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.BillingProfileService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class BillingProfileServiceImpl implements BillingProfileService {
    private final UserRepository users;
    private final CustomerBillingProfileRepository profiles;

    @Override
    @Transactional(readOnly = true)
    public BillingProfileResponse get(String username) {
        return profiles.findById(user(username).getId())
                .map(BillingProfileServiceImpl::toResponse)
                .orElse(new BillingProfileResponse(null, null, null, null, null, 0, null));
    }

    @Override
    @Transactional(readOnly = true)
    public BillingProfileResponse getForUser(Long userId) {
        if (userId == null || !users.existsById(userId))
            throw SystemException.notFound(CoreConstants.USER_NOT_FOUND);
        return profiles.findById(userId)
                .map(BillingProfileServiceImpl::toResponse)
                .orElse(new BillingProfileResponse(null, null, null, null, null, 0, null));
    }

    @Override
    @Transactional
    public BillingProfileResponse update(String username, BillingProfileRequest request) {
        Long userId = user(username).getId();
        CustomerBillingProfile profile = profiles.findById(userId).orElse(null);
        long current = profile == null ? 0 : profile.getVersion();
        if (request.expectedVersion() != current)
            throw SystemException.conflict("BILLING_PROFILE_STALE");
        if (profile == null) profile = new CustomerBillingProfile(userId);
        profile.setOrganizationName(clean(request.organizationName()));
        profile.setTaxCode(clean(request.taxCode()));
        profile.setBillingAddress(clean(request.billingAddress()));
        profile.setEmergencyContactName(clean(request.emergencyContactName()));
        profile.setEmergencyContactPhone(clean(request.emergencyContactPhone()));
        profile.setUpdatedAt(LocalDateTime.now());
        return toResponse(profiles.saveAndFlush(profile));
    }

    private AppUser user(String username) {
        return users.findByUsername(username)
                .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
    }

    static String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static BillingProfileResponse toResponse(CustomerBillingProfile p) {
        return new BillingProfileResponse(
                p.getOrganizationName(),
                p.getTaxCode(),
                p.getBillingAddress(),
                p.getEmergencyContactName(),
                p.getEmergencyContactPhone(),
                p.getVersion(),
                p.getUpdatedAt());
    }
}
