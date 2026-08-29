# InvoiceFlow - Claude Code Build Guide

> **For Claude Code:** Read this entire file before writing a single line of code.
> Load the required skills listed below before beginning any phase.

---

## Project Overview

**InvoiceFlow** is a full-stack invoicing platform for South African small businesses and individuals.
It enables users to create, brand, send, and track professional invoices with PayFast payment integration and PDF generation.

**Owner:** Nqobile Sibiya (SUPPLYNEX / Criterio)
**Target market:** South African SMEs and freelancers
**Primary currency:** ZAR (South African Rand)

---

## Required Skills - Load Before Building

When building any part of this project, Claude Code must load the following skills using the `Skill` tool:

```
# For backend (Spring Boot) work:
Skill("engineering:architecture")
Skill("engineering:code-review")
Skill("engineering:testing-strategy")
Skill("engineering:deploy-checklist")

# For frontend (Next.js) work:
Skill("artifact-design")           # Must load before any UI work
Skill("dataviz")                   # For dashboard charts and analytics

# For documentation:
Skill("engineering:documentation")

# For database schema changes:
Skill("engineering:system-design")

# For security review:
Skill("engineering:code-review")
```

---

## Tech Stack (Locked - Do Not Change Without Owner Approval)

### Backend
| Layer | Technology | Notes |
|-------|-----------|-------|
| Runtime | Java 21 (LTS) | Use record classes for DTOs |
| Framework | Spring Boot 3.x | Web, Security, Data JPA, Mail, Validation |
| Security | Spring Security 6 + JWT | Stateless. Access token 15min, Refresh token 7 days |
| Database | PostgreSQL 16 | UUID primary keys everywhere |
| ORM | Spring Data JPA + Hibernate | Use projections for read-heavy queries |
| PDF | iText 8 (Community) | For invoice PDF generation |
| Email | Spring Mail + Thymeleaf | SMTP via Gmail or SendGrid |
| Payments | PayFast API | South African payment gateway |
| Container | Docker + Docker Compose | Local dev environment |
| Testing | JUnit 5 + Mockito + Testcontainers | Testcontainers for PostgreSQL integration tests |

### Frontend (Web)
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | TypeScript strict mode |
| Styling | Tailwind CSS v4 | Custom design tokens - see Design System section |
| State | Zustand | Global auth + invoice state |
| Forms | React Hook Form + Zod | Client-side validation |
| HTTP | Axios with interceptors | Auto-attach JWT, handle 401 refresh |
| PDF Preview | react-pdf | Display generated PDFs in browser |
| Charts | Recharts | Dashboard analytics |
| UI Components | Radix UI primitives | Unstyled, accessible, styled manually |

### Mobile
| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | React Native (Expo SDK 52) | TypeScript strict mode |
| Navigation | Expo Router | File-based routing, matches Next.js patterns |
| Styling | NativeWind (Tailwind for RN) | Keep same utility classes as web where possible |
| State | Zustand (shared with web) | Share /src/store and /src/services between web and mobile |
| Storage | Expo SecureStore | JWT token storage - NEVER AsyncStorage for tokens |
| Camera | Expo Camera | Scanning client QR codes, uploading logo |

---

## Design System (Anti-AI-Slop Rules)

**Read this before touching any UI file.**

The owner explicitly does NOT want the default SaaS look.

### What to avoid
- Purple/violet gradients as hero backgrounds
- Rounded card-heavy layouts (too much border-radius)
- Inter or DM Sans as the only typeface
- Glassmorphism
- Gradient text on headings
- "Powered by AI" badges or robot icons

