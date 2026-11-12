package com.uav.platform.controller.support;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.dto.request.support.PublicSupportCreateRequest;
import com.uav.platform.dto.request.support.PublicSupportMessageRequest;
import com.uav.platform.dto.response.support.PublicSupportThreadSessionResponse;
import com.uav.platform.service.support.SupportService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** Unauthenticated visitor support inquiry & live 2-way chat endpoints for the landing page. */
@RestController
@RequestMapping(ApiRoutes.Public.BASE)
@RequiredArgsConstructor
public class PublicSupportController {

    private final SupportService supportService;

    @PostMapping(ApiRoutes.Public.SUPPORT_THREADS)
    public ResponseEntity<PublicSupportThreadSessionResponse> createThread(
            @Valid @RequestBody PublicSupportCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(supportService.createPublicThread(request));
    }

    @GetMapping(ApiRoutes.Public.SUPPORT_THREAD_BY_TOKEN)
    public ResponseEntity<PublicSupportThreadSessionResponse> getThread(
            @PathVariable String visitorToken,
            @RequestParam(defaultValue = "false") boolean markRead) {
        return ResponseEntity.ok(supportService.getPublicThread(visitorToken, markRead));
    }

    @PostMapping(ApiRoutes.Public.SUPPORT_THREAD_MESSAGES)
    public ResponseEntity<PublicSupportThreadSessionResponse> postMessage(
            @PathVariable String visitorToken,
            @Valid @RequestBody PublicSupportMessageRequest request) {
        return ResponseEntity.ok(supportService.postPublicMessage(visitorToken, request));
    }
}
