package com.uav.platform.repository.project;

import com.uav.platform.entity.project.Project;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface ProjectRepository
        extends JpaRepository<Project, Long>, JpaSpecificationExecutor<Project> {

    Optional<Project> findByIdAndDeletedFalse(Long id);

    boolean existsByCode(String code);
}
