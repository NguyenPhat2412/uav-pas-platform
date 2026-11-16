package com.uav.platform.service.storage.gateway;

import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody;

import java.io.InputStream;

public interface StorageGatewayService {
    void uploadSigned(
            String nodeCode,
            String objectKey,
            String contentType,
            long size,
            Long exp,
            String sig,
            String ifNoneMatch,
            InputStream body);

    ResponseEntity<StreamingResponseBody> downloadSigned(
            String objectKey, String range, boolean headOnly, Long exp, String sig);
}
