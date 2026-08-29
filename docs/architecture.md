# InvoiceFlow - System Architecture

## Overview

InvoiceFlow is a three-tier application:

```
[React Native Mobile App]     [Next.js Web App]
          |                         |
          +----------+  +-----------+
                     |  |
            [Spring Boot REST API]
                     |
            [PostgreSQL Database]
                     |
         [PayFast] [SendGrid] [File Storage]
```

## Component Responsibilities

### Backend (Spring Boot 3 / Java 21)
- All business logic lives here. The frontend and mobile are thin clients.
- Issues and validates JWTs
- Generates invoice PDFs using iText 8
- Sends emails via SMTP (Spring Mail + Thymeleaf templates)
- Verifies PayFast ITN webhooks and updates payment status
- Enforces all authorization rules (owner can only see their own data)
- Runs scheduled jobs (overdue detection, daily at 00:01 SAST)

### Database (PostgreSQL 16)
- Single source of truth
- JSONB column for invoice line items (flexible, no line-item join table needed)
- UUID primary keys (prevents enumeration attacks)
- Soft deletes for clients (is_active flag)
- Optimistic locking on invoice number sequence

### Frontend (Next.js 15)
- App Router with server components for initial data fetch
- Client components for interactive invoice builder
- Axios interceptors handle token refresh transparently
- No business logic. All calculations happen backend-side.

### Mobile (React Native / Expo)
- Shares API service layer with web (same TypeScript types and API calls)
- SecureStore for JWT tokens (never AsyncStorage)
- Offline-capable invoice list (cached with React Query)

## Data Flow - Creating and Sending an Invoice

```
1. User fills InvoiceBuilder form (frontend)
2. POST /api/v1/invoices -> backend saves as DRAFT, returns invoice ID
3. User previews PDF: GET /api/v1/invoices/{id}/pdf
4. User clicks "Send": POST /api/v1/invoices/{id}/send
   a. Backend generates PDF via iText 8
   b. Stores PDF at /uploads/{businessId}/invoices/{invoiceId}.pdf
   c. Sends email with PDF attachment + view link via SendGrid
   d. Sets invoice status = SENT, sent_at = NOW()
5. Client receives email, clicks view link
6. Browser opens /invoice/{viewToken} (public, no auth required)
   a. Backend finds invoice by view_token, marks viewed_at = NOW(), status = VIEWED
7. Client clicks "Pay Now" -> POST /api/v1/payments/initiate/{invoiceId}
   a. Backend constructs PayFast payment form params + MD5 signature
   b. Returns redirect URL to PayFast payment page
8. Client completes payment on PayFast
9. PayFast sends ITN webhook to POST /api/v1/payments/notify
   a. Backend verifies ITN signature + IP + amount
   b. Creates Payment record
   c. Sets invoice status = PAID, paid_at = NOW()
   d. Sends payment confirmation email to business owner
```

## Security Layers

1. HTTPS everywhere (Let's Encrypt in production)
2. JWT access tokens (15 min) + rotating refresh tokens (7 days)
3. Bcrypt password hashing (cost 12)
4. Rate limiting on auth endpoints (Bucket4j)
5. CORS restricted to known origins
6. PayFast ITN signature verification + IP allowlist
7. File upload validation (MIME type + extension + size)
8. SQL injection prevention (JPA only, no string-concatenated queries)
9. Audit log for all write operations

## Deployment (Production)

```
[Vercel / Railway]              [Railway / AWS ECS]
  Next.js frontend   <-HTTPS->   Spring Boot API
                                      |
                              [Railway PostgreSQL]
                                      |
                                [AWS S3 or local]
                                  PDF storage
```

Recommended for SA market:
- Backend: Railway (Docker, auto-deploy from GitHub, Johannesburg-adjacent region)
- Frontend: Vercel (global CDN, fastest Next.js hosting)
- Database: Railway PostgreSQL or Supabase (both have free tiers)
- Email: SendGrid (free tier: 100 emails/day)
