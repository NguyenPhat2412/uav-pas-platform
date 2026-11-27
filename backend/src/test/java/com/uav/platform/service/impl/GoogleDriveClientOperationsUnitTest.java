package com.uav.platform.service.impl;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.DriveAboutInfo;
import com.uav.platform.dto.record.DriveUploadedFile;
import com.uav.platform.dto.record.ObjectMetadata;
import com.uav.platform.entity.StorageDriveNode;
import com.uav.platform.enums.DriveAuthType;
import com.uav.platform.error.SystemException;

import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

class GoogleDriveClientOperationsUnitTest {

    @SuppressWarnings("unchecked")
    private HttpResponse<String> stringResponse(
            int status, String body, Map<String, List<String>> headers) {
        HttpResponse<String> resp = mock(HttpResponse.class);
        when(resp.statusCode()).thenReturn(status);
        when(resp.body()).thenReturn(body);
        when(resp.headers()).thenReturn(HttpHeaders.of(headers, (k, v) -> true));
        return resp;
    }

    @SuppressWarnings("unchecked")
    private HttpResponse<InputStream> streamResponse(
            int status, byte[] bytes, Map<String, List<String>> headers) {
        HttpResponse<InputStream> resp = mock(HttpResponse.class);
        when(resp.statusCode()).thenReturn(status);
        when(resp.body()).thenReturn(new ByteArrayInputStream(bytes));
        when(resp.headers()).thenReturn(HttpHeaders.of(headers, (k, v) -> true));
        return resp;
    }

    @Test
    @SuppressWarnings("unchecked")
    void oauthAndServiceAccountCryptoTokenFetchUploadStreamHeadAndDeleteWork() throws Exception {
        HttpClient http = mock(HttpClient.class);
        GoogleDriveClientOperations client =
                new GoogleDriveClientOperations("unit-test-secret", http);

        // Encrypt / decrypt secret & invalid ciphertext
        String enc = client.encryptSecret("my-secret");
        assertEquals("my-secret", client.decryptSecret(enc));
        assertThrows(SystemException.class, () -> client.decryptSecret("not-base64!!!"));

        // OAuth authorize URL & code exchange
        String url = client.buildOAuthAuthorizeUrl("cid", "https://uav.all1.vn/cb", "st1");
        assertTrue(url.contains("client_id=cid") && url.contains("state=st1"));

        var exchOk = stringResponse(200, "{\"refresh_token\":\"rt-xyz\"}", Map.of());
        var exchEmpty = stringResponse(200, "{}", Map.of());
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(exchOk, exchEmpty);
        assertEquals(
                "rt-xyz", client.exchangeAuthorizationCode("cid", "csec", "code", "https://cb"));
        assertThrows(
                SystemException.class,
                () -> client.exchangeAuthorizationCode("cid", "csec", "code", "https://cb"));

        // Service account JSON parsing & RSA signing
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048);
        KeyPair kp = kpg.generateKeyPair();
        String pem =
                "-----BEGIN PRIVATE KEY-----\n"
                        + Base64.getEncoder().encodeToString(kp.getPrivate().getEncoded())
                        + "\n-----END PRIVATE KEY-----";
        String saJson =
                "{\"client_email\":\"bot@uav.iam.gserviceaccount.com\",\"private_key\":\""
                        + pem.replace("\n", "\\n")
                        + "\"}";
        var parsedSa = client.encryptServiceAccountJson(saJson);
        assertEquals("bot@uav.iam.gserviceaccount.com", parsedSa.clientEmail());
        assertThrows(SystemException.class, () -> client.encryptServiceAccountJson("{}"));
        assertThrows(SystemException.class, () -> client.encryptServiceAccountJson("not-json"));

        // OAuth node fetchAbout + ensureRootFolder + uploadStream + headFile + readHeader +
        // openStream + deleteFile
        StorageDriveNode oauthNode = new StorageDriveNode();
        oauthNode.setId(1L);
        oauthNode.setAuthType(DriveAuthType.OAUTH2);
        oauthNode.setEncryptedCredentials(client.encryptOAuthCredentials("cid", "csec", "rt"));

