package com.invoiceflow.service;

import com.invoiceflow.dto.response.PaymentInitiateResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.integration.payfast.PayFastService;
import com.invoiceflow.integration.payfast.PayFastService.PayFastPaymentRequest;
import com.invoiceflow.model.entity.Invoice;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;
import com.invoiceflow.model.entity.Payment;
import com.invoiceflow.model.entity.Payment.PaymentStatus;
import com.invoiceflow.repository.InvoiceRepository;
import com.invoiceflow.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final InvoiceRepository invoiceRepository;
    private final PaymentRepository paymentRepository;
    private final PayFastService payFastService;

    @Value("${app.payfast.sandbox}")
    private boolean sandbox;

    @Transactional
    public PaymentInitiateResponse initiatePayment(UUID businessId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            throw InvoiceFlowException.badRequest("Invoice is already paid");
        }
        if (invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw InvoiceFlowException.badRequest("Invoice is cancelled");
        }
        if (invoice.getStatus() == InvoiceStatus.DRAFT) {
            throw InvoiceFlowException.badRequest("Send the invoice before requesting payment");
        }
        if (invoice.getClient().getEmail() == null) {
            throw InvoiceFlowException.badRequest("Client has no email address");
        }

        PayFastPaymentRequest pfRequest = payFastService.buildPaymentRequest(invoice);

        invoice.setPayfastPaymentId(pfRequest.paymentId());
        invoiceRepository.save(invoice);

        return new PaymentInitiateResponse(
            pfRequest.paymentId(),
            pfRequest.paymentUrl(),
            pfRequest.params(),
            sandbox
        );
    }

    @Transactional
    public void handleItn(Map<String, String> itnParams, String requestIp) {
        String mPaymentId = itnParams.get("m_payment_id");
        String paymentStatus = itnParams.get("payment_status");

        log.info("PayFast ITN received: paymentId={}, status={}, ip={}", mPaymentId, paymentStatus, requestIp);

        Invoice invoice = invoiceRepository.findByPayfastPaymentId(mPaymentId)
                .orElseGet(() -> {
                    log.warn("PayFast ITN: no invoice found for paymentId={}", mPaymentId);
                    return null;
                });

        if (invoice == null) return;

        boolean valid = payFastService.verifyItn(itnParams, requestIp, invoice.getTotal());
        if (!valid) {
            log.warn("PayFast ITN verification failed for paymentId={}", mPaymentId);
            return;
        }

        if (invoice.getStatus() == InvoiceStatus.PAID) {
            log.info("PayFast ITN: invoice {} already paid, skipping", invoice.getId());
            return;
        }

        Payment payment = Payment.builder()
                .invoice(invoice)
                .amount(invoice.getTotal())
                .gateway("PAYFAST")
                .gatewayPaymentId(itnParams.getOrDefault("pf_payment_id", mPaymentId))
                .paymentMethod(itnParams.getOrDefault("payment_method", "PAYFAST"))
                .reference(itnParams.getOrDefault("m_payment_id", ""))
                .status(PaymentStatus.COMPLETE)
                .paidAt(LocalDateTime.now())
                .build();

        paymentRepository.save(payment);

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        invoiceRepository.save(invoice);

        log.info("Invoice {} marked PAID via PayFast ITN", invoice.getInvoiceNumber());
    }
}
