package com.uav.platform.dto.request.billing;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Admin confirmation of a bank transfer seen on the account statement. */
public record ManualPaymentRequest(@NotBlank @Size(max = 100) String bankReference) {}
