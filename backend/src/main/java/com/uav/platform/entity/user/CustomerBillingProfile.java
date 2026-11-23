package com.uav.platform.entity.user;

import com.uav.platform.common.util.AesStringAttributeConverter;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/** Organisation details printed on VAT invoices plus the on-site emergency contact. Keyed by the user id. */
@Entity
@Table(name = "customer_billing_profiles")
@Getter
@Setter
@NoArgsConstructor
public class CustomerBillingProfile {
    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "organization_name", length = 200)
    private String organizationName;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "tax_code", length = 512)
    private String taxCode;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "billing_address", length = 1024)
    private String billingAddress;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "billing_email", length = 512)
    private String billingEmail;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "emergency_contact_name", length = 512)
    private String emergencyContactName;

    @Convert(converter = AesStringAttributeConverter.class)
    @Column(name = "emergency_contact_phone", length = 512)
    private String emergencyContactPhone;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CustomerBillingProfile(Long userId) {
        this.userId = userId;
    }

    @PrePersist
    void onCreate() {
        if (this.updatedAt == null) {
            this.updatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    void onPersist() {
        this.updatedAt = LocalDateTime.now();
    }
}
