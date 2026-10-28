package com.uav.platform.security;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientIpResolverTest {

    private static MockHttpServletRequest from(String remote) {
        var request = new MockHttpServletRequest();
        request.setRemoteAddr(remote);
        return request;
    }

    @Test
    void directClientsCannotChooseTheirAddressWithHeaders() {
        var request = from("203.0.113.9");
        request.addHeader("X-Real-IP", "1.2.3.4");
        request.addHeader("X-Forwarded-For", "1.2.3.4");
        assertEquals("203.0.113.9", ClientIpResolver.resolve(request));
    }

    @Test
    void localProxyHeadersAreUsed() {
        var request = from("127.0.0.1");
        request.addHeader("X-Real-IP", "198.51.100.4");
        assertEquals("198.51.100.4", ClientIpResolver.resolve(request));

        var docker = from("172.17.0.1");
        // Only the last hop was added by the proxy; earlier entries come from the client.
        docker.addHeader("X-Forwarded-For", "6.6.6.6, 198.51.100.5");
        assertEquals("198.51.100.5", ClientIpResolver.resolve(docker));

        assertEquals("127.0.0.1", ClientIpResolver.resolve(from("127.0.0.1")));
    }
}
