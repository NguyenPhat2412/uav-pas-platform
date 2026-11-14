package com.uav.platform.dto.request.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin record of money sent back for a transfer that could not settle its invoice. */
public record RefundTransactionRequest(
        @NotBlank @Size(max = 100) String bankReference, @Size(max = 380) String note) {}
