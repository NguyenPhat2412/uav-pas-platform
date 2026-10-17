package com.uav.platform.modules.mission.service;

import com.uav.platform.modules.mission.dto.request.ServiceOfferingRequest;
import com.uav.platform.modules.mission.dto.response.ServiceOfferingResponse;

import java.util.List;

public interface ServiceOfferingService {
    List<ServiceOfferingResponse> list();

    ServiceOfferingResponse create(ServiceOfferingRequest request);
}
