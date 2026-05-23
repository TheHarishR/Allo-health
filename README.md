# Allo Inventory Platform

Multi-warehouse inventory and reservation system — Allo Engineering take-home.

---

## Stack

| | |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| ORM | Prisma |
| Database | Supabase (hosted Postgres) |
| Cache / Locking | Upstash Redis |
| Validation | Zod |
| Styling | Tailwind CSS |
| Hosting | Vercel |

---

## Setup from scratch

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier)
- An [Upstash](https://upstash.com) Redis database (free tier)

### Step 1 — Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/allo-inventory
cd allo-inventory
npm install
```

### Step 2 — Create `.env.local`

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

```bash
# Supabase: Project Settings > Database > Connection string
# IMPORTANT: Use port 6543 (Transaction Pooler) for DATABASE_URL
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Upstash: Redis database > REST API tab
UPSTASH_REDIS_REST_URL="https://YOUR.upstash.io"
UPSTASH_REDIS_REST_TOKEN="YOUR_TOKEN"

CRON_SECRET="any-random-string"
```

> **Supabase tip:** In your Supabase dashboard go to  
> `Project Settings → Database → Connection string`  
> Select **"Transaction"** mode and copy that URL as `DATABASE_URL`.  
> Select **"Session"** mode for `DIRECT_URL`.

### Step 3 — Push schema and seed data

```bash
npx prisma generate        # generates the Prisma client
npx prisma db push         # creates tables in Supabase (no migration file needed)
npm run db:seed            # inserts 5 products + 3 warehouses
```

### Step 4 — Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/products` | Products with per-warehouse stock |
| `GET` | `/api/warehouses` | All warehouses |
| `POST` | `/api/reservations` | Create reservation — `409` if insufficient stock |
| `GET` | `/api/reservations/:id` | Get reservation |
| `POST` | `/api/reservations/:id/confirm` | Confirm — `410` if expired |
| `POST` | `/api/reservations/:id/release` | Release / cancel |
| `GET` | `/api/cron/cleanup` | Cron — releases expired reservations |

---

## Concurrency safety

The core guarantee: two simultaneous requests for the last unit of a SKU — exactly one succeeds, the other gets 409.

**Mechanism: Redis distributed lock (`SET NX PX`)**

```
Request A ──► acquireLock("stock:productId:warehouseId")  ← atomic
               │ got it
               ├── read stock inside lock
               ├── check available > 0  ✓
               ├── prisma.$transaction([
               │     stockLevel.update(reservedUnits++)
               │     reservation.create(...)
               │   ])
               └── releaseLock()

Request B ──► acquireLock(...)  ← fails (key exists)
               │ retry ×5 / 200ms
               │ lock released by A
               ├── read stock  →  available = 0  ✗
               └── return 409
```

The Prisma `$transaction` ensures the stock increment and reservation creation are atomic — both commit or neither does.

---

## Expiry mechanism

**Dual approach:**

1. **Vercel Cron** — `vercel.json` schedules `GET /api/cron/cleanup` every 5 minutes. Finds all `PENDING` reservations where `expiresAt < NOW()`, sets status to `RELEASED`, decrements `reservedUnits`.

2. **Lazy cleanup** — every page load of `/` also calls `releaseExpiredReservations()`. Ensures stock is always accurate on product reads even if the cron is delayed.

---

## Idempotency (bonus)

Send `Idempotency-Key: <uuid>` header on:
- `POST /api/reservations`
- `POST /api/reservations/:id/confirm`

First call: response computed and stored in Redis for 24 hours.  
Subsequent retries: cached response returned immediately — no side effects replayed.

---

## Trade-offs

| Decision | Reasoning | With more time |
|---|---|---|
| Redis lock | Explicit, correct, works across serverless instances | Postgres advisory lock would remove Redis dependency |
| Lazy expiry on product reads | Zero extra infrastructure | Pure cron + a job queue (BullMQ) |
| No auth | Out of scope | NextAuth / Clerk + session-scoped reservations |
| No pagination | 5 products in demo | Cursor-based pagination on `/api/products` |
| Server Components query Prisma directly | Avoids HTTP self-fetch which breaks when port changes | Same pattern, just documented explicitly |
