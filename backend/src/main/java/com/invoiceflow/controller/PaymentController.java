package com.invoiceflow.controller;

import com.invoiceflow.dto.response.PaymentInitiateResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final BusinessRepository businessRepository;

    @PostMapping("/initiate/{invoiceId}")
    public ResponseEntity<PaymentInitiateResponse> initiate(
            @AuthenticationPrincipal User user,
            @PathVariable UUID invoiceId) {
        UUID businessId = getBusinessId(user);
        return ResponseEntity.ok(paymentService.initiatePayment(businessId, invoiceId));
    }

    /**
     * PayFast ITN (Instant Transaction Notification) webhook.
     * No authentication — verified by IP + MD5 signature inside PaymentService.
     */
    @PostMapping("/notify")
    public ResponseEntity<String> itnNotify(
            @RequestParam MultiValueMap<String, String> params,
            HttpServletRequest request) {

        String ip = resolveClientIp(request);
        Map<String, String> itnParams = new HashMap<>();
        params.forEach((key, values) -> itnParams.put(key, values.isEmpty() ? "" : values.get(0)));

        try {
            paymentService.handleItn(itnParams, ip);
        } catch (Exception e) {
            log.error("ITN processing error: {}", e.getMessage(), e);
        }

        // PayFast requires 200 OK regardless
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/return")
    public ResponseEntity<Map<String, String>> paymentReturn(
            @RequestParam(required = false) UUID invoice) {
        return ResponseEntity.ok(Map.of(
            "status", "success",
            "message", "Payment completed. Your invoice will be updated shortly.",
            "invoiceId", invoice != null ? invoice.toString() : ""
        ));
    }

    @GetMapping("/cancel")
    public ResponseEntity<Map<String, String>> paymentCancel(
            @RequestParam(required = false) UUID invoice) {
        return ResponseEntity.ok(Map.of(
            "status", "cancelled",
            "message", "Payment was cancelled.",
            "invoiceId", invoice != null ? invoice.toString() : ""
        ));
    }

    private UUID getBusinessId(User user) {
        return businessRepository.findByOwnerId(user.getId())
                .map(b -> b.getId())
                .orElseThrow(() -> InvoiceFlowException.badRequest("Please complete your business profile first"));
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
