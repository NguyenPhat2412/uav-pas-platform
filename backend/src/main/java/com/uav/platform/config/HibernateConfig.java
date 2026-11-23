package com.uav.platform.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.orm.jpa.SharedEntityManagerCreator;

/**
 * Configures the shared transaction-bound {@link EntityManager} and exposes the underlying
 * Hibernate {@link SessionFactory} so every {@code HibernateGenericDao} implementation uses pure
 * Hibernate {@link Session} APIs via constructor injection without Spring Data JPA.
 */
@Configuration
public class HibernateConfig {

    private final EntityManagerFactory entityManagerFactory;

    public HibernateConfig(@Lazy EntityManagerFactory entityManagerFactory) {
        this.entityManagerFactory = entityManagerFactory;
    }

    @Bean
    public EntityManager sharedEntityManager(EntityManagerFactory entityManagerFactory) {
        return SharedEntityManagerCreator.createSharedEntityManager(entityManagerFactory);
    }

    public SessionFactory sessionFactory() {
        return entityManagerFactory.unwrap(SessionFactory.class);
    }

    public Session openStatelessOrNewSession() {
        return sessionFactory().openSession();
    }
}