        HttpResponse<String> tokenResp =
                stringResponse(200, "{\"access_token\":\"tok-1\",\"expires_in\":3600}", Map.of());
        HttpResponse<String> aboutResp =
                stringResponse(
                        200,
                        "{\"user\":{\"emailAddress\":\"drive@uav.vn\"},\"storageQuota\":{\"limit\":\"10000\",\"usage\":\"1000\",\"usageInDrive\":\"800\"}}",
                        Map.of());
        HttpResponse<String> findEmptyResp = stringResponse(200, "{\"files\":[]}", Map.of());
        HttpResponse<String> createFolderResp =
                stringResponse(200, "{\"id\":\"root-123\"}", Map.of());
        HttpResponse<String> findSubResp =
                stringResponse(200, "{\"files\":[{\"id\":\"sub-docs\"}]}", Map.of());
        HttpResponse<String> initUploadResp =
                stringResponse(
                        200, "", Map.of("Location", List.of("https://upload.example.com/sess1")));
        HttpResponse<String> putUploadResp =
                stringResponse(200, "{\"id\":\"file-99\",\"size\":\"5\"}", Map.of());
        HttpResponse<String> headOkResp =
                stringResponse(
                        200,
                        "{\"id\":\"file-99\",\"mimeType\":\"application/pdf\",\"size\":\"5\",\"trashed\":false}",
                        Map.of());
        HttpResponse<String> headNotFoundResp = stringResponse(404, "", Map.of());
        HttpResponse<InputStream> streamResp =
                streamResponse(
                        206,
                        "hello".getBytes(StandardCharsets.UTF_8),
                        Map.of(
                                "Content-Length", List.of("5"),
                                "Content-Range", List.of("bytes 0-4/5"),
                                "Content-Type", List.of("application/pdf"),
                                "ETag", List.of("\"e1\"")));
        HttpResponse<String> deleteResp = stringResponse(204, "", Map.of());

        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(
                        tokenResp,
                        aboutResp,
                        findEmptyResp,
                        createFolderResp,
                        findSubResp,
                        initUploadResp,
                        putUploadResp,
                        headOkResp,
                        headNotFoundResp,
                        streamResp,
                        deleteResp);

        DriveAboutInfo about = client.fetchAbout(oauthNode);
        assertEquals("drive@uav.vn", about.email());
        assertEquals(10000L, about.limitBytes());

        DriveUploadedFile uploaded =
                client.uploadStream(
                        oauthNode,
                        "document/report.pdf",
                        "application/pdf",
                        5L,
                        new ByteArrayInputStream("hello".getBytes(StandardCharsets.UTF_8)));
        assertEquals("file-99", uploaded.driveFileId());
        assertEquals("documents", uploaded.moduleFolder());

        Optional<ObjectMetadata> meta = client.headFile(oauthNode, "file-99", "application/pdf");
        assertTrue(meta.isPresent());
        assertEquals(5L, meta.get().size());
        assertTrue(client.headFile(oauthNode, "missing", null).isEmpty());

        byte[] headerBytes = client.readHeader(oauthNode, "file-99", "application/pdf");
        assertEquals("hello", new String(headerBytes, StandardCharsets.UTF_8));

        client.deleteFile(oauthNode, "file-99");
        client.evictToken(1L);

        // Service account node token fetch + root folder trashed + HTTP error branches
        StorageDriveNode saNode = new StorageDriveNode();
        saNode.setId(2L);
        saNode.setAuthType(DriveAuthType.SERVICE_ACCOUNT);
        saNode.setEncryptedCredentials(parsedSa.encryptedCredentials());
        saNode.setRootFolderId("existing-root");

        var trashedResp =
                stringResponse(200, "{\"id\":\"existing-root\",\"trashed\":true}", Map.of());
        var forbiddenResp = stringResponse(403, "forbidden", Map.of());
        when(http.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(tokenResp, trashedResp, forbiddenResp)
                .thenThrow(new IOException("network down"));

        assertThrows(SystemException.class, () -> client.ensureRootFolder(saNode));
        assertThrows(SystemException.class, () -> client.fetchAbout(saNode));
        assertThrows(SystemException.class, () -> client.deleteFile(saNode, "file-x"));

        // Helper utilities
        assertEquals("training", GoogleDriveClientOperations.resolveModuleFolder("training/a.mp4"));
        assertEquals("images", GoogleDriveClientOperations.resolveModuleFolder("image/a.png"));
        assertEquals("videos", GoogleDriveClientOperations.resolveModuleFolder("video/a.mp4"));
        assertEquals("missions", GoogleDriveClientOperations.resolveModuleFolder("mission/a.kml"));
        assertEquals("general", GoogleDriveClientOperations.resolveModuleFolder(""));
        assertEquals("file.bin", GoogleDriveClientOperations.resolveFileName(""));
        assertEquals("a.pdf", GoogleDriveClientOperations.resolveFileName("docs/a.pdf"));
    }
}
