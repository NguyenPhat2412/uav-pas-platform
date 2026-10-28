package com.uav.platform.modules.infrastructure.service.impl;

import com.uav.platform.modules.infrastructure.dto.record.TlsCertificateInfo;
import com.uav.platform.modules.infrastructure.service.TlsCertificateService;

import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.URI;
import java.security.KeyStore;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;

import javax.naming.ldap.LdapName;
import javax.naming.ldap.Rdn;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLEngine;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;
import javax.net.ssl.X509ExtendedTrustManager;
import javax.net.ssl.X509TrustManager;

/**
 * Opens one TLS handshake to app.public-url (never a caller-supplied host) and reads the leaf certificate. The chain
 * is validated against the JDK trust store with hostname checking, but an untrusted or expired chain is still read
 * so the page can show why. Nothing is sent after the handshake.
 */
@Service
@Slf4j
public class TlsCertificateServiceImpl implements TlsCertificateService {
    static final long EXPIRING_DAYS = 14;
    static final Duration CACHE_FOR = Duration.ofHours(1);
    static final Duration FAILURE_CACHE_FOR = Duration.ofMinutes(10);
    static final int TIMEOUT_MS = 5_000;

    private final String publicUrl;
    private final Clock clock;
    private volatile TlsCertificateInfo cached;

    @Autowired
    public TlsCertificateServiceImpl(@Value("${app.public-url:}") String publicUrl) {
        this(publicUrl, Clock.systemUTC());
    }

    TlsCertificateServiceImpl(String publicUrl, Clock clock) {
        this.publicUrl = publicUrl == null ? "" : publicUrl.trim();
        this.clock = clock;
    }

    @Override
    public TlsCertificateInfo current() {
        Instant now = clock.instant();
        TlsCertificateInfo snapshot = cached;
        if (snapshot != null) {
            Duration ttl = snapshot.notAfter() != null ? CACHE_FOR : FAILURE_CACHE_FOR;
            if (snapshot.checkedAt().plus(ttl).isAfter(now)) return snapshot;
        }
        synchronized (this) {
            snapshot = cached;
            if (snapshot != null
                    && snapshot.checkedAt()
                            .plus(snapshot.notAfter() != null ? CACHE_FOR : FAILURE_CACHE_FOR)
                            .isAfter(now)) return snapshot;
            cached = probe(now);
            return cached;
        }
    }

    private TlsCertificateInfo probe(Instant now) {
        if (publicUrl.isEmpty()) return unknown("NOT_CONFIGURED", now, null);
        URI uri;
        try {
            uri = URI.create(publicUrl);
        } catch (IllegalArgumentException invalid) {
            return unknown("NOT_CONFIGURED", now, "IllegalArgumentException");
        }
        if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null)
            return unknown("NOT_HTTPS", now, null);
        int port = uri.getPort() > 0 ? uri.getPort() : 443;
        try {
            RecordingTrustManager trust = new RecordingTrustManager(defaultTrustManager());
            SSLContext context = SSLContext.getInstance("TLS");
            context.init(null, new TrustManager[] {trust}, null);
            try (Socket raw = new Socket()) {
                raw.connect(new InetSocketAddress(uri.getHost(), port), TIMEOUT_MS);
                raw.setSoTimeout(TIMEOUT_MS);
                try (SSLSocket socket =
                        (SSLSocket)
                                context.getSocketFactory()
                                        .createSocket(raw, uri.getHost(), port, false)) {
                    SSLParameters parameters = socket.getSSLParameters();
                    parameters.setEndpointIdentificationAlgorithm("HTTPS");
                    socket.setSSLParameters(parameters);
                    socket.startHandshake();
                    X509Certificate leaf =
                            (X509Certificate) socket.getSession().getPeerCertificates()[0];
                    Instant notAfter = leaf.getNotAfter().toInstant();
                    return new TlsCertificateInfo(
                            classify(notAfter, now),
                            notAfter,
                            daysLeft(notAfter, now),
                            commonName(leaf.getIssuerX500Principal().getName()),
                            trust.trusted.get(),
                            now,
                            null);
                }
            }
        } catch (Exception unreachable) {
            log.debug("TLS probe failed: {}", unreachable.getClass().getSimpleName());
            return unknown("UNREACHABLE", now, unreachable.getClass().getSimpleName());
        }
    }

    private static TlsCertificateInfo unknown(String status, Instant now, String errorClass) {
        return new TlsCertificateInfo(status, null, null, null, null, now, errorClass);
    }

    /** Whole days left, rounded down; negative once expired. */
    static long daysLeft(Instant notAfter, Instant now) {
        return Math.floorDiv(Duration.between(now, notAfter).getSeconds(), 86_400L);
    }

    static String classify(Instant notAfter, Instant now) {
        if (!notAfter.isAfter(now)) return "EXPIRED";
        return daysLeft(notAfter, now) < EXPIRING_DAYS ? "EXPIRING" : "OK";
    }

    /** CN of an X.500 name, falling back to O; the issuer is a CA name, never one of our hosts. */
    static String commonName(String distinguishedName) {
        try {
            String organization = null;
            for (Rdn rdn : new LdapName(distinguishedName).getRdns()) {
                if ("CN".equalsIgnoreCase(rdn.getType())) return String.valueOf(rdn.getValue());
                if ("O".equalsIgnoreCase(rdn.getType()))
                    organization = String.valueOf(rdn.getValue());
            }
            return organization;
        } catch (Exception invalid) {
            return null;
        }
    }

    private static X509ExtendedTrustManager defaultTrustManager() throws Exception {
        TrustManagerFactory factory =
                TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        factory.init((KeyStore) null);
        for (TrustManager manager : factory.getTrustManagers())
            if (manager instanceof X509ExtendedTrustManager extended) return extended;
        throw new IllegalStateException("No X509 trust manager");
    }

    /** Delegates validation to the JDK but records the verdict instead of aborting, so expiry stays readable. */
    private static final class RecordingTrustManager extends X509ExtendedTrustManager {
        private final X509ExtendedTrustManager delegate;
        private final AtomicBoolean trusted = new AtomicBoolean(false);

        RecordingTrustManager(X509ExtendedTrustManager delegate) {
            this.delegate = delegate;
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, Socket socket) {
            try {
                delegate.checkServerTrusted(chain, authType, socket);
                trusted.set(true);
            } catch (CertificateException | RuntimeException rejected) {
                trusted.set(false);
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType, SSLEngine engine) {
            try {
                delegate.checkServerTrusted(chain, authType, engine);
                trusted.set(true);
            } catch (CertificateException | RuntimeException rejected) {
                trusted.set(false);
            }
        }

        @Override
        public void checkServerTrusted(X509Certificate[] chain, String authType) {
            try {
                ((X509TrustManager) delegate).checkServerTrusted(chain, authType);
                trusted.set(true);
            } catch (CertificateException | RuntimeException rejected) {
                trusted.set(false);
            }
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, Socket socket)
                throws CertificateException {
            throw new CertificateException("Client certificates are not accepted");
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType, SSLEngine engine)
                throws CertificateException {
            throw new CertificateException("Client certificates are not accepted");
        }

        @Override
        public void checkClientTrusted(X509Certificate[] chain, String authType)
                throws CertificateException {
            throw new CertificateException("Client certificates are not accepted");
        }

        @Override
        public X509Certificate[] getAcceptedIssuers() {
            return delegate.getAcceptedIssuers();
        }
    }
}
