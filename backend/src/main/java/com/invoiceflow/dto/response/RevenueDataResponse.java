package com.invoiceflow.dto.response;

import java.math.BigDecimal;
import java.util.List;

public record RevenueDataResponse(List<MonthlyRevenue> months) {
    public record MonthlyRevenue(String month, int year, BigDecimal amount) {}
}
