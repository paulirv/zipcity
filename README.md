# Zip-City Lookup Cloudflare Worker

A lightweight Cloudflare Worker that returns the ZIP/postal code and coordinates for a given city and state/province, plus autocomplete for location inputs. US and Canada data live in Cloudflare D1 (SQLite); every response carries `lat` / `lon` so a typed location can be used directly as a proximity-search origin.

## Features

- **/api/us** — Lookup a U.S. ZIP by `?city=` & `?state=`, or by `?zip=`
- **/api/ca** — Lookup a Canada postal code (FSA) by `?city=` & `?province=`, or by `?postal=`
- **/api/autocomplete/us** and **/api/autocomplete/ca** — City / ZIP / postal-code autocomplete (`?q=`, min 3 chars, `?limit=` up to 25)
- **Coordinates** — Every lookup and autocomplete row includes `lat` / `lon` (numbers, or `null` when the source row has none)
- **D1 Storage** — US and Canada data in a Cloudflare D1 database with indexes on place/state and code
- **Zero-config SSL** — Supports custom domains (`zipcity.example.com`) via Cloudflare's Automatic SSL
- **Global CDN** — Fast responses worldwide with Cloudflare's edge network

## Quick Start

```bash
# Install dependencies
npm install

# Load the schema and data into the local D1 (first run only)
wrangler d1 execute zipcity-data --local --file=schema.sql
wrangler d1 execute zipcity-data --local --file=data/zipcodes.us.sql
wrangler d1 execute zipcity-data --local --file=data/zipcodes.ca.sql

# Run locally (port 5630, set in wrangler.toml [dev])
npm run dev

# Test the API locally
curl -s "http://localhost:5630/api/us?city=Burlington&state=WI"

# Deploy to Cloudflare (NanaWall account — pinned in wrangler.toml)
wrangler login
npm run deploy

# Test production API
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/us?city=Burlington&state=WI"
```

## Repository Structure

```text
├── README.md              # This file
├── SETUP.md              # Detailed setup guide
├── WRANGLER_COMMANDS.md  # Wrangler 4.14.1 command reference
├── wrangler.toml         # Cloudflare Worker configuration
├── package.json          # Node.js dependencies
├── test.sh              # Local development test script
├── test-production.sh   # Production API test script
├── schema.sql            # D1 tables + indexes (us_zipcodes, ca_zipcodes)
├── src/
│   └── index.js      # Worker entrypoint
└── data/
    ├── zipcodes.us.sql   # US ZIP code inserts (with latitude/longitude)
    └── zipcodes.ca.sql   # Canada FSA inserts (with latitude/longitude)
```

## API Usage

All endpoints return JSON with CORS enabled. Coordinates are decimal degrees (WGS84); `lat` / `lon` are `null` when the source row has no coordinates.

### US ZIP Lookup

By city and state, or by ZIP code:

```bash
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/us?city=Burlington&state=WI"
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/us?zip=53105"
```

**Response:**
```json
{
  "city": "Burlington",
  "state": "WI",
  "zip": "53105",
  "lat": 42.666,
  "lon": -88.2749
}
```

**Error responses:** `404 {"error":"Not found"}`; `400` when neither `zip` nor both `city` and `state` are given.

### Canada Postal Code Lookup

By city and province, or by postal code. The database stores forward sortation areas (the first three characters), so a full postal code such as `M5A 1A1` is reduced to `M5A`:

```bash
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/ca?city=Toronto&province=ON"
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/ca?postal=M5A"
```

**Response:**
```json
{
  "city": "Toronto",
  "province": "ON",
  "postal_code": "M5A",
  "lat": 43.6555,
  "lon": -79.3626
}
```

### Autocomplete

```bash
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/autocomplete/us?q=santa%20bar&limit=5"
curl -s "https://zip-city-lookup.nana-wall-systems-enterprise.workers.dev/api/autocomplete/ca?q=toron&limit=5"
```

`q` accepts a city prefix (`santa bar`), a `City, ST` pair (`santa barbara, ca`), or a ZIP / postal-code prefix (`9310`, `M5A`). Results are capped at 25.

**Response:**
```json
{
  "query": "santa bar",
  "results": [
    {
      "type": "city",
      "display": "Santa Barbara, CA",
      "value": "Santa Barbara, CA",
      "city": "Santa Barbara",
      "state": "CA",
      "zipcode": "93101",
      "lat": 34.4256,
      "lon": -119.724
    }
  ],
  "count": 1
}
```

City rows (`type: "city"`) are grouped per city/state: `zipcode` is the lowest ZIP for the city and `lat` / `lon` is the centroid (average) of all its ZIPs. ZIP rows (`type: "zipcode"`) carry that ZIP's own coordinates.

## Custom Domain Setup

To set up `zipcity.example.com` with SSL:

1. **Add DNS CNAME**: `zipcity.example.com` → `your-worker.your-subdomain.workers.dev`
2. **Add Custom Domain** in Cloudflare Workers dashboard
3. **Enable Automatic HTTPS** (SSL certificate auto-provisioned)
4. **Update wrangler.toml** routes section
5. **Redeploy**: `wrangler deploy`

See [SETUP.md](SETUP.md) for detailed instructions.

## Extending the Worker

### Adding More Data
```bash
# Upload new zipcode data to R2
wrangler r2 object put zipcity/zipcodes.us.json --file=data/zipcodes.us.json
wrangler r2 object put zipcity/zipcodes.ca.json --file=data/zipcodes.ca.json

# Data is automatically loaded from R2 on each request
```

### Migrating to KV Storage (Alternative)
For faster lookups with pre-indexed data:
```bash
# Create KV namespace
wrangler kv namespace create "ZIP_US"

# Update wrangler.toml with KV binding
# Modify worker code to use env.ZIP_US.get()
```

See [SETUP.md](SETUP.md) for complete migration guides.

## Testing

```bash
# Run the local test suite against `npm run dev` (port 5630; override with BASE_URL=...)
./test.sh

# Run the same assertions against production
./test-production.sh

# Manual testing - Local development
curl -s "http://localhost:5630/api/us?city=Burlington&state=WI"
curl -s "http://localhost:5630/api/ca?postal=M5A"
```

## Performance Notes

- **R2 Storage**: Excellent for large datasets, small memory footprint, easy updates
- **KV Storage**: Faster lookups for frequently accessed data, good for pre-indexed lookups
- **Edge Caching**: Responses cached at Cloudflare edge for improved performance

Current implementation uses R2 storage for optimal balance of performance and maintainability.

## License

MIT License - see [LICENSE](LICENSE) for details.
