package com.uav.platform.modules.infrastructure.service;

import com.uav.platform.modules.infrastructure.dto.record.TlsCertificateInfo;

public interface TlsCertificateService {
    /** Certificate of app.public-url, cached for about an hour. */
    TlsCertificateInfo current();
}
