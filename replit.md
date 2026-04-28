# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Project: Egypt Advocates — Mohamed A. Osaman Law Firm

Bilingual (Arabic / English, RTL aware) legal-services website with full back-office for an Egyptian law firm.

### Artifacts
- `artifacts/api-server` (Express 5 + Drizzle + Postgres) — public + admin REST API mounted under `/api`
- `artifacts/egypt-advocates` (Vite + React + wouter + shadcn/ui) — public site + admin portal mounted under `/`

### Public site features
Home, About, Practice Areas (+ details), Lawyers (+ profile), Services (+ details), Online + In-Office Booking with availability + payment-method selection, Legal Library (Egyptian laws, categories + articles), Blog (+ post), FAQs, Contact form, bilingual Chat widget (auto-reply via keyword bot during off-hours, live during work hours).

### Admin portal (`/admin`)
- Login at `/admin/login`. Default seed admin:
  - **Email**: `admin@egypt-advocates.com`
  - **Password**: `EgyptAdvocates@2026` (override via `ADMIN_PASSWORD` env var on next seed)
- Dashboard (KPIs, revenue/appointments/pipeline charts), Clients (CRM), Cases, Appointments, Invoices (+ mark paid), Payments, Chat console, Contact Inquiries, Legal Articles, Blog Posts, Services, Lawyers.
- Auth: scrypt password hash + signed-cookie session (`ea_admin`, signed with `SESSION_SECRET`).

### Payments (Egypt-focused)
Instapay, Vodafone Cash, Fawry, Visa, Cash, Bank Transfer. Manual confirmation flow: client selects method → admin confirms in Payments page (no third-party integration, fully manual to avoid PCI / connector requirements).

### Database
16 tables managed by Drizzle (`lib/db/src/schema/*`). Tables: admin_users, site_settings, practice_areas, lawyers, services, testimonials, faqs, clients, cases, case_events, appointments, invoices, invoice_items, payments, chat_threads, chat_messages, contact_inquiries, legal_categories, legal_articles, blog_posts.

### Useful commands
- `pnpm --filter @workspace/scripts run seed` — re-run idempotent seed (admin, site settings, practice areas, lawyers, services, testimonials, FAQs, legal library, blog).
- `pnpm --filter @workspace/db run push` — apply schema changes.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate React Query hooks + Zod schemas after editing `lib/api-spec/openapi.yaml`.

### Conventions
- Public APIs are unauthenticated; admin APIs are mounted under `/api/admin/*` and gated by `requireAdmin` middleware.
- All public list endpoints return arrays directly (not paginated objects).
- Bilingual copy is stored as parallel `*Ar` / `*En` columns on each entity.
- Work-hours logic uses Africa/Cairo timezone (`lib/work-hours.ts`).
