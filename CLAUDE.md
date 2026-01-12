# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Cloudflare Worker API that provides ZIP/postal code lookups and autocomplete functionality for US, Canada, and Mexico locations. Data is stored in Cloudflare D1 (SQLite) for US/CA and R2 for Mexico.

## Commands

```bash
# Development
npm run dev              # Start local dev server (wrangler dev)
npm run deploy           # Deploy to Cloudflare

# Testing
./test.sh                # Run API test suite against localhost:8787

# Database operations
wrangler d1 execute zipcity-data --local --file=schema.sql    # Apply schema locally
wrangler d1 execute zipcity-data --file=schema.sql            # Apply schema to production

# Data import to D1
wrangler d1 execute zipcity-data --local --file=data/zipcodes.us.sql
wrangler d1 execute zipcity-data --local --file=data/zipcodes.ca.sql

# R2 data management (Mexico data still uses R2)
wrangler r2 object put zipcity/zipcodes.mx.json --file=data/zipcodes.mx.json
wrangler r2 object list zipcity

# Monitoring
wrangler tail            # Real-time production logs
```

## Architecture

### Storage Strategy
- **D1 Database**: US and Canada zipcode data (`us_zipcodes`, `ca_zipcodes` tables)
- **R2 Bucket**: Mexico data (JSON file, pending migration to D1)
- Database binding: `env.DB`, R2 binding: `env.ZIP_DATA`

### API Endpoints (src/index.js)
All endpoints support CORS and return JSON:

| Endpoint | Description |
|----------|-------------|
| `/api/us?city=&state=` | US ZIP lookup by city/state |
| `/api/ca?city=&province=` | Canada postal code lookup |
| `/api/autocomplete/us?q=&limit=` | US city/ZIP autocomplete (min 3 chars) |
| `/api/autocomplete/ca?q=&limit=` | Canada city/postal code autocomplete |
| `/api/autocomplete/mx?q=&limit=` | Mexico state/postal code autocomplete |

### Key Implementation Details
- Autocomplete queries group by city/state to avoid duplicates from multiple ZIP codes per city
- Canada postal code detection uses regex `^[A-Za-z]\d[A-Za-z]?` for alphanumeric codes
- Mexico autocomplete uses chunked processing with 8-second timeout to avoid CPU limits
- Autocomplete results capped at 25 items maximum

### Database Schema (schema.sql)
Tables: `us_zipcodes`, `ca_zipcodes` with columns: `zipcode`, `place`, `state`, `state_code`, `latitude`, `longitude`
Indexes on `(place, state_code)` and `zipcode` for query performance.

## Configuration

- `wrangler.toml`: D1 database ID, R2 bucket binding, custom domain route
- Production domain: `zipcity.iwpi.com`
- D1 database name: `zipcity-data`
