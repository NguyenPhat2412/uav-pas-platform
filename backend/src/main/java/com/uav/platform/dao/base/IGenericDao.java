package com.uav.platform.dao.base;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import java.util.List;
import java.util.Optional;

/**
 * Pure Hibernate Generic DAO contract ({@code IGenericDao<PK, T>}) shared across all feature DAO
 * interfaces. Embeds CRUD, dynamic FIQL search, sorting, pagination, count, and Criteria
 * {@link HibernateSpecification} support without any Spring Data JPA repository layer.
 *
 * @param <PK> primary key type
 * @param <T> managed Hibernate entity type
 */
public interface IGenericDao<PK, T> {

    // ---- Canonical Hibernate Generic DAO CRUD & Search API ----

    T create(T entity);

    T save(T entity);

    T update(T entity);

    void delete(T entity);

    void deleteByPk(PK id);

    T getById(PK id);

    List<T> getAll();

    /**
     * Executes dynamic search with embedded sorting and offset/limit pagination directly inside
     * Hibernate DAO.
     *
     * @param query FIQL/RSQL search expression (e.g. {@code status==ACTIVE;name:uav})
     * @param lowerLimit zero-based start offset (nullable, defaults to 0)
     * @param upperLimit maximum records to return (nullable, returns all when null)
     * @param orderBy entity property path to sort by (nullable)
     * @param orderType {@code ASC} or {@code DESC} (nullable, defaults to {@code ASC})
     */
    List<T> search(
            String query, Integer lowerLimit, Integer upperLimit, String orderBy, String orderType);

    /** Returns the count of entities matching the FIQL/RSQL {@code query}. */
    Integer getCount(String query);

    // ---- Extended Persistence & Criteria API ----

    Optional<T> findById(PK id);

    T getReferenceById(PK id);

    boolean existsById(PK id);

    List<T> findAll();

    List<T> findAll(Sort sort);

    Page<T> findAll(Pageable pageable);

    List<T> findAllById(Iterable<PK> ids);

    Optional<T> findOne(HibernateSpecification<T> spec);

    List<T> findAll(HibernateSpecification<T> spec);

    List<T> findAll(HibernateSpecification<T> spec, Sort sort);

    Page<T> findAll(HibernateSpecification<T> spec, Pageable pageable);

    long count();

    long count(HibernateSpecification<T> spec);

    boolean exists(HibernateSpecification<T> spec);

    T saveAndFlush(T entity);

    List<T> saveAll(Iterable<T> entities);

    List<T> saveAllAndFlush(Iterable<T> entities);

    void deleteById(PK id);

    void deleteAll(Iterable<? extends T> entities);

    void deleteAll();

    void deleteAllInBatch();

    void flush();

    void refresh(T entity);
}
