package com.uav.platform.transport.webhook;

import com.uav.platform.error.SystemException;

import java.net.*;
import java.util.Locale;

/** Conservative public-unicast policy; literal IPs and every DNS answer use the same rules. */
public final class PublicAddressPolicy {
    private PublicAddressPolicy() {}

    public static URI parse(String url) {
        try {
            URI uri = URI.create(url.trim());
            String host = uri.getHost();
            if (!("https".equalsIgnoreCase(uri.getScheme())
                            || "http".equalsIgnoreCase(uri.getScheme()))
                    || host == null
                    || uri.getRawUserInfo() != null
                    || uri.getRawFragment() != null
                    || uri.getPort() == 0
                    || uri.getPort() > 65535) throw new IllegalArgumentException();
            host = host.toLowerCase(Locale.ROOT).replace("[", "").replace("]", "");
            if (host.equals("localhost")
                    || !host.contains(".") && !host.contains(":")
                    || host.endsWith(".local")
                    || host.endsWith(".internal")) throw new IllegalArgumentException();
            if (host.contains(":") || host.matches("[0-9.]+"))
                requirePublic(InetAddress.getByName(host));
            return uri;
        } catch (Exception ex) {
            throw new SystemException(
                    "Webhook URL must target a public HTTP(S) endpoint without credentials or fragments",
                    org.springframework.http.HttpStatus.BAD_REQUEST,
                    "UNSAFE_WEBHOOK_URL");
        }
    }

    public static void requirePublic(InetAddress address) throws UnknownHostException {
        byte[] b = address.getAddress();
        boolean publicAddress;
        if (b.length == 4) {
            int a = b[0] & 255, c = b[1] & 255, d = b[2] & 255;
            publicAddress =
                    a > 0
                            && a < 224
                            && a != 10
                            && a != 127
                            && !(a == 100 && c >= 64 && c <= 127)
                            && !(a == 169 && c == 254)
                            && !(a == 172 && c >= 16 && c <= 31)
                            && !(a == 192 && c == 168)
                            && !(a == 192 && c == 0)
                            && !(a == 192 && c == 88 && d == 99)
                            && !(a == 198 && (c == 18 || c == 19 || c == 51 && d == 100))
                            && !(a == 203 && c == 0 && d == 113);
        } else {
            // Only currently allocated global unicast 2000::/3; exclude
            // special/documentation/transition ranges.
            int a = b[0] & 255, c = b[1] & 255, d = b[2] & 255, e = b[3] & 255;
            publicAddress =
                    (a & 0xe0) == 0x20
                            && !(a == 0x20 && c == 0x01 && d < 2)
                            && !(a == 0x20 && c == 0x01 && d == 0x0d && e == 0xb8)
                            && !(a == 0x20 && c == 0x02)
                            && !(a == 0x3f && c == 0xff);
        }
        if (!publicAddress
                || address.isAnyLocalAddress()
                || address.isLoopbackAddress()
                || address.isLinkLocalAddress()
                || address.isSiteLocalAddress()
                || address.isMulticastAddress())
            throw new UnknownHostException("NON_PUBLIC_ADDRESS");
    }
}
