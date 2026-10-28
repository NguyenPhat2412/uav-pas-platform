package com.uav.platform.modules.infrastructure.dto.response;

import java.time.Instant;

/** Outcome of a test email to the calling admin. errorClass is the exception type only. */
public record EmailTestResponse(
        boolean success, String errorClass, String recipient, Instant attemptedAt) {}
