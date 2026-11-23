package com.uav.platform.controller.mission;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.uav.platform.controller.mission.catalog.ServiceOfferingController;
import com.uav.platform.dao.base.HibernateSpecification;
import com.uav.platform.dao.mission.IServiceOfferingDao;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.enums.audit.*;
import com.uav.platform.enums.inventory.*;
import com.uav.platform.enums.media.*;
import com.uav.platform.enums.mission.*;
import com.uav.platform.enums.station.*;
import com.uav.platform.enums.uav.*;

import org.junit.jupiter.api.Test;

import java.util.List;

class ServiceOfferingControllerTest {
    @Test
    void listQueriesOnlyActiveServicesWithSpecification() {
        IServiceOfferingDao repository = mock(IServiceOfferingDao.class);
        ServiceOffering active = new ServiceOffering("MAPPING", "Mapping", null, 30);
        when(repository.findAll(any(HibernateSpecification.class))).thenReturn(List.of(active));

        var response =
                new ServiceOfferingController(
                                new com.uav.platform.service.impl.mission.catalog
                                        .ServiceOfferingServiceImpl(repository))
                        .list();

        assertEquals(1, response.getBody().size());
        verify(repository).findAll(any(HibernateSpecification.class));
        verify(repository, never()).findAll();
    }

    @Test
    void invalidDurationIsRejectedBeforePersistence() {
        var repository = mock(IServiceOfferingDao.class);
        var service =
                new com.uav.platform.service.impl.mission.catalog.ServiceOfferingServiceImpl(
                        repository);
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class,
                () ->
                        service.create(
                                new com.uav.platform.dto.request.mission.catalog
                                        .ServiceOfferingRequest("BAD", "Invalid", null, 0)));
        verify(repository, never()).save(any());
    }

    @Test
    void duplicateCodeIsRejectedBeforePersistence() {
        var repository = mock(IServiceOfferingDao.class);
        when(repository.findByCode("EXISTING"))
                .thenReturn(
                        java.util.Optional.of(
                                new ServiceOffering("EXISTING", "Existing", null, 30)));
        var service =
                new com.uav.platform.service.impl.mission.catalog.ServiceOfferingServiceImpl(
                        repository);
        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalStateException.class,
                () ->
                        service.create(
                                new com.uav.platform.dto.request.mission.catalog
                                        .ServiceOfferingRequest(
                                        "EXISTING", "Duplicate", null, 30)));
        verify(repository, never()).save(any());
    }
}
