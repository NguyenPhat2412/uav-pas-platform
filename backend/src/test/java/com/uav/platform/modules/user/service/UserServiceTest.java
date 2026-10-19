package com.uav.platform.modules.user.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.user.dto.request.RoleUpdateRequest;
import com.uav.platform.modules.user.dto.request.UserQueryRequest;
import com.uav.platform.modules.user.dto.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.enums.UserRole;
import com.uav.platform.modules.user.enums.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.UserServiceImpl;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;
import java.util.Optional;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Pagination & Sorting Unit Tests")
class UserServiceTest {

    @Mock private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new UserServiceImpl(userRepository);
    }

    @Test
    @DisplayName("getUsers should paginate and sort correctly")
    void getUsers_PaginationAndSort_Success() {
        AppUser user1 = new AppUser("pilot_01", "p1@uav.vn", "h", "0900000001", UserStatus.ACTIVE);
        user1.setId(1L);
        AppUser user2 = new AppUser("pilot_02", "p2@uav.vn", "h", "0900000002", UserStatus.ACTIVE);
        user2.setId(2L);

        Page<AppUser> userPage = new PageImpl<>(List.of(user1, user2));
        when(userRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(userPage);

        PageResponse<UserResponse> response =
                userService.getUsers(new UserQueryRequest(0, 10, "username", "asc", null, null));

        assertNotNull(response);
        assertEquals(2, response.content().size());
        assertEquals("pilot_01", response.content().get(0).username());

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).findAll(any(Specification.class), captor.capture());

        Pageable captured = captor.getValue();
        assertEquals(0, captured.getPageNumber());
        assertEquals(10, captured.getPageSize());
        Sort.Order order = captured.getSort().getOrderFor("username");
        assertNotNull(order);
        assertTrue(order.isAscending());
    }

    @Test
    @DisplayName("getUsers with invalid sortBy should fall back to createdAt")
    void getUsers_InvalidSort_FallsBackToCreatedAt() {
        Page<AppUser> emptyPage = new PageImpl<>(List.of());
        when(userRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage);

        userService.getUsers(
                new UserQueryRequest(0, 10, "invalid_column_injection", "desc", null, null));

        ArgumentCaptor<Pageable> captor = ArgumentCaptor.forClass(Pageable.class);
        verify(userRepository).findAll(any(Specification.class), captor.capture());

        Sort.Order order = captor.getValue().getSort().getOrderFor("createdAt");
        assertNotNull(order, "Should fall back to createdAt for unknown sort fields");
        assertTrue(order.isDescending());
    }

    @Test
    @DisplayName("getUsers with keyword and role should pass sanitized parameters")
    void getUsers_WithKeywordAndRole() {
        Page<AppUser> emptyPage = new PageImpl<>(List.of());
        when(userRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(emptyPage);

        userService.getUsers(
                new UserQueryRequest(0, 10, "createdAt", "desc", "  pilot  ", UserRole.ROLE_PILOT));

        verify(userRepository).findAll(any(Specification.class), any(Pageable.class));
    }

    @Test
    @DisplayName("getUserById should return user if found")
    void getUserById_Found() {
        AppUser user = new AppUser("pilot_01", "p1@uav.vn", "h", "0900000001", UserStatus.ACTIVE);
        user.setId(5L);
        when(userRepository.findById(5L)).thenReturn(Optional.of(user));

        UserResponse response = userService.getUserById(5L);
        assertNotNull(response);
        assertEquals(5L, response.id());
        assertEquals("pilot_01", response.username());
    }

    @Test
    @DisplayName("getUserById should throw SystemException if not found")
    void getUserById_NotFound_Throws() {
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(SystemException.class, () -> userService.getUserById(999L));
    }

    @Test
    void lockAndUnlockPersistManualLockAndClearFailedAttempts() {
        AppUser user = new AppUser();
        user.setId(10L);
        user.setFailedAttempts(3);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        userService.lockUser(10L, "admin");
        assertTrue(user.isManualLocked());
        assertNotNull(user.getLockTime());
        assertEquals(3, user.getFailedAttempts());

        userService.unlockUser(10L, "admin");
        assertFalse(user.isManualLocked());
        assertNull(user.getLockTime());
        assertEquals(0, user.getFailedAttempts());
        verify(userRepository, times(2)).save(user);
    }

    @Test
    void updateRolePreservesDefaultForNullAssignment() {
        AppUser user = new AppUser();
        user.setId(10L);
        user.setRole(UserRole.ROLE_COMMANDER);
        when(userRepository.findById(10L)).thenReturn(Optional.of(user));

        UserResponse response = userService.updateRole(10L, new RoleUpdateRequest(null), "admin");

        assertEquals(UserRole.ROLE_PILOT, user.getRole());
        assertEquals(UserRole.ROLE_PILOT, response.role());
        verify(userRepository).save(user);
    }
}
