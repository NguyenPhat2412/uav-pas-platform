package com.uav.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class UavPlatformApplication {
    /**
     * Business time zone. Every LocalDateTime (mission schedule, telemetry clock-skew checks,
     * maintenance due dates, device-key expiry) is read and stored in this zone, whatever the host
     * clock says. Override with APP_TIME_ZONE only for a deployment outside Vietnam.
     */
    public static final String BUSINESS_TIME_ZONE = "Asia/Ho_Chi_Minh";

    public static void main(String[] args) {
        TimeZone.setDefault(
                TimeZone.getTimeZone(
                        System.getenv().getOrDefault("APP_TIME_ZONE", BUSINESS_TIME_ZONE)));
        SpringApplication.run(UavPlatformApplication.class, args);
    }
}
