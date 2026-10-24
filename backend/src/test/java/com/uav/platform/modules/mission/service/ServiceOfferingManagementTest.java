package com.uav.platform.modules.mission.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.error.SystemException;
import com.uav.platform.modules.mission.dto.request.ServiceOfferingUpdateRequest;
import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;
import com.uav.platform.modules.mission.entity.ServiceOffering;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.mission.service.impl.ServiceOfferingOperations;
import com.uav.platform.modules.mission.service.impl.ServiceOfferingServiceImpl;

import org.junit.jupiter.api.Test;

import java.util.Optional;

class ServiceOfferingManagementTest {
    private final ServiceOfferingRepository repository = mock(ServiceOfferingRepository.class);
    private final ServiceOfferingServiceImpl service = new ServiceOfferingServiceImpl(repository);

    private ServiceOffering existing() {
        ServiceOffering s = ServiceOfferingOperations.create("SURVEY", "Khảo sát", "cũ", 60);
        when(repository.findById(5L)).thenReturn(Optional.of(s));
        when(repository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        return s;
    }

    @Test
    void updateKeepsTheCodeAndTrimsFields() {
        existing();
        ServiceOfferingResponse r = service.update(5L, new ServiceOfferingUpdateRequest("  Khảo sát địa hình ", "  ", 90));
        assertEquals("SURVEY", r.code());
        assertEquals("Khảo sát địa hình", r.name());
        assertNull(r.description());
        assertEquals(90, r.defaultDurationMinutes());
    }

    @Test
    void specsAreStoredAndSensorsDeduplicated() {
        existing();
        ServiceOfferingResponse r = service.update(5L, new ServiceOfferingUpdateRequest("Khảo sát", null, 60,
                java.util.List.of("RGB_4K", "LIDAR", "RGB_4K"), 1.5, 200.0, 10.0, 48, 72));
        assertEquals(java.util.List.of("RGB_4K", "LIDAR"), r.sensors());
        assertEquals(1.5, r.bestGsdCm());
        assertEquals(72, r.deliveryHours());
        ServiceOfferingResponse cleared = service.update(5L, new ServiceOfferingUpdateRequest("Khảo sát", null, 60));
        assertTrue(cleared.sensors().isEmpty());
        assertNull(cleared.onSiteHours());
    }

    @Test
    void togglingActiveFlipsTheFlag() {
        existing();
        assertFalse(service.setActive(5L, false).active());
        assertTrue(service.setActive(5L, true).active());
    }

    @Test
    void unknownServiceIsNotFound() {
        when(repository.findById(9L)).thenReturn(Optional.empty());
        assertThrows(SystemException.class, () -> service.setActive(9L, true));
    }
}
