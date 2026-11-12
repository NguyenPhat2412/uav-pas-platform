package com.uav.platform.service.impl.settings;

import com.uav.platform.dto.record.settings.SettingRule;
import com.uav.platform.entity.settings.SystemConfiguration;
import com.uav.platform.entity.settings.SystemConfigurationHistory;
import com.uav.platform.enums.settings.SettingValueType;
import com.uav.platform.error.SystemException;

import java.math.BigDecimal;
import java.net.URI;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

/** Internal creation and validation rules shared by application services and setup callers. */
public final class SystemConfigurationOperations {
    static final int MAX_VALUE_LENGTH = 500;
    private static final Pattern PHONE = Pattern.compile("\\+?[0-9][0-9 .()\\-]{4,22}[0-9]");
    private static final Pattern EMAIL =
            Pattern.compile("[A-Za-z0-9._%+\\-]{1,64}@[A-Za-z0-9.\\-]{1,190}\\.[A-Za-z]{2,24}");
    private static final Set<String> BOOLEANS = Set.of("true", "false");

    private SystemConfigurationOperations() {}

    public static SystemConfiguration create(
            String configKey,
            String configValue,
            String category,
            String description,
            String updatedBy) {
        SystemConfiguration entity = new SystemConfiguration();
        entity.setConfigKey(configKey);
        entity.setConfigValue(configValue);
        entity.setCategory(category != null ? category : "OPERATIONS");
        entity.setDescription(description);
        entity.setUpdatedBy(updatedBy);
        entity.setValueType(SettingValueType.STRING);
        return entity;
    }

    /** Creates a typed setting; bounds and choices may be null. */
    public static SystemConfiguration createTyped(
            String configKey,
            String configValue,
            String category,
            SettingValueType type,
            BigDecimal min,
            BigDecimal max,
            String allowedValues,
            boolean isPublic) {
        SystemConfiguration entity = create(configKey, configValue, category, null, "SYSTEM");
        entity.setValueType(type != null ? type : SettingValueType.STRING);
        entity.setMinValue(min);
        entity.setMaxValue(max);
        entity.setAllowedValues(allowedValues);
        entity.setPublicSetting(isPublic);
        return entity;
    }

    static SystemConfigurationHistory history(
            String key, String oldValue, String newValue, String changedBy) {
        SystemConfigurationHistory h = new SystemConfigurationHistory();
        h.setConfigKey(key);
        h.setOldValue(oldValue);
        h.setNewValue(newValue);
        h.setChangedBy(changedBy);
        h.setChangedAt(LocalDateTime.now());
        return h;
    }

    public static SettingValueType typeOf(SystemConfiguration c) {
        if ((c.getValueType() == null || c.getValueType() == SettingValueType.STRING)
                && untyped(c)
                && KNOWN.containsKey(c.getConfigKey())) return KNOWN.get(c.getConfigKey()).type();
        return c.getValueType() != null ? c.getValueType() : SettingValueType.STRING;
    }

    /**
     * Rules for keys other modules depend on, applied when a row carries no metadata (e.g. a
     * database where V27 metadata is absent). Mirrors V27.
     */
    private static final java.util.Map<String, SettingRule> KNOWN =
            java.util.Map.of(
                    "billing.vat_rate",
                    new SettingRule(
                            SettingValueType.DECIMAL, BigDecimal.ZERO, BigDecimal.ONE, null),
                    "billing.bank_bin",
                    new SettingRule(SettingValueType.STRING, null, null, "[0-9]{6}"),
                    "billing.bank_account_number",
                    new SettingRule(SettingValueType.STRING, null, null, "[0-9A-Za-z]{4,19}"),
                    "billing.bank_name",
                    new SettingRule(SettingValueType.STRING, null, BigDecimal.valueOf(120), null),
                    "billing.bank_account_name",
                    new SettingRule(SettingValueType.STRING, null, BigDecimal.valueOf(120), null),
                    "contact.dispatch_hotline",
                    new SettingRule(SettingValueType.PHONE, null, null, null),
                    "contact.zalo_phone",
                    new SettingRule(SettingValueType.PHONE, null, null, null),
                    "contact.email",
                    new SettingRule(SettingValueType.EMAIL, null, null, null),
                    "contact.address",
                    new SettingRule(SettingValueType.STRING, null, BigDecimal.valueOf(255), null));

    private static boolean untyped(SystemConfiguration c) {
        return c.getMinValue() == null
                && c.getMaxValue() == null
                && (c.getValuePattern() == null || c.getValuePattern().isBlank())
                && (c.getAllowedValues() == null || c.getAllowedValues().isBlank());
    }

    public static BigDecimal minOf(SystemConfiguration c) {
        SettingRule k = untyped(c) ? KNOWN.get(c.getConfigKey()) : null;
        return k != null ? k.min() : c.getMinValue();
    }

    public static BigDecimal maxOf(SystemConfiguration c) {
        SettingRule k = untyped(c) ? KNOWN.get(c.getConfigKey()) : null;
        return k != null ? k.max() : c.getMaxValue();
    }

    public static String patternOf(SystemConfiguration c) {
        SettingRule k = untyped(c) ? KNOWN.get(c.getConfigKey()) : null;
        return k != null ? k.pattern() : c.getValuePattern();
    }

    public static List<String> allowedValues(SystemConfiguration c) {
        if (c.getAllowedValues() == null || c.getAllowedValues().isBlank()) return List.of();
        return Arrays.stream(c.getAllowedValues().split(","))
                .map(String::trim)
                .filter(v -> !v.isEmpty())
                .toList();
    }

