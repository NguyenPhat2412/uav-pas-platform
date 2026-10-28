package com.uav.platform.modules.webhook.transport;

import org.apache.hc.client5.http.DnsResolver;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.util.Timeout;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.*;
import java.util.concurrent.*;

/** The connection manager consumes validated InetAddress objects directly; no second hostname lookup.
 * Fresh client per attempt avoids stale pooled DNS. Default TLS verifies the original URI hostname.
 */
@Component
public class PinnedWebhookTransport implements WebhookTransport {
    @FunctionalInterface
    public interface Lookup {
        InetAddress[] resolve(String host) throws UnknownHostException;
    }

    private static final ExecutorService DNS =
            new ThreadPoolExecutor(
                    2,
                    2,
                    0,
                    TimeUnit.MILLISECONDS,
                    new ArrayBlockingQueue<>(2),
                    runnable -> {
                        var thread = new Thread(runnable, "webhook-dns");
                        thread.setDaemon(true);
                        return thread;
                    },
                    new ThreadPoolExecutor.AbortPolicy());
    private final Lookup lookup;

    private InetAddress[] resolveBounded(String host) throws UnknownHostException {
        Future<InetAddress[]> future = null;
        try {
            future = DNS.submit(() -> lookup.resolve(host));
            return future.get(1, TimeUnit.SECONDS);
        } catch (Exception ex) {
            if (future != null) future.cancel(true);
            if (ex instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new UnknownHostException("DNS_UNAVAILABLE");
        }
    }

    public PinnedWebhookTransport() {
        this(InetAddress::getAllByName);
    }

    public PinnedWebhookTransport(Lookup lookup) {
        this.lookup = lookup;
    }

    public DnsResolver resolver() {
        return new DnsResolver() {
            public InetAddress[] resolve(String host) throws UnknownHostException {
                InetAddress[] answers = resolveBounded(host);
                if (answers.length == 0) throw new UnknownHostException("NO_DNS_ANSWERS");
                for (var answer : answers) PublicAddressPolicy.requirePublic(answer);
                return answers;
            }

            public String resolveCanonicalHostname(String host) {
                return host;
            }
        };
    }

    @Override
    public int post(
            String url,
            String payload,
            java.util.Map<String, String> signatureHeaders,
            String eventType,
            String eventId)
            throws Exception {
        URI uri = PublicAddressPolicy.parse(url);
        var request = new HttpPost(uri);
        request.setEntity(new StringEntity(payload, ContentType.APPLICATION_JSON));
        signatureHeaders.forEach(request::setHeader);
        request.setHeader("X-Event-Type", eventType);
        request.setHeader("X-Event-Id", eventId);
        var config =
                RequestConfig.custom()
                        .setConnectTimeout(Timeout.ofSeconds(2))
                        .setConnectionRequestTimeout(Timeout.ofSeconds(1))
                        .setResponseTimeout(Timeout.ofSeconds(2))
                        .setRedirectsEnabled(false)
                        .setContentCompressionEnabled(false)
                        .build();
        try (var manager =
                        PoolingHttpClientConnectionManagerBuilder.create()
                                .setDnsResolver(resolver())
                                .build();
                var client =
                        HttpClients.custom()
                                .setConnectionManager(manager)
                                .setDefaultRequestConfig(config)
                                .disableRedirectHandling()
                                .disableAutomaticRetries()
                                .disableCookieManagement()
                                .build();
                var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            Future<Integer> result =
                    executor.submit(
                            () ->
                                    client.execute(
                                            request,
                                            response -> {
                                                if (response.getEntity() != null) {
                                                    try (var input =
                                                            response.getEntity().getContent()) {
                                                        if (input.readNBytes(16_385).length
                                                                > 16_384)
                                                            throw new IOException(
                                                                    "RESPONSE_TOO_LARGE");
                                                    }
                                                }
                                                return response.getCode();
                                            }));
            try {
                return result.get(4, TimeUnit.SECONDS);
            } catch (TimeoutException ex) {
                request.cancel();
                result.cancel(true);
                throw new IOException("DELIVERY_TIMEOUT");
            }
        }
    }
}
