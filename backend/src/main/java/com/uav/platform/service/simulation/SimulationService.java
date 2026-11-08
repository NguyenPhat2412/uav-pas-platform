package com.uav.platform.service.simulation;

import com.uav.platform.dto.request.simulation.SimulationStartRequest;
import com.uav.platform.dto.request.simulation.SurveyPlanRequest;
import com.uav.platform.dto.response.simulation.SimulationRunLogResponse;
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

    SimulationStateResponse rehearseMission(
            Long missionId,
            Double windSpeedMs,
            Double windDirectionDeg,
            Double timeScale,
            String operator);

    SimulationStateResponse command(Long uavId, SimCommand command, String operator);

    void stop(Long uavId, String operator);

    SimulationStateResponse state(Long uavId);

    List<SimulationStateResponse> list();

    List<SimulationRunLogResponse> runs(Long uavId, Long missionId);

    SurveyPlanResponse surveyPlan(SurveyPlanRequest request);
}
