package com.uav.platform.modules.mission.controller;

import com.uav.platform.modules.user.common.*;
import com.uav.platform.modules.uav.common.*;
import com.uav.platform.modules.station.common.*;
import com.uav.platform.modules.inventory.common.*;
import com.uav.platform.modules.media.common.*;
import com.uav.platform.modules.audit.common.*;
import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.UavService;
import com.uav.platform.modules.mission.repository.UavServiceRepository;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UavServiceControllerTest {
    @Test
    void listQueriesOnlyActiveServicesWithSpecification() {
        UavServiceRepository repository = mock(UavServiceRepository.class);
        UavService active = new UavService("MAPPING", "Mapping", null, 30);
        when(repository.findAll(any(Specification.class))).thenReturn(List.of(active));

        var response = new UavServiceController(repository).list();

        assertEquals(1, response.getBody().size());
        verify(repository).findAll(any(Specification.class));
        verify(repository, never()).findAll();
    }
}