### Design direction
- **Typeface:** `Sohne` or fallback to `IBM Plex Sans` (body) + `Playfair Display` (display headings)
- **Color palette:** Deep navy (#0A1628) base, ZAR gold (#C9A84C) accent, off-white (#F8F6F1) background
- **Border radius:** Minimal. Max 6px on cards. 0px on inputs.
- **Tone:** Professional, South African, trustworthy - not startup playful
- **Invoice design:** Clean, typographic, receipt-like. Think a premium accountant's letterhead.
- **Shadows:** Subtle 1px border + box-shadow, not floating cards

### Tailwind custom tokens (add to tailwind.config.ts)
```ts
colors: {
  brand: {
    navy: '#0A1628',
    gold: '#C9A84C',
    'gold-light': '#E8D5A3',
    cream: '#F8F6F1',
    slate: '#4A5568',
  },
  status: {
    draft: '#6B7280',
    sent: '#2563EB',
    viewed: '#7C3AED',
    paid: '#059669',
    overdue: '#DC2626',
    cancelled: '#9CA3AF',
  }
}
```

---

## Security Architecture

### Authentication Flow
```
1. User registers -> password hashed with BCrypt (strength 12)
2. Login -> returns { accessToken (15min JWT), refreshToken (7 days, HttpOnly cookie) }
3. Every request -> Authorization: Bearer <accessToken>
4. 401 on expired -> frontend calls /auth/refresh automatically via Axios interceptor
5. Logout -> invalidate refresh token in DB (token rotation)
```

### JWT Claims
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "businessId": "business-uuid",
  "role": "OWNER | ACCOUNTANT | VIEWER",
  "iat": 1234567890,
  "exp": 1234568790
}
```

### Security Rules (Spring Security - Do Not Relax)
- CSRF: disabled (stateless JWT API)
- CORS: configured explicitly - never use `allowAll()`
- Rate limiting: 5 login attempts per 15 minutes per IP (use Bucket4j)
- Passwords: BCrypt strength 12 minimum
- SQL Injection: JPA only, no native queries with string concatenation
- File uploads: validate MIME type + extension, max 5MB, store in /uploads with UUID names
- PayFast webhook: verify ITN signature before processing any payment
- Sensitive config: environment variables only, never in application.yml committed to git

### CORS Allowed Origins (application.yml, not hardcoded)
```
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

---

## Database Schema

### Core Tables
```sql
-- Users
users (id UUID PK, email VARCHAR UNIQUE, password_hash VARCHAR, 
       first_name VARCHAR, last_name VARCHAR, phone VARCHAR,
       email_verified BOOLEAN, created_at TIMESTAMP, updated_at TIMESTAMP)

-- Businesses (white-label profile per user)
businesses (id UUID PK, owner_id UUID FK->users, name VARCHAR, 
            registration_number VARCHAR, vat_number VARCHAR,
            address_line1 VARCHAR, address_line2 VARCHAR, city VARCHAR,
            province VARCHAR, postal_code VARCHAR, country VARCHAR DEFAULT 'ZA',
            phone VARCHAR, email VARCHAR, website VARCHAR,
            logo_url VARCHAR, primary_color VARCHAR, secondary_color VARCHAR,
            invoice_prefix VARCHAR DEFAULT 'INV', next_invoice_number INT DEFAULT 1,
            payment_terms_days INT DEFAULT 30, bank_name VARCHAR,
            bank_account_number VARCHAR, bank_branch_code VARCHAR,
            currency VARCHAR DEFAULT 'ZAR', created_at TIMESTAMP, updated_at TIMESTAMP)

-- Clients
clients (id UUID PK, business_id UUID FK->businesses, name VARCHAR,
         email VARCHAR, phone VARCHAR, company_name VARCHAR,
         vat_number VARCHAR, address_line1 VARCHAR, address_line2 VARCHAR,
         city VARCHAR, province VARCHAR, postal_code VARCHAR, country VARCHAR,
         notes TEXT, is_active BOOLEAN DEFAULT true,
         created_at TIMESTAMP, updated_at TIMESTAMP)

-- Invoice line items embedded in invoices as JSONB for flexibility
invoices (id UUID PK, business_id UUID FK->businesses, client_id UUID FK->clients,
          invoice_number VARCHAR, status VARCHAR CHECK IN ('DRAFT','SENT','VIEWED','PAID','OVERDUE','CANCELLED'),
          issue_date DATE, due_date DATE,
          line_items JSONB NOT NULL,  -- [{description, quantity, unit_price, tax_rate, amount}]
          subtotal DECIMAL(12,2), tax_total DECIMAL(12,2), total DECIMAL(12,2),
          currency VARCHAR DEFAULT 'ZAR', notes TEXT, terms TEXT,
          pdf_url VARCHAR, view_token UUID DEFAULT gen_random_uuid(),
          sent_at TIMESTAMP, viewed_at TIMESTAMP, paid_at TIMESTAMP,
          payfast_payment_id VARCHAR,
          created_at TIMESTAMP, updated_at TIMESTAMP)

-- Payments
payments (id UUID PK, invoice_id UUID FK->invoices, amount DECIMAL(12,2),
          payment_method VARCHAR, reference VARCHAR, gateway VARCHAR,
          gateway_payment_id VARCHAR, status VARCHAR, paid_at TIMESTAMP,
          created_at TIMESTAMP)

-- Refresh tokens
refresh_tokens (id UUID PK, user_id UUID FK->users, token_hash VARCHAR UNIQUE,
                expires_at TIMESTAMP, revoked BOOLEAN DEFAULT false,
                created_at TIMESTAMP)

-- Audit log
audit_logs (id UUID PK, user_id UUID FK->users, action VARCHAR, 
            entity_type VARCHAR, entity_id UUID, details JSONB, 
            ip_address VARCHAR, created_at TIMESTAMP)
```

