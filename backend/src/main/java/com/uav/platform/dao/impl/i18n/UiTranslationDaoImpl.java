package com.uav.platform.dao.impl.i18n;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.i18n.IUiTranslationDao;
import com.uav.platform.entity.i18n.UiTranslation;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UiTranslationDaoImpl extends HibernateGenericDao<Long, UiTranslation>
        implements IUiTranslationDao {

    private static final Logger logger = LoggerFactory.getLogger(UiTranslationDaoImpl.class);

    public UiTranslationDaoImpl(final EntityManager entityManager) {
        super(UiTranslation.class, entityManager);
    }

    @Override
    public List<UiTranslation> findByLocaleOrderByTranslationKeyAsc(String locale) {
        return hql("select e from UiTranslation e where e.locale = :locale order by e.translationKey asc")
                .setParameter("locale", locale)
                .getResultList();
    }

    @Override
    public List<UiTranslation> findByLocaleAndNamespaceOrderByTranslationKeyAsc(
            String locale, String namespace) {
        return hql("select e from UiTranslation e where e.locale = :locale and e.namespace = :namespace order by e.translationKey asc")
                .setParameter("locale", locale)
                .setParameter("namespace", namespace)
                .getResultList();
    }

    @Override
    public List<UiTranslation> findByTranslationKeyIn(List<String> keys) {
        if (isEmpty(keys)) return List.of();
        return hql("select e from UiTranslation e where e.translationKey in :keys")
                .setParameter("keys", keys)
                .getResultList();
    }

    @Override
    public Optional<UiTranslation> findByTranslationKeyAndLocale(
            String translationKey, String locale) {
        return hql("select e from UiTranslation e where e.translationKey = :translationKey and e.locale = :locale")
                .setParameter("translationKey", translationKey)
                .setParameter("locale", locale)
                .uniqueResultOptional();
    }

    @Override
    public List<String> findDistinctNamespaces() {
        return hql(
                        "SELECT DISTINCT t.namespace FROM UiTranslation t ORDER BY t.namespace ASC",
                        String.class)
                .getResultList();
    }
}
