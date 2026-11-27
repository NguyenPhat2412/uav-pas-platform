package com.uav.platform.enums;

public enum InvoiceStatus {
    PENDING,
    PAID,
    FAILED,
    CANCELLED,
    /** A plan invoice left unpaid past its due date; a late transfer is kept for refund. */
    EXPIRED
}
