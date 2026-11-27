package com.uav.platform.dao.impl;

import com.uav.platform.dao.IUserDao;
import com.uav.platform.dao.base.HibernateGenericDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.UserRole;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public class UserDaoImpl extends HibernateGenericDao<Long, AppUser> implements IUserDao {

    private static final Logger logger = LoggerFactory.getLogger(UserDaoImpl.class);

    public UserDaoImpl(final EntityManager entityManager) {
        super(AppUser.class, entityManager);
    }

    @Override
    public boolean existsByEmail(String email) {
        return !hql("select 1 from AppUser e where e.email = :email", Integer.class)
                .setParameter("email", email)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByUsername(String username) {
        return !hql("select 1 from AppUser e where e.username = :username", Integer.class)
                .setParameter("username", username)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByPhoneNumber(String phoneNumber) {
        return !hql("select 1 from AppUser e where e.phoneNumber = :phoneNumber", Integer.class)
                .setParameter("phoneNumber", phoneNumber)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id) {
        return !hql(
                        "select 1 from AppUser e where e.phoneNumber = :phoneNumber and e.id <> :id",
                        Integer.class)
                .setParameter("phoneNumber", phoneNumber)
                .setParameter("id", id)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public Optional<AppUser> findByEmail(String email) {
        return hql("select e from AppUser e where e.email = :email")
                .setParameter("email", email)
                .uniqueResultOptional();
    }

    @Override
    public Optional<AppUser> findFirstByEmailIgnoreCaseOrderByIdAsc(String email) {
        List<AppUser> rows =
                hql("select e from AppUser e where lower(e.email) = lower(:email) order by e.id asc")
                        .setParameter("email", email)
                        .setMaxResults(1)
                        .getResultList();
        return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(0));
    }

    @Override
    public boolean existsByEmailIgnoreCase(String email) {
        return !hql("select 1 from AppUser e where lower(e.email) = lower(:email)", Integer.class)
                .setParameter("email", email)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public boolean existsByUsernameIgnoreCase(String username) {
        return !hql(
                        "select 1 from AppUser e where lower(e.username) = lower(:username)",
                        Integer.class)
                .setParameter("username", username)
                .setMaxResults(1)
                .getResultList()
                .isEmpty();
    }

    @Override
    public Optional<AppUser> findByUsername(String username) {
        return hql("select e from AppUser e where e.username = :username")
                .setParameter("username", username)
                .uniqueResultOptional();
    }

    @Override
    public Optional<AppUser> findByAppleSub(String appleSub) {
        return hql("select e from AppUser e where e.appleSub = :appleSub")
                .setParameter("appleSub", appleSub)
                .uniqueResultOptional();
    }

    @Override
    public List<AppUser> findByRole(UserRole role) {
        return hql("select e from AppUser e where e.role = :role")
                .setParameter("role", role)
                .getResultList();
    }

    @Override
    public Optional<AppUser> findByIdForUpdate(Long id) {
        return hql("select u from AppUser u where u.id = :id", AppUser.class)
                .setParameter("id", id)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE)
                .uniqueResultOptional();
    }
}
