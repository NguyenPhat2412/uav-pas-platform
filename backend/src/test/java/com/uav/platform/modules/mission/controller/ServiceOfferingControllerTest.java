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

        var response =
                new ServiceOfferingController(
                                new com.uav.platform.modules.mission.service.impl
                                        .ServiceOfferingServiceImpl(repository))
                        .list();

        assertEquals(1, response.getBody().size());
        verify(repository).findAll(any(Specification.class));
        verify(repository, never()).findAll();
    }

    @Test
    void invalidDurationIsRejectedBeforePersistence() {
        var repository = mock(ServiceOfferingRepository.class);
        var service =
                new com.uav.platform.modules.mission.service.impl.ServiceOfferingServiceImpl(
                        repository);
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.create(
                                new com.uav.platform.modules.mission.dto.request
                                        .ServiceOfferingRequest("BAD", "Invalid", null, 0)));
        verify(repository, never()).save(any());
    }

    @Test
    void duplicateCodeIsRejectedBeforePersistence() {
        var repository = mock(ServiceOfferingRepository.class);
        when(repository.findByCode("EXISTING"))
                .thenReturn(
                        java.util.Optional.of(
                                new ServiceOffering("EXISTING", "Existing", null, 30)));
        var service =
                new com.uav.platform.modules.mission.service.impl.ServiceOfferingServiceImpl(
                        repository);
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class,
                () ->
                        service.create(
                                new com.uav.platform.modules.mission.dto.request
                                        .ServiceOfferingRequest(
                                        "EXISTING", "Duplicate", null, 30)));
        verify(repository, never()).save(any());
    }
}
