package com.uav.platform.config.routes;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.PathMatchConfigurer;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Cấu hình tổng thể định tuyến API Routes cho ứng dụng Spring MVC.
 * Hỗ trợ tiền tố định tuyến, mapping phiên bản API và các cấu hình đường dẫn tương thích.
 */
@Configuration
public class ApiRouteConfig implements WebMvcConfigurer {

    @Override
    public void configurePathMatch(PathMatchConfigurer configurer) {
        // Cấu hình linh hoạt cho đường dẫn API nếu cần tùy biến trong tương lai
    }
}
