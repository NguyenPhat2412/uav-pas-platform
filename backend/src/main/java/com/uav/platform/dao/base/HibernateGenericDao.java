package com.uav.platform.dao.base;

import jakarta.persistence.Entity;
import jakarta.persistence.EntityGraph;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.Subgraph;
import jakarta.persistence.Version;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.From;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.query.MutationQuery;
import org.hibernate.query.NativeQuery;
import org.hibernate.query.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

import java.lang.reflect.Field;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Pure Hibernate {@link Session} Generic DAO ({@code HibernateGenericDao<PK, T>}) providing CRUD,
 * embedded FIQL search language, dynamic sorting, pagination, Criteria
 * {@link HibernateSpecification}, pessimistic locking, entity-graph fetch plans, and HQL/Native
 * SQL execution.
 *
 * @param <PK> primary key type
 * @param <T> managed Hibernate entity type
 */
@Transactional(readOnly = true)
public abstract class HibernateGenericDao<PK, T> implements IGenericDao<PK, T> {

    private static final String FETCH_GRAPH_HINT = "jakarta.persistence.fetchgraph";
    private static final Logger log = LoggerFactory.getLogger(HibernateGenericDao.class);

    private final Class<T> entityClass;
    private final String entityName;
    private final Field versionField;
    private final EntityManager entityManager;

    protected HibernateGenericDao(Class<T> entityClass, final EntityManager entityManager) {
        Assert.notNull(entityClass, "entityClass must not be null");
        Assert.notNull(entityManager, "entityManager must not be null");
        this.entityClass = entityClass;
        Entity entityAnnotation = entityClass.getAnnotation(Entity.class);
        this.entityName =
                (entityAnnotation != null && !entityAnnotation.name().isEmpty())
                        ? entityAnnotation.name()
                        : entityClass.getSimpleName();
        this.versionField = findVersionField(entityClass);
        this.entityManager = entityManager;
    }

    /** Returns the injected persistence {@link EntityManager}. */
    protected EntityManager getEntityManager() {
        return entityManager;
    }

    /** Returns the transaction-bound Hibernate {@link Session}. */
    protected Session currentSession() {
        return entityManager.unwrap(Session.class);
    }

    /** Returns the underlying Hibernate {@link SessionFactory}. */
    protected SessionFactory sessionFactory() {
        return entityManager.getEntityManagerFactory().unwrap(SessionFactory.class);
    }

    protected Class<T> entityClass() {
        return entityClass;
    }

    // ---- Canonical Hibernate Generic DAO CRUD & Search API ----

    @Override
    @Transactional
    public T create(T entity) {
        Assert.notNull(entity, "Entity must not be null");
        log.debug("Creating entity {}", entityName);
        currentSession().persist(entity);
        return entity;
    }

    @Override
    @Transactional
    public T update(T entity) {
        Assert.notNull(entity, "Entity must not be null");
        log.debug("Updating entity {}", entityName);
        return currentSession().merge(entity);
    }

    @Override
    @Transactional
    public void deleteByPk(PK id) {
        Assert.notNull(id, "The given id must not be null");
        T entity = getById(id);
        if (entity != null) {
            delete(entity);
        }
    }

    @Override
    public T getById(PK id) {
        Assert.notNull(id, "The given id must not be null");
        return currentSession().find(entityClass, id);
    }

    @Override
    public List<T> getAll() {
        return findAll();
    }

    @Override
    public List<T> search(
            String query,
            Integer lowerLimit,
            Integer upperLimit,
            String orderBy,
            String orderType) {
        HibernateSpecification<T> spec = HibernateSearchQueryParser.parse(query);
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<T> cq = cb.createQuery(entityClass);
        Root<T> root = cq.from(entityClass);
        cq.select(root);

        Predicate predicate = spec.toPredicate(root, cq, cb);
        if (predicate != null) {
            cq.where(predicate);
        }

        if (orderBy != null && !orderBy.isBlank()) {
            Path<?> sortPath = HibernateSearchQueryParser.resolvePath(root, orderBy.trim());
            boolean desc = "DESC".equalsIgnoreCase(orderType);
            cq.orderBy(desc ? cb.desc(sortPath) : cb.asc(sortPath));
        }

        Query<T> hqlQuery = session.createQuery(cq);
        if (lowerLimit != null && lowerLimit > 0) {
            hqlQuery.setFirstResult(lowerLimit);
        }
        if (upperLimit != null && upperLimit > 0) {
            hqlQuery.setMaxResults(upperLimit);
        }
        return hqlQuery.getResultList();
    }

