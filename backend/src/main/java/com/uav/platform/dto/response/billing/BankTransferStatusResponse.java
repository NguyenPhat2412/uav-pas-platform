package com.uav.platform.dto.response.billing;

/** Whether customers can pay by VietQR bank transfer; no account details are exposed here. */
public record BankTransferStatusResponse(boolean enabled, String bankName) {}
