package com.invoiceflow.service;

import com.invoiceflow.dto.request.BusinessRequest;
import com.invoiceflow.dto.response.BusinessResponse;
import com.invoiceflow.exception.InvoiceFlowException;
import com.invoiceflow.model.entity.Business;
import com.invoiceflow.model.entity.User;
import com.invoiceflow.repository.BusinessRepository;
import com.invoiceflow.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BusinessService {

    private final BusinessRepository businessRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public BusinessResponse getByOwnerId(UUID ownerId) {
        return businessRepository.findByOwnerId(ownerId)
                .map(BusinessResponse::from)
                .orElseThrow(() -> InvoiceFlowException.notFound("Business profile not found"));
    }

    @Transactional
    public BusinessResponse create(UUID ownerId, BusinessRequest req) {
        if (businessRepository.existsByOwnerId(ownerId)) {
            throw InvoiceFlowException.conflict("Business profile already exists");
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> InvoiceFlowException.notFound("User not found"));

        Business business = Business.builder()
                .owner(owner)
                .name(req.name())
                .registrationNumber(req.registrationNumber())
                .vatNumber(req.vatNumber())
                .addressLine1(req.addressLine1())
                .addressLine2(req.addressLine2())
                .city(req.city())
                .province(req.province())
                .postalCode(req.postalCode())
                .phone(req.phone())
                .email(req.email())
                .website(req.website())
                .primaryColor(req.primaryColor())
                .secondaryColor(req.secondaryColor())
                .invoicePrefix(req.invoicePrefix() != null ? req.invoicePrefix() : "INV")
                .paymentTermsDays(req.paymentTermsDays() != null ? req.paymentTermsDays() : 30)
                .bankName(req.bankName())
                .bankAccountNumber(req.bankAccountNumber())
                .bankBranchCode(req.bankBranchCode())
                .country(req.country() != null ? req.country() : "ZA")
                .currency(req.currency() != null ? req.currency() : "ZAR")
                .contactPerson(req.contactPerson())
                .build();

        return BusinessResponse.from(businessRepository.save(business));
    }

    @Transactional
    public BusinessResponse update(UUID ownerId, BusinessRequest req) {
        Business business = businessRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Business profile not found"));

        business.setName(req.name());
        business.setRegistrationNumber(req.registrationNumber());
        business.setVatNumber(req.vatNumber());
        business.setAddressLine1(req.addressLine1());
        business.setAddressLine2(req.addressLine2());
        business.setCity(req.city());
        business.setProvince(req.province());
        business.setPostalCode(req.postalCode());
        business.setPhone(req.phone());
        business.setEmail(req.email());
        business.setWebsite(req.website());
        business.setPrimaryColor(req.primaryColor());
        business.setSecondaryColor(req.secondaryColor());
        if (req.invoicePrefix() != null) business.setInvoicePrefix(req.invoicePrefix());
        if (req.paymentTermsDays() != null) business.setPaymentTermsDays(req.paymentTermsDays());
        business.setBankName(req.bankName());
        business.setBankAccountNumber(req.bankAccountNumber());
        business.setBankBranchCode(req.bankBranchCode());
        if (req.country() != null) business.setCountry(req.country());
        if (req.currency() != null) business.setCurrency(req.currency());
        if (req.watermarkEnabled() != null) business.setWatermarkEnabled(req.watermarkEnabled());
        business.setWatermarkText(req.watermarkText());
        if (req.watermarkOpacity() != null) business.setWatermarkOpacity(req.watermarkOpacity());
        business.setContactPerson(req.contactPerson());

        return BusinessResponse.from(businessRepository.save(business));
    }

    @Transactional
    public BusinessResponse updateLogo(UUID ownerId, String logoUrl) {
        Business business = businessRepository.findByOwnerId(ownerId)
                .orElseThrow(() -> InvoiceFlowException.notFound("Business profile not found"));
        business.setLogoUrl(logoUrl);
        return BusinessResponse.from(businessRepository.save(business));
    }
}
