package com.invoiceflow.integration.payfast;

import com.invoiceflow.model.entity.Invoice;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.codec.digest.DigestUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * PayFast payment gateway integration for South African payments.
 *
 * Supports: Credit/Debit Card, Instant EFT, SnapScan, Zapper, Capitec Pay, Mobicred
 *
 * Security: ITN (Instant Transaction Notification) verification with:
 * 1. IP allowlist (PayFast IPs only)
 * 2. MD5 signature verification with passphrase
 * 3. Amount verification (within R0.01 tolerance)
 * 4. Payment status check
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayFastService {

    @Value("${app.payfast.merchant-id}")
    private String merchantId;

    @Value("${app.payfast.merchant-key}")
    private String merchantKey;

    @Value("${app.payfast.passphrase}")
    private String passphrase;

    @Value("${app.payfast.sandbox}")
    private boolean sandbox;

    @Value("${app.payfast.notify-url}")
    private String notifyUrl;

    @Value("${app.payfast.return-url}")
    private String returnUrl;

    @Value("${app.payfast.cancel-url}")
    private String cancelUrl;

    @Value("${app.url.frontend}")
    private String frontendUrl;

    // PayFast IP ranges (allowlist for ITN verification)
    private static final List<String> PAYFAST_IP_PREFIXES = List.of(
            "197.97.145.",   // 197.97.145.144/28
            "41.74.179."     // 41.74.179.192/27
    );

    private static final String PAYFAST_LIVE_URL = "https://www.payfast.co.za/eng/process";
    private static final String PAYFAST_SANDBOX_URL = "https://sandbox.payfast.co.za/eng/process";

    /**
     * Builds the PayFast payment URL and signed parameters for a given invoice.
     * The frontend redirects the client to this URL to complete payment.
     */
    public PayFastPaymentRequest buildPaymentRequest(Invoice invoice) {
        String paymentId = UUID.randomUUID().toString();
        String itemName = "Invoice " + invoice.getInvoiceNumber() + " - " + invoice.getBusiness().getName();
        String clientName = invoice.getClient().getName();
        String clientEmail = invoice.getClient().getEmail();

        LinkedHashMap<String, String> params = new LinkedHashMap<>();
        params.put("merchant_id", merchantId);
        params.put("merchant_key", merchantKey);
        params.put("return_url", returnUrl + "?invoice=" + invoice.getId());
        params.put("cancel_url", cancelUrl + "?invoice=" + invoice.getId());
        params.put("notify_url", notifyUrl);
        params.put("name_first", clientName.contains(" ") ? clientName.split(" ")[0] : clientName);
        params.put("name_last", clientName.contains(" ") ? clientName.split(" ", 2)[1] : "");
        params.put("email_address", clientEmail != null ? clientEmail : "");
        params.put("m_payment_id", paymentId);
        params.put("amount", invoice.getTotal().setScale(2).toPlainString());
        params.put("item_name", itemName);
        params.put("item_description", "Payment for " + itemName);

        String signature = generateSignature(params);
        params.put("signature", signature);

        String baseUrl = sandbox ? PAYFAST_SANDBOX_URL : PAYFAST_LIVE_URL;

        return new PayFastPaymentRequest(paymentId, baseUrl, Collections.unmodifiableMap(params));
    }

    /**
     * Verifies a PayFast ITN (Instant Transaction Notification) webhook.
     *
     * MUST call this before processing any payment. Returns true only if ALL checks pass.
     *
     * @param itnParams   all POST parameters from PayFast ITN
     * @param requestIp   the IP address of the ITN request
     * @param invoiceTotal the expected invoice total
     */
    public boolean verifyItn(Map<String, String> itnParams, String requestIp, BigDecimal invoiceTotal) {
        // Step 1: IP Allowlist
        if (!isPayFastIp(requestIp)) {
            log.warn("PayFast ITN rejected: IP not in allowlist: {}", requestIp);
            return false;
        }

        // Step 2: Signature verification
        if (!verifySignature(itnParams)) {
            log.warn("PayFast ITN rejected: invalid signature");
            return false;
        }

        // Step 3: Payment status
        String paymentStatus = itnParams.get("payment_status");
        if (!"COMPLETE".equals(paymentStatus)) {
            log.info("PayFast ITN: payment not complete, status={}", paymentStatus);
            return false;
        }

        // Step 4: Amount verification (within R0.01 tolerance)
        try {
            BigDecimal pfAmount = new BigDecimal(itnParams.get("amount_gross"));
            BigDecimal diff = invoiceTotal.subtract(pfAmount).abs();
            if (diff.compareTo(new BigDecimal("0.01")) > 0) {
                log.warn("PayFast ITN rejected: amount mismatch. Expected={}, Got={}", invoiceTotal, pfAmount);
                return false;
            }
        } catch (NumberFormatException e) {
            log.warn("PayFast ITN rejected: invalid amount format");
            return false;
        }

        log.info("PayFast ITN verified successfully for payment: {}", itnParams.get("m_payment_id"));
        return true;
    }

    private boolean verifySignature(Map<String, String> itnParams) {
        String receivedSignature = itnParams.get("pf_signature");
        if (receivedSignature == null) {
            receivedSignature = itnParams.get("signature");
        }
        if (receivedSignature == null) return false;

        // Reconstruct data string (alphabetical, exclude signature fields)
        Map<String, String> params = new TreeMap<>(itnParams);
        params.remove("pf_signature");
        params.remove("signature");

        StringBuilder dataString = new StringBuilder();
        params.forEach((key, value) -> {
            if (value != null && !value.isEmpty()) {
                dataString.append(key).append("=")
                        .append(URLEncoder.encode(value.trim(), StandardCharsets.UTF_8))
                        .append("&");
            }
        });

        // Remove trailing &
        String data = dataString.length() > 0
                ? dataString.substring(0, dataString.length() - 1)
                : dataString.toString();

        // Append passphrase if set
        if (passphrase != null && !passphrase.isBlank()) {
            data += "&passphrase=" + URLEncoder.encode(passphrase.trim(), StandardCharsets.UTF_8);
        }

        String expectedSignature = DigestUtils.md5Hex(data).toLowerCase();
        return expectedSignature.equals(receivedSignature.toLowerCase());
    }

    private String generateSignature(Map<String, String> params) {
        StringBuilder dataString = new StringBuilder();
        params.forEach((key, value) -> {
            if (value != null && !value.isEmpty()) {
                dataString.append(key).append("=")
                        .append(URLEncoder.encode(value, StandardCharsets.UTF_8))
                        .append("&");
            }
        });

        String data = dataString.length() > 0
                ? dataString.substring(0, dataString.length() - 1)
                : dataString.toString();

        if (passphrase != null && !passphrase.isBlank()) {
            data += "&passphrase=" + URLEncoder.encode(passphrase.trim(), StandardCharsets.UTF_8);
        }

        return DigestUtils.md5Hex(data).toLowerCase();
    }

    private boolean isPayFastIp(String ip) {
        if (sandbox) return true; // Allow all IPs in sandbox mode
        return PAYFAST_IP_PREFIXES.stream().anyMatch(ip::startsWith);
    }

    public record PayFastPaymentRequest(
        String paymentId,
        String paymentUrl,
        Map<String, String> params
    ) {}
}
