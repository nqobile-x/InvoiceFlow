# InvoiceFlow - Security Guide

## Authentication

### JWT Strategy
- Access token: 15 minutes expiry, signed with HS256
- Refresh token: 7 days expiry, stored as HttpOnly cookie, hash stored in DB
- On every request: validate access token signature + expiry + user still active
- On 401: frontend automatically calls /auth/refresh, then retries original request
- Logout: revoke refresh token in DB (set revoked = true)

### Password Policy
- Minimum 8 characters
- BCrypt cost factor 12 (approx 250ms on modern hardware - appropriate cost)
- No password complexity rules shown to user (complexity reduces memorability)
- Account lockout after 5 failed attempts (Bucket4j rate limiter per IP)

## Authorization

Every API endpoint (except public routes) checks:
1. JWT is valid and not expired
2. User exists and is active
3. Resource belongs to user's business (tenant isolation)

### Public Routes (No Auth Required)
```
GET  /invoice/{viewToken}           - client invoice view
POST /api/v1/payments/notify        - PayFast ITN webhook
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/forgot-password
POST /api/v1/auth/reset-password
GET  /api/v1/auth/verify-email
```

### Tenant Isolation
Every service method that touches business data must verify:
```java
if (!resource.getBusinessId().equals(currentUser.getBusinessId())) {
    throw new AccessDeniedException("Resource not found");  // Return 404, not 403
}
```
Return 404 (not 403) to prevent resource enumeration.

## PayFast Security

### ITN Verification Steps (Required - Do Not Skip)
```java
// Step 1: Check request IP is from PayFast
// Allowed: 197.97.145.144/28, 41.74.179.192/27
// Reject immediately if IP not in range

// Step 2: Reconstruct data string
// Sort POST params alphabetically (exclude pf_signature, signature)
// URL-encode values, concatenate as key=value&key=value
// Append &passphrase=YOUR_PASSPHRASE (if set)

// Step 3: Verify signature
String expectedSig = DigestUtils.md5Hex(dataString).toLowerCase();
if (!expectedSig.equals(pfSignature)) throw new SecurityException("Invalid ITN");

// Step 4: Verify amount (within R0.01 tolerance)
BigDecimal invoiceTotal = invoice.getTotal();
BigDecimal pfAmount = new BigDecimal(params.get("amount_gross"));
if (invoiceTotal.subtract(pfAmount).abs().compareTo(new BigDecimal("0.01")) > 0) {
    throw new SecurityException("Amount mismatch");
}

// Step 5: Check payment_status = "COMPLETE"
// Step 6: Mark invoice as PAID only after all checks pass
```

## File Upload Security

```java
// Validate MIME type (don't trust Content-Type header - check magic bytes)
// Allowed: image/jpeg, image/png, image/webp (for logos)
// Allowed: application/pdf (for any document uploads)
// Reject: .exe, .js, .php, .sh - anything executable

// Rename to UUID before saving
// Store outside web root (not /public)
// Max size: 5MB

// Never use the original filename from the upload
String safeName = UUID.randomUUID().toString() + "." + extension;
```

## Environment Variables

Never commit secrets to Git. Use:
- `.env` files (added to .gitignore)
- Railway environment variables in production
- Spring `@Value("${JWT_SECRET}")` injection

## HTTPS

- Development: HTTP is acceptable on localhost
- Production: HTTPS mandatory
  - Vercel handles TLS automatically
  - Railway handles TLS automatically
  - Never run Spring Boot on port 80/443 without a reverse proxy

## Audit Log

Log every mutation with:
- User ID
- Action (INVOICE_CREATED, CLIENT_DELETED, etc.)
- Entity type + ID
- IP address
- Timestamp

Store in `audit_logs` table. Retention: 2 years minimum (for South African tax compliance).

## POPIA Compliance (South Africa)

The Protection of Personal Information Act (POPIA) requires:
- User consent before collecting personal data (registration flow)
- Right to access: users can export their data
- Right to deletion: users can request account deletion (soft delete + anonymize)
- Data breach notification within 72 hours to the Information Regulator
- Store personal data (client names, emails) only as long as necessary
- Privacy policy must be linked from registration page
