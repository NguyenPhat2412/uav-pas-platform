package com.uav.platform.modules.media.service;

/** Each object is claimed by database row locks, including across application instances. */
public interface MediaCleanupService {
    void scheduledCleanup();

    int runBatch();

    boolean process(Long id);
}
