package com.uav.platform.modules.webhook.service;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import com.uav.platform.modules.webhook.transport.*;

import org.apache.hc.client5.http.DnsResolver;
import org.junit.jupiter.api.Test;

import java.net.*;
import java.util.concurrent.atomic.AtomicInteger;

class WebhookTransportTest {
    @Test
    void interruptIgnoringDnsStillHasHardDeadlineAndBoundedThreads() throws Exception {
        var release = new java.util.concurrent.CountDownLatch(1);
        var transport =
                new PinnedWebhookTransport(
                        host -> {
                            while (release.getCount() > 0)
                                try {
                                    release.await();
                                } catch (InterruptedException ignored) {
                                }
                            return new InetAddress[] {InetAddress.getByName("93.184.216.34")};
                        });
        var callers = java.util.concurrent.Executors.newFixedThreadPool(6);
        long start = System.nanoTime();
        try {
            var results = new java.util.ArrayList<java.util.concurrent.Future<?>>();
            for (int i = 0; i < 6; i++)
                results.add(
                        callers.submit(
                                () ->
                                        assertThrows(
                                                Exception.class,
                                                () ->
                                                        transport.post(
                                                                "https://fixture.test/events",
                                                                "{}",
                                                                "fixture",
                                                                "TEST",
                                                                "id"))));
            for (var result : results) result.get(3, java.util.concurrent.TimeUnit.SECONDS);
            assertTrue(
                    (System.nanoTime() - start) / 1_000_000 < 2500,
                    "DNS ignoring interrupt must not hold request executor close");
            assertTrue(
                    Thread.getAllStackTraces().keySet().stream()
                                    .filter(t -> t.getName().equals("webhook-dns"))
                                    .count()
                            <= 2);
        } finally {
            release.countDown();
            callers.shutdownNow();
        }
    }

    @Test
    void allAnswersCheckedAndRebindingRechecked() throws Exception {
        var publicIp = InetAddress.getByName("93.184.216.34");
        var local = InetAddress.getByName("127.0.0.1");
        var mixed = new PinnedWebhookTransport(host -> new InetAddress[] {publicIp, local});
        assertThrows(UnknownHostException.class, () -> mixed.resolver().resolve("fixture.test"));
        AtomicInteger calls = new AtomicInteger();
        var changing =
                new PinnedWebhookTransport(
                        host ->
                                new InetAddress[] {
                                    calls.getAndIncrement() == 0 ? publicIp : local
                                });
        assertEquals(publicIp, changing.resolver().resolve("fixture.test")[0]);
        assertThrows(UnknownHostException.class, () -> changing.resolver().resolve("fixture.test"));
    }

    @Test
    void actualConnectionUsesResolverAndNeverFollowsRedirect() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var hits = new AtomicInteger();
        var lookups = new AtomicInteger();
        server.createContext(
                "/target",
                ex -> {
                    hits.incrementAndGet();
                    ex.sendResponseHeaders(204, -1);
                    ex.close();
                });
        server.createContext(
                "/redirect",
                ex -> {
                    assertEquals("stable-event", ex.getRequestHeaders().getFirst("X-Event-Id"));
                    ex.getResponseHeaders().add("Location", "/target");
                    ex.sendResponseHeaders(302, -1);
                    ex.close();
                });
        server.start();
        try {
            var transport = localReceiverTransport(lookups);
            assertEquals(
                    302,
                    transport.post(
                            "http://fixture.test:" + server.getAddress().getPort() + "/redirect",
                            "{}",
                            "fixture",
                            "TEST",
                            "stable-event"));
            assertEquals(0, hits.get());
            assertEquals(1, lookups.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void privateDnsIsBlockedBeforeAnyConnection() throws Exception {
        AtomicInteger hits = new AtomicInteger();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext(
                "/",
                ex -> {
                    hits.incrementAndGet();
                    ex.sendResponseHeaders(204, -1);
                    ex.close();
                });
        server.start();
        try {
            var transport =
                    new PinnedWebhookTransport(
                            host -> new InetAddress[] {InetAddress.getByName("127.0.0.1")});
            assertThrows(
                    Exception.class,
                    () ->
                            transport.post(
                                    "http://fixture.test:" + server.getAddress().getPort() + "/",
                                    "{}",
                                    "fixture",
                                    "TEST",
                                    "id"));
            assertEquals(0, hits.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void nonSuccessAndOversizedAndTimeoutResponsesAreBounded() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor());
        server.createContext(
                "/reject",
                ex -> {
                    ex.sendResponseHeaders(503, -1);
                    ex.close();
                });
        server.createContext(
                "/large",
                ex -> {
                    byte[] body = new byte[20000];
                    ex.sendResponseHeaders(200, body.length);
                    ex.getResponseBody().write(body);
                    ex.close();
                });
        server.createContext(
                "/slow",
                ex -> {
                    try {
                        Thread.sleep(5000);
                    } catch (InterruptedException ignored) {
                    }
                    ex.close();
                });
        server.start();
        try {
            var transport = localReceiverTransport(new AtomicInteger());
            String base = "http://fixture.test:" + server.getAddress().getPort();
            assertEquals(503, transport.post(base + "/reject", "{}", "fixture", "TEST", "id"));
            assertThrows(
                    Exception.class,
                    () -> transport.post(base + "/large", "{}", "fixture", "TEST", "id"));
            long start = System.nanoTime();
            assertThrows(
                    Exception.class,
                    () -> transport.post(base + "/slow", "{}", "fixture", "TEST", "id"));
            assertTrue((System.nanoTime() - start) / 1_000_000 < 5000);
        } finally {
            server.stop(0);
        }
    }

    // This explicit test-only resolver allows a test-owned loopback receiver. Production never uses
    // it.
    private PinnedWebhookTransport localReceiverTransport(AtomicInteger calls) {
        return new PinnedWebhookTransport() {
            @Override
            public DnsResolver resolver() {
                return new DnsResolver() {
                    public InetAddress[] resolve(String host) throws UnknownHostException {
                        calls.incrementAndGet();
                        return new InetAddress[] {InetAddress.getByName("127.0.0.1")};
                    }

                    public String resolveCanonicalHostname(String host) {
                        return host;
                    }
                };
            }
        };
    }
}