    /**
     * Billing payment keys fall back to app.billing.* when blank; contact keys are hidden when
     * blank. Flags and the approved hourly price keep their dedicated non-empty rules.
     */
    public static boolean emptyAllowed(SystemConfiguration c) {
        String key = c.getConfigKey() == null ? "" : c.getConfigKey();
        if (typeOf(c) == SettingValueType.BOOLEAN || typeOf(c) == SettingValueType.ENUM)
            return false;
        if ("billing.hourly_rate_vnd".equals(key)) return false;
        return key.startsWith("billing.") || key.startsWith("contact.");
    }

    /** Validates a candidate value against the setting's declared type; returns the stored form. */
    public static String validate(SystemConfiguration c, String raw) {
        if (raw == null) throw invalid("Vui lòng nhập giá trị cấu hình.", "SETTING_VALUE_REQUIRED");
        String value = raw.trim();
        if (value.length() > MAX_VALUE_LENGTH)
            throw invalid(
                    "Giá trị cấu hình không được vượt quá " + MAX_VALUE_LENGTH + " ký tự.",
                    "SETTING_VALUE_TOO_LONG");
        if (value.isEmpty()) {
            if (emptyAllowed(c)) return value;
            throw invalid("Vui lòng nhập giá trị cấu hình.", "SETTING_VALUE_REQUIRED");
        }
        switch (typeOf(c)) {
            case INTEGER -> {
                BigDecimal number;
                try {
                    number = new BigDecimal(value);
                    if (number.stripTrailingZeros().scale() > 0 || !value.matches("[+-]?\\d+"))
                        throw new NumberFormatException();
                } catch (NumberFormatException ex) {
                    throw invalid(
                            "Giá trị phải là số nguyên (không có phần thập phân).",
                            "SETTING_INVALID_INTEGER");
                }
                checkRange(c, number);
            }
            case DECIMAL -> {
                BigDecimal number;
                try {
                    if (!value.matches("[+-]?(\\d+(\\.\\d*)?|\\.\\d+)"))
                        throw new NumberFormatException();
                    number = new BigDecimal(value);
                } catch (NumberFormatException ex) {
                    throw invalid(
                            "Giá trị phải là số hợp lệ (dùng dấu chấm cho phần thập phân).",
                            "SETTING_INVALID_DECIMAL");
                }
                checkRange(c, number);
            }
            case BOOLEAN -> {
                if (!BOOLEANS.contains(value))
                    throw invalid(
                            "Giá trị bật/tắt phải là true hoặc false.", "SETTING_INVALID_BOOLEAN");
            }
            case ENUM -> {
                if (!allowedValues(c).contains(value))
                    throw invalid(
                            "Giá trị không nằm trong danh sách cho phép.",
                            "SETTING_INVALID_CHOICE");
            }
            case PHONE -> {
                long digits = value.chars().filter(Character::isDigit).count();
                if (!PHONE.matcher(value).matches() || digits < 3 || digits > 15)
                    throw invalid(
                            "Số điện thoại không đúng định dạng (3–15 chữ số).",
                            "SETTING_INVALID_PHONE");
            }
            case EMAIL -> {
                if (!EMAIL.matcher(value).matches() || value.contains(".."))
                    throw invalid("Địa chỉ email không đúng định dạng.", "SETTING_INVALID_EMAIL");
            }
            case URL -> {
                try {
                    URI uri = new URI(value);
                    String scheme = uri.getScheme();
                    if (scheme == null
                            || !(scheme.equalsIgnoreCase("https")
                                    || scheme.equalsIgnoreCase("http"))
                            || uri.getHost() == null) throw new IllegalArgumentException();
                } catch (Exception ex) {
                    throw invalid(
                            "Địa chỉ URL phải bắt đầu bằng http:// hoặc https://.",
                            "SETTING_INVALID_URL");
                }
            }
            case STRING -> {
                BigDecimal length = BigDecimal.valueOf(value.codePointCount(0, value.length()));
                BigDecimal min = minOf(c), max = maxOf(c);
                if ((min != null && length.compareTo(min) < 0)
                        || (max != null && length.compareTo(max) > 0))
                    throw invalid(lengthRangeMessage(min, max), "SETTING_LENGTH_OUT_OF_RANGE");
                String pattern = patternOf(c);
                if (pattern != null && !pattern.isBlank()) {
                    boolean matches;
                    try {
                        matches = Pattern.compile(pattern).matcher(value).matches();
                    } catch (PatternSyntaxException ex) {
                        matches = false;
                    }
                    if (!matches)
                        throw invalid(
                                "Giá trị không khớp định dạng yêu cầu.", "SETTING_INVALID_FORMAT");
                }
            }
        }
        return value;
    }

    private static void checkRange(SystemConfiguration c, BigDecimal number) {
        BigDecimal min = minOf(c), max = maxOf(c);
        if ((min != null && number.compareTo(min) < 0)
                || (max != null && number.compareTo(max) > 0))
            throw invalid(numericRangeMessage(min, max), "SETTING_OUT_OF_RANGE");
    }

    private static String numericRangeMessage(BigDecimal min, BigDecimal max) {
        if (min != null && max != null) {
            return "Giá trị phải nằm trong khoảng từ " + plain(min) + " đến " + plain(max) + ".";
        }
        if (min != null) return "Giá trị tối thiểu là " + plain(min) + ".";
        return "Giá trị tối đa là " + plain(max) + ".";
    }

    private static String lengthRangeMessage(BigDecimal min, BigDecimal max) {
        if (min != null && max != null) {
            return "Độ dài phải từ " + plain(min) + " đến " + plain(max) + " ký tự.";
        }
        if (min != null) return "Độ dài tối thiểu " + plain(min) + " ký tự.";
        return "Độ dài không được vượt quá " + plain(max) + " ký tự.";
    }

    private static String plain(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }

    private static SystemException invalid(String message, String code) {
        return SystemException.badRequest(message, code).at("configValue");
    }
}
