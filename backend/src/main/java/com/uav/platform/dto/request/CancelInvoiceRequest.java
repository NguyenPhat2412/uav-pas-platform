package com.uav.platform.dto.request;

import jakarta.validation.constraints.Size;

/** Optional reason shown on the cancelled invoice. */
public record CancelInvoiceRequest(@Size(max = 200) String reason) {}
