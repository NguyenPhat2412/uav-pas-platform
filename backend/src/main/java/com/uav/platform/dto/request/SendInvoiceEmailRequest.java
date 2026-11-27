package com.uav.platform.dto.request;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SendInvoiceEmailRequest(
        @Size(max = 255)
                @Pattern(
                        regexp = "^\\s*$|\\s*[^@\\s]+@[^@\\s]+\\.[^@\\s]+\\s*",
                        message = "Địa chỉ email nhận hóa đơn không hợp lệ.")
                String recipientEmail) {}
