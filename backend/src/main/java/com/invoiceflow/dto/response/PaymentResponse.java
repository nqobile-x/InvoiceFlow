package com.invoiceflow.dto.response;

import com.invoiceflow.model.entity.Payment;
import com.invoiceflow.model.entity.Payment.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public record PaymentResponse(
    UUID id,
    UUID invoiceId,
    BigDecimal amount,
    String paymentMethod,
    String gateway,
    String gatewayPaymentId,
    PaymentStatus status,
    LocalDateTime paidAt,
    LocalDateTime createdAt
) {
    public static PaymentResponse from(Payment p) {
        return new PaymentResponse(
            p.getId(), p.getInvoice().getId(), p.getAmount(),
            p.getPaymentMethod(), p.getGateway(), p.getGatewayPaymentId(),
            p.getStatus(), p.getPaidAt(), p.getCreatedAt()
        );
    }
}
