# Zip-City Lookup Cloudflare Worker

A lightweight Cloudflare Worker that returns the ZIP/postal code for a given city and state (US), with future support for Canada. Data is served from bundled static JSON files and can be migrated to Cloudflare KV or R2 as needed.

## Features

- **/api/us** — Lookup U.S. ZIP by `?city=` & `?state=`
- **Extensible** — Add `/api/ca` for Canada by dropping in `zipcodes.ca.json`
- **Zero-config SSL** — Supports custom domains (`zipcity.iwpi.com`) via Cloudflare's Automatic SSL
- **Bundled data** — Ships with `zipcodes.us.json`; future-proofed for KV/R2 migration

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Test the API
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"

# Deploy to Cloudflare
wrangler auth login
npm run deploy
```

## Repository Structure

```text
├── README.md           # This file
├── SETUP.md           # Detailed setup guide
├── wrangler.toml      # Cloudflare Worker configuration
├── package.json       # Node.js dependencies
├── test.sh           # Test script
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

### Canada Postal Code Lookup (Future)

```bash
curl -s "https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON"
```

## Custom Domain Setup

To set up `zipcity.iwpi.com` with SSL:

1. **Add DNS CNAME**: `zipcity.iwpi.com` → `your-worker.your-subdomain.workers.dev`
2. **Add Custom Domain** in Cloudflare Workers dashboard
3. **Enable Automatic HTTPS** (SSL certificate auto-provisioned)
4. **Update wrangler.toml** routes section
5. **Redeploy**: `wrangler publish`

See [SETUP.md](SETUP.md) for detailed instructions.

## Extending the Worker

### Adding Canada Support
1. Uncomment Canada routes in `src/index.js`
2. Implement `handleCALookup` function
3. Test with sample data in `data/zipcodes.ca.json`

### Migrating to KV Storage
```bash
# Create KV namespace
wrangler kv:namespace create "ZIP_US"

# Update wrangler.toml with KV binding
# Modify worker code to use env.ZIP_US.get()
```

### Migrating to R2 Storage
```bash
# Create R2 bucket
wrangler r2 bucket create zip-city-data

# Upload JSON files
wrangler r2 object put zip-city-data/zipcodes.us.json --file=data/zipcodes.us.json
```

See [SETUP.md](SETUP.md) for complete migration guides.

## Testing

```bash
# Run test suite
./test.sh

# Manual testing
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"
curl -s "http://localhost:8787/api/us?city=Chicago&state=IL"
curl -s "http://localhost:8787/api/us?city=Austin&state=TX"
```

## Performance Notes

- **Static JSON**: Fast cold starts, larger bundle size
- **KV Storage**: Smaller bundles, network latency per lookup
- **R2 Storage**: Best for large datasets, requires runtime parsing

Choose based on your data size and update frequency requirements.

## License

MIT License - see [LICENSE](LICENSE) for details.
