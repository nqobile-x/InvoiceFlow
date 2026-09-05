package com.invoiceflow.service;

import com.invoiceflow.model.entity.Business;
import com.invoiceflow.model.entity.Client;
import com.invoiceflow.model.entity.Invoice;
import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.*;
import com.itextpdf.layout.properties.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.text.NumberFormat;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.UUID;

/**
 * Generates PDF invoices using iText 8.
 *
 * Features:
 * - Business white-label branding (logo + primary color)
 * - Line items table with VAT breakdown
 * - Watermarks: DRAFT (gray diagonal), OVERDUE (red diagonal), PAID (green stamp)
 * - Bank details footer
 * - PayFast payment link (when applicable)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PdfGenerationService {

    @Value("${app.upload.dir}")
    private String uploadDir;

    @Value("${app.url.frontend}")
    private String frontendUrl;

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd MMMM yyyy");

    private static final java.util.Map<String, Locale> CURRENCY_LOCALES = java.util.Map.ofEntries(
        java.util.Map.entry("ZAR", new Locale("en", "ZA")),
        java.util.Map.entry("BWP", new Locale("en", "BW")),
        java.util.Map.entry("NAD", new Locale("en", "NA")),
        java.util.Map.entry("ZMW", new Locale("en", "ZM")),
        java.util.Map.entry("KES", new Locale("en", "KE")),
        java.util.Map.entry("UGX", new Locale("en", "UG")),
        java.util.Map.entry("NGN", new Locale("en", "NG")),
        java.util.Map.entry("GHS", new Locale("en", "GH")),
        java.util.Map.entry("TZS", new Locale("en", "TZ")),
        java.util.Map.entry("MWK", new Locale("en", "MW")),
        java.util.Map.entry("USD", Locale.US),
        java.util.Map.entry("EUR", Locale.GERMANY),
        java.util.Map.entry("GBP", Locale.UK),
        java.util.Map.entry("AUD", new Locale("en", "AU")),
        java.util.Map.entry("CAD", new Locale("en", "CA"))
    );

    /**
     * Generates a PDF for the given invoice and saves it to disk.
     *
     * @return the relative URL path to the saved PDF
     */
    public String generateAndSave(Invoice invoice) throws IOException {
        byte[] pdfBytes = generatePdfBytes(invoice);

        String relativePath = "invoices/" + invoice.getBusiness().getId() + "/" + invoice.getId() + ".pdf";
        Path fullPath = Paths.get(uploadDir, relativePath);
        Files.createDirectories(fullPath.getParent());
        Files.write(fullPath, pdfBytes);

        log.info("Invoice PDF saved: {}", fullPath);
        return "/uploads/" + relativePath;
    }

    /**
     * Generates PDF bytes in memory (for streaming/download without saving).
     */
    public byte[] generatePdfBytes(Invoice invoice) throws IOException {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();

        PdfWriter writer = new PdfWriter(baos);
        PdfDocument pdf = new PdfDocument(writer);
        Document document = new Document(pdf, PageSize.A4);
        document.setMargins(40, 50, 40, 50);

        Business business = invoice.getBusiness();
        Client client = invoice.getClient();

        DeviceRgb brandColor = parseBrandColor(business.getPrimaryColor());
        PdfFont bold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);
        PdfFont regular = PdfFontFactory.createFont(StandardFonts.HELVETICA);

        // === HEADER: Business info ===
        addHeader(document, business, invoice, brandColor, bold, regular);

        // === BILL TO + INVOICE META ===
        addBillToSection(document, client, invoice, bold, regular);

        // === LINE ITEMS TABLE ===
        String currency = invoice.getCurrency() != null ? invoice.getCurrency() : "ZAR";
        addLineItemsTable(document, invoice, currency, brandColor, bold, regular);

        // === TOTALS ===
        addTotalsSection(document, invoice, currency, brandColor, bold, regular);

        // === NOTES + TERMS ===
        addNotesAndTerms(document, invoice, bold, regular);

        // === BANK DETAILS (if no PayFast or as fallback) ===
        addBankDetails(document, business, bold, regular);

        // === FOOTER ===
        addFooter(document, invoice, regular);

        // === WATERMARK (applied last, over content) ===
        applyWatermark(pdf, invoice);

        document.close();
        return baos.toByteArray();
    }

    private void addHeader(Document doc, Business business, Invoice invoice,
                           DeviceRgb brandColor, PdfFont bold, PdfFont regular) {
        Table header = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(20);

        // Left: Logo + business name
        Cell leftCell = new Cell().setBorder(null).setPadding(0);

        // Embed logo — prefer base64 (persists across server restarts), fall back to disk
        String logoData = business.getLogoBase64() != null ? business.getLogoBase64()
                : (business.getLogoUrl() != null && business.getLogoUrl().startsWith("data:") ? business.getLogoUrl() : null);
        if (logoData != null) {
            try {
                // Strip the data URI prefix to get raw base64 bytes
                String base64 = logoData.substring(logoData.indexOf(",") + 1);
                byte[] logoBytes = java.util.Base64.getDecoder().decode(base64);
                ImageData imageData = ImageDataFactory.create(logoBytes);
                leftCell.add(new Image(imageData).setMaxWidth(160).setMaxHeight(80).setMarginBottom(8));
            } catch (Exception e) {
                log.warn("Could not load business logo from base64: {}", e.getMessage());
                // Try disk as last resort
                try {
                    if (business.getLogoUrl() != null) {
                        int idx = business.getLogoUrl().indexOf("/uploads/");
                        if (idx >= 0) {
                            Path logoFile = Paths.get(uploadDir).resolve(business.getLogoUrl().substring(idx + 9));
                            if (Files.exists(logoFile)) {
                                leftCell.add(new Image(ImageDataFactory.create(Files.readAllBytes(logoFile)))
                                        .setMaxWidth(160).setMaxHeight(80).setMarginBottom(8));
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        }

        leftCell.add(new Paragraph(business.getName())
                .setFont(bold).setFontSize(20).setFontColor(brandColor));

        // Business address block — slightly darker so it reads clearly
        DeviceRgb subText = new DeviceRgb(90, 90, 90);
        if (business.getAddressLine1() != null) {
            StringBuilder addr = new StringBuilder(business.getAddressLine1());
            if (business.getAddressLine2() != null) addr.append(", ").append(business.getAddressLine2());
            if (business.getCity() != null) addr.append(", ").append(business.getCity());
            if (business.getPostalCode() != null) addr.append(", ").append(business.getPostalCode());
            leftCell.add(new Paragraph(addr.toString())
                    .setFont(regular).setFontSize(9).setFontColor(subText).setMarginTop(2));
        }
        if (business.getPhone() != null) {
            leftCell.add(new Paragraph(business.getPhone())
                    .setFont(regular).setFontSize(9).setFontColor(subText));
        }
        if (business.getEmail() != null) {
            leftCell.add(new Paragraph(business.getEmail())
                    .setFont(regular).setFontSize(9).setFontColor(subText));
        }
        if (business.getWebsite() != null) {
            leftCell.add(new Paragraph(business.getWebsite())
                    .setFont(regular).setFontSize(9).setFontColor(subText));
        }
        if (business.getRegistrationNumber() != null) {
            leftCell.add(new Paragraph("Reg: " + business.getRegistrationNumber())
                    .setFont(regular).setFontSize(9).setFontColor(subText));
        }
        if (business.getVatNumber() != null) {
            leftCell.add(new Paragraph("VAT: " + business.getVatNumber())
                    .setFont(regular).setFontSize(9).setFontColor(subText));
        }

        // Right: Invoice heading
        Cell rightCell = new Cell().setBorder(null).setPadding(0)
                .setTextAlignment(TextAlignment.RIGHT);

        boolean isTaxInvoice = business.getVatNumber() != null;
        rightCell.add(new Paragraph(isTaxInvoice ? "TAX INVOICE" : "INVOICE")
                .setFont(bold).setFontSize(28).setFontColor(brandColor));
        rightCell.add(new Paragraph(invoice.getInvoiceNumber())
                .setFont(bold).setFontSize(12));

        header.addCell(leftCell);
        header.addCell(rightCell);
        doc.add(header);

        // Divider line
        doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine(0.5f))
                .setMarginBottom(15));
    }

    private void addBillToSection(Document doc, Client client, Invoice invoice,
                                  PdfFont bold, PdfFont regular) {
        Table meta = new Table(UnitValue.createPercentArray(new float[]{50, 50}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(20);

        // Bill To
        Cell billTo = new Cell().setBorder(null).setPadding(0);
        billTo.add(new Paragraph("BILL TO").setFont(bold).setFontSize(9)
                .setFontColor(ColorConstants.GRAY).setMarginBottom(4));
        billTo.add(new Paragraph(client.getCompanyName() != null ? client.getCompanyName() : client.getName())
                .setFont(bold).setFontSize(12));
        billTo.add(new Paragraph(client.getName()).setFont(regular).setFontSize(10));
        if (client.getEmail() != null) {
            billTo.add(new Paragraph(client.getEmail()).setFont(regular).setFontSize(10));
        }
        if (client.getVatNumber() != null) {
            billTo.add(new Paragraph("VAT: " + client.getVatNumber())
                    .setFont(regular).setFontSize(9).setFontColor(ColorConstants.GRAY));
        }

        // Extra invoice fields under Bill To
        if (invoice.getContactPerson() != null && !invoice.getContactPerson().isBlank()) {
            billTo.add(new Paragraph("Attn: " + invoice.getContactPerson())
                    .setFont(regular).setFontSize(9).setFontColor(ColorConstants.GRAY));
        }

        // Invoice dates + PO / TIN
        Cell dates = new Cell().setBorder(null).setPadding(0)
                .setTextAlignment(TextAlignment.RIGHT);
        dates.add(new Paragraph("INVOICE DATE").setFont(bold).setFontSize(9)
                .setFontColor(ColorConstants.GRAY));
        dates.add(new Paragraph(invoice.getIssueDate().format(DATE_FORMAT))
                .setFont(regular).setFontSize(10).setMarginBottom(8));
        dates.add(new Paragraph("DUE DATE").setFont(bold).setFontSize(9)
                .setFontColor(ColorConstants.GRAY));
        dates.add(new Paragraph(invoice.getDueDate().format(DATE_FORMAT))
                .setFont(bold).setFontSize(10));
        if (invoice.getPurchaseOrderNumber() != null && !invoice.getPurchaseOrderNumber().isBlank()) {
            dates.add(new Paragraph("PO NUMBER").setFont(bold).setFontSize(9)
                    .setFontColor(ColorConstants.GRAY).setMarginTop(8));
            dates.add(new Paragraph(invoice.getPurchaseOrderNumber())
                    .setFont(regular).setFontSize(10));
        }
        if (invoice.getTinNumber() != null && !invoice.getTinNumber().isBlank()) {
            dates.add(new Paragraph("TIN").setFont(bold).setFontSize(9)
                    .setFontColor(ColorConstants.GRAY).setMarginTop(4));
            dates.add(new Paragraph(invoice.getTinNumber())
                    .setFont(regular).setFontSize(10));
        }

        meta.addCell(billTo);
        meta.addCell(dates);
        doc.add(meta);
    }

    private void addLineItemsTable(Document doc, Invoice invoice, String currency,
                                   DeviceRgb brandColor, PdfFont bold, PdfFont regular) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{45, 10, 15, 10, 20}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(10);

        // Table header
        String[] headers = {"DESCRIPTION", "QTY", "UNIT PRICE", "TAX", "AMOUNT"};
        for (String h : headers) {
            table.addHeaderCell(new Cell()
                    .setBackgroundColor(brandColor)
                    .add(new Paragraph(h).setFont(bold).setFontSize(9).setFontColor(ColorConstants.WHITE))
                    .setPadding(8));
        }

        // Alternating row colors
        boolean alternate = false;
        for (Invoice.LineItem item : invoice.getLineItems()) {
            DeviceRgb rowBg = alternate
                    ? new DeviceRgb(248, 248, 248)
                    : new DeviceRgb(255, 255, 255);
            alternate = !alternate;

            table.addCell(new Cell().setBackgroundColor(rowBg)
                    .add(new Paragraph(item.description()).setFont(regular).setFontSize(10)).setPadding(7));
            table.addCell(new Cell().setBackgroundColor(rowBg)
                    .add(new Paragraph(item.quantity().stripTrailingZeros().toPlainString())
                            .setFont(regular).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setPadding(7));
            table.addCell(new Cell().setBackgroundColor(rowBg)
                    .add(new Paragraph(formatAmount(item.unitPrice(), currency))
                            .setFont(regular).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setPadding(7));
            table.addCell(new Cell().setBackgroundColor(rowBg)
                    .add(new Paragraph(item.taxRate().compareTo(BigDecimal.ZERO) == 0 ? "0%" : item.taxRate() + "%")
                            .setFont(regular).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setPadding(7));
            table.addCell(new Cell().setBackgroundColor(rowBg)
                    .add(new Paragraph(formatAmount(item.amount(), currency))
                            .setFont(bold).setFontSize(10).setTextAlignment(TextAlignment.RIGHT)).setPadding(7));
        }

        doc.add(table);
    }

    private void addTotalsSection(Document doc, Invoice invoice, String currency,
                                  DeviceRgb brandColor, PdfFont bold, PdfFont regular) {
        Table totals = new Table(UnitValue.createPercentArray(new float[]{70, 30}))
                .setWidth(UnitValue.createPercentValue(100))
                .setMarginBottom(20);

        addTotalsRow(totals, "Subtotal", formatAmount(invoice.getSubtotal(), currency), regular, false, null);
        if (invoice.getTaxTotal().compareTo(BigDecimal.ZERO) > 0) {
            addTotalsRow(totals, "VAT (15%)", formatAmount(invoice.getTaxTotal(), currency), regular, false, null);
        }
        addTotalsRow(totals, "TOTAL DUE", formatAmount(invoice.getTotal(), currency), bold, true, brandColor);

        doc.add(totals);
    }

    private void addTotalsRow(Table table, String label, String value,
                               PdfFont font, boolean highlight, DeviceRgb bgColor) {
        Cell labelCell = new Cell().setBorder(null);
        Cell valueCell = new Cell().setBorder(null);

        if (highlight && bgColor != null) {
            labelCell.setBackgroundColor(bgColor);
            valueCell.setBackgroundColor(bgColor);
            labelCell.add(new Paragraph(label).setFont(font).setFontSize(12)
                    .setFontColor(ColorConstants.WHITE));
            valueCell.add(new Paragraph(value).setFont(font).setFontSize(12)
                    .setFontColor(ColorConstants.WHITE).setTextAlignment(TextAlignment.RIGHT));
        } else {
            labelCell.add(new Paragraph(label).setFont(font).setFontSize(10));
            valueCell.add(new Paragraph(value).setFont(font).setFontSize(10)
                    .setTextAlignment(TextAlignment.RIGHT));
        }
        labelCell.setPadding(6);
        valueCell.setPadding(6);
        table.addCell(labelCell);
        table.addCell(valueCell);
    }

    private void addNotesAndTerms(Document doc, Invoice invoice, PdfFont bold, PdfFont regular) {
        boolean hasNotes = invoice.getNotes() != null && !invoice.getNotes().isBlank();
        boolean hasTerms = invoice.getTerms() != null && !invoice.getTerms().isBlank();

        if (!hasNotes && !hasTerms) return;

        DeviceRgb labelColor = new DeviceRgb(120, 120, 120);

        if (hasNotes) {
            doc.add(new Paragraph("Notes").setFont(bold).setFontSize(9)
                    .setFontColor(labelColor).setMarginTop(10).setMarginBottom(3));
            doc.add(new Paragraph(invoice.getNotes()).setFont(regular).setFontSize(10)
                    .setMarginBottom(10));
        }
        if (hasTerms) {
            doc.add(new Paragraph("Terms & Conditions").setFont(bold).setFontSize(9)
                    .setFontColor(labelColor).setMarginBottom(3));
            doc.add(new Paragraph(invoice.getTerms()).setFont(regular).setFontSize(9)
                    .setFontColor(labelColor));
        }
    }

    private void addBankDetails(Document doc, Business business, PdfFont bold, PdfFont regular) {
        if (business.getBankAccountNumber() == null) return;

        doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.DashedLine())
                .setMarginTop(15).setMarginBottom(10));
        doc.add(new Paragraph("Banking Details").setFont(bold).setFontSize(10).setMarginBottom(4));
        Table bank = new Table(UnitValue.createPercentArray(new float[]{30, 70}))
                .setWidth(UnitValue.createPercentValue(60));

        addBankRow(bank, "Bank:", business.getBankName(), bold, regular);
        addBankRow(bank, "Account:", business.getBankAccountNumber(), bold, regular);
        if (business.getBankBranchCode() != null) {
            addBankRow(bank, "Branch Code:", business.getBankBranchCode(), bold, regular);
        }
        addBankRow(bank, "Reference:", business.getName() + " - " + "Invoice", bold, regular);
        doc.add(bank);
    }

    private void addBankRow(Table table, String label, String value, PdfFont bold, PdfFont regular) {
        table.addCell(new Cell().setBorder(null)
                .add(new Paragraph(label).setFont(bold).setFontSize(9)));
        table.addCell(new Cell().setBorder(null)
                .add(new Paragraph(value != null ? value : "").setFont(regular).setFontSize(9)));
    }

    private void addFooter(Document doc, Invoice invoice, PdfFont regular) {
        doc.add(new LineSeparator(new com.itextpdf.kernel.pdf.canvas.draw.SolidLine(0.3f))
                .setMarginTop(20).setMarginBottom(8));
        doc.add(new Paragraph("Generated by InvoiceFlow - invoiceflow.co.za")
                .setFont(regular).setFontSize(8)
                .setFontColor(ColorConstants.GRAY)
                .setTextAlignment(TextAlignment.CENTER));
    }

    /**
     * Applies a diagonal watermark based on invoice status.
     * DRAFT: gray, OVERDUE: red, PAID: green
     */
    private void applyWatermark(PdfDocument pdf, Invoice invoice) throws IOException {
        String watermarkText = switch (invoice.getStatus()) {
            case DRAFT -> "DRAFT";
            case OVERDUE -> "OVERDUE";
            case PAID -> "PAID";
            default -> null;
        };

        if (watermarkText == null) return;

        DeviceRgb watermarkColor = switch (invoice.getStatus()) {
            case DRAFT -> new DeviceRgb(180, 180, 180);
            case OVERDUE -> new DeviceRgb(200, 50, 50);
            case PAID -> new DeviceRgb(50, 160, 80);
            default -> new DeviceRgb(180, 180, 180);
        };

        PdfFont font = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

        for (int i = 1; i <= pdf.getNumberOfPages(); i++) {
            PdfPage page = pdf.getPage(i);
            Rectangle pageSize = page.getPageSize();

            PdfCanvas canvas = new PdfCanvas(page.newContentStreamBefore(), page.getResources(), pdf);
            canvas.saveState();
            canvas.setFillColor(watermarkColor);
            canvas.setExtGState(new com.itextpdf.kernel.pdf.extgstate.PdfExtGState()
                    .setFillOpacity(0.15f));

            canvas.beginText();
            canvas.setFontAndSize(font, 80);
            canvas.moveTextWithLeading(
                    pageSize.getWidth() / 2 - 150,
                    pageSize.getHeight() / 2 - 30
            );
            canvas.setTextMatrix(
                    com.itextpdf.kernel.geom.AffineTransform.getRotateInstance(Math.toRadians(45),
                            pageSize.getWidth() / 2, pageSize.getHeight() / 2)
            );
            canvas.showText(watermarkText);
            canvas.endText();
            canvas.restoreState();
        }
    }

    private DeviceRgb parseBrandColor(String hex) {
        if (hex == null || hex.isBlank()) {
            return new DeviceRgb(10, 22, 40); // Default: brand navy #0A1628
        }
        hex = hex.replace("#", "");
        int r = Integer.parseInt(hex.substring(0, 2), 16);
        int g = Integer.parseInt(hex.substring(2, 4), 16);
        int b = Integer.parseInt(hex.substring(4, 6), 16);
        return new DeviceRgb(r, g, b);
    }

    private String formatAmount(BigDecimal amount, String currency) {
        Locale locale = CURRENCY_LOCALES.getOrDefault(currency != null ? currency : "ZAR", new Locale("en", "ZA"));
        NumberFormat fmt = NumberFormat.getCurrencyInstance(locale);
        try {
            fmt.setCurrency(java.util.Currency.getInstance(currency != null ? currency : "ZAR"));
        } catch (Exception ignored) {}
        return fmt.format(amount != null ? amount : BigDecimal.ZERO);
    }
}
