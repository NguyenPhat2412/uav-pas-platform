package com.uav.platform.dao.impl;

import com.uav.platform.dao.ITrainingAssetDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.TrainingAsset;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class TrainingAssetDaoImpl extends HibernateGenericDao<Long, TrainingAsset>
        implements ITrainingAssetDao {

    private static final Logger logger = LoggerFactory.getLogger(TrainingAssetDaoImpl.class);

    public TrainingAssetDaoImpl(final EntityManager entityManager) {
        super(TrainingAsset.class, entityManager);
    }
}
