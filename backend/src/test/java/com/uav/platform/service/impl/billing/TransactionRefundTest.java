package com.uav.platform.service.impl.billing;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.uav.platform.entity.billing.PaymentTransaction;
import com.uav.platform.error.SystemException;
import com.uav.platform.repository.billing.PaymentTransactionRepository;

import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.TestingAuthenticationToken;

import java.math.BigDecimal;
import java.util.Optional;

class TransactionRefundTest {
    private final PaymentTransactionRepository payments = mock(PaymentTransactionRepository.class);
    private final BillingAdminServiceImpl service = new BillingAdminServiceImpl(payments);
    private final TestingAuthenticationToken admin = new TestingAuthenticationToken("admin", null);

    private PaymentTransaction stored(String status) {
        PaymentTransaction tx = new PaymentTransaction();
        tx.setId(7L);
        tx.setStatus(status);
        tx.setAmount(new BigDecimal("450000"));
        when(payments.findById(7L)).thenReturn(Optional.of(tx));
        return tx;
    }

    @Test
    void mismatchedTransferIsRefundedOnceWithItsReference() {
        PaymentTransaction tx = stored("MISMATCH");

        var response = service.refundTransaction(7L, " FT123 ", "chuyển thiếu", admin);

        assertThat(response.resolution()).isEqualTo("REFUNDED");
        assertThat(tx.getResolutionNote()).isEqualTo("FT123 · chuyển thiếu");
        assertThat(tx.getResolvedBy()).isEqualTo("admin");
        assertThatThrownBy(() -> service.refundTransaction(7L, "FT124", null, admin))
                .isInstanceOf(SystemException.class)
                .hasMessageContaining("already resolved");
    }

    @Test
    void settledPaymentCannotBeMarkedRefunded() {
        stored("SUCCESS");

        assertThatThrownBy(() -> service.refundTransaction(7L, "FT123", null, admin))
                .isInstanceOf(SystemException.class)
                .hasMessageContaining("Only unmatched or mismatched");
    }
}
