package com.uav.platform.dto.record.infrastructure;

import java.time.Instant;

/** Result of an SMTP connect-and-authenticate probe (no message is sent). status is UP, DOWN or DISABLED. */
public record MailConnectionCheck(String status, Instant checkedAt, String errorClass) {}
