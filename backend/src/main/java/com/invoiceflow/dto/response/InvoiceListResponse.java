package com.invoiceflow.dto.response;

import com.invoiceflow.model.entity.Invoice;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public record InvoiceListResponse(
    UUID id,
    String invoiceNumber,
    InvoiceStatus status,
    LocalDate issueDate,
    LocalDate dueDate,
    BigDecimal total,
    String currency,
    String clientName,
    String clientCompany,
    LocalDateTime createdAt
) {
    public static InvoiceListResponse from(Invoice i) {
        return new InvoiceListResponse(
            i.getId(), i.getInvoiceNumber(), i.getStatus(),
            i.getIssueDate(), i.getDueDate(), i.getTotal(), i.getCurrency(),
            i.getClient().getName(), i.getClient().getCompanyName(),
            i.getCreatedAt()
        );
    }
}