---

## API Design

### Base URL
- Development: `http://localhost:8080/api/v1`
- Production: `https://api.invoiceflow.co.za/api/v1`

### Endpoints

#### Auth
```
POST /auth/register
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/verify-email?token=
POST /auth/forgot-password
POST /auth/reset-password
```

#### Business Profile
```
GET    /business              - get own business profile
POST   /business              - create business profile
PUT    /business              - update business profile
POST   /business/logo         - upload logo (multipart)
```

#### Clients
```
GET    /clients               - list clients (paginated, searchable)
POST   /clients               - create client
GET    /clients/{id}          - get client details
PUT    /clients/{id}          - update client
DELETE /clients/{id}          - soft delete
GET    /clients/{id}/invoices - invoices for this client
```

#### Invoices
```
GET    /invoices              - list invoices (filter: status, client, date range)
POST   /invoices              - create invoice (DRAFT by default)
GET    /invoices/{id}         - get invoice detail
PUT    /invoices/{id}         - update invoice (DRAFT only)
DELETE /invoices/{id}         - delete (DRAFT only)
POST   /invoices/{id}/send    - send invoice via email + mark SENT
GET    /invoices/{id}/pdf     - download PDF
POST   /invoices/{id}/mark-paid - manually mark as paid
GET    /invoices/public/{viewToken} - public view (no auth, for clients)
```

#### Payments (PayFast)
```
POST   /payments/initiate/{invoiceId}  - create PayFast payment
POST   /payments/notify               - PayFast ITN webhook (no auth)
GET    /payments/cancel               - PayFast cancel redirect
GET    /payments/return               - PayFast success redirect
```

#### Dashboard
```
GET    /dashboard/summary     - total invoiced, paid, outstanding, overdue
GET    /dashboard/recent      - last 10 invoices
GET    /dashboard/revenue     - monthly revenue (12 months)
```

---

## Build Order for Claude Code

Follow this exact order. Do not skip ahead.

### Phase 1 - Backend Foundation
1. `pom.xml` with all dependencies
2. `application.yml` (dev) + `application-prod.yml` (prod)
3. Security config: `SecurityConfig.java`, `JwtUtil.java`, `JwtAuthFilter.java`
4. User entity + repository + `UserDetailsServiceImpl`
5. Auth endpoints: register, login, refresh, logout
6. Business entity + CRUD
7. Client entity + CRUD

### Phase 2 - Core Invoice Engine
1. Invoice entity + repository (JSONB line items)
2. Invoice CRUD endpoints
3. PDF generation service using iText 8
4. Email service (send invoice via Spring Mail + Thymeleaf template)
5. Invoice send endpoint (generate PDF + email + update status)
6. Public invoice view endpoint (no auth, via viewToken)

### Phase 3 - PayFast Integration
1. PayFast service (ITN signature verification)
2. Payment initiation endpoint
3. ITN webhook handler
4. Payment entity + repository

### Phase 4 - Dashboard & Analytics
1. Dashboard summary endpoint
2. Revenue analytics endpoint
3. Overdue invoice scheduled task (`@Scheduled` - daily at 00:01 SAST)

