package com.uav.platform.service.infrastructure;

import com.uav.platform.dto.response.infrastructure.DatabaseStatusResponse;
import com.uav.platform.dto.response.infrastructure.DeploymentInfoResponse;
import com.uav.platform.dto.response.infrastructure.StorageStatusResponse;

public interface InfrastructureService {
    DeploymentInfoResponse deployment();

    StorageStatusResponse storage();

    DatabaseStatusResponse database();
}
