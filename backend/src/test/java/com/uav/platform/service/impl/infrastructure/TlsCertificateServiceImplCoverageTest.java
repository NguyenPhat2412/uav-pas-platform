package com.uav.platform.service.impl.infrastructure;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.record.infrastructure.TlsCertificateInfo;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.FileInputStream;
import java.lang.reflect.Constructor;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.file.Path;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.concurrent.atomic.AtomicReference;

import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.SSLServerSocket;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.X509ExtendedTrustManager;

class TlsCertificateServiceImplCoverageTest {

    private static final Instant NOW = Instant.parse("2026-10-25T00:00:00Z");

    @Test
    void handlesNullInvalidHostlessUrlsAndFailureCacheExpiry() {
        AtomicReference<Instant> time = new AtomicReference<>(NOW);
        Clock mutableClock =
                new Clock() {
                    @Override
                    public ZoneOffset getZone() {
                        return ZoneOffset.UTC;
                    }

                    @Override
                    public Clock withZone(java.time.ZoneId zone) {
                        return this;
                    }

                    @Override
                    public Instant instant() {
                        return time.get();
                    }
                };

        // Public Spring constructor & null URL
        TlsCertificateServiceImpl nullService = new TlsCertificateServiceImpl(null, mutableClock);
        assertEquals("NOT_CONFIGURED", nullService.current().status());
        assertEquals("NOT_CONFIGURED", new TlsCertificateServiceImpl("").current().status());

        // Invalid URI syntax
        TlsCertificateInfo invalid =
                new TlsCertificateServiceImpl("https://bad host name", mutableClock).current();
        assertEquals("NOT_CONFIGURED", invalid.status());
        assertEquals("IllegalArgumentException", invalid.errorClass());

        // HTTPS with null host
        TlsCertificateInfo noHost =
                new TlsCertificateServiceImpl("https:///only-path", mutableClock).current();
        assertEquals("NOT_HTTPS", noHost.status());

        // Failure cache hit & expiry
        TlsCertificateServiceImpl cachedService =
                new TlsCertificateServiceImpl("http://localhost:8080", mutableClock);
        TlsCertificateInfo first = cachedService.current();
        time.set(NOW.plus(Duration.ofMinutes(5)));
        TlsCertificateInfo second = cachedService.current();
        assertSame(first, second);

        time.set(NOW.plus(Duration.ofMinutes(11)));
        TlsCertificateInfo third = cachedService.current();
        assertNotSame(first, third);
        assertEquals(NOW.plus(Duration.ofMinutes(11)), third.checkedAt());

        // commonName with neither CN nor O returns null
        assertNull(TlsCertificateServiceImpl.commonName("C=VN,ST=Hanoi"));
    }

    @Test
    void probeReturnsUnreachableWhenPortRefusesConnection() throws Exception {
        int unusedPort;
        try (ServerSocket socket = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            unusedPort = socket.getLocalPort();
        }
        Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
        TlsCertificateServiceImpl service =
                new TlsCertificateServiceImpl("https://127.0.0.1:" + unusedPort, clock);

        TlsCertificateInfo info = service.current();
        assertEquals("UNREACHABLE", info.status());
        assertNull(info.notAfter());
        assertNotNull(info.errorClass());
    }

