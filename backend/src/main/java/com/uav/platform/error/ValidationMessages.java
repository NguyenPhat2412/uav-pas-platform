package com.uav.platform.error;

import jakarta.validation.ConstraintViolation;

import org.springframework.validation.FieldError;

import java.util.Collection;
import java.util.Map;

/**
 * Vietnamese text for bean-validation errors whose DTO kept the library's default (English) message. A message
 * written on the annotation is returned unchanged; defaults are rebuilt from the constraint and its limits.
 */
final class ValidationMessages {
    private ValidationMessages() {}

    static String vietnamese(FieldError err) {
        ConstraintViolation<?> violation = unwrap(err);
        if (violation == null
                || !violation.getMessageTemplate().startsWith("{jakarta.validation.constraints."))
            return err.getDefaultMessage();
        Map<String, Object> a = violation.getConstraintDescriptor().getAttributes();
        Object value = violation.getInvalidValue();
        return switch (String.valueOf(err.getCode())) {
            case "NotBlank", "NotNull", "NotEmpty" -> "Vui lòng nhập thông tin này.";
            case "Size" -> size(value, (Integer) a.get("min"), (Integer) a.get("max"));
            case "Min", "DecimalMin" -> "Giá trị phải từ " + a.get("value") + " trở lên.";
            case "Max", "DecimalMax" -> "Giá trị không được vượt quá " + a.get("value") + ".";
            case "Positive" -> "Giá trị phải lớn hơn 0.";
            case "PositiveOrZero" -> "Giá trị không được âm.";
            case "Negative", "NegativeOrZero" -> "Giá trị không hợp lệ.";
            case "Digits" ->
                    "Tối đa "
                            + a.get("integer")
                            + " chữ số phần nguyên và "
                            + a.get("fraction")
                            + " chữ số thập phân.";
            case "Email" -> "Địa chỉ email không hợp lệ.";
            case "AssertTrue" -> "Vui lòng xác nhận mục này.";
            case "Pattern" -> "Định dạng không hợp lệ.";
            case "FutureOrPresent" -> "Ngày phải từ hôm nay trở đi.";
            case "Future" -> "Thời điểm phải ở tương lai.";
            case "Past", "PastOrPresent" -> "Thời điểm không được ở tương lai.";
            default -> err.getDefaultMessage();
        };
    }

    private static String size(Object value, int min, int max) {
        boolean list =
                value instanceof Collection<?> || (value != null && value.getClass().isArray());
        String unit = list ? "mục" : "ký tự";
        if (min > 0 && max < Integer.MAX_VALUE)
            return (list ? "Chọn từ " : "Độ dài từ ") + min + " đến " + max + " " + unit + ".";
        if (max < Integer.MAX_VALUE) return "Không được vượt quá " + max + " " + unit + ".";
        return "Cần ít nhất " + min + " " + unit + ".";
    }

    private static ConstraintViolation<?> unwrap(FieldError err) {
        try {
            return err.unwrap(ConstraintViolation.class);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
