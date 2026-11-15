package com.uav.platform.controller.storage;

import com.uav.platform.config.routes.ApiRoutes;
import com.uav.platform.service.storage.StorageGatewayService;

import jakarta.servlet.http.HttpServletRequest;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.IOException;

@RestController
@RequestMapping(ApiRoutes.StorageGateway.BASE)
@RequiredArgsConstructor
public class StorageGatewayController {
    private final StorageGatewayService gateway;

    @PutMapping(ApiRoutes.StorageGateway.UPLOAD)
    public ResponseEntity<Void> upload(
            @RequestParam("node") String node,
            @RequestParam("key") String key,
            @RequestParam("ct") String contentType,
            @RequestParam("size") long size,
            @RequestParam("exp") Long exp,
            @RequestParam("sig") String sig,
            @RequestHeader(value = HttpHeaders.IF_NONE_MATCH, required = false) String ifNoneMatch,
            HttpServletRequest request)
            throws IOException {
        gateway.uploadSigned(
                node, key, contentType, size, exp, sig, ifNoneMatch, request.getInputStream());
        return ResponseEntity.noContent().build();
    }

    @RequestMapping(
            value = ApiRoutes.StorageGateway.DOWNLOAD,
            method = {RequestMethod.GET, RequestMethod.HEAD})
    public ResponseEntity<StreamingResponseBody> download(
            @RequestParam("key") String key,
            @RequestParam("exp") Long exp,
            @RequestParam("sig") String sig,
            @RequestHeader(value = HttpHeaders.RANGE, required = false) String range,
            HttpServletRequest request) {
        boolean headOnly =
                request != null && RequestMethod.HEAD.name().equalsIgnoreCase(request.getMethod());
        return gateway.downloadSigned(key, range, headOnly, exp, sig);
    }
}
