package com.invoiceflow.dto.response;

import com.invoiceflow.model.entity.Business;

import java.util.UUID;

public record BusinessResponse(
    UUID id,
    String name,
    String registrationNumber,
    String vatNumber,
    String addressLine1,
    String addressLine2,
    String city,
    String province,
    String postalCode,
    String country,
    String phone,
    String email,
    String website,
    String logoUrl,
    String primaryColor,
    String secondaryColor,
    String invoicePrefix,
    Integer paymentTermsDays,
    String bankName,
    String bankAccountNumber,
    String bankBranchCode,
    String currency,
    boolean watermarkEnabled,
    String watermarkText,
    Double watermarkOpacity
) {
    public static BusinessResponse from(Business b) {
        return new BusinessResponse(
            b.getId(), b.getName(), b.getRegistrationNumber(), b.getVatNumber(),
            b.getAddressLine1(), b.getAddressLine2(), b.getCity(), b.getProvince(),
            b.getPostalCode(), b.getCountry(), b.getPhone(), b.getEmail(), b.getWebsite(),
            b.getLogoUrl(), b.getPrimaryColor(), b.getSecondaryColor(),
            b.getInvoicePrefix(), b.getPaymentTermsDays(),
            b.getBankName(), b.getBankAccountNumber(), b.getBankBranchCode(),
            b.getCurrency(), b.isWatermarkEnabled(), b.getWatermarkText(), b.getWatermarkOpacity()
        );
    }
}
