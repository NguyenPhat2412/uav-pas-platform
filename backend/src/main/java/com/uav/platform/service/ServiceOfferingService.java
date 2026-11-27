package com.uav.platform.service;

import com.uav.platform.dto.request.ServiceOfferingRequest;
import com.uav.platform.dto.request.ServiceOfferingUpdateRequest;
import com.uav.platform.dto.response.ServiceOfferingResponse;

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
