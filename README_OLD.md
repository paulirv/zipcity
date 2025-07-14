# Zip-City Lookup Cloudflare Worker

A lightweight Cloudflare Worker that returns the ZIP/postal code for a given city and state (US), with future support for Canada. Data is served from bundled static JSON files and can be migrated to Cloudflare KV or R2 as needed.

---

## Features

- **/api/us** — Lookup U.S. ZIP by `?city=` & `?state=`
- **Extensible** — Add `/api/ca` for Canada by dropping in `zipcodes.ca.json`
- **Zero-config SSL** — Supports custom domains (`zipcity.iwpi.com`) via Cloudflare’s Automatic SSL
- **Bundled data** — Ships with `zipcodes.us.json`; future-proofed for KV/R2 migration

---

## Prerequisites

- [Node.js ≥ 16](https://nodejs.org/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/cli-wrangler/) installed and authenticated
- A Cloudflare account with Workers permissions

---

## Repository Structure

```text
├── README.md
├── wrangler.toml
├── src/
│   └── index.js        # Worker entrypoint
├── data/
│   ├── zipcodes.us.json
│   └── zipcodes.ca.json  # (optional—add when ready)
└── package.json
```

---

## Getting Started

1. **Clone & install**

   ```bash
   git clone https://github.com/your-org/zip-city-worker.git
   cd zip-city-worker
   npm install
   ```

2. **Place your JSON**
   - `data/zipcodes.us.json` is included.
   - To support Canada later, drop in `data/zipcodes.ca.json` (same structure).

3. **Configure `wrangler.toml`**
   Ensure you set your account, project name, and route:

   ```toml
   name = "zip-city-lookup"
   main = "src/index.js"
   compatibility_date = "2025-07-01"

   [[kv_namespaces]]
   binding = "ZIP_US"   # optional, if you switch to KV
   id = ""

   [[routes]]
   pattern = "zipcity.iwpi.com/api/*"
   ```

4. **Develop locally**

   ```bash
   wrangler dev --local
   # Visit http://127.0.0.1:8787/api/us?city=Burlington&state=WI
   ```

5. **Publish**

   ```bash
   wrangler publish
   ```

---

## Usage

### US Lookup

```bash
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI"
```

**Response**
```json
{
  "city": "Burlington",
  "state": "WI",
  "zip": "53105"
}
```

### Canada Lookup (future)

```bash
curl -s "https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON"
```

_Response format will be analogous to the US endpoint._

---

## SSL & Custom Domain

1. In your Cloudflare dashboard, add a DNS record:
   - **Type**: CNAME
   - **Name**: `zipcity`
   - **Target**: `<your-zone>.workers.dev`

2. Under **Workers → Custom domains**, add `zipcity.iwpi.com` and select “Automatic HTTPS.”

Cloudflare will provision a TLS certificate automatically.

---

## Extending / Migrations

- **Cloudflare KV**:
  - Bind a namespace (`wrangler.toml` ➔ `[[kv_namespaces]]`)
  - Swap static `fetch()` from `data/` to `ZIP_US.get()`
- **Cloudflare R2**:
  - Bind an R2 bucket
  - Load JSON on startup or in flight from R2 via the R2 binding

_TODOs are marked in `src/index.js` with guidance._

---

## License

This project is MIT-licensed. See [LICENSE](LICENSE) for details.
