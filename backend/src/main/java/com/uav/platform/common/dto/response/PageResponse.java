package com.uav.platform.common.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.data.domain.Page;

import java.util.Collections;
import java.util.List;
import java.util.function.Function;

/**
 * Cấu trúc đóng gói dữ liệu phân trang và sắp xếp thống nhất cho toàn bộ hệ thống UAV PAS Platform.
 * Tránh việc phơi bày các trường nội bộ của Spring Data Page và tối ưu hóa payload JSON truyền tải.
 *
 * @param <T> Kiểu dữ liệu của từng phần tử trong trang (thường là Response DTO)
 */
@Schema(description = "Standardized pagination and sorting response wrapper")
public record PageResponse<T>(
        @Schema(description = "List of items in the current page")
        List<T> content,

        @Schema(description = "Current page index (0-based)", example = "0")
        int page,

        @Schema(description = "Page size (number of items requested per page)", example = "10")
        int size,

        @Schema(description = "Total number of elements matching the query", example = "42")
        long totalElements,

        @Schema(description = "Total number of pages", example = "5")
        int totalPages,

        @Schema(description = "Whether this is the first page", example = "true")
        boolean first,

        @Schema(description = "Whether this is the last page", example = "false")
        boolean last,

        @Schema(description = "Whether there is a next page available", example = "true")
        boolean hasNext,

        @Schema(description = "Whether there is a previous page available", example = "false")
        boolean hasPrevious
) {
    public static <T> PageResponse<T> from(Page<T> springPage) {
        if (springPage == null) {
            return new PageResponse<>(Collections.emptyList(), 0, 0, 0, 0, true, true, false, false);
        }
        return new PageResponse<>(
                springPage.getContent(),
                springPage.getNumber(),
                springPage.getSize(),
                springPage.getTotalElements(),
                springPage.getTotalPages(),
                springPage.isFirst(),
                springPage.isLast(),
                springPage.hasNext(),
                springPage.hasPrevious()
        );
    }

    public static <E, T> PageResponse<T> from(Page<E> springPage, Function<E, T> mapper) {
        if (springPage == null) {
            return new PageResponse<>(Collections.emptyList(), 0, 0, 0, 0, true, true, false, false);
        }
        List<T> mappedContent = springPage.getContent().stream()
                .map(mapper)
                .toList();

        return new PageResponse<>(
                mappedContent,
                springPage.getNumber(),
                springPage.getSize(),
                springPage.getTotalElements(),
                springPage.getTotalPages(),
                springPage.isFirst(),
                springPage.isLast(),
                springPage.hasNext(),
                springPage.hasPrevious()
        );
    }
}
