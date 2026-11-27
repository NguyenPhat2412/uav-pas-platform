package com.uav.platform.dao;

import com.uav.platform.dao.base.IGenericDao;
import com.uav.platform.entity.AppUser;
import com.uav.platform.enums.UserRole;

import java.util.List;
import java.util.Optional;

public interface IUserDao extends IGenericDao<Long, AppUser> {
    boolean existsByEmail(String email);

    boolean existsByUsername(String username);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id);

    Optional<AppUser> findByEmail(String email);

    Optional<AppUser> findFirstByEmailIgnoreCaseOrderByIdAsc(String email);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUsernameIgnoreCase(String username);

    Optional<AppUser> findByUsername(String username);

    Optional<AppUser> findByAppleSub(String appleSub);

    List<AppUser> findByRole(UserRole role);

    Optional<AppUser> findByIdForUpdate(Long id);
}
