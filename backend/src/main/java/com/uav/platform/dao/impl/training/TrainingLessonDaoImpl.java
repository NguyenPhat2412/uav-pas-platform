package com.uav.platform.dao.impl.training;

import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.dao.training.ITrainingLessonDao;
import com.uav.platform.entity.training.TrainingLesson;

import jakarta.persistence.EntityManager;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public class TrainingLessonDaoImpl extends HibernateGenericDao<Long, TrainingLesson>
        implements ITrainingLessonDao {

    private static final Logger logger = LoggerFactory.getLogger(TrainingLessonDaoImpl.class);

    public TrainingLessonDaoImpl(final EntityManager entityManager) {
        super(TrainingLesson.class, entityManager);
    }

    @Override
    public List<TrainingLesson> findByDocumentIdOrderBySortOrderAscIdAsc(Long documentId) {
        return hql("select e from TrainingLesson e where e.document.id = :documentId order by e.sortOrder asc, e.id asc")
                .setParameter("documentId", documentId)
                .getResultList();
    }

    @Override
    public List<TrainingLesson> findByDocumentIdAndActiveTrueOrderBySortOrderAscIdAsc(
            Long documentId) {
        return hql("select e from TrainingLesson e where e.document.id = :documentId and e.active = true order by e.sortOrder asc, e.id asc")
                .setParameter("documentId", documentId)
                .getResultList();
    }

    @Override
    public List<TrainingLesson> findByDocumentIdInAndActiveTrueOrderBySortOrderAscIdAsc(
            Collection<Long> documentIds) {
        if (isEmpty(documentIds)) return List.of();
        return hql("select e from TrainingLesson e where e.document.id in :documentIds and e.active = true order by e.sortOrder asc, e.id asc")
                .setParameter("documentIds", documentIds)
                .getResultList();
    }

    @Override
    public List<Object[]> countResources(Collection<Long> lessonIds) {
        if (isEmpty(lessonIds)) return List.of();
        return nativeSql(
                        "SELECT lesson_id, COUNT(*) FROM training_lesson_resources WHERE lesson_id IN (:lessonIds) GROUP BY lesson_id",
                        Object[].class)
                .setParameter("lessonIds", lessonIds)
                .getResultList();
    }
}
