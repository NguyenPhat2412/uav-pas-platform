package com.uav.platform.repository.infrastructure;

import com.uav.platform.entity.infrastructure.MailOtpSettings;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface MailOtpSettingsRepository
        extends JpaRepository<MailOtpSettings, Integer>,
                JpaSpecificationExecutor<MailOtpSettings> {}
