package com.uav.platform.service.impl.security;

import com.uav.platform.common.constant.CoreConstants;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.dto.record.security.SessionRevokeOutcome;
import com.uav.platform.dto.request.security.SecuritySessionQueryRequest;
import com.uav.platform.dto.request.security.TwoFactorResetRequest;
import com.uav.platform.dto.response.security.SecurityActionResponse;
import com.uav.platform.dto.response.security.SecuritySessionResponse;
import com.uav.platform.entity.auth.AuthOtpToken;
import com.uav.platform.entity.auth.RefreshToken;
import com.uav.platform.entity.security.SessionRevocation;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.audit.AuditAction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.auth.AuthOtpTokenRepository;
import com.uav.platform.repository.auth.RefreshTokenRepository;
import com.uav.platform.repository.security.SessionRevocationRepository;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.service.audit.AuditLogService;
import com.uav.platform.service.auth.AuthSessionLock;
import com.uav.platform.service.impl.auth.AuthOtpServiceImpl;
import com.uav.platform.service.security.SecuritySessionService;
import com.uav.platform.service.security.SessionRevocationService;
import com.uav.platform.specification.security.SecuritySessionSpecifications;
import com.uav.platform.specification.user.UserSpecifications;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@Transactional
@RequiredArgsConstructor
public class SecuritySessionServiceImpl implements SecuritySessionService {

    static final String ENTITY_SESSION = "USER_SESSION";
    static final String ENTITY_2FA = "USER_2FA";

