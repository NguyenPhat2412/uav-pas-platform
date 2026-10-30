package com.uav.platform.modules.weather.entity;

import com.uav.platform.modules.weather.enums.WeatherProviderType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** The single weather configuration row (id = 1). The API key is stored only as AES-256-GCM text. */
@Entity
@Table(name = "weather_provider_settings")
@Getter
@Setter
@NoArgsConstructor
public class WeatherProviderSettings {

    @Id private Integer id = 1;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private WeatherProviderType provider = WeatherProviderType.OPEN_METEO;

    @Column(name = "api_key_cipher", columnDefinition = "TEXT")
    private String apiKeyCipher;

    @Column(name = "cache_ttl_minutes", nullable = false)
    private int cacheTtlMinutes = 30;

    @Column(name = "enforce_preflight_block", nullable = false)
    private boolean enforcePreflightBlock;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by", length = 100)
    private String updatedBy;
}
