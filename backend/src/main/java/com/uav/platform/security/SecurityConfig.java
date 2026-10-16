package com.uav.platform.security;

import com.uav.platform.security.jwt.JwtAuthenticationFilter;
import com.uav.platform.config.routes.ApiRoutes;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            @Value("${app.cookie.domain:}") String cookieDomain
    ) throws Exception {
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        csrfRepository.setCookieCustomizer(builder -> {
            builder.path("/");
            if (StringUtils.hasText(cookieDomain)) {
                builder.domain(cookieDomain.trim());
            }
        });
        XorCsrfTokenRequestAttributeHandler maskedHandler = new XorCsrfTokenRequestAttributeHandler();
        maskedHandler.setCsrfRequestAttributeName(null);
        var csrfHandler = new org.springframework.security.web.csrf.CsrfTokenRequestHandler() {
            @Override
            public void handle(jakarta.servlet.http.HttpServletRequest request,
                    jakarta.servlet.http.HttpServletResponse response,
                    java.util.function.Supplier<org.springframework.security.web.csrf.CsrfToken> token) {
                maskedHandler.handle(request, response, token);
            }
            @Override
            public String resolveCsrfTokenValue(jakarta.servlet.http.HttpServletRequest request,
                    org.springframework.security.web.csrf.CsrfToken token) {
                // Preserve the raw cookie/header contract and masked form-token support.
                return StringUtils.hasText(request.getHeader(token.getHeaderName()))
                        ? request.getHeader(token.getHeaderName()) : maskedHandler.resolveCsrfTokenValue(request, token);
            }
        };

        http
                // Bearer-token clients are CSRF-immune; cookie-authenticated browsers must send X-XSRF-TOKEN.
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfRepository)
                        .csrfTokenRequestHandler(csrfHandler)
                        .ignoringRequestMatchers(ApiRoutes.PUBLIC_AUTH_WHITELIST)
                        .ignoringRequestMatchers(ApiRoutes.Webhook.WILDCARD)
                        .ignoringRequestMatchers(ApiRoutes.Health.ENDPOINT, ApiRoutes.Health.LIVENESS)
                        .ignoringRequestMatchers(ApiRoutes.SWAGGER_WHITELIST)
                        .requireCsrfProtectionMatcher(request -> {
                            String method = request.getMethod();
                            if ("GET".equalsIgnoreCase(method) || "HEAD".equalsIgnoreCase(method)
                                    || "OPTIONS".equalsIgnoreCase(method) || "TRACE".equalsIgnoreCase(method)) {
                                return false;
                            }
                            String header = request.getHeader("Authorization");
                            return !(StringUtils.hasText(header)
                                    && header.trim().regionMatches(true, 0, "Bearer ", 0, 7));
                        })
                )
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint((request, response, exception) -> response.sendError(401)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(ApiRoutes.Auth.FULL_ME).authenticated()
                        .requestMatchers(ApiRoutes.Health.ENDPOINT, ApiRoutes.Health.LIVENESS).permitAll()
                        .requestMatchers(ApiRoutes.SWAGGER_WHITELIST).permitAll()
                        .requestMatchers(ApiRoutes.PUBLIC_AUTH_WHITELIST).permitAll()
                        .requestMatchers(ApiRoutes.Webhook.WILDCARD).permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
