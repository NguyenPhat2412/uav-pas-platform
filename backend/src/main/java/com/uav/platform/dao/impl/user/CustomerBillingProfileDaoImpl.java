package com.uav.platform.dao.impl.user;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.user.ICustomerBillingProfileDao;
import com.uav.platform.entity.user.CustomerBillingProfile;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

@Repository
public class CustomerBillingProfileDaoImpl extends HibernateGenericDao<Long, CustomerBillingProfile>
        implements ICustomerBillingProfileDao {

    private static final Logger logger =
            LoggerFactory.getLogger(CustomerBillingProfileDaoImpl.class);

    public CustomerBillingProfileDaoImpl(final EntityManager entityManager) {
        super(CustomerBillingProfile.class, entityManager);
    }
}
