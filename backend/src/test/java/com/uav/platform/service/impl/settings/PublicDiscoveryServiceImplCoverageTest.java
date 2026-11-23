package com.uav.platform.service.impl.settings;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.uav.platform.dao.billing.IServicePlanDao;
import com.uav.platform.dao.mission.IServiceOfferingDao;
import com.uav.platform.dao.training.ITrainingDocumentDao;
import com.uav.platform.dto.response.settings.PublicDiscoveryResponse;
import com.uav.platform.dto.response.settings.PublicSiteInfoResponse;
import com.uav.platform.entity.billing.ServicePlan;
import com.uav.platform.entity.mission.ServiceOffering;
import com.uav.platform.entity.training.TrainingDocument;
import com.uav.platform.service.settings.SystemConfigService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@ExtendWith(MockitoExtension.class)
class PublicDiscoveryServiceImplCoverageTest {

    @Mock private IServiceOfferingDao serviceOfferingRepository;
    @Mock private IServicePlanDao servicePlanRepository;
    @Mock private ITrainingDocumentDao trainingDocumentRepository;
    @Mock private SystemConfigService systemConfigService;

    @InjectMocks private PublicDiscoveryServiceImpl service;

    @Test
    void getPublicDiscoveryFiltersSortsLimitsAndMapsAllFields() {
        List<ServiceOffering> offerings =
                List.of(
                        offering("SURVEY_READ", "Read Only", "Internal", 30, "RGB", 10.0),
                        offering("SURVEY", "Survey", "Topo", 45, "RGB,LIDAR", 120.5),
                        offering("SPRAY", "Spray", "Agri", 60, "NOZZLE", 80.0),
                        offering("INSPECT", "Inspect", "Powerline", 50, "THERMAL", 40.0),
                        offering("SAR", "Search Rescue", "Night SAR", 90, "EO,IR", 200.0),
                        offering("MAP", "Mapping", "3D", 70, "RGB", 150.0),
                        offering("EXTRA", "Extra", "Overflow", 20, "RGB", 15.0));

        List<ServicePlan> plans =
                List.of(
                        plan("ENT", "Enterprise", "5000000", 200.0, 10, true),
                        plan("FREE", "Starter", "0", 5.0, 1, false),
                        plan("PRO", "Pro", "1500000", 60.0, 3, true),
                        plan("BASIC", "Basic", "500000", 20.0, 2, false),
                        plan("ULTRA", "Ultra", "9000000", 500.0, 25, true));

        List<TrainingDocument> docs =
                List.of(
                        doc("D0", "admin-sop", "ADMIN", "Admin SOP", "Secret", 10, "OPS"),
                        doc("D1", "admin-low", "admin", "Admin Lower", "Secret", 12, "OPS"),
                        doc("D2", "cust-1", "CUSTOMER", "Intro", "Summary 1", 15, "ONBOARD"),
                        doc("D3", "ops-1", "OPERATIONS", "Flight", "Summary 2", 25, "SAFETY"),
                        doc("D4", "cust-2", "CUSTOMER", "Booking", "Summary 3", 10, "BOOKING"),
                        doc("D5", "ops-2", "OPERATIONS", "Battery", "Summary 4", 20, "SAFETY"),
                        doc("D6", "cust-3", "CUSTOMER", "Billing", "Summary 5", 8, "BILLING"),
                        doc("D7", "cust-4", "CUSTOMER", "Overflow", "Summary 6", 5, "OTHER"));

        when(serviceOfferingRepository.findByActiveTrueOrderByIdAsc()).thenReturn(offerings);
        when(servicePlanRepository.findByActiveTrue()).thenReturn(plans);
        when(trainingDocumentRepository.findByActiveTrueOrderByTargetPortalAscSortOrderAscIdAsc())
                .thenReturn(docs);
        when(systemConfigService.publicSiteInfo())
                .thenReturn(
                        new PublicSiteInfoResponse(
                                "19001234", "0901234567", "support@uav.vn", "Hanoi", Map.of()));

        PublicDiscoveryResponse response = service.getPublicDiscovery();

        assertEquals(5, response.services().size());
        assertEquals("SURVEY", response.services().get(0).code());
        assertEquals("Survey", response.services().get(0).name());
        assertEquals("Topo", response.services().get(0).description());
        assertEquals(45, response.services().get(0).defaultDurationMinutes());
        assertEquals("RGB,LIDAR", response.services().get(0).sensors());
        assertEquals(120.5, response.services().get(0).maxAreaHectares());
        assertTrue(response.services().stream().noneMatch(s -> s.code().endsWith("_READ")));

        assertEquals(4, response.plans().size());
        assertEquals(
                List.of("FREE", "BASIC", "PRO", "ENT"),
                response.plans().stream()
                        .map(PublicDiscoveryResponse.PublicPlanItem::code)
                        .toList());
        assertEquals(new BigDecimal("1500000"), response.plans().get(2).price());
        assertEquals(60.0, response.plans().get(2).maxMonthlyFlightHours());
        assertEquals(3, response.plans().get(2).maxConcurrentUavs());
        assertEquals(Boolean.TRUE, response.plans().get(2).allowSarAi());

        assertEquals(5, response.trainings().size());
        assertEquals(
                List.of("D2", "D3", "D4", "D5", "D6"),
                response.trainings().stream()
                        .map(PublicDiscoveryResponse.PublicTrainingItem::code)
                        .toList());
        assertEquals("cust-1", response.trainings().get(0).slug());
        assertEquals("Intro", response.trainings().get(0).title());
        assertEquals("Summary 1", response.trainings().get(0).summary());
        assertEquals(15, response.trainings().get(0).estimatedMinutes());
        assertEquals("ONBOARD", response.trainings().get(0).category());

        assertEquals("19001234", response.dispatchHotline());
        assertEquals("0901234567", response.zaloPhone());
        assertEquals("support@uav.vn", response.email());
    }

