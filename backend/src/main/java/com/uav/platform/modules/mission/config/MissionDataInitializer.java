package com.uav.platform.modules.mission.config;


import com.uav.platform.modules.mission.common.*;

import com.uav.platform.modules.mission.entity.UavService;
import com.uav.platform.modules.mission.repository.UavServiceRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class MissionDataInitializer implements ApplicationRunner {
    private final UavServiceRepository services;
    public MissionDataInitializer(UavServiceRepository services) { this.services = services; }
    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        seed("UAV_RENTAL", "Basic UAV Rental", "Thuê UAV cơ bản", 60);
        seed("AREA_INSPECTION", "Area Inspection", "Khảo sát khu vực", 120);
        seed("AERIAL_RECORDING", "Aerial Video Recording", "Quay video trên không", 90);
        seed("DATA_COLLECTION", "Data Collection", "Thu thập dữ liệu", 120);
    }
    private void seed(String code, String name, String description, int minutes) {
        if (services.findByCode(code).isEmpty()) services.save(new UavService(code, name, description, minutes));
    }
}
