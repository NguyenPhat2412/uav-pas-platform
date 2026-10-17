package com.uav.platform.common.dto.response;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

@DisplayName("PageResponse DTO Unit Tests")
class PageResponseTest {

    @Test
    @DisplayName("Should correctly map Spring Data Page to PageResponse")
    void pageResponse_FromSpringPage() {
        List<String> items = List.of("alpha", "bravo", "charlie");
        Page<String> springPage = new PageImpl<>(items, PageRequest.of(0, 3), 10);

        PageResponse<String> response = PageResponse.from(springPage);

        assertEquals(3, response.content().size());
        assertEquals("alpha", response.content().get(0));
        assertEquals(0, response.page());
        assertEquals(3, response.size());
        assertEquals(10, response.totalElements());
        assertEquals(4, response.totalPages());
        assertTrue(response.first());
        assertFalse(response.last());
        assertTrue(response.hasNext());
        assertFalse(response.hasPrevious());
    }

    @Test
    @DisplayName("Should correctly transform elements using mapping function")
    void pageResponse_WithMapper() {
        List<Integer> numbers = List.of(1, 2, 3);
        Page<Integer> springPage = new PageImpl<>(numbers, PageRequest.of(1, 3), 6);

        PageResponse<String> response = PageResponse.from(springPage, n -> "Item #" + n);

        assertEquals(List.of("Item #1", "Item #2", "Item #3"), response.content());
        assertEquals(1, response.page());
        assertEquals(6, response.totalElements());
        assertEquals(2, response.totalPages());
        assertFalse(response.first());
        assertTrue(response.last());
        assertFalse(response.hasNext());
        assertTrue(response.hasPrevious());
    }

    @Test
    @DisplayName("Should handle null Spring Page safely")
    void pageResponse_NullPage() {
        PageResponse<String> response = PageResponse.from((Page<String>) null);

        assertNotNull(response);
        assertTrue(response.content().isEmpty());
        assertEquals(0, response.totalElements());
        assertTrue(response.first());
        assertTrue(response.last());
    }
}