    @Test
    void getPublicDiscoveryHandlesEmptyRepositories() {
        when(serviceOfferingRepository.findByActiveTrueOrderByIdAsc()).thenReturn(List.of());
        when(servicePlanRepository.findByActiveTrue()).thenReturn(List.of());
        when(trainingDocumentRepository.findByActiveTrueOrderByTargetPortalAscSortOrderAscIdAsc())
                .thenReturn(List.of());
        when(systemConfigService.publicSiteInfo())
                .thenReturn(new PublicSiteInfoResponse(null, null, null, null, Map.of()));

        PublicDiscoveryResponse response = service.getPublicDiscovery();

        assertTrue(response.services().isEmpty());
        assertTrue(response.plans().isEmpty());
        assertTrue(response.trainings().isEmpty());
        assertNull(response.dispatchHotline());
        assertNull(response.zaloPhone());
        assertNull(response.email());
    }

    private static ServiceOffering offering(
            String code,
            String name,
            String description,
            int duration,
            String sensors,
            Double maxArea) {
        ServiceOffering offering = new ServiceOffering(code, name, description, duration);
        offering.setSensors(sensors);
        offering.setMaxAreaHectares(maxArea);
        return offering;
    }

    private static ServicePlan plan(
            String code, String name, String price, double hours, int uavs, boolean allowSarAi) {
        ServicePlan plan = new ServicePlan();
        plan.setCode(code);
        plan.setName(name);
        plan.setPrice(new BigDecimal(price));
        plan.setMaxMonthlyFlightHours(hours);
        plan.setMaxConcurrentUavs(uavs);
        plan.setAllowSarAi(allowSarAi);
        return plan;
    }

    private static TrainingDocument doc(
            String code,
            String slug,
            String portal,
            String title,
            String summary,
            int minutes,
            String category) {
        TrainingDocument doc = new TrainingDocument();
        doc.setCode(code);
        doc.setSlug(slug);
        doc.setTargetPortal(portal);
        doc.setTitle(title);
        doc.setSummary(summary);
        doc.setEstimatedMinutes(minutes);
        doc.setCategory(category);
        return doc;
    }
}
