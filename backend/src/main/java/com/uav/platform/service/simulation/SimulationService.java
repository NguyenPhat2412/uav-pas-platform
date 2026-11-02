package com.uav.platform.service.simulation;

import com.uav.platform.dto.request.simulation.SimulationStartRequest;
import com.uav.platform.dto.request.simulation.SurveyPlanRequest;
import com.uav.platform.dto.response.simulation.SimulationStateResponse;
import com.uav.platform.dto.response.simulation.SurveyPlanResponse;
import com.uav.platform.enums.simulation.SimCommand;

import java.util.List;

/**
 * Simulated UAV flights that feed the real telemetry pipeline, standing in for a PX4 SITL vehicle
 * and its ground-station bridge while no aircraft is flown.
 */
public interface SimulationService {
    SimulationStateResponse start(SimulationStartRequest request, String operator);

    SimulationStateResponse command(Long uavId, SimCommand command, String operator);

    void stop(Long uavId, String operator);

    SimulationStateResponse state(Long uavId);

    List<SimulationStateResponse> list();

    SurveyPlanResponse surveyPlan(SurveyPlanRequest request);
}