    @Override
    public Integer getCount(String query) {
        HibernateSpecification<T> spec = HibernateSearchQueryParser.parse(query);
        return Math.toIntExact(count(spec));
    }

    // ---- Extended Persistence & Criteria API ----

    @Override
    public Optional<T> findById(PK id) {
        Assert.notNull(id, "The given id must not be null");
        return Optional.ofNullable(currentSession().find(entityClass, id));
    }

    @Override
    public T getReferenceById(PK id) {
        Assert.notNull(id, "The given id must not be null");
        return currentSession().getReference(entityClass, id);
    }

    @Override
    public boolean existsById(PK id) {
        Assert.notNull(id, "The given id must not be null");
        return findById(id).isPresent();
    }

    @Override
    public List<T> findAll() {
        return findAll((HibernateSpecification<T>) null, Sort.unsorted());
    }

    @Override
    public List<T> findAll(Sort sort) {
        return findAll((HibernateSpecification<T>) null, sort);
    }

    @Override
    public Page<T> findAll(Pageable pageable) {
        return findAll((HibernateSpecification<T>) null, pageable);
    }

    @Override
    public List<T> findAllById(Iterable<PK> ids) {
        Assert.notNull(ids, "Ids must not be null");
        List<PK> idList = new ArrayList<>();
        for (PK id : ids) {
            if (id != null) {
                idList.add(id);
            }
        }
        if (idList.isEmpty()) {
            return Collections.emptyList();
        }
        Session session = currentSession();
        var entityType = entityManager.getMetamodel().entity(entityClass);
        String idAttr = entityType.getId(entityType.getIdType().getJavaType()).getName();
        return session.createQuery(
                        "select e from " + entityName + " e where e." + idAttr + " in :ids",
                        entityClass)
                .setParameter("ids", idList)
                .getResultList();
    }

    @Override
    public Optional<T> findOne(HibernateSpecification<T> spec) {
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<T> cq = cb.createQuery(entityClass);
        Root<T> root = cq.from(entityClass);
        cq.select(root);
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        return session.createQuery(cq).uniqueResultOptional();
    }

    @Override
    public List<T> findAll(HibernateSpecification<T> spec) {
        return findAll(spec, Sort.unsorted());
    }

    @Override
    public List<T> findAll(HibernateSpecification<T> spec, Sort sort) {
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<T> cq = cb.createQuery(entityClass);
        Root<T> root = cq.from(entityClass);
        cq.select(root);
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        applySort(cb, cq, root, sort);
        return session.createQuery(cq).getResultList();
    }

    @Override
    public Page<T> findAll(HibernateSpecification<T> spec, Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            List<T> content =
                    findAll(spec, pageable == null ? Sort.unsorted() : pageable.getSort());
            return new PageImpl<>(content);
        }
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<T> cq = cb.createQuery(entityClass);
        Root<T> root = cq.from(entityClass);
        cq.select(root);
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        applySort(cb, cq, root, pageable.getSort());

