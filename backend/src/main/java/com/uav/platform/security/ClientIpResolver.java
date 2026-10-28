package com.uav.platform.security;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * Client address for throttling. Forwarding headers are trusted only when the direct peer is the
 * local reverse proxy (loopback or private network, as with the bundled nginx); otherwise a client
 * could pick its own address by sending the header.
 */
public final class ClientIpResolver {

    private ClientIpResolver() {}

    public static String resolve(HttpServletRequest request) {
        if (request == null) return null;
        String remote = request.getRemoteAddr();
        if (!isTrustedProxy(remote)) return remote;
        // nginx sets X-Real-IP to the peer it saw, overwriting anything the client sent.
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) return realIp.trim();
        // $proxy_add_x_forwarded_for appends the true peer last; earlier entries are
        // client-supplied.
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            String[] parts = forwarded.split(",");
            String last = parts[parts.length - 1].trim();
            if (!last.isEmpty()) return last;
        }
        return remote;
    }

    static boolean isTrustedProxy(String address) {
        if (address == null || address.isBlank()) return false;
        // Only literal addresses; never resolve names here.
        if (!address.matches("[0-9a-fA-F:.\\[\\]%]+")) return false;
        try {
            InetAddress inet = InetAddress.getByName(address.replace("[", "").replace("]", ""));
            return inet.isLoopbackAddress() || inet.isSiteLocalAddress();
        } catch (UnknownHostException e) {
            return false;
        }
    }
}