    @Test
    void probeCompletesRealLoopbackTlsHandshakeAndCachesCertificate(@TempDir Path tempDir)
            throws Exception {
        Path ksPath = tempDir.resolve("test.p12");
        String keytool =
                Path.of(System.getProperty("java.home"), "bin", "keytool")
                        .toAbsolutePath()
                        .toString();
        Process proc =
                new ProcessBuilder(
                                keytool,
                                "-genkeypair",
                                "-alias",
                                "srv",
                                "-keyalg",
                                "RSA",
                                "-keysize",
                                "2048",
                                "-validity",
                                "30",
                                "-dname",
                                "CN=127.0.0.1,O=UAV Test CA,C=VN",
                                "-storetype",
                                "PKCS12",
                                "-keystore",
                                ksPath.toString(),
                                "-storepass",
                                "changeit",
                                "-keypass",
                                "changeit")
                        .redirectErrorStream(true)
                        .start();
        assertEquals(0, proc.waitFor(), "keytool must succeed");

        KeyStore ks = KeyStore.getInstance("PKCS12");
        try (FileInputStream fis = new FileInputStream(ksPath.toFile())) {
            ks.load(fis, "changeit".toCharArray());
        }
        KeyManagerFactory kmf =
                KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        kmf.init(ks, "changeit".toCharArray());
        SSLContext serverCtx = SSLContext.getInstance("TLS");
        serverCtx.init(kmf.getKeyManagers(), null, null);

        try (SSLServerSocket server =
                (SSLServerSocket)
                        serverCtx
                                .getServerSocketFactory()
                                .createServerSocket(0, 5, InetAddress.getLoopbackAddress())) {
            int port = server.getLocalPort();
            Thread acceptThread =
                    new Thread(
                            () -> {
                                try (SSLSocket client = (SSLSocket) server.accept()) {
                                    client.startHandshake();
                                } catch (Exception ignored) {
                                }
                            },
                            "tls-test-server");
            acceptThread.setDaemon(true);
            acceptThread.start();

            AtomicReference<Instant> time = new AtomicReference<>(Instant.now());
            Clock mutableClock =
                    new Clock() {
                        @Override
                        public ZoneOffset getZone() {
                            return ZoneOffset.UTC;
                        }

                        @Override
                        public Clock withZone(java.time.ZoneId zone) {
                            return this;
                        }

                        @Override
                        public Instant instant() {
                            return time.get();
                        }
                    };

            TlsCertificateServiceImpl service =
                    new TlsCertificateServiceImpl("https://127.0.0.1:" + port, mutableClock);
            TlsCertificateInfo first = service.current();

            assertEquals("OK", first.status());
            assertNotNull(first.notAfter());
            assertTrue(first.daysLeft() >= 14);
            assertEquals("127.0.0.1", first.issuer());
            assertEquals(Boolean.FALSE, first.trusted());
            assertNull(first.errorClass());

            // Within 1 hour CACHE_FOR -> cached instance returned without re-connecting
            time.set(time.get().plus(Duration.ofMinutes(30)));
            assertSame(first, service.current());

            acceptThread.join(2000);
        }
    }

    @Test
    void recordingTrustManagerCoversAllDelegationAndRejectionBranches() throws Exception {
        Class<?> tmClass =
                Class.forName(
                        "com.uav.platform.service.impl.infrastructure.TlsCertificateServiceImpl$RecordingTrustManager");
        Constructor<?> ctor = tmClass.getDeclaredConstructor(X509ExtendedTrustManager.class);
        ctor.setAccessible(true);

        X509ExtendedTrustManager delegate = mock(X509ExtendedTrustManager.class);
        X509Certificate[] chain = new X509Certificate[0];
        when(delegate.getAcceptedIssuers()).thenReturn(chain);

        X509ExtendedTrustManager tm = (X509ExtendedTrustManager) ctor.newInstance(delegate);
        Socket socket = mock(Socket.class);
        SSLEngine engine = mock(SSLEngine.class);

        // Trusted paths
        assertDoesNotThrow(() -> tm.checkServerTrusted(chain, "RSA", socket));
        assertDoesNotThrow(() -> tm.checkServerTrusted(chain, "RSA", engine));
        assertDoesNotThrow(() -> tm.checkServerTrusted(chain, "RSA"));
        assertSame(chain, tm.getAcceptedIssuers());

        // Rejected paths
        doThrow(new CertificateException("bad"))
                .when(delegate)
                .checkServerTrusted(chain, "RSA", socket);
        doThrow(new CertificateException("bad"))
                .when(delegate)
                .checkServerTrusted(chain, "RSA", engine);
        doThrow(new CertificateException("bad")).when(delegate).checkServerTrusted(chain, "RSA");
        assertDoesNotThrow(() -> tm.checkServerTrusted(chain, "RSA", socket));
        assertDoesNotThrow(() -> tm.checkServerTrusted(chain, "RSA", engine));
        assertDoesNotThrow(() -> tm.checkServerTrusted(chain, "RSA"));

        // Client certs always rejected
        assertThrows(CertificateException.class, () -> tm.checkClientTrusted(chain, "RSA", socket));
        assertThrows(CertificateException.class, () -> tm.checkClientTrusted(chain, "RSA", engine));
        assertThrows(CertificateException.class, () -> tm.checkClientTrusted(chain, "RSA"));
    }
}
