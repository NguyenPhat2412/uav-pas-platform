package com.uav.platform.repository.support;

import com.uav.platform.entity.support.SupportQuickReply;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupportQuickReplyRepository
        extends JpaRepository<SupportQuickReply, Long>,
                JpaSpecificationExecutor<SupportQuickReply> {

    List<SupportQuickReply> findAllByOrderBySortOrderAscIdAsc();
}
