package com.uav.platform.security.jwt;

import com.uav.platform.entity.user.AppUser;
import com.uav.platform.repository.user.UserRepository;
import com.uav.platform.security.AuthCookieHelper;
import com.uav.platform.service.auth.InvalidatedTokenService;
import com.uav.platform.service.impl.user.UserAccountServiceImpl;
import com.uav.platform.service.security.SessionRevocationService;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final InvalidatedTokenService invalidatedTokenService;
    private final UserRepository userRepository;
    private final AuthCookieHelper authCookieHelper;
    private SessionRevocationService sessionRevocationService;

    public JwtAuthenticationFilter(JwtTokenProvider jwtTokenProvider) {
        this(jwtTokenProvider, null, null, null);
    }

    @Autowired
    public JwtAuthenticationFilter(
            JwtTokenProvider jwtTokenProvider,
            @Autowired(required = false) InvalidatedTokenService invalidatedTokenService,
            @Autowired(required = false) UserRepository userRepository,
            @Autowired(required = false) AuthCookieHelper authCookieHelper) {
        this.jwtTokenProvider = jwtTokenProvider;
        this.invalidatedTokenService = invalidatedTokenService;
        this.userRepository = userRepository;
        this.authCookieHelper = authCookieHelper;
    }

    /** Optional: admin "sign out everywhere" cut-off (see SessionRevocationService). */
    @Autowired(required = false)
    public void setSessionRevocationService(SessionRevocationService sessionRevocationService) {
        this.sessionRevocationService = sessionRevocationService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String token = resolveToken(request);

        if (StringUtils.hasText(token) && jwtTokenProvider.validateToken(token)) {
            if (invalidatedTokenService != null && invalidatedTokenService.isInvalidated(token)) {
                filterChain.doFilter(request, response);
                return;
            }

            String username = jwtTokenProvider.getUsernameFromToken(token);
            String role = jwtTokenProvider.getRoleFromToken(token);
            if (userRepository != null) {
                AppUser currentUser = userRepository.findByUsername(username).orElse(null);
                // Inactive, suspended or administrator-locked accounts lose their sessions; the
                // temporary failed-password lock only stops new sign-ins at the login endpoint.
                if (currentUser == null
                        || !UserAccountServiceImpl.isEnabled(currentUser)
                        || !UserAccountServiceImpl.isAccountNonLocked(currentUser)) {
                    filterChain.doFilter(request, response);
                    return;
                }
                if (sessionRevocationService != null
                        && sessionRevocationService.isRevoked(
                                currentUser.getId(), issuedAt(token))) {
                    filterChain.doFilter(request, response);
                    return;
                }
                // Resolve role from current state so role changes invalidate stale authorities.
                role = currentUser.getRole() != null ? currentUser.getRole().name() : role;
            }
            List<SimpleGrantedAuthority> authorities =
                    StringUtils.hasText(role)
                            ? List.of(new SimpleGrantedAuthority(role))
                            : java.util.Collections.emptyList();

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(username, null, authorities);
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        }

        filterChain.doFilter(request, response);
    }

    private java.time.Instant issuedAt(String token) {
        java.util.Date iat = jwtTokenProvider.getClaimsFromToken(token).getIssuedAt();
        return iat != null ? iat.toInstant() : null;
    }

    private String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken)
                && bearerToken.trim().regionMatches(true, 0, "Bearer ", 0, 7)) {
            return bearerToken.trim().substring(7).trim();
        }
        if (authCookieHelper != null) {
            String cookieToken = authCookieHelper.resolveAccessToken(request);
            if (StringUtils.hasText(cookieToken)) {
                return cookieToken.trim();
            }
        }
        return null;
    }
}
