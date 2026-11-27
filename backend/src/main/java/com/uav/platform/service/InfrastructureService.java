package com.uav.platform.service;

import com.uav.platform.dto.response.DatabaseStatusResponse;
import com.uav.platform.dto.response.DeploymentInfoResponse;
import com.uav.platform.dto.response.StorageStatusResponse;

public interface InfrastructureService {
    DeploymentInfoResponse deployment();

    StorageStatusResponse storage();

    DatabaseStatusResponse database();
}
