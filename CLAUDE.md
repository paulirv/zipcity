# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Cloudflare Worker API that provides ZIP/postal code lookups and autocomplete functionality for US, Canada, and Mexico locations. US/CA data is stored in Cloudflare D1 (SQLite) and every US/CA response carries `lat` / `lon`, so the nanawalld8 projects-gallery proximity filter can use a typed location as its origin without a separate geocode step. Mexico data is read from a public R2 URL (no R2 binding) and is effectively unused by consumers.

## Commands

```bash
# Development
npm run dev              # Start local dev server (wrangler dev on port 5630, see wrangler.toml [dev])
npm run deploy           # Deploy to Cloudflare (NanaWall account, pinned in wrangler.toml)

# Testing
./test.sh                # Run API test suite against localhost:5630 (BASE_URL=... to override)
./test-production.sh     # Same assertions against the live workers.dev host

# Database operations
wrangler d1 execute zipcity-data --local --file=schema.sql    # Apply schema locally
wrangler d1 execute zipcity-data --file=schema.sql            # Apply schema to production

# Data import to D1
wrangler d1 execute zipcity-data --local --file=data/zipcodes.us.sql
wrangler d1 execute zipcity-data --local --file=data/zipcodes.ca.sql

# Production D1 sanity check (run before deploying)
wrangler d1 execute zipcity-data --command "SELECT COUNT(*) AS n, SUM(latitude IS NULL) AS missing FROM us_zipcodes"

# Monitoring
wrangler tail            # Real-time production logs
```

## Architecture

### Storage Strategy
- **D1 Database**: US and Canada zipcode data (`us_zipcodes`, `ca_zipcodes` tables)
- **Mexico**: JSON fetched from a public R2 URL at request time; there is deliberately no R2 binding (the live script has none, and nanawalld8 never calls the MX endpoint)
- Database binding: `env.DB`

### API Endpoints (src/index.js)
All endpoints support CORS and return JSON:

| Endpoint | Description |
|----------|-------------|
| `/api/us?city=&state=` or `/api/us?zip=` | US ZIP lookup → `{city, state, zip, lat, lon}` |
| `/api/ca?city=&province=` or `/api/ca?postal=` | Canada lookup by city/province or FSA → `{city, province, postal_code, lat, lon}` (a full postal code is reduced to its FSA) |
| `/api/autocomplete/us?q=&limit=` | US city/ZIP autocomplete (min 3 chars); rows carry `lat`/`lon` |
| `/api/autocomplete/ca?q=&limit=` | Canada city/postal code autocomplete; rows carry `lat`/`lon` |
| `/api/autocomplete/mx?q=&limit=` | Mexico state/postal code autocomplete |

### Key Implementation Details
- Autocomplete queries group by city/state to avoid duplicates from multiple ZIP codes per city; grouped rows return `MIN(zipcode)` and an `AVG(latitude)`/`AVG(longitude)` centroid
- `lat`/`lon` are numbers, or `null` when the row has no coordinates (`toCoord()`); existing keys (`type`, `display`, `value`, `city`, `state`, `zipcode`) never change — nanawalld8's `RepFinderController` depends on them
- The US `zip` branch's 400/404 bodies match the previously deployed script byte-for-byte (it had `?zip=` before the repo did)
- Canada postal code detection uses regex `^[A-Za-z]\d[A-Za-z]?` for alphanumeric codes
- Mexico autocomplete uses chunked processing with 8-second timeout to avoid CPU limits
- Autocomplete results capped at 25 items maximum

### Database Schema (schema.sql)
Tables: `us_zipcodes`, `ca_zipcodes` with columns: `zipcode`, `place`, `state`, `state_code`, `latitude`, `longitude`
Indexes on `(place, state_code)` and `zipcode` for query performance.

## Configuration

- `wrangler.toml`: pinned to the NanaWall account (`account_id = 68e5fdab2d5644181406329dbca94fda`) and its D1 `zipcity-data` (`7fe2e03d-a774-45bb-8410-2d0f4f92b113`). An older copy of the service and D1 exists in the personal `paul-bb4` account — never deploy against it.
- Production host: `https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev` (called by nanawalld8's repfinder proxy). Dashboard: https://dash.cloudflare.com/68e5fdab2d5644181406329dbca94fda/workers/services/view/zip-city-lookup/production
- Local dev: `wrangler.toml [dev] port = 5630` must stay in step with `dev.json` (`bob ready` rewrites dev.json's port to the band base, 5630)
- D1 database name: `zipcity-data`
