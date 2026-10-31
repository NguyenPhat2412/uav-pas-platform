package com.uav.platform.service.infrastructure;

import com.uav.platform.dto.record.infrastructure.TlsCertificateInfo;

public interface TlsCertificateService {
    /** Certificate of app.public-url, cached for about an hour. */
    TlsCertificateInfo current();
}
