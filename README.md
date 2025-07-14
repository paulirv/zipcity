# Zip-City Lookup Cloudflare Worker

A lightweight Cloudflare Worker that returns the ZIP/postal code for a given city and state/province. Data is stored in Cloudflare R2 for scalable storage and easy updates, supporting both US ZIP codes and Canada postal codes.

## Features

- **/api/us** — Lookup U.S. ZIP by `?city=` & `?state=`
- **/api/ca** — Lookup Canada postal code by `?city=` & `?province=`
- **R2 Storage** — Data stored in Cloudflare R2 bucket for scalability
- **Zero-config SSL** — Supports custom domains (`zipcity.iwpi.com`) via Cloudflare's Automatic SSL
- **Global CDN** — Fast responses worldwide with Cloudflare's edge network

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Test the API locally
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"

# Deploy to Cloudflare
wrangler login
npm run deploy

# Test production API
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI"
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
├── src/
│   └── index.js      # Worker entrypoint
└── data/
    ├── zipcodes.us.json  # US ZIP code data
    └── zipcodes.ca.json  # Canada postal code data (ready for future use)
```

## API Usage

### US ZIP Lookup

```bash
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI"
```

**Response:**
```json
{
  "city": "Burlington",
  "state": "WI", 
  "zip": "53105"
}
```

**Error Response:**
```json
{
  "error": "Not found"
}
```

### Canada Postal Code Lookup

```bash
curl -s "https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON"
```

**Response:**
```json
{
  "city": "Toronto",
  "province": "ON",
  "postal_code": "M5H 2N2"
}
```

## Custom Domain Setup

To set up `zipcity.iwpi.com` with SSL:

1. **Add DNS CNAME**: `zipcity.iwpi.com` → `your-worker.your-subdomain.workers.dev`
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
# Run test suite (tests both US and Canada endpoints)
./test.sh

# Manual testing - Local development
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"
curl -s "http://localhost:8787/api/ca?city=Toronto&province=ON"

# Manual testing - Production
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI"
curl -s "https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON"
```

## Performance Notes

- **R2 Storage**: Excellent for large datasets, small memory footprint, easy updates
- **KV Storage**: Faster lookups for frequently accessed data, good for pre-indexed lookups
- **Edge Caching**: Responses cached at Cloudflare edge for improved performance

Current implementation uses R2 storage for optimal balance of performance and maintainability.

## License

MIT License - see [LICENSE](LICENSE) for details.
