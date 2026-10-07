package com.uav.platform.modules.user.service;

import com.uav.platform.modules.user.config.response.UserResponse;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.common.UserRole;
import com.uav.platform.modules.user.common.UserStatus;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.impl.IUserService;
import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("UserService Pagination & Sorting Unit Tests")
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private UserService userService;

    @BeforeEach
    void setUp() {
        userService = new IUserService(userRepository);
    }

    @Test
    @DisplayName("getUsers should paginate and sort correctly")
    void getUsers_PaginationAndSort_Success() {
        AppUser user1 = new AppUser("pilot_01", "p1@uav.vn", "h", "0900000001", UserStatus.ACTIVE);
        user1.setId(1L);
        AppUser user2 = new AppUser("pilot_02", "p2@uav.vn", "h", "0900000002", UserStatus.ACTIVE);
        user2.setId(2L);

        Page<AppUser> userPage = new PageImpl<>(List.of(user1, user2));
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(userPage);

        PageResponse<UserResponse> response = userService.getUsers(0, 10, "username", "asc", null, null);

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
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

        userService.getUsers(0, 10, "invalid_column_injection", "desc", null, null);

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
        when(userRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(emptyPage);

        userService.getUsers(0, 10, "createdAt", "desc", "  pilot  ", UserRole.ROLE_PILOT);

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

}
