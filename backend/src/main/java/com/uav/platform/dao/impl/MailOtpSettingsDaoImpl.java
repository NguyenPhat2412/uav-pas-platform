package com.uav.platform.dao.impl;

import com.uav.platform.dao.IMailOtpSettingsDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.MailOtpSettings;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class MailOtpSettingsDaoImpl extends HibernateGenericDao<Integer, MailOtpSettings>
        implements IMailOtpSettingsDao {

    private static final Logger logger = LoggerFactory.getLogger(MailOtpSettingsDaoImpl.class);

    public MailOtpSettingsDaoImpl(final EntityManager entityManager) {
        super(MailOtpSettings.class, entityManager);
    }
}
