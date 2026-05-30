# 🛠️ ServiceGo — On-Demand Home Services Platform

<div align="center">

![ServiceGo](https://img.shields.io/badge/ServiceGo-Home%20Services%20Platform-F97316?style=for-the-badge&logoColor=white)

**A full-stack, hyper-local marketplace connecting Indian households with trusted home service professionals — instantly.**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express%205-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![Razorpay](https://img.shields.io/badge/Razorpay-Payments-02042B?style=flat-square&logo=razorpay)](https://razorpay.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)

🌐 **Live at:** [servicego.works](https://servicego.works)

</div>

---

## 📌 Table of Contents

- [About the Project](#-about-the-project)
- [Services Offered](#-services-offered)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Key Features](#-key-features)
  - [Customer Features](#-customer-features)
  - [Vendor Features](#-vendor-features)
  - [Admin Features](#-admin-features)
- [Booking Flow](#-booking-flow)
- [Payment Integration](#-payment-integration)
- [Database Schema](#-database-schema)
- [API Reference](#-api-reference)
- [Performance Optimizations](#-performance-optimizations)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)

---

## 🚀 About the Project

**ServiceGo** is a production-ready, full-stack home services marketplace built for the Indian market. It connects customers who need home appliance repair, installation, and maintenance with verified local professionals (vendors) — offering real-time booking, transparent pricing, Razorpay-powered payments, and live booking status tracking.

The platform is built with a **three-sided marketplace model**:
- **Customers** discover services, book professionals, pay online, and track jobs in real-time
- **Vendors** receive and manage bookings through a feature-rich dashboard with push notifications
- **Admins** oversee the entire platform — managing bookings, vendors, and services from a centralized control panel

---

## 🔧 Services Offered

ServiceGo currently supports **10 service categories**, each with detailed sub-services including inclusions, exclusions, and technician notes:

| Category | Sub-services Include |
|---|---|
| 🌬️ **AC** | Foam Jet Service, General Service, Gas Refilling, Check-up, Installation, Uninstallation |
| ⚡ **Electrical** | Wiring, Switches, Sockets, MCB, Fan Installation |
| 🪵 **Carpenter** | Furniture Repair, Wardrobe, Door Work |
| 🏠 **Chimney** | Installation, Uninstallation, Normal & Deep Cleaning, Check-up |
| ❄️ **Air Cooler** | Check-up, Pad Replacement, Seasonal Service |
| 🧊 **Fridge** | Gas Charging (Single/Double Door, Side-by-Side), Check-up & Diagnosis |
| 🚿 **Geyser** | Installation, Uninstallation, Check-up & Diagnosis |
| 🫧 **Washing Machine** | Top/Front Load – Check-up, Normal Cleaning, Deep Cleaning |
| 🍳 **Microwave** | Check-up, Magnetron Replacement, PCB Service |
| 💧 **RO / Water Purifier** | Check-up, Standard Service, Annual Care Plan |

---

## 🛠️ Tech Stack

### Frontend
| Technology | Version | Purpose |
|---|---|---|
| **Next.js** | 16.1.6 | App Router, SSR, SEO, Image Optimization |
| **React** | 19.2.3 | UI Components |
| **TypeScript** | 5 | Type Safety |
| **Tailwind CSS** | 4 | Utility-First Styling |
| **Leaflet** | 1.9.4 | Interactive Maps (lazy-loaded) |
| **Supabase JS** | 2.98 | Auth & Real-time DB Client |

### Backend
| Technology | Version | Purpose |
|---|---|---|
| **Node.js + Express** | 5.2.1 | REST API Server |
| **Supabase** | 2.98 | PostgreSQL Database & Auth |
| **Razorpay** | 2.9.6 | Payment Gateway |
| **web-push** | 3.6.7 | Vendor Push Notifications |
| **compression** | 1.7.4 | Gzip Response Compression |

### Infrastructure & SEO
- **Supabase** (PostgreSQL) — Hosted database with Row Level Security
- **Vercel / Render** — Frontend on Vercel, Backend on Render
- **Schema.org JSON-LD** — Organization + Website structured data for Google
- **Open Graph + Twitter Cards** — Social sharing metadata
- **Sitemap + Robots.ts** — Full SEO optimization
- **PWA Ready** — Web manifest + Service Worker (`sw.js`) + Apple touch icons

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     CUSTOMER / BROWSER                  │
│            servicego.works  (Next.js on Vercel)         │
└──────────────────────┬──────────────────────────────────┘
                       │  REST API calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│             BACKEND  (Express on Render)                │
│   servicego-backnd.onrender.com                         │
│  • Booking CRUD        • Payment (Razorpay)             │
│  • Vendor Management   • Push Notifications (web-push)  │
│  • Admin Endpoints     • Gzip Compression               │
└──────────────────────┬──────────────────────────────────┘
                       │  Supabase SDK
                       ▼
┌─────────────────────────────────────────────────────────┐
│              DATABASE  (Supabase / PostgreSQL)           │
│  Tables: users, vendors, services, bookings,            │
│          vendor_push_subscriptions                      │
│  15+ Performance Indexes | Row Level Security           │
└─────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure

```
servicegoo/
├── frontend/                          # Next.js 16 App Router
│   ├── app/
│   │   ├── page.tsx                   # 🏠 Homepage — Service discovery + location detection
│   │   ├── layout.tsx                 # Root layout — SEO metadata, Schema.org, GlobalHeader
│   │   ├── subservices/page.tsx       # 📋 Sub-service listing with pricing
│   │   ├── shops/
│   │   │   ├── page.tsx               # 🏪 Vendor search — geo-filtered, sorted by proximity
│   │   │   └── [vendorId]/page.tsx    # 🧑‍🔧 Individual vendor profile + shop cart
│   │   ├── booking/
│   │   │   ├── location/page.tsx      # 📍 Location selection (Leaflet map + Nominatim)
│   │   │   ├── charges/page.tsx       # 💰 Package & add-on selection
│   │   │   └── status/page.tsx        # ✅ Live booking status + ratings
│   │   ├── bookings/page.tsx          # 📚 Customer booking history
│   │   ├── cart/page.tsx              # 🛒 Shop cart management
│   │   ├── checkout/page.tsx          # 💳 Address book + Razorpay payment
│   │   ├── profile/page.tsx           # 👤 Customer profile management
│   │   ├── auth/
│   │   │   ├── login/page.tsx         # 🔐 Supabase Auth login
│   │   │   ├── signup/page.tsx        # 📝 Customer registration
│   │   │   └── reset-password/page.tsx
│   │   ├── vendor/
│   │   │   ├── entry/page.tsx         # Vendor entry point
│   │   │   ├── login/page.tsx         # 🔐 Vendor login
│   │   │   ├── signup/page.tsx        # 📝 Vendor registration
│   │   │   ├── onboarding/page.tsx    # 🧾 Vendor profile setup (Aadhar, shop photos, services)
│   │   │   └── dashboard/page.tsx     # 📊 Vendor dashboard — bookings, servicemen, earnings
│   │   ├── admin/
│   │   │   ├── page.tsx               # 🛡️ Admin panel — booking management + vendor assignment
│   │   │   ├── profile/page.tsx       # Admin profile
│   │   │   ├── vendors/page.tsx       # Vendor approval & management
│   │   │   └── services/page.tsx      # Service catalog management
│   │   ├── faqs/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   └── cancellation-refund-policy/page.tsx
│   │
│   ├── components/
│   │   ├── GlobalHeader.tsx           # Sticky nav — dynamic based on user/vendor/admin role
│   │   ├── SubserviceDetail.tsx       # Sub-service card with includes/excludes detail
│   │   ├── LazyMap.tsx                # Dynamic import wrapper for Leaflet (perf optimization)
│   │   └── LeafletMapContent.tsx      # Actual Leaflet map component
│   │
│   ├── lib/
│   │   ├── booking-flow.ts            # BookingDraft state — persisted in localStorage
│   │   ├── payment-gateway.ts         # Razorpay order creation + verification abstraction
│   │   ├── location.ts                # Nominatim geocoding + reverse geocoding + user location
│   │   ├── address-book.ts            # Saved addresses — persisted in localStorage
│   │   ├── shop-cart.ts               # Vendor shop cart — multi-item, quantity management
│   │   ├── client-cache.ts            # TTL-based in-memory + localStorage API response cache
│   │   ├── supabase.ts                # Supabase client initialization
│   │   ├── user-role.ts               # Role detection — customer / vendor / admin
│   │   ├── admin-access.ts            # Admin route protection utility
│   │   ├── env.ts                     # Typed environment variable access
│   │   └── phone.ts                   # Indian phone number validation + normalization
│   │
│   └── hooks/
│       └── useScrollReveal.ts         # Intersection Observer scroll animation hook
│
├── backend/
│   ├── index.js                       # Express server — all API routes (~2400 lines)
│   ├── package.json
│   ├── .env.example
│   └── sql/                           # Database migration scripts
│       ├── add_booking_payment_columns.sql
│       ├── add_booking_customer_ratings.sql
│       ├── add_booking_serviceman_assignment_columns.sql
│       ├── add_booking_pricing_summary_columns.sql
│       ├── add_vendor_profile_fields.sql
│       ├── add_vendor_approval_status.sql
│       ├── add_performance_indexes.sql
│       ├── add_vendor_service_filter_indexes.sql
│       ├── create_vendor_push_subscriptions.sql
│       ├── populate_detailed_subservices.sql
│       ├── populate_all_detailed_subservices.sql
│       └── update_services_with_subservices.sql
│
├── OPTIMIZATION_SUMMARY.md            # Performance improvements documentation
├── PERFORMANCE_OPTIMIZATION_GUIDE.md  # Optimization guide
└── SUBSERVICES_UPDATE_GUIDE.md        # How to add/update sub-services
```

---

## ✨ Key Features

### 👥 Customer Features

**Service Discovery**
- Smart service search with fuzzy matching on name, category, tags, and keywords
- 10 service categories with vivid image cards
- Automatic location detection via browser Geolocation API + Nominatim reverse geocoding
- Cached service list (5-min TTL) for fast repeated loads

**Vendor Discovery (`/shops`)**
- Browse and filter vendors by service type and location
- Real-time distance calculation from user's detected location
- Vendor cards display rating, experience, base price, and area
- Individual vendor profile page with full service + sub-service listing and a shop cart

**Multi-Step Booking Flow**
1. Select service from homepage
2. Choose sub-service (for AC, Washing Machine, Geyser)
3. Select pricing package + optional add-ons (`/booking/charges`)
4. Set delivery location on interactive Leaflet map (`/booking/location`)
5. Checkout with saved address book + Razorpay payment (`/checkout`)
6. Live booking status tracking with serviceman details (`/booking/status`)

**Payment Methods** (via Razorpay)
- UPI / Wallet (Google Pay, PhonePe, Paytm)
- Credit / Debit Card (Visa, Mastercard, RuPay)
- Net Banking
- Cash on Delivery (COD)

**Post-Service**
- Star rating + review system after job completion
- Full booking history at `/bookings`
- Profile management at `/profile`
- Saved address book for repeat bookings

---

### 🧑‍🔧 Vendor Features

**Onboarding (`/vendor/onboarding`)**
- Multi-step profile setup: shop name, area, experience, services offered
- Aadhar number + photo upload for KYC verification
- Serviceman team registration with individual photos
- GPS-based location auto-detection

**Vendor Dashboard (`/vendor/dashboard`)**
- Full booking management: view, accept, reject, complete bookings
- Assign specific servicemen to individual jobs
- Live update messages + ETA broadcasting to customers
- Team management — add/manage servicemen profiles
- Earnings overview and booking history
- Web Push Notification support — get notified instantly on new bookings

---

### 🛡️ Admin Features

**Admin Panel (`/admin`)**
- Overview of all bookings with status filtering (pending, assigned, completed)
- Assign vendors to pending bookings with one click
- Booking status management: reassign, reopen, complete
- Real-time polling (30-second interval) for live updates

**Vendor Management (`/admin/vendors`)**
- Approve or reject vendor registrations
- View vendor profiles, service categories, and activity status
- Activate/deactivate vendors

**Service Catalog (`/admin/services`)**
- Add, edit, and delete service categories
- Manage sub-service listings with included/excluded item details
- Update service pricing and descriptions

---

## 🔄 Booking Flow

```
Customer Selects Service
        ↓
Sub-service Selection (if AC / WM / Geyser)
        ↓
Package + Add-on Selection  (/booking/charges)
        ↓
Location on Map             (/booking/location)
        ↓
Cart Review + Address Book  (/checkout)
        ↓
Razorpay Payment
        ↓
Booking Created in DB       → Push Notification → Vendor
        ↓
Admin Assigns Vendor        (or Vendor Self-Accepts)
        ↓
Vendor Assigns Serviceman   (with name, phone, photo)
        ↓
Live Status Updates         (/booking/status)
        ↓
Job Completed → Customer Rates + Reviews
```

The booking draft is persisted across page navigations using `localStorage` via `lib/booking-flow.ts`, ensuring no data loss if the user navigates back or refreshes.

---

## 💳 Payment Integration

ServiceGo uses **Razorpay** for all online transactions.

**Flow:**
1. Backend creates a Razorpay order via `/payments/create-order`
2. Frontend opens the Razorpay payment modal
3. On success, frontend sends payment details to backend `/payments/verify`
4. Backend verifies the Razorpay signature (HMAC-SHA256) before confirming the booking
5. Payment status is stored: `pending → paid / failed / refunded`

**Supported methods:** `upi`, `card`, `netbanking`, `cod`

---

## 🗃️ Database Schema

The database is hosted on **Supabase (PostgreSQL)**. Key tables and their notable columns:

### `bookings`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `status` | text | `pending` / `pending_admin` / `assigned` / `completed` |
| `payment_method` | text | `cod` / `upi` / `card` / `netbanking` |
| `payment_status` | text | `pending` / `paid` / `failed` / `refunded` |
| `payment_order_id` | text | Razorpay order ID |
| `payment_id` | text | Razorpay payment ID |
| `assigned_serviceman_name` | text | Individual technician name |
| `assigned_serviceman_phone` | text | Individual technician contact |
| `customer_rating` | integer | 1–5 star rating |
| `customer_review` | text | Review text |
| `estimated_amount` | numeric | Pricing summary |

### `vendors`
| Column | Type | Description |
|---|---|---|
| `id` | uuid | Primary key |
| `service_ids` | jsonb | Array of service IDs offered |
| `selected_service_names` | jsonb | Service name labels |
| `sub_services` | jsonb | Detailed sub-service catalog |
| `servicemen_details` | jsonb | Team member info |
| `approval_status` | text | `pending` / `approved` / `rejected` |
| `rating_average` | float | Computed average rating |
| `rating_count` | integer | Total ratings received |

### `vendor_push_subscriptions`
Stores Web Push subscription objects per vendor for real-time notifications.

---

## 📡 API Reference

All endpoints are served by the Express backend at `https://servicego-backnd.onrender.com`.

### Bookings
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/booking` | Create a new booking |
| `GET` | `/booking/:id` | Get booking details |
| `GET` | `/bookings/user/:userId` | Get all bookings for a customer |
| `GET` | `/bookings` | Admin — get all bookings (paginated) |
| `PUT` | `/booking/:id/assign` | Admin — assign a vendor |
| `PUT` | `/booking/:id/accept` | Vendor — accept a booking |
| `PUT` | `/booking/:id/serviceman` | Vendor — assign a serviceman |
| `PUT` | `/booking/:id/complete` | Mark booking as complete |
| `PUT` | `/booking/:id/unassign` | Unassign a vendor |
| `PUT` | `/booking/:id/reopen` | Reopen a completed booking |
| `DELETE` | `/booking/:id` | Delete a booking |
| `POST` | `/booking/:id/rating` | Submit customer rating |

### Vendors
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/vendors` | List vendors (paginated, filterable) |
| `GET` | `/vendors/:id` | Get a single vendor |
| `PUT` | `/vendors/:id` | Update vendor profile |
| `DELETE` | `/vendors/:id` | Delete vendor |
| `GET` | `/vendors/:auth_id/bookings` | Vendor's own bookings |

### Services
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/services` | List all services |
| `GET` | `/services/:id` | Get a single service |
| `POST` | `/services` | Create a service (admin) |
| `PUT` | `/services/:id` | Update a service (admin) |
| `DELETE` | `/services/:id` | Delete a service (admin) |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/payments/create-order` | Create a Razorpay order |
| `POST` | `/payments/verify` | Verify Razorpay payment signature |

### Push Notifications
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/push/subscribe` | Register vendor push subscription |
| `POST` | `/push/unsubscribe` | Remove vendor push subscription |

---

## ⚡ Performance Optimizations

ServiceGo went through a dedicated performance optimization pass with **8 improvement areas**:

| Optimization | Impact |
|---|---|
| **15+ Database Indexes** on status, user_id, service_id, vendor_id, created_at | 80–90% faster queries |
| **Backend Pagination** on `/bookings`, `/vendors`, `/services` with limit/offset | 99% smaller API payloads |
| **Admin polling** reduced from 8s → 30s intervals | 73% fewer API calls |
| **N+1 Query Fix** on vendor bookings endpoint — 2 queries → 1 | 70% fewer DB round trips |
| **Query-specific fetching** — fetch single record instead of full list | 90% bandwidth reduction |
| **Gzip Compression** middleware + cache headers (1h services, 30min vendors) | 30–50% network savings |
| **Next.js Image Optimization** — automatic WebP/AVIF via `<Image>` | 60–80% smaller images |
| **Lazy-loaded Leaflet** (~100KB) — only loaded on checkout/map pages | 100KB bundle reduction |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- A Supabase project with PostgreSQL database
- Razorpay account (live or test keys)

### 1. Clone the repository

```bash
git clone https://github.com/Ishan-Mittal999/servicegoo.git
cd servicegoo
```

### 2. Set up the Backend

```bash
cd backend
npm install
cp .env.example .env
# Fill in your credentials in .env
npm start
```

### 3. Set up the Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
# Fill in your credentials in .env.local
npm run dev
```

Visit `http://localhost:3000`

### 4. Run Database Migrations

Execute the SQL files in `backend/sql/` in this order against your Supabase database:

```
1. add_vendor_profile_fields.sql
2. add_vendor_approval_status.sql
3. add_booking_payment_columns.sql
4. add_booking_customer_ratings.sql
5. add_booking_serviceman_assignment_columns.sql
6. add_booking_pricing_summary_columns.sql
7. create_vendor_push_subscriptions.sql
8. add_performance_indexes.sql
9. add_vendor_service_filter_indexes.sql
10. populate_all_detailed_subservices.sql
```

---

## 🔐 Environment Variables

### Backend (`.env`)

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_BASE_URL=your_backend_url
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_google_verification_token  # optional
```

> ⚠️ Never commit `.env` or `.env.local` files. They are included in `.gitignore`.

---

## 📄 Legal Pages

ServiceGo includes complete legal documentation:
- `/privacy` — Privacy Policy
- `/terms` — Terms & Conditions
- `/cancellation-refund-policy` — Cancellation & Refund Policy
- `/faqs` — Frequently Asked Questions

---

<div align="center">

Built with ❤️ for India's home service professionals and the households that need them.

🌐 [servicego.works](https://servicego.works)

</div>
