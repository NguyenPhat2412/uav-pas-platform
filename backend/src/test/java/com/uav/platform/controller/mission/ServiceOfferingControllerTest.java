package com.uav.platform.controller.mission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;
import com.uav.platform.repository.mission.ServiceOfferingRepository;

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
                                new com.uav.platform.service.impl.mission
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
                new com.uav.platform.service.impl.mission.ServiceOfferingServiceImpl(repository);
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.create(
                                new com.uav.platform.dto.request.mission.ServiceOfferingRequest(
                                        "BAD", "Invalid", null, 0)));
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
                new com.uav.platform.service.impl.mission.ServiceOfferingServiceImpl(repository);
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class,
                () ->
                        service.create(
                                new com.uav.platform.dto.request.mission.ServiceOfferingRequest(
                                        "EXISTING", "Duplicate", null, 30)));
        verify(repository, never()).save(any());
    }
}
