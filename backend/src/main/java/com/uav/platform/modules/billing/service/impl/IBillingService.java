package com.uav.platform.modules.billing.service.impl;

import com.uav.platform.common.dto.response.PageResponse;
import com.uav.platform.error.SystemException;
import com.uav.platform.modules.billing.config.request.CreateInvoiceRequest;
import com.uav.platform.modules.billing.config.request.PayInvoiceRequest;
import com.uav.platform.modules.billing.config.response.InvoiceResponse;
import com.uav.platform.modules.billing.config.response.PaymentResponse;
import com.uav.platform.modules.billing.config.response.ServicePlanResponse;
import com.uav.platform.modules.billing.entity.Invoice;
import com.uav.platform.modules.billing.entity.ServicePlan;
import com.uav.platform.modules.billing.repository.InvoiceRepository;
import com.uav.platform.modules.billing.repository.PaymentTransactionRepository;
import com.uav.platform.modules.billing.repository.ServicePlanRepository;
import com.uav.platform.modules.billing.service.BillingService;
import com.uav.platform.modules.mission.entity.Mission;
import com.uav.platform.modules.mission.repository.MissionRepository;
import com.uav.platform.modules.user.entity.AppUser;
import com.uav.platform.modules.user.repository.UserRepository;
import com.uav.platform.modules.user.service.PermissionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
@Transactional
public class IBillingService implements BillingService {

    private final ServicePlanRepository planRepository;
    private final InvoiceRepository invoiceRepository;
    private final PaymentTransactionRepository paymentRepository;
    private final UserRepository userRepository;
    private final MissionRepository missionRepository;
    private final PermissionService permissions;

    public IBillingService(ServicePlanRepository planRepository,
                           InvoiceRepository invoiceRepository,
                           PaymentTransactionRepository paymentRepository,
                           UserRepository userRepository,
                           MissionRepository missionRepository,
                           PermissionService permissions) {
        this.planRepository = planRepository;
        this.invoiceRepository = invoiceRepository;
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.missionRepository = missionRepository;
        this.permissions = permissions;
    }

    private AppUser getCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || auth instanceof org.springframework.security.authentication.AnonymousAuthenticationToken) {
            throw SystemException.unauthorized("Authentication required");
        }
        return userRepository.findByUsername(auth.getName())
            .filter(user -> user.isEnabled() && user.isAccountNonLocked())
            .orElseThrow(() -> SystemException.unauthorized("Authentication required"));
    }

    private Invoice accessibleInvoice(Long id, Authentication auth) {
        AppUser user = getCurrentUser(auth);
        Invoice invoice = invoiceRepository.findById(id)
            .orElseThrow(() -> SystemException.notFound("Invoice not found"));
        if (!Objects.equals(invoice.getUser().getId(), user.getId()) && !permissions.has(auth, "USER_MANAGE")) {
            throw SystemException.notFound("Invoice not found");
        }
        return invoice;
    }

    @Override
    @Transactional(readOnly = true)
    public List<ServicePlanResponse> listActivePlans() {
        return planRepository.findByActiveTrue().stream().map(this::toPlanResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<InvoiceResponse> listInvoices(Authentication auth, Pageable pageable) {
        AppUser user = getCurrentUser(auth);
        boolean canManage = permissions.has(auth, "USER_MANAGE");

        Page<Invoice> page = canManage
            ? invoiceRepository.findAll(pageable)
            : invoiceRepository.findByUserIdOrderByCreatedAtDesc(user.getId(), pageable);

        return PageResponse.from(page.map(this::toInvoiceResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long id, Authentication auth) {
        return toInvoiceResponse(accessibleInvoice(id, auth));
    }

    @Override
    public InvoiceResponse createInvoice(CreateInvoiceRequest request, Authentication auth) {
        getCurrentUser(auth);
        if (!permissions.has(auth, "USER_MANAGE")) {
            throw new SystemException("Permission denied", HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        }
        AppUser user = userRepository.findById(request.userId())
            .orElseThrow(() -> SystemException.notFound("User not found with id: " + request.userId()));

        Mission mission = null;
        if (request.missionId() != null) {
            mission = missionRepository.findById(request.missionId())
                .orElseThrow(() -> SystemException.notFound("Mission not found"));
            if (!Objects.equals(mission.getCustomer().getId(), user.getId())) {
                throw SystemException.badRequest("Mission does not belong to invoice customer");
            }
        }

        ServicePlan plan = null;
        if (request.planId() != null) {
            plan = planRepository.findById(request.planId())
                .orElseThrow(() -> SystemException.notFound("Service plan not found"));
            if (!Boolean.TRUE.equals(plan.getActive())) {
                throw SystemException.badRequest("Service plan is inactive");
            }
        }

        String code = "INV-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        LocalDateTime dueDate = LocalDateTime.now().plusDays(7);

        Invoice invoice = new Invoice(code, user, mission, plan, request.amount(), dueDate, request.notes());
        Invoice saved = invoiceRepository.save(invoice);
        return toInvoiceResponse(saved);
    }

    @Override
    public PaymentResponse payInvoice(Long id, PayInvoiceRequest request, Authentication auth) {
        accessibleInvoice(id, auth);
        throw new SystemException("Payment gateway is not configured", HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_UNAVAILABLE");
    }

    private ServicePlanResponse toPlanResponse(ServicePlan p) {
        return new ServicePlanResponse(
            p.getId(),
            p.getCode(),
            p.getName(),
            p.getPrice(),
            p.getBillingCycle(),
            p.getMaxMonthlyFlightHours(),
            p.getMaxConcurrentUavs(),
            p.getAllowSarAi(),
            p.getDescription(),
            p.getActive()
        );
    }

    private InvoiceResponse toInvoiceResponse(Invoice inv) {
        return new InvoiceResponse(
            inv.getId(),
            inv.getCode(),
            inv.getUser().getId(),
            inv.getUser().getUsername(),
            inv.getMission() != null ? inv.getMission().getId() : null,
            inv.getMission() != null ? inv.getMission().getTitle() : null,
            inv.getPlan() != null ? inv.getPlan().getId() : null,
            inv.getPlan() != null ? inv.getPlan().getName() : null,
            inv.getAmount(),
            inv.getStatus(),
            inv.getDueDate(),
            inv.getPaidAt(),
            inv.getNotes(),
            inv.getCreatedAt()
        );
    }
}