### Phase 5 - Frontend (Next.js)
1. Tailwind config with brand tokens
2. Auth pages: login, register, forgot password
3. Dashboard page with Recharts revenue chart
4. Clients list + create/edit
5. Invoice list with status filter tabs
6. Invoice builder (multi-step form: client, line items, dates, preview)
7. PDF preview modal
8. Invoice public view page (no auth)
9. Settings: business profile + logo upload + bank details

### Phase 6 - Mobile (React Native Expo)
1. Expo project init with TypeScript + NativeWind
2. Auth screens (login, register)
3. Dashboard screen with summary cards
4. Invoice list screen
5. Invoice detail screen + PDF view
6. Client list screen
7. Quick invoice create flow

---

## Environment Variables

### Backend (.env)
```
# Database
DB_URL=jdbc:postgresql://localhost:5432/invoiceflow
DB_USERNAME=invoiceflow
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD

# JWT
JWT_SECRET=CHANGE_ME_256_BIT_BASE64_SECRET
JWT_ACCESS_EXPIRY_MS=900000
JWT_REFRESH_EXPIRY_MS=604800000

# Email (SendGrid or Gmail SMTP)
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=apikey
MAIL_PASSWORD=SENDGRID_API_KEY
MAIL_FROM=invoices@yourdomain.com

# PayFast
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_MERCHANT_KEY=your_merchant_key
PAYFAST_PASSPHRASE=your_passphrase
PAYFAST_SANDBOX=true

# App
APP_URL=http://localhost:3000
API_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:3000

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=5
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8080/api/v1
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PAYFAST_MERCHANT_ID=your_merchant_id
```

---

## Key Implementation Notes

### PayFast ITN Verification
```java
// ALWAYS verify the ITN before processing payment
// 1. Disable security filter for /api/v1/payments/notify
// 2. Reconstruct the data string from POST params (alphabetical order, exclude signature)
// 3. MD5 hash with passphrase appended
// 4. Compare to posted pf_signature
// 5. Verify pfHost is a valid PayFast IP: 197.97.145.144/28, 41.74.179.192/27
// 6. Verify amount matches invoice total (within R0.01)
// 7. Only then mark invoice as PAID
```

### PDF Invoice Template
The generated PDF must include:
- Business logo (top left), business name + address (top right)
- "INVOICE" or "TAX INVOICE" heading (large, navy)
- Invoice number, issue date, due date
- Bill To: client name + address
- Line items table: Description | Qty | Unit Price | Tax | Amount
- Subtotal, VAT (15% if applicable), Total (bold, large)
- Payment instructions / bank details
- Footer: terms and conditions + "Generated by InvoiceFlow"
- Business primary color applied to table header and headings

### Invoice Numbering
Format: `{PREFIX}-{YEAR}-{SEQUENCE}` e.g. `INV-2026-0001`
Increment `businesses.next_invoice_number` atomically with `@Lock(PESSIMISTIC_WRITE)`

### Overdue Detection
Daily scheduled job: find all SENT invoices where `due_date < NOW()`, mark as OVERDUE, send reminder email.

---

## Testing Requirements

- Unit test every service class (Mockito)
- Integration test every controller endpoint (MockMvc + @SpringBootTest)
- Testcontainers for PostgreSQL (do not mock the DB in integration tests)
- Test ITN signature verification with both valid and invalid signatures
- Test JWT expiry and refresh flow
- Frontend: Jest + React Testing Library for critical components

---

## Git Conventions
```
feat: add PayFast payment initiation
fix: correct invoice number sequence race condition  
security: add rate limiting to auth endpoints
refactor: extract PDF generation to dedicated service
test: add integration tests for invoice controller
docs: update API reference with new endpoints
```

---