    private final UserRepository users;
    private final RefreshTokenRepository refreshTokens;
    private final AuthOtpTokenRepository otpTokens;
    private final SessionRevocationRepository revocations;
    private final SessionRevocationService revocationService;
    private final AuthSessionLock sessionLock;
    private final AuditLogService audit;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SecuritySessionResponse> sessions(SecuritySessionQueryRequest query) {
        int page = Math.max(query.page(), 0);
        int size = Math.min(Math.max(query.size(), 1), 100);
        Instant now = Instant.now();
        Specification<AppUser> spec =
                Specification.where(UserSpecifications.hasKeyword(query.keyword()))
                        .and(UserSpecifications.hasRole(query.role()))
                        .and(
                                SecuritySessionSpecifications.hasActiveSession(
                                        query.activeOnly(), now));
        Page<AppUser> result =
                users.findAll(spec, PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id")));
        List<Long> ids = result.getContent().stream().map(AppUser::getId).toList();
        Map<Long, RefreshToken> tokens =
                ids.isEmpty()
                        ? Map.of()
                        : refreshTokens.findByUserIdIn(ids).stream()
                                .collect(
                                        Collectors.toMap(
                                                t -> t.getUser().getId(),
                                                Function.identity(),
                                                (a, b) -> a));
        Map<Long, SessionRevocation> revoked =
                ids.isEmpty()
                        ? Map.of()
                        : revocations.findAllById(ids).stream()
                                .collect(
                                        Collectors.toMap(
                                                SessionRevocation::getUserId, Function.identity()));
        return PageResponse.from(
                result, u -> toResponse(u, tokens.get(u.getId()), revoked.get(u.getId()), now));
    }

    static SecuritySessionResponse toResponse(
            AppUser u, RefreshToken token, SessionRevocation revocation, Instant now) {
        String state;
        if (token == null) state = "NONE";
        else if (token.isRevoked()) state = "REVOKED";
        else if (!now.isBefore(token.getExpiryDate())) state = "EXPIRED";
        else state = "ACTIVE";
        Instant created =
                token != null && token.getCreatedAt() != null
                        ? token.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant()
                        : null;
        return new SecuritySessionResponse(
                u.getId(),
                u.getUsername(),
                u.getEmail(),
                u.getFullName(),
                u.getRole() != null ? u.getRole().name() : null,
                u.getStatus() != null ? u.getStatus().name() : null,
                "ACTIVE".equals(state),
                state,
                created,
                token != null ? token.getExpiryDate() : null,
                u.isTwoFactorEnabled(),
                u.isTwoFactorEnabled() ? u.getTwoFactorMethod() : null,
                revocation != null ? revocation.getRevokedBefore() : null,
                revocation != null ? revocation.getRevokedBy() : null);
    }

    @Override
    public SecurityActionResponse revokeUserSessions(Long userId, Authentication auth) {
        AppUser target = requireUser(userId);
        String actor = actorName(auth);
        Long actorId = actorId(actor);
        SessionRevokeOutcome outcome = revokeOne(target, actor);
        audit.record(
                actorId,
                actor,
                AuditAction.REVOKE,
                ENTITY_SESSION,
                String.valueOf(userId),
                "Admin revoked all sessions; refreshTokensRevoked="
                        + outcome.refreshTokens()
                        + ", accessTokensIssuedUpTo="
                        + outcome.cutoff());
        return new SecurityActionResponse(
                "REVOKE_USER_SESSIONS",
                1,
                outcome.refreshTokens(),
                userId.equals(actorId),
                outcome.cutoff());
    }

    @Override
    public SecurityActionResponse revokeAllSessions(Authentication auth) {
        String actor = actorName(auth);
        Long actorId = actorId(actor);
        if (actorId == null)
            throw SystemException.forbidden("Current administrator account was not found");
        int refreshCount = refreshTokens.revokeAllExceptUserId(actorId);
        List<Long> targets = revocations.findAllUserIdsExcept(actorId);
        Instant cutoff = revocationService.revokeAccessTokens(targets, actor);
        int challenges = 0;
        for (AppUser user : users.findAllById(targets))
            challenges += cancelPendingChallenges(user, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA);
        audit.record(
                actorId,
                actor,
                AuditAction.REVOKE,
                ENTITY_SESSION,
                "ALL",
                "Admin revoked sessions of all other users; users="
                        + targets.size()
                        + ", refreshTokensRevoked="
                        + refreshCount
                        + ", pendingLoginChallengesCancelled="
                        + challenges
                        + ", accessTokensIssuedUpTo="
                        + cutoff);
        return new SecurityActionResponse(
                "REVOKE_ALL_SESSIONS", targets.size(), refreshCount, false, cutoff);
    }

    @Override
    public SecurityActionResponse resetTwoFactor(
            Long userId, TwoFactorResetRequest request, Authentication auth) {
        AppUser target = sessionLock.lock(requireUser(userId));
        String actor = actorName(auth);
        Long actorId = actorId(actor);
        boolean wasEnabled = target.isTwoFactorEnabled();
        String previousMethod = target.getTwoFactorMethod();
        boolean hadAuthenticator =
                target.getTotpSecret() != null && !target.getTotpSecret().isBlank();
        target.setTwoFactorEnabled(false);
        target.setTwoFactorMethod(AuthOtpServiceImpl.METHOD_EMAIL);
        target.setTotpSecret(null);
        users.save(target);
        cancelPendingChallenges(target, AuthOtpServiceImpl.PURPOSE_ENABLE_2FA_EMAIL);
        boolean revokeSessions = request == null || request.shouldRevokeSessions();
        SessionRevokeOutcome outcome = revokeSessions ? revokeOne(target, actor) : null;
        if (!revokeSessions) cancelPendingChallenges(target, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA);
        audit.record(
                actorId,
                actor,
                AuditAction.UPDATE,
                ENTITY_2FA,
                String.valueOf(userId),
                "Admin reset 2FA; wasEnabled="
                        + wasEnabled
                        + ", previousMethod="
                        + previousMethod
                        + ", authenticatorRemoved="
                        + hadAuthenticator
                        + ", sessionsRevoked="
                        + revokeSessions);
        return new SecurityActionResponse(
                "RESET_2FA",
                1,
                outcome != null ? outcome.refreshTokens() : 0,
                userId.equals(actorId),
                outcome != null ? outcome.cutoff() : Instant.now());
    }

    private SessionRevokeOutcome revokeOne(AppUser target, String actor) {
        // Same lock as login/refresh rotation, so a concurrent refresh cannot slip a new token in.
        AppUser locked = sessionLock.lock(target);
        int refresh = refreshTokens.revokeByUserId(locked.getId());
        Instant cutoff = revocationService.revokeAccessTokens(List.of(locked.getId()), actor);
        cancelPendingChallenges(locked, AuthOtpServiceImpl.PURPOSE_LOGIN_2FA);
        return new SessionRevokeOutcome(refresh, cutoff);
    }

    /** A pending login 2FA challenge would otherwise still mint a fresh session. */
    private int cancelPendingChallenges(AppUser user, String purpose) {
        if (user.getEmail() == null) return 0;
        List<AuthOtpToken> pending =
                otpTokens.findByEmailIgnoreCaseAndPurposeAndConsumedAtIsNull(
                        user.getEmail(), purpose);
        if (pending.isEmpty()) return 0;
        LocalDateTime now = LocalDateTime.now();
        pending.forEach(t -> t.setConsumedAt(now));
        otpTokens.saveAll(pending);
        return pending.size();
    }

    private AppUser requireUser(Long id) {
        if (id == null) throw SystemException.badRequest("User ID must not be null");
        return users.findById(id)
                .orElseThrow(() -> SystemException.notFound(CoreConstants.USER_NOT_FOUND));
    }

    private static String actorName(Authentication auth) {
        return auth != null ? auth.getName() : null;
    }

    private Long actorId(String actor) {
        if (actor == null) return null;
        return users.findByUsername(actor).map(AppUser::getId).orElse(null);
    }
}
