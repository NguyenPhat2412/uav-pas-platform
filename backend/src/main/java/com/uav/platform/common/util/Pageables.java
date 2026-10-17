package com.uav.platform.common.util;

import com.uav.platform.error.SystemException;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

public final class Pageables {
    private Pageables() {}

    public static PageRequest of(int page, int size) {
        return PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, 100));
    }

    public static PageRequest asc(int page, int size, String property) {
        return PageRequest.of(
                Math.max(page, 0), Math.clamp(size, 1, 100), Sort.by(property).ascending());
    }

    public static PageRequest desc(int page, int size, String property) {
        return PageRequest.of(
                Math.max(page, 0), Math.clamp(size, 1, 100), Sort.by(property).descending());
    }

    public static PageRequest strictDesc(int page, int size, String property, String errorCode) {
        if (page < 0 || size < 1 || size > 100) throw SystemException.badRequest(errorCode);
        return PageRequest.of(page, size, Sort.by(property).descending());
    }

    public static PageRequest from(Pageable pageable, int defaultSize) {
        int page =
                pageable != null && pageable.isPaged() ? Math.max(pageable.getPageNumber(), 0) : 0;
        int size =
                pageable != null && pageable.isPaged()
                        ? Math.clamp(pageable.getPageSize(), 1, 100)
                        : defaultSize;
        return PageRequest.of(page, size);
    }
}
