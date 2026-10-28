package com.uav.platform.modules.infrastructure.dto.record;

import java.time.Instant;

/** Result of an SMTP connect-and-authenticate probe (no message is sent). status is UP, DOWN or DISABLED. */
public record MailConnectionCheck(String status, Instant checkedAt, String errorClass) {}
