package com.uav.platform.service.impl.mission;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.uav.platform.dto.request.notification.CreateNotificationRequest;
import com.uav.platform.entity.mission.Mission;
import com.uav.platform.entity.user.AppUser;
import com.uav.platform.enums.mission.MissionEventType;
import com.uav.platform.repository.mission.MissionEventRepository;
import com.uav.platform.service.mission.MissionAccessService;
import com.uav.platform.service.notification.NotificationService;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.util.List;

class MissionSubmitNotificationTest {
    private final NotificationService notifications = mock(NotificationService.class);
    private final MissionAccessService access = mock(MissionAccessService.class);
    private final MissionEventServiceImpl service =
            new MissionEventServiceImpl(mock(MissionEventRepository.class), notifications, access);

    private static AppUser user(long id, String username) {
        AppUser user = mock(AppUser.class);
        when(user.getId()).thenReturn(id);
        when(user.getUsername()).thenReturn(username);
        return user;
    }

    private List<Long> recipients(MissionEventType type) {
        AppUser customer = user(1L, "customer");
        AppUser dispatcher = user(2L, "dispatcher");
        Mission mission = mock(Mission.class);
        when(mission.getCustomer()).thenReturn(customer);
        when(mission.getId()).thenReturn(9L);
        // The customer is also listed as staff here: they must not be notified twice (or at all, as
        // actor).
        when(access.dispatchers()).thenReturn(List.of(customer, dispatcher));
        service.notifyParties(
                mission,
                new TestingAuthenticationToken("customer", null),
                type,
                "Mission submitted");
        ArgumentCaptor<CreateNotificationRequest> sent =
                ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notifications, atLeast(0)).sendNotification(sent.capture());
        return sent.getAllValues().stream().map(CreateNotificationRequest::userId).toList();
    }

    @Test
    void submitNotifiesDispatchStaffButNotTheSubmitter() {
        assertThat(recipients(MissionEventType.SUBMITTED)).containsExactly(2L);
    }

    @Test
    void otherEventsDoNotNotifyDispatchStaff() {
        assertThat(recipients(MissionEventType.CREATED)).isEmpty();
    }
}
