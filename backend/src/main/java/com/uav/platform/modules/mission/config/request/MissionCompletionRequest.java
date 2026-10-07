package com.uav.platform.modules.mission.config.request;


import com.uav.platform.modules.mission.common.*;

public record MissionCompletionRequest(String completionNote, String equipmentCondition) {}
