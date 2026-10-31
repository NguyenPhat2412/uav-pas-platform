package com.uav.platform.error;

import static org.junit.jupiter.api.Assertions.*;

import com.uav.platform.common.util.PhoneNumbers;
import com.uav.platform.dto.request.billing.UpdateQuotaRequest;
import com.uav.platform.dto.request.inventory.EquipmentRequest;
import com.uav.platform.dto.request.inventory.QuantityRequest;
import com.uav.platform.dto.request.mission.MissionCreateRequest;
import com.uav.platform.enums.inventory.EquipmentType;
import com.uav.platform.enums.mission.MissionType;
import com.uav.platform.service.impl.mission.MissionInputOperations;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;

import org.junit.jupiter.api.Test;
import org.springframework.validation.FieldError;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/** Rules moved off the frontend: each must be enforced here and come back in Vietnamese on its field. */
class ServerSideValidationTest {
    private static final Validator VALIDATOR =
            Validation.buildDefaultValidatorFactory().getValidator();

    /** Field name to the message the API would return for it. */
    private static <T> Map<String, String> fields(T dto) {
        Set<ConstraintViolation<T>> violations = VALIDATOR.validate(dto);
        return violations.stream()
                .collect(
                        Collectors.toMap(
                                v -> v.getPropertyPath().toString(),
                                v -> {
                                    String constraint =
                                            v.getConstraintDescriptor()
                                                    .getAnnotation()
                                                    .annotationType()
                                                    .getSimpleName();
                                    FieldError err =
                                            new FieldError(
                                                    "dto",
                                                    v.getPropertyPath().toString(),
                                                    v.getInvalidValue(),
                                                    false,
                                                    new String[] {constraint},
                                                    null,
                                                    v.getMessage());
                                    err.wrap(v);
                                    return ValidationMessages.vietnamese(err);
                                },
                                (a, b) -> a));
    }

    @Test
    void phoneNumbersAreNormalisedTheSameWayEverywhere() {
        assertEquals("0901234567", PhoneNumbers.normalizeVietnam("+84 901 234 567"));
        assertEquals("02439876543", PhoneNumbers.normalizeVietnam("(024) 3987-6543"));
        assertEquals("0901234567", PhoneNumbers.normalizeVietnam("84901234567"));
        for (String bad :
                new String[] {"abc", "12345", "0901 234 56", "+1 415 555 0100", "091234567890"})
            assertNull(PhoneNumbers.normalizeVietnam(bad), bad);
    }

    @Test
    void missionEndMustFollowStartAndNamesTheField() {
        LocalDateTime start = LocalDateTime.of(2030, 5, 1, 10, 0);
        SystemException e =
                assertThrows(
                        SystemException.class,
                        () -> MissionInputOperations.checkSchedule(start, start));
        assertEquals("MISSION_END_BEFORE_START", e.getCode());
        assertEquals("expectedEndTime", e.getField());
        assertDoesNotThrow(() -> MissionInputOperations.checkSchedule(start, start.plusHours(1)));
    }

    @Test
    void missionLimitsTheFormUsedToCheckAreNowOnTheRequest() {
        var request =
                new MissionCreateRequest(
                        MissionType.AREA_INSPECTION,
                        "x".repeat(181),
                        "d".repeat(2001),
                        LocalDate.now().plusDays(1),
                        LocalDateTime.now().plusDays(1),
                        LocalDateTime.now().plusDays(1).plusHours(1),
                        "l".repeat(256),
                        new BigDecimal("91"),
                        new BigDecimal("-181"),
                        null,
                        null,
                        null);
        Map<String, String> f = fields(request);
        assertEquals("Tiêu đề không được vượt quá 180 ký tự.", f.get("title"));
        assertEquals("Địa điểm không được vượt quá 255 ký tự.", f.get("locationName"));
        assertEquals("Mô tả không được vượt quá 2.000 ký tự.", f.get("description"));
        assertEquals("Vĩ độ phải từ -90 đến 90.", f.get("latitude"));
        assertEquals("Kinh độ phải từ -180 đến 180.", f.get("longitude"));
    }

    @Test
    void equipmentAndQuotaGainTheLimitsTheFormsHad() {
        assertEquals(
                "Tên thiết bị không được vượt quá 100 ký tự.",
                fields(new EquipmentRequest("n".repeat(101), EquipmentType.BATTERY, null, null))
                        .get("name"));
        assertEquals(
                "Hạn mức giờ bay từ 5 đến 1.000 giờ.",
                fields(new UpdateQuotaRequest("PRO", 1001.0)).get("flightHoursLimit"));
        assertEquals(
                "Hạn mức giờ bay từ 5 đến 1.000 giờ.",
                fields(new UpdateQuotaRequest("PRO", 4.0)).get("flightHoursLimit"));
    }

    @Test
    void libraryDefaultMessagesAreReturnedInVietnamese() {
        Map<String, String> f = fields(new QuantityRequest(0, "n".repeat(256)));
        assertEquals("Giá trị phải từ 1 trở lên.", f.get("quantity"));
        assertEquals("Không được vượt quá 255 ký tự.", f.get("note"));
    }
}
