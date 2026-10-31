package com.uav.platform.repository.user;

import com.uav.platform.entity.user.AppUser;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository
        extends JpaRepository<AppUser, Long>, JpaSpecificationExecutor<AppUser> {

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id);

    boolean existsByZaloId(String zaloId);

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findFirstByEmailIgnoreCaseOrderByIdAsc(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByZaloId(String zaloId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUser u where u.id = :id")
    Optional<AppUser> findByIdForUpdate(Long id);
}
