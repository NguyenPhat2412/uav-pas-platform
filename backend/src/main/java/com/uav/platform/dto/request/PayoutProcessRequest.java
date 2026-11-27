package com.uav.platform.dto.request;

import jakarta.validation.constraints.Size;

public record PayoutProcessRequest(
        boolean approve,
        @Size(max = 120) String bankTransferRef,
        @Size(max = 500) String adminNote) {}
