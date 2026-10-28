package com.uav.platform.modules.infrastructure.dto.response;

import com.uav.platform.modules.infrastructure.dto.record.TlsCertificateInfo;

import java.time.Instant;
import java.util.List;

/** Build, runtime and schema facts about the running backend. No hostnames, credentials or env values. */
public record DeploymentInfoResponse(
        String version,
        String gitCommit,
        String buildTime,
        List<String> activeProfiles,
        String javaVersion,
        String javaVendor,
        Instant startedAt,
        long uptimeSeconds,
        String timeZone,
        Instant serverTime,
        String publicUrl,
        String flywayVersion,
        List<Migration> migrations,
        TlsCertificateInfo tls) {

    public record Migration(
            String version,
            String description,
            Instant installedOn,
            Integer executionTimeMs,
            boolean success) {}
}
