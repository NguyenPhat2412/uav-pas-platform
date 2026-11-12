package com.uav.platform.service.impl.billing;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.billing.ServicePlanRequest;
import com.uav.platform.dto.request.billing.ServicePlanUpdateRequest;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.error.SystemException;
import com.uav.platform.mapper.billing.BillingMapper;
import com.uav.platform.repository.billing.ServicePlanRepository;
import com.uav.platform.service.audit.AuditLogService;

import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.math.BigDecimal;
import java.util.Optional;

class PlanAdministrationServiceTest {
    private final ServicePlanRepository repository = mock(ServicePlanRepository.class);
    private final PlanAdministrationServiceImpl service =
            new PlanAdministrationServiceImpl(
                    repository,
                    Mappers.getMapper(BillingMapper.class),
                    mock(AuditLogService.class));

    private ServicePlan plan(String code) {
        ServicePlan p = new ServicePlan();
        p.setCode(code);
        p.setName("Plan");
        p.setActive(true);
        when(repository.findById(1L)).thenReturn(Optional.of(p));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return p;
    }

    @Test
    void createRejectsADuplicateCode() {
        when(repository.findByCode("PRO")).thenReturn(Optional.of(new ServicePlan()));
        SystemException e =
                assertThrows(
                        SystemException.class,
                        () ->
                                service.create(
                                        new ServicePlanRequest(
                                                "PRO",
                                                "Pro",
                                                BigDecimal.TEN,
                                                "MONTHLY",
                                                40.0,
                                                2,
                                                true,
                                                null),
                                        "admin"));
        assertEquals(PlanAdministrationServiceImpl.PLAN_EXISTS, e.getMessage());
    }

    @Test
    void updateAppliesEveryTermButKeepsTheCode() {
        plan("PRO");
        var r =
                service.update(
                        1L,
                        new ServicePlanUpdateRequest(
                                " Pro+ ", new BigDecimal("990000"), "YEARLY", 60.0, 3, true, " "),
                        "admin");
        assertEquals("PRO", r.code());
        assertEquals("Pro+", r.name());
        assertEquals("YEARLY", r.billingCycle());
        assertEquals(3, r.maxConcurrentUavs());
        assertTrue(r.allowSarAi());
        assertNull(r.description());
    }

    @Test
    void everyPlanCanBeHiddenAndShownIncludingBasic() {
        plan("BASIC");
        assertFalse(service.setActive(1L, false, "admin").active());
        assertTrue(service.setActive(1L, true, "admin").active());
    }
}
