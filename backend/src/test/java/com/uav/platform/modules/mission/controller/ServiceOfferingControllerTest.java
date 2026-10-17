package com.uav.platform.modules.mission.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.modules.audit.enums.*;
import com.uav.platform.modules.inventory.enums.*;
import com.uav.platform.modules.media.enums.*;
import com.uav.platform.modules.mission.entity.ServiceOffering;
import com.uav.platform.modules.mission.enums.*;
import com.uav.platform.modules.mission.repository.ServiceOfferingRepository;
import com.uav.platform.modules.station.enums.*;
import com.uav.platform.modules.uav.enums.*;

import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

class ServiceOfferingControllerTest {
    @Test
    void listQueriesOnlyActiveServicesWithSpecification() {
        ServiceOfferingRepository repository = mock(ServiceOfferingRepository.class);
        ServiceOffering active = new ServiceOffering("MAPPING", "Mapping", null, 30);
        when(repository.findAll(any(Specification.class))).thenReturn(List.of(active));

        var response = new ServiceOfferingController(repository).list();

        assertEquals(1, response.getBody().size());
        verify(repository).findAll(any(Specification.class));
        verify(repository, never()).findAll();
    }
}
