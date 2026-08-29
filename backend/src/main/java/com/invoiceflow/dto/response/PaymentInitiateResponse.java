package com.invoiceflow.dto.response;

import java.util.Map;

public record PaymentInitiateResponse(
    String paymentId,
    String paymentUrl,
    Map<String, String> params,
    boolean sandbox
) {}
