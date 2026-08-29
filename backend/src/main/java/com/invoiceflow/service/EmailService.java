package com.invoiceflow.service;

import com.invoiceflow.model.entity.Business;
import com.invoiceflow.model.entity.Client;
import com.invoiceflow.model.entity.Invoice;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.math.BigDecimal;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final PdfGenerationService pdfGenerationService;

    @Value("${app.mail.from}")
    private String fromAddress;

    @Value("${app.mail.from-name}")
    private String fromName;

    @Value("${app.url.frontend}")
    private String frontendUrl;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMMM yyyy");
    private static final NumberFormat ZAR = NumberFormat.getCurrencyInstance(new Locale("en", "ZA"));

    @Async
    public void sendInvoice(Invoice invoice) {
        try {
            byte[] pdf = pdfGenerationService.generatePdfBytes(invoice);
            Business business = invoice.getBusiness();
            Client client = invoice.getClient();

            Context ctx = new Context();
            ctx.setVariable("invoiceNumber", invoice.getInvoiceNumber());
            ctx.setVariable("clientName", client.getCompanyName() != null ? client.getCompanyName() : client.getName());
            ctx.setVariable("businessName", business.getName());
            ctx.setVariable("total", ZAR.format(invoice.getTotal()));
            ctx.setVariable("dueDate", invoice.getDueDate().format(DATE_FMT));
            ctx.setVariable("viewUrl", frontendUrl + "/invoice/" + invoice.getViewToken());
            ctx.setVariable("primaryColor", business.getPrimaryColor() != null ? business.getPrimaryColor() : "#0A1628");

            String html = templateEngine.process("invoice-email", ctx);
            String subject = "Invoice " + invoice.getInvoiceNumber() + " from " + business.getName();
            String filename = "Invoice-" + invoice.getInvoiceNumber() + ".pdf";

            sendWithAttachment(client.getEmail(), subject, html, pdf, filename);
            log.info("Invoice email sent: {} -> {}", invoice.getInvoiceNumber(), client.getEmail());

        } catch (Exception e) {
            log.error("Failed to send invoice email for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    @Async
    public void sendOverdueReminder(Invoice invoice) {
        try {
            Business business = invoice.getBusiness();
            Client client = invoice.getClient();

            BigDecimal outstanding = invoice.getTotal();

            Context ctx = new Context();
            ctx.setVariable("invoiceNumber", invoice.getInvoiceNumber());
            ctx.setVariable("clientName", client.getCompanyName() != null ? client.getCompanyName() : client.getName());
            ctx.setVariable("businessName", business.getName());
            ctx.setVariable("total", ZAR.format(outstanding));
            ctx.setVariable("dueDate", invoice.getDueDate().format(DATE_FMT));
            ctx.setVariable("viewUrl", frontendUrl + "/invoice/" + invoice.getViewToken());
            ctx.setVariable("primaryColor", business.getPrimaryColor() != null ? business.getPrimaryColor() : "#0A1628");

            String html = templateEngine.process("overdue-reminder", ctx);
            String subject = "Payment Overdue: Invoice " + invoice.getInvoiceNumber() + " from " + business.getName();

            sendHtml(client.getEmail(), subject, html);
            log.info("Overdue reminder sent: {} -> {}", invoice.getInvoiceNumber(), client.getEmail());

        } catch (Exception e) {
            log.error("Failed to send overdue reminder for {}: {}", invoice.getInvoiceNumber(), e.getMessage());
        }
    }

    private void sendWithAttachment(String to, String subject, String html,
                                     byte[] attachment, String filename) throws MessagingException, java.io.UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        helper.addAttachment(filename, new ByteArrayResource(attachment), "application/pdf");
        mailSender.send(message);
    }

    private void sendHtml(String to, String subject, String html) throws MessagingException, java.io.UnsupportedEncodingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        helper.setFrom(fromAddress, fromName);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(html, true);
        mailSender.send(message);
    }
}
