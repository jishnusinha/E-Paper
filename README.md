# E-Paper Studio

Production-oriented interactive e-paper builder and publishing platform.

Upload a newspaper PDF, draw article rectangles on a Konva canvas, choose a reader theme, publish, and let readers hover/click articles to open high-resolution crops.

## Stack

- **Web**: React, TypeScript, Vite, Tailwind, shadcn/Radix, TanStack Query, Zustand, React Konva
- **API**: Node.js, Express, MongoDB/Mongoose, JWT cookies, Multer, Cloudinary, Zod
- **PDF**: `pdfjs-dist` + `@napi-rs/canvas` (server-side page rendering)
- **Shared**: coordinate math, Zod schemas, theme defaults

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker (for local MongoDB) or another MongoDB instance
- Cloudinary account (required for PDF/page uploads and article crops)

### 2. Install

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example apps/api/.env
cp .env.example apps/web/.env
```

Edit `apps/api/.env`:

- `MONGODB_URI`
- `JWT_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`

Edit `apps/web/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

### 4. Start MongoDB

```bash
docker compose up -d
```

### 5. Seed admin + themes

```bash
npm run seed:admin
npm run seed:themes
```

### 6. Run development servers

```bash
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:5000/api/health
- Public reader: http://localhost:5173/epaper
- Admin: http://localhost:5173/admin/login

## Root scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start API + web |
| `npm run build` | Build shared, API, web |
| `npm run typecheck` | Type-check all packages |
| `npm run lint` | Lint/typecheck packages |
| `npm run test` | Unit + API tests |
| `npm run seed:admin` | Idempotent admin seed |
| `npm run seed:themes` | Seed reader themes |

## Core workflow

1. Admin logs in
2. Creates an edition and uploads a multi-page PDF
3. Backend stores the PDF in Cloudinary and renders page images
4. Admin opens the canvas editor and draws article rectangles
5. Coordinates are saved as normalized `0–1` page values
6. Admin selects sidebar or bottom pagination theme
7. Admin previews and publishes
8. Readers open `/epaper/:YYYY-MM-DD`, hover articles, and open crop modals

## PDF processing notes

- Rendering is done on the server with `pdfjs-dist` and `@napi-rs/canvas`
- Jobs are persisted in MongoDB and recovered after restarts
- Concurrency is bounded by `PDF_PROCESSING_CONCURRENCY`
- Target page width defaults to `PDF_RENDER_TARGET_WIDTH=3000`
- When Cloudinary credentials are set, PDFs and page images are stored in Cloudinary
- When Cloudinary is not configured, the API uses a local storage fallback under `.data/storage` and serves files from `/media` so local development still works end-to-end
- Sample fixture PDF: `fixtures/sample-newspaper.pdf` (generated, not copyrighted)

## Testing

```bash
npm run test -w @epaper/shared
npm run test -w @epaper/api
npm run test -w @epaper/web
```

Playwright end-to-end coverage lives under `apps/web/e2e` and requires a running stack plus Cloudinary credentials for the full upload path.

## Project structure

```text
apps/web       React reader + admin studio
apps/api       Express API, PDF worker, Cloudinary
packages/shared  Shared types, Zod schemas, coordinate helpers
```

## Security notes

- Admin auth uses HTTP-only JWT cookies
- Login is rate-limited
- Public APIs only expose published editions
- Crop endpoints validate ownership and publication state
- Cloudinary credentials stay on the backend only
