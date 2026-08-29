package com.invoiceflow.dto.response;

import java.math.BigDecimal;

public record DashboardSummaryResponse(
    BigDecimal totalPaid,
    BigDecimal totalOutstanding,
    BigDecimal totalOverdue,
    long draftCount,
    long sentCount,
    long viewedCount,
    long paidCount,
    long overdueCount
) {}
