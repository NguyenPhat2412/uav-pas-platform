package com.uav.platform.modules.media.service;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.media.service.impl.S3CompatibleStorageService;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.media.service.impl.S3CompatibleStorageService;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

class S3CompatibleStorageServiceTest {
    @Test
    void signatureAuthenticatesThePublicHostWhenInternalEndpointDiffers() throws Exception {
        ObjectStorageService storage = new S3CompatibleStorageService("minio", "http://minio:9000", "uav", "access", "secret", "us-east-1", "http://localhost:9000", false, "http://localhost:3000");
        URI uri = URI.create(storage.createSignedDownloadUrl("document/test.txt"));
        String[] params = uri.getRawQuery().split("&");
        String signature = Arrays.stream(params).filter(p -> p.startsWith("X-Amz-Signature=")).findFirst().orElseThrow().split("=", 2)[1];
        String canonicalQuery = String.join("&", Arrays.stream(params).filter(p -> !p.startsWith("X-Amz-Signature=")).sorted().toList());
        String date = Arrays.stream(params).filter(p -> p.startsWith("X-Amz-Date=")).findFirst().orElseThrow().split("=", 2)[1];
        String credential = URLDecoder.decode(Arrays.stream(params).filter(p -> p.startsWith("X-Amz-Credential=")).findFirst().orElseThrow().split("=", 2)[1], StandardCharsets.UTF_8);
        String scope = credential.substring(credential.indexOf('/') + 1);
        String canonical = "GET\n" + uri.getRawPath() + "\n" + canonicalQuery + "\nhost:" + uri.getRawAuthority() + "\n\nhost\nUNSIGNED-PAYLOAD";
        String stringToSign = "AWS4-HMAC-SHA256\n" + date + "\n" + scope + "\n" + HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(canonical.getBytes(StandardCharsets.UTF_8)));
        byte[] key = hmac("AWS4secret".getBytes(StandardCharsets.UTF_8), date.substring(0, 8));
        key = hmac(key, "us-east-1"); key = hmac(key, "s3"); key = hmac(key, "aws4_request");
        assertEquals(signature, HexFormat.of().formatHex(hmac(key, stringToSign)));
    }

    private byte[] hmac(byte[] key, String value) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(key, "HmacSHA256"));
        return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
    }
    @Test
    void createsExpiringSignedUrlsWithoutExposingCredentials() {
        ObjectStorageService storage = new S3CompatibleStorageService("minio", "http://localhost:9000", "uav", "access", "secret", "us-east-1", "http://localhost:9000", false, "http://localhost:3000");
        String url = storage.createSignedUploadUrl("image/file.png", "image/png");
        assertTrue(url.contains("X-Amz-Signature="));
        assertTrue(url.contains("X-Amz-Expires="));
        assertTrue(!url.contains("secret"));
    }
}
