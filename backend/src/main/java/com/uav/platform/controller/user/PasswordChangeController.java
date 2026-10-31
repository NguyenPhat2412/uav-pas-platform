package com.uav.platform.controller.user;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.user.PasswordChangeRequest;
import com.uav.platform.service.user.PasswordChangeService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(ApiRoutes.Users.FULL_PROFILE_PASSWORD)
@PreAuthorize("isAuthenticated()")
@Tag(name = "User profile", description = "Self-service account settings")
@RequiredArgsConstructor
public class PasswordChangeController {
    private final PasswordChangeService passwords;

    @Operation(summary = "Change the signed-in user's password; all sessions must sign in again")
    @PostMapping
    public ResponseEntity<Void> change(
            @Valid @RequestBody PasswordChangeRequest request, Authentication authentication) {
        passwords.change(authentication.getName(), request);
        return ResponseEntity.noContent().build();
    }
}