## Folder Structure Reference
```
InvoiceFlow/
├── CLAUDE.md                           <- You are here
├── README.md
├── docs/
│   ├── architecture.md
│   ├── api-reference.md
│   ├── security.md
│   └── database-schema.md
├── backend/                            <- Spring Boot 3.x Java 21
│   ├── src/main/java/com/invoiceflow/
│   │   ├── InvoiceFlowApplication.java
│   │   ├── config/
│   │   │   ├── SecurityConfig.java
│   │   │   ├── JwtConfig.java
│   │   │   ├── CorsConfig.java
│   │   │   └── MailConfig.java
│   │   ├── controller/
│   │   │   ├── AuthController.java
│   │   │   ├── BusinessController.java
│   │   │   ├── ClientController.java
│   │   │   ├── InvoiceController.java
│   │   │   ├── PaymentController.java
│   │   │   └── DashboardController.java
│   │   ├── service/
│   │   │   ├── AuthService.java
│   │   │   ├── BusinessService.java
│   │   │   ├── ClientService.java
│   │   │   ├── InvoiceService.java
│   │   │   ├── PdfGenerationService.java
│   │   │   ├── EmailService.java
│   │   │   ├── PayFastService.java
│   │   │   └── DashboardService.java
│   │   ├── repository/
│   │   ├── model/entity/
│   │   ├── dto/request/
│   │   ├── dto/response/
│   │   ├── security/jwt/
│   │   │   ├── JwtUtil.java
│   │   │   └── JwtAuthFilter.java
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   └── InvoiceFlowException.java
│   │   └── util/
│   │       └── PayFastSignatureUtil.java
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   ├── application-prod.yml
│   │   └── templates/
│   │       ├── invoice-email.html      <- Thymeleaf email template
│   │       └── overdue-reminder.html
│   ├── pom.xml
│   └── Dockerfile
├── frontend/                           <- Next.js 15 TypeScript
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx               <- Landing/redirect
│   │   │   ├── auth/login/page.tsx
│   │   │   ├── auth/register/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── invoices/page.tsx
│   │   │   ├── invoices/new/page.tsx
│   │   │   ├── invoices/[id]/page.tsx
│   │   │   ├── clients/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   └── invoice/[viewToken]/page.tsx  <- Public, no auth
│   │   ├── components/
│   │   │   ├── ui/                    <- Base Radix UI components
│   │   │   ├── invoice/               <- InvoiceBuilder, LineItemRow, InvoicePreview
│   │   │   ├── dashboard/             <- RevenueChart, StatCard, RecentInvoices
│   │   │   └── layout/                <- Sidebar, TopBar, PageHeader
│   │   ├── lib/
│   │   │   ├── api/                   <- Axios instance + all API calls
│   │   │   ├── hooks/                 <- useInvoices, useClients, useAuth
│   │   │   ├── store/                 <- Zustand stores
│   │   │   └── utils/                 <- formatCurrency (ZAR), formatDate
│   │   └── styles/globals.css
│   ├── tailwind.config.ts
│   ├── package.json
│   └── Dockerfile
├── mobile/                             <- React Native Expo SDK 52
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── services/                  <- Shared API layer
│   │   └── utils/
│   ├── app.json
│   └── package.json
└── docker-compose.yml
```

---

## Custom Business Watermark (Owner-Defined)

In addition to system watermarks (DRAFT/OVERDUE/PAID), businesses can configure their own
custom watermark in Business Settings. This appears on all SENT and VIEWED invoices.

### Database additions
```sql
ALTER TABLE businesses ADD COLUMN watermark_enabled BOOLEAN DEFAULT false;
ALTER TABLE businesses ADD COLUMN watermark_text VARCHAR(50);
ALTER TABLE businesses ADD COLUMN watermark_opacity DECIMAL(3,2) DEFAULT 0.08;
```

### Watermark priority (highest to lowest)
1. DRAFT - always shown on draft invoices
2. OVERDUE - always shown on overdue invoices
3. PAID - shown on paid invoices (optional, togglable in settings)
4. Custom business watermark - SENT/VIEWED invoices if enabled
5. None - no watermark

### PdfGenerationService logic
```java
if (invoice.getStatus() == SENT || invoice.getStatus() == VIEWED) {
    Business biz = invoice.getBusiness();
    if (biz.isWatermarkEnabled() && biz.getWatermarkText() != null) {
        applyCustomWatermark(pdf, biz.getWatermarkText(), biz.getWatermarkOpacity());
    }
}
```

### Settings UI
Add "Invoice Watermark" card to /settings/page.tsx:
- Toggle: "Add watermark to invoices"
- Text input: "Watermark text" (max 20 chars, e.g. "SUPPLYNEX", "CONFIDENTIAL")
- Slider: Opacity: Subtle (5%) / Light (10%) / Medium (20%)
- Live preview: small invoice thumbnail showing how it looks
