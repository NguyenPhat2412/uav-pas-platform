package com.uav.platform.service.mission;

import com.uav.platform.dto.request.mission.ServiceOfferingRequest;
import com.uav.platform.dto.request.mission.ServiceOfferingUpdateRequest;
import com.uav.platform.dto.response.mission.ServiceOfferingResponse;

import java.util.List;

public interface ServiceOfferingService {
    List<ServiceOfferingResponse> list();

    ServiceOfferingResponse create(ServiceOfferingRequest request);

    /** Every service including deactivated ones, for catalog management. */
    List<ServiceOfferingResponse> listAll();

    ServiceOfferingResponse update(Long id, ServiceOfferingUpdateRequest request);

    /** Deactivated services disappear from the customer catalog; existing missions keep their reference. */
    ServiceOfferingResponse setActive(Long id, boolean active);
}
