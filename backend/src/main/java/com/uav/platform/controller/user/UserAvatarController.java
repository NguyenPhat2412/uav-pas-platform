package com.uav.platform.controller.user;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.user.AvatarUpdateRequest;
import com.uav.platform.dto.request.user.AvatarUploadRequest;
import com.uav.platform.dto.response.media.SignedMediaUrlResponse;
import com.uav.platform.dto.response.user.AvatarResponse;
import com.uav.platform.service.user.AvatarService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.concurrent.TimeUnit;

/** Every signed-in user manages their own avatar; it is not tied to the media management permissions. */
@RestController
@RequestMapping(ApiRoutes.Users.BASE)
@PreAuthorize("isAuthenticated()")
@RequiredArgsConstructor
public class UserAvatarController {
    private final AvatarService avatars;

    @PostMapping("/profile/avatar/upload-url")
    public ResponseEntity<SignedMediaUrlResponse> uploadUrl(
            Authentication authentication, @Valid @RequestBody AvatarUploadRequest request) {
        return ResponseEntity.ok(avatars.uploadUrl(authentication.getName(), request));
    }

    @PutMapping("/profile/avatar")
    public ResponseEntity<AvatarResponse> use(
            Authentication authentication, @Valid @RequestBody AvatarUpdateRequest request) {
        return ResponseEntity.ok(avatars.use(authentication.getName(), request.mediaId()));
    }

    @DeleteMapping("/profile/avatar")
    public ResponseEntity<Void> remove(Authentication authentication) {
        avatars.remove(authentication.getName());
        return ResponseEntity.noContent().build();
    }

    /** Redirects to a short-lived storage URL; the stored path carries ?v= so a new picture busts caches. */
    @GetMapping("/{id}/avatar")
    public ResponseEntity<Void> image(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(avatars.signedUrl(id, authentication)))
                .cacheControl(CacheControl.maxAge(5, TimeUnit.MINUTES).cachePrivate())
                .header(HttpHeaders.VARY, "Cookie")
                .build();
    }
}
