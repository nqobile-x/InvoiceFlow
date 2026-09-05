package com.invoiceflow.service;

import com.invoiceflow.dto.request.InvoiceRequest;
import com.invoiceflow.dto.request.LineItemRequest;
import com.invoiceflow.dto.response.InvoiceListResponse;
import com.invoiceflow.dto.response.InvoiceResponse;
import com.invoiceflow.dto.response.PageResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.Business;
import com.invoiceflow.model.entity.Client;
import com.invoiceflow.model.entity.Invoice;
import com.invoiceflow.model.entity.Invoice.InvoiceStatus;
import com.invoiceflow.model.entity.Invoice.LineItem;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.repository.ClientRepository;
import com.invoiceflow.repository.InvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final BusinessRepository businessRepository;
    private final ClientRepository clientRepository;
    private final PdfGenerationService pdfGenerationService;
    private final EmailService emailService;

    @Transactional(readOnly = true)
    public PageResponse<InvoiceListResponse> list(UUID businessId, InvoiceStatus status, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        var result = status != null
                ? invoiceRepository.findByBusinessIdAndStatus(businessId, status, pageable)
                : invoiceRepository.findByBusinessId(businessId, pageable);
        return PageResponse.from(result.map(InvoiceListResponse::from));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse get(UUID businessId, UUID invoiceId) {
        return invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .map(InvoiceResponse::from)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));
    }

    @Transactional(readOnly = true)
    public InvoiceResponse getPublic(UUID viewToken) {
        Invoice invoice = invoiceRepository.findByViewToken(viewToken)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        // Track first view
        if (invoice.getViewedAt() == null && invoice.getStatus() == InvoiceStatus.SENT) {
            invoice.setStatus(InvoiceStatus.VIEWED);
            invoice.setViewedAt(LocalDateTime.now());
            invoiceRepository.save(invoice);
        }

        return InvoiceResponse.from(invoice);
    }

    @Transactional
    public InvoiceResponse create(UUID businessId, InvoiceRequest req) {
        Business business = businessRepository.findByIdWithLock(businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Business not found"));

        Client client = clientRepository.findByIdAndBusinessId(req.clientId(), businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Client not found"));

        List<LineItem> lineItems = buildLineItems(req.lineItems());
        BigDecimal subtotal = lineItems.stream()
                .map(li -> li.unitPrice().multiply(li.quantity()).setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxTotal = lineItems.stream()
                .map(li -> li.amount().subtract(li.unitPrice().multiply(li.quantity()).setScale(2, RoundingMode.HALF_UP)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal total = subtotal.add(taxTotal);

        String invoiceNumber = generateInvoiceNumber(business);
        business.setNextInvoiceNumber(business.getNextInvoiceNumber() + 1);
        businessRepository.save(business);

        Invoice invoice = Invoice.builder()
                .business(business)
                .client(client)
                .invoiceNumber(invoiceNumber)
                .issueDate(req.issueDate())
                .dueDate(req.dueDate())
                .lineItems(lineItems)
                .subtotal(subtotal)
                .taxTotal(taxTotal)
                .total(total)
                .currency(business.getCurrency())
                .notes(req.notes())
                .terms(req.terms())
                .contactPerson(req.contactPerson())
                .purchaseOrderNumber(req.purchaseOrderNumber())
                .tinNumber(req.tinNumber())
                .build();

        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Transactional
    public InvoiceResponse update(UUID businessId, UUID invoiceId, InvoiceRequest req) {
        Invoice invoice = invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw InvoiceFlowException.badRequest("Only DRAFT invoices can be edited");
        }

        Client client = clientRepository.findByIdAndBusinessId(req.clientId(), businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Client not found"));

        List<LineItem> lineItems = buildLineItems(req.lineItems());
        BigDecimal subtotal = lineItems.stream()
                .map(li -> li.unitPrice().multiply(li.quantity()).setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal taxTotal = lineItems.stream()
                .map(li -> li.amount().subtract(li.unitPrice().multiply(li.quantity()).setScale(2, RoundingMode.HALF_UP)))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        invoice.setClient(client);
        invoice.setIssueDate(req.issueDate());
        invoice.setDueDate(req.dueDate());
        invoice.setLineItems(lineItems);
        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setTotal(subtotal.add(taxTotal));
        invoice.setNotes(req.notes());
        invoice.setTerms(req.terms());
        invoice.setContactPerson(req.contactPerson());
        invoice.setPurchaseOrderNumber(req.purchaseOrderNumber());
        invoice.setTinNumber(req.tinNumber());

        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    @Transactional
    public void delete(UUID businessId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw InvoiceFlowException.badRequest("Only DRAFT invoices can be deleted");
        }

        invoiceRepository.delete(invoice);
    }

    @Transactional
    public InvoiceResponse send(UUID businessId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw InvoiceFlowException.badRequest("Only DRAFT invoices can be sent");
        }

        if (invoice.getClient().getEmail() == null || invoice.getClient().getEmail().isBlank()) {
            throw InvoiceFlowException.badRequest("Client has no email address");
        }

        try {
            String pdfUrl = pdfGenerationService.generateAndSave(invoice);
            invoice.setPdfUrl(pdfUrl);
        } catch (Exception e) {
            log.error("PDF generation failed for invoice {}: {}", invoiceId, e.getMessage());
            throw InvoiceFlowException.badRequest("Failed to generate PDF: " + e.getMessage());
        }

        invoice.setStatus(InvoiceStatus.SENT);
        invoice.setSentAt(LocalDateTime.now());
        Invoice saved = invoiceRepository.save(invoice);

        emailService.sendInvoice(saved);

        return InvoiceResponse.from(saved);
    }

    @Transactional
    public InvoiceResponse markPaid(UUID businessId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        if (invoice.getStatus() == InvoiceStatus.PAID || invoice.getStatus() == InvoiceStatus.CANCELLED) {
            throw InvoiceFlowException.badRequest("Invoice is already " + invoice.getStatus());
        }

        invoice.setStatus(InvoiceStatus.PAID);
        invoice.setPaidAt(LocalDateTime.now());

        return InvoiceResponse.from(invoiceRepository.save(invoice));
    }

    public byte[] downloadPdf(UUID businessId, UUID invoiceId) {
        Invoice invoice = invoiceRepository.findByIdAndBusinessId(invoiceId, businessId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Invoice not found"));

        try {
            return pdfGenerationService.generatePdfBytes(invoice);
        } catch (Exception e) {
            log.error("PDF download failed for invoice {}: {}", invoiceId, e.getMessage());
            throw InvoiceFlowException.badRequest("Failed to generate PDF");
        }
    }

    @Scheduled(cron = "0 1 0 * * *", zone = "Africa/Johannesburg")
    @Transactional
    public void markOverdueInvoices() {
        List<Invoice> overdue = invoiceRepository.findOverdueInvoices(LocalDate.now());
        log.info("Overdue job: {} invoices to process", overdue.size());

        for (Invoice invoice : overdue) {
            invoice.setStatus(InvoiceStatus.OVERDUE);
            invoiceRepository.save(invoice);
            emailService.sendOverdueReminder(invoice);
        }
    }

    private List<LineItem> buildLineItems(List<LineItemRequest> requests) {
        return requests.stream().map(req -> {
            BigDecimal qty = req.quantity().setScale(2, RoundingMode.HALF_UP);
            BigDecimal unitPrice = req.unitPrice().setScale(2, RoundingMode.HALF_UP);
            BigDecimal taxRate = req.taxRate().setScale(2, RoundingMode.HALF_UP);
            BigDecimal net = qty.multiply(unitPrice).setScale(2, RoundingMode.HALF_UP);
            BigDecimal amount = net.multiply(BigDecimal.ONE.add(taxRate.divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP)))
                    .setScale(2, RoundingMode.HALF_UP);
            return new LineItem(req.description(), qty, unitPrice, taxRate, amount);
        }).toList();
    }

    private String generateInvoiceNumber(Business business) {
        int year = LocalDate.now().getYear();
        String seq = String.format("%04d", business.getNextInvoiceNumber());
        String prefix = (business.getInvoicePrefix() != null && !business.getInvoicePrefix().isBlank())
                ? business.getInvoicePrefix() : "INV";
        return prefix + "-" + year + "-" + seq;
    }
}
