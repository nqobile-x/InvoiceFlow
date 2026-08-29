<div align="center">

```
██╗███╗   ██╗██╗   ██╗ ██████╗ ██╗ ██████╗███████╗███████╗██╗      ██████╗ ██╗    ██╗
██║████╗  ██║██║   ██║██╔═══██╗██║██╔════╝██╔════╝██╔════╝██║     ██╔═══██╗██║    ██║
██║██╔██╗ ██║██║   ██║██║   ██║██║██║     █████╗  █████╗  ██║     ██║   ██║██║ █╗ ██║
██║██║╚██╗██║╚██╗ ██╔╝██║   ██║██║██║     ██╔══╝  ██╔══╝  ██║     ██║   ██║██║███╗██║
██║██║ ╚████║ ╚████╔╝ ╚██████╔╝██║╚██████╗███████╗██║     ███████╗╚██████╔╝╚███╔███╔╝
╚═╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝ ╚═╝ ╚═════╝╚══════╝╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ 
```

**Professional invoicing for South African businesses**

[![Backend](https://img.shields.io/badge/Spring_Boot-3.3-6DB33F?style=flat-square&logo=spring)](https://spring.io/projects/spring-boot)
[![Frontend](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=next.js)](https://nextjs.org)
[![Mobile](https://img.shields.io/badge/Expo-SDK_54-000020?style=flat-square&logo=expo)](https://expo.dev)
[![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk)](https://openjdk.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-C9A84C?style=flat-square)](LICENSE)

</div>

---

## What is InvoiceFlow?

InvoiceFlow is a full-stack invoicing platform built for South African SMEs and freelancers. Create, brand, send, and track professional invoices with PayFast payment integration, PDF generation, and a matching mobile app.

Built by [Nqobile Sibiya](https://github.com/nqobile-x) (SUPPLYNEX / Criterio).

---

## Features

- **Professional PDF invoices** — branded with your logo, colours, and banking details
- **PayFast integration** — clients pay directly from the invoice link
- **Public invoice view** — share a link, client pays online, no login needed
- **Mobile app** — create and manage invoices from your phone (React Native)
- **Smart dashboard** — revenue charts, overdue alerts, invoice stats
- **Multi-status tracking** — Draft → Sent → Viewed → Paid → Overdue
- **Business watermarks** — DRAFT / OVERDUE / PAID + custom watermark
- **ZAR-first** — South African currency, VAT (15%), and date formats

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 3.3, Java 21, Spring Security 6 + JWT |
| Database | PostgreSQL 16, Flyway migrations |
| PDF | iText 8 Community |
| Email | Spring Mail + Thymeleaf |
| Frontend | Next.js 15, TypeScript, Tailwind CSS v4, Zustand |
| Mobile | React Native, Expo SDK 54, NativeWind |
| Payments | PayFast API |

---

## Project Structure

```
InvoiceFlow/
├── backend/          # Spring Boot 3 REST API
├── frontend/         # Next.js 15 web app
├── mobile/           # React Native Expo app
├── docs/             # Architecture & security docs
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites
- Java 21 (Temurin recommended)
- Node.js 20+
- PostgreSQL 16
- Maven 3.9+

### Backend

```bash
cd backend
cp ../.env.example .env   # fill in your values
mvn spring-boot:run
# API available at http://localhost:8080/api/v1
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # set NEXT_PUBLIC_API_URL
npm run dev
# Web app at http://localhost:3000
```

### Mobile

```bash
cd mobile
npm install --legacy-peer-deps
npx expo start
# Scan QR with Expo Go
```

### Docker (full stack)

```bash
docker-compose up
```

---

## Environment Variables

Copy `.env.example` and fill in:

| Variable | Description |
|----------|-------------|
| `DB_URL` | PostgreSQL connection string |
| `JWT_SECRET` | 256-bit base64 secret |
| `PAYFAST_MERCHANT_ID` | PayFast merchant ID |
| `PAYFAST_MERCHANT_KEY` | PayFast merchant key |
| `MAIL_PASSWORD` | SMTP / SendGrid API key |

---

## Design

InvoiceFlow uses a deliberate South African professional aesthetic:

- **Navy** `#0A1628` — primary brand colour
- **Gold** `#C9A84C` — accent (ZAR gold)
- **Cream** `#F8F6F1` — background
- **IBM Plex Sans** — body typeface
- **Playfair Display** — display headings

---

## Roadmap

- [x] Backend API (Spring Boot)
- [x] PDF generation with branding
- [x] PayFast payment integration
- [x] Next.js web frontend
- [x] React Native mobile app
- [x] Public invoice view page
- [ ] Deploy to Render + Vercel + Supabase
- [ ] Play Store / App Store submission
- [ ] Multi-user / team accounts
- [ ] Recurring invoices

---

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">
Built with care in 🇿🇦 South Africa
</div>
