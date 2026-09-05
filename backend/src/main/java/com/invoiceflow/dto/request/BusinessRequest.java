package com.invoiceflow.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BusinessRequest(
    @NotBlank String name,
    String registrationNumber,
    String vatNumber,
    String addressLine1,
    String addressLine2,
    String city,
    String province,
    String postalCode,
    String phone,
    String email,
    String website,
    String primaryColor,
    String secondaryColor,
    @Size(max = 10) String invoicePrefix,
    Integer paymentTermsDays,
    String bankName,
    String bankAccountNumber,
    String bankBranchCode,
    String country,
    String currency,
    Boolean watermarkEnabled,
    @Size(max = 50) String watermarkText,
    Double watermarkOpacity,
    @Size(max = 200) String contactPerson
) {}
