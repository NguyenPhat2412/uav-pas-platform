package com.uav.platform.modules.infrastructure.service;

import com.uav.platform.modules.infrastructure.dto.response.DatabaseStatusResponse;
import com.uav.platform.modules.infrastructure.dto.response.DeploymentInfoResponse;
import com.uav.platform.modules.infrastructure.dto.response.StorageStatusResponse;

public interface InfrastructureService {
    DeploymentInfoResponse deployment();

    StorageStatusResponse storage();

    DatabaseStatusResponse database();
}
