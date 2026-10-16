package com.uav.platform.modules.user.controller;

import com.uav.platform.common.constant.RestEndpoint;
import com.uav.platform.modules.user.config.request.UserProfileUpdateRequest;
import com.uav.platform.modules.user.config.response.UserProfileResponse;
import com.uav.platform.modules.user.service.UserProfileService;
import com.uav.platform.error.ErrorResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping(RestEndpoint.USERS + "/profile")
@PreAuthorize("isAuthenticated()")
public class UserProfileController {
    private final UserProfileService profiles;
    public UserProfileController(UserProfileService profiles) { this.profiles = profiles; }
    @GetMapping
    public ResponseEntity<UserProfileResponse> get(Authentication authentication) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.get(authentication.getName()));
    }
    @PatchMapping
    public ResponseEntity<UserProfileResponse> update(Authentication authentication, @RequestBody Map<String,Object> body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(profiles.update(authentication.getName(), UserProfileUpdateRequest.from(body)));
    }
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ErrorResponse> malformedBody() {
        return ResponseEntity.badRequest().body(ErrorResponse.ofCode(400,"Bad Request","INVALID_PROFILE_REQUEST","Thông tin hồ sơ không đúng định dạng.",RestEndpoint.USERS + "/profile"));
    }
}
