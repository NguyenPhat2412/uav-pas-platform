package com.uav.platform.modules.user.entity;

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

    @Column(name = "tax_code", length = 14)
    private String taxCode;

    @Column(name = "billing_address", length = 500)
    private String billingAddress;

    @Column(name = "emergency_contact_name", length = 120)
    private String emergencyContactName;

    @Column(name = "emergency_contact_phone", length = 20)
    private String emergencyContactPhone;

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public CustomerBillingProfile(Long userId) {
        this.userId = userId;
    }
}