        Query<T> query = session.createQuery(cq);
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());
        List<T> content = query.getResultList();

        long total = count(spec);
        return new PageImpl<>(content, pageable, total);
    }

    @Override
    public long count() {
        return count(null);
    }

    @Override
    public long count(HibernateSpecification<T> spec) {
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<Long> cq = cb.createQuery(Long.class);
        Root<T> root = cq.from(entityClass);
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        cq.select(cq.isDistinct() ? cb.countDistinct(root) : cb.count(root));
        Long total = session.createQuery(cq).getSingleResult();
        return total == null ? 0L : total;
    }

    @Override
    public boolean exists(HibernateSpecification<T> spec) {
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<Integer> cq = cb.createQuery(Integer.class);
        Root<T> root = cq.from(entityClass);
        cq.select(cb.literal(1));
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        return !session.createQuery(cq).setMaxResults(1).getResultList().isEmpty();
    }

    @Override
    @Transactional
    public T save(T entity) {
        Assert.notNull(entity, "Entity must not be null");
        Session session = currentSession();
        if (isNew(entity)) {
            session.persist(entity);
            return entity;
        }
        return session.merge(entity);
    }

    @Override
    @Transactional
    public T saveAndFlush(T entity) {
        T saved = save(entity);
        flush();
        return saved;
    }

    @Override
    @Transactional
    public List<T> saveAll(Iterable<T> entities) {
        Assert.notNull(entities, "Entities must not be null");
        List<T> result = new ArrayList<>();
        for (T entity : entities) {
            result.add(save(entity));
        }
        return result;
    }

    @Override
    @Transactional
    public List<T> saveAllAndFlush(Iterable<T> entities) {
        List<T> result = saveAll(entities);
        flush();
        return result;
    }

    @Override
    @Transactional
    public void delete(T entity) {
        Assert.notNull(entity, "Entity must not be null");
        Session session = currentSession();
        T managed = session.contains(entity) ? entity : session.merge(entity);
        session.remove(managed);
    }

    @Override
    @Transactional
    public void deleteById(PK id) {
        deleteByPk(id);
    }

    @Override
    @Transactional
    public void deleteAll(Iterable<? extends T> entities) {
        Assert.notNull(entities, "Entities must not be null");
        for (T entity : entities) {
            delete(entity);
        }
    }

    @Override
    @Transactional
    public void deleteAll() {
        for (T entity : findAll()) {
            delete(entity);
        }
    }

    @Override
    @Transactional
    public void deleteAllInBatch() {
        currentSession().createMutationQuery("delete from " + entityName).executeUpdate();
    }

    @Override
    @Transactional
    public void flush() {
        currentSession().flush();
    }

    @Override
    @Transactional
    public void refresh(T entity) {
        Assert.notNull(entity, "Entity must not be null");
        currentSession().refresh(entity);
    }

    // ---- Protected Hibernate helpers for concrete *DaoImpl subclasses ----

    protected Page<T> findAllWithGraph(
            HibernateSpecification<T> spec, Pageable pageable, String... attributePaths) {
        if (pageable == null || pageable.isUnpaged()) {
            List<T> content =
                    findAllWithGraph(
                            spec,
                            pageable == null ? Sort.unsorted() : pageable.getSort(),
                            attributePaths);
            return new PageImpl<>(content);
        }
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<T> cq = cb.createQuery(entityClass);
        Root<T> root = cq.from(entityClass);
        cq.select(root);
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        applySort(cb, cq, root, pageable.getSort());

        Query<T> query = session.createQuery(cq);
        applyEntityGraph(query, attributePaths);
        query.setFirstResult((int) pageable.getOffset());
        query.setMaxResults(pageable.getPageSize());
        List<T> content = query.getResultList();

        long total = count(spec);
        return new PageImpl<>(content, pageable, total);
    }

    protected List<T> findAllWithGraph(
            HibernateSpecification<T> spec, Sort sort, String... attributePaths) {
        Session session = currentSession();
        CriteriaBuilder cb = session.getCriteriaBuilder();
        CriteriaQuery<T> cq = cb.createQuery(entityClass);
        Root<T> root = cq.from(entityClass);
        cq.select(root);
        if (spec != null) {
            Predicate predicate = spec.toPredicate(root, cq, cb);
            if (predicate != null) {
                cq.where(predicate);
            }
        }
        applySort(cb, cq, root, sort);
        Query<T> query = session.createQuery(cq);
        applyEntityGraph(query, attributePaths);
        return query.getResultList();
    }

    protected Optional<T> findByIdWithGraph(PK id, String... attributePaths) {
        Assert.notNull(id, "The given id must not be null");
        EntityGraph<T> graph = buildEntityGraph(attributePaths);
        return Optional.ofNullable(
                currentSession().find(entityClass, id, Map.of(FETCH_GRAPH_HINT, graph)));
    }

    protected Query<T> hql(String hql) {
        return currentSession().createQuery(hql, entityClass);
    }

    protected <R> Query<R> hql(String hql, Class<R> resultType) {
        return currentSession().createQuery(hql, resultType);
    }

    protected MutationQuery hqlMutation(String hql) {
        return currentSession().createMutationQuery(hql);
    }

    protected <R> NativeQuery<R> nativeSql(String sql, Class<R> resultType) {
        return currentSession().createNativeQuery(sql, resultType);
    }

    protected MutationQuery nativeMutation(String sql) {
        return currentSession().createNativeMutationQuery(sql);
    }

    protected <R> Query<R> withEntityGraph(Query<R> query, String... attributePaths) {
        applyEntityGraph(query, attributePaths);
        return query;
    }

    protected <R> Query<R> withLock(Query<R> query, LockModeType lockMode) {
        query.setLockMode(lockMode);
        return query;
    }

    protected <R> Page<R> toPage(Query<R> dataQuery, long total, Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return new PageImpl<>(dataQuery.getResultList());
        }
        dataQuery.setFirstResult((int) pageable.getOffset());
        dataQuery.setMaxResults(pageable.getPageSize());
        return new PageImpl<>(dataQuery.getResultList(), pageable, total);
    }

    protected String appendPageableSort(String baseHql, Pageable pageable) {
        if (pageable == null || pageable.getSort().isUnsorted()) {
            return baseHql;
        }
        StringBuilder sb = new StringBuilder(baseHql);
        sb.append(baseHql.toLowerCase().contains("order by") ? ", " : " order by ");
        boolean first = true;
        for (Sort.Order order : pageable.getSort()) {
            if (!first) {
                sb.append(", ");
            }
            first = false;
            String prop = order.getProperty();
            if (!prop.contains(".")) {
                sb.append("e.");
            }
            sb.append(prop).append(order.isAscending() ? " asc" : " desc");
        }
        return sb.toString();
    }

    protected static boolean isEmpty(Collection<?> c) {
        return c == null || c.isEmpty();
    }

    // ---- Internal helpers ----

    private boolean isNew(T entity) {
        if (versionField != null && !versionField.getType().isPrimitive()) {
            try {
                return versionField.get(entity) == null;
            } catch (IllegalAccessException ignored) {
                // Fall back to identifier check
            }
        }
        Object id =
                entityManager
                        .getEntityManagerFactory()
                        .getPersistenceUnitUtil()
                        .getIdentifier(entity);
        return id == null;
    }

    private static Field findVersionField(Class<?> type) {
        for (Class<?> cur = type; cur != null && cur != Object.class; cur = cur.getSuperclass()) {
            for (Field field : cur.getDeclaredFields()) {
                if (field.isAnnotationPresent(Version.class)) {
                    field.setAccessible(true);
                    return field;
                }
            }
        }
        return null;
    }

    private void applyEntityGraph(Query<?> query, String... attributePaths) {
        if (attributePaths == null || attributePaths.length == 0) {
            return;
        }
        query.setHint(FETCH_GRAPH_HINT, buildEntityGraph(attributePaths));
    }

    private EntityGraph<T> buildEntityGraph(String... attributePaths) {
        EntityGraph<T> graph = currentSession().createEntityGraph(entityClass);
        for (String attrPath : attributePaths) {
            String[] segments = attrPath.split("\\.");
            if (segments.length == 1) {
                graph.addAttributeNodes(segments[0]);
            } else {
                Subgraph<?> sub = graph.addSubgraph(segments[0]);
                for (int i = 1; i < segments.length - 1; i++) {
                    sub = sub.addSubgraph(segments[i]);
                }
                sub.addAttributeNodes(segments[segments.length - 1]);
            }
        }
        return graph;
    }

    private void applySort(CriteriaBuilder cb, CriteriaQuery<?> cq, Root<T> root, Sort sort) {
        if (sort == null || sort.isUnsorted()) {
            return;
        }
        List<Order> orders = new ArrayList<>();
        for (Sort.Order order : sort) {
            Path<?> path = resolvePath(root, order.getProperty());
            orders.add(order.isAscending() ? cb.asc(path) : cb.desc(path));
        }
        if (!orders.isEmpty()) {
            cq.orderBy(orders);
        }
    }

    private Path<?> resolvePath(Root<T> root, String property) {
        String[] parts = property.split("\\.");
        Path<?> current = root;
        for (int i = 0; i < parts.length; i++) {
            if (i < parts.length - 1 && current instanceof From<?, ?> from) {
                current = from.join(parts[i], jakarta.persistence.criteria.JoinType.LEFT);
            } else {
                current = current.get(parts[i]);
            }
        }
        return current;
    }
}
