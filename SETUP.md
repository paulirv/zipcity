# Zip-City Lookup Setup Guide (R2 Storage)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. R2 Bucket Setup (Already Configured)
Your `wrangler.toml` is already configured with the R2 bucket bind2. **Worker not responding**
   - Check `wrangler dev` output for errors
   - Verify wrangler.toml configuration:
```toml
[[r2_buckets]]
binding = "ZIP_DATA"
bucket_name = "zipcity"
```

### 3. Development
```bash
# Run locally with Wrangler
npm run dev

# Or directly with wrangler
wrangler dev
```

### 4. Test the API
```bash
# Run the test script (tests both US and Canada)
./test.sh

# Or manually test with curl - Local development
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"
curl -s "http://localhost:8787/api/ca?city=Toronto&province=ON"

# Manual test - Production (after deployment)
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI" 
curl -s "https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON"
```

### 5. Deploy to Cloudflare
```bash
# Login to Cloudflare (if not already)
wrangler login

# Deploy the worker
npm run deploy
```

## Custom Domain Setup (zipcity.iwpi.com)

### Prerequisites
- You own the domain `iwpi.com`
- The domain is managed by Cloudflare DNS

### Steps

1. **Add DNS Record**
   - Go to Cloudflare Dashboard → DNS
   - Add a CNAME record:
     - **Name**: `zipcity`
     - **Target**: `your-worker-name.your-subdomain.workers.dev`
     - **Proxy status**: Proxied (orange cloud)

2. **Configure Custom Domain**
   - Go to Workers & Pages → your worker → Settings → Triggers
   - Click "Add Custom Domain"
   - Enter: `zipcity.iwpi.com`
   - Click "Add Custom Domain"

3. **Enable SSL**
   - SSL is automatically enabled with Cloudflare's Universal SSL
   - Certificate provisioning takes 1-15 minutes

4. **Update wrangler.toml**
   ```toml
   # Uncomment and modify this section in wrangler.toml:
   [[routes]]
   pattern = "zipcity.iwpi.com/api/*"
   zone_name = "iwpi.com"
   ```

5. **Redeploy**
   ```bash
   wrangler deploy
   ```

### Verification
```bash
# Test the custom domain with both endpoints
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI"
curl -s "https://zipcity.iwpi.com/api/ca?city=Toronto&province=ON"
```

## Managing R2 Data (Current Implementation)

### Uploading New Data
```bash
# Update US zipcode data
wrangler r2 object put zipcity/zipcodes.us.json --file=data/zipcodes.us.json

# Update Canada postal code data  
wrangler r2 object put zipcity/zipcodes.ca.json --file=data/zipcodes.ca.json

# List objects in bucket
wrangler r2 object list zipcity
```

### Data Format
The JSON files should follow this structure:

**US Data (zipcodes.us.json):**
```json
[
  {
    "country_code": "US",
    "zipcode": "53105", 
    "place": "Burlington",
    "state": "Wisconsin",
    "state_code": "WI",
    "county": "Racine",
    "latitude": "42.6847",
    "longitude": "-88.2787"
  }
]
```

**Canada Data (zipcodes.ca.json):**
```json
[
  {
    "country_code": "CA",
    "postal_code": "M5H 2N2",
    "place": "Toronto", 
    "province": "Ontario",
    "province_code": "ON",
    "latitude": "43.6532",
    "longitude": "-79.3832"
  }
]
```

## Migration to Cloudflare KV (Alternative Storage)

If you prefer KV storage for faster lookups:

### Creating KV Namespaces
```bash
# Create KV namespace for US data
wrangler kv namespace create "ZIP_US"

# Create preview namespace
wrangler kv namespace create "ZIP_US" --preview

# Create Canada namespace (optional)
wrangler kv namespace create "ZIP_CA"
wrangler kv namespace create "ZIP_CA" --preview
```

### Upload Data to KV
```bash
# Upload US data (transform JSON to key-value pairs first)
wrangler kv key put --binding ZIP_US "WI:Burlington" '{"zipcode":"53105","place":"Burlington","state_code":"WI"}'

# Bulk upload with a script would be more practical for large datasets
```

### Update Configuration
1. Update `wrangler.toml` with the namespace IDs from the create commands
2. Modify `src/index.js` to use `env.ZIP_US.get()` instead of R2 calls

### Alternative R2 Bucket Setup

If you need to create a new R2 bucket:

### Creating R2 Bucket
```bash
wrangler r2 bucket create zip-city-data
```

### Uploading JSON Files
```bash
wrangler r2 object put zip-city-data/zipcodes.us.json --file=data/zipcodes.us.json
wrangler r2 object put zip-city-data/zipcodes.ca.json --file=data/zipcodes.ca.json
```

## Adding Canada Support

1. **Ensure data/zipcodes.ca.json exists** (already created)

2. **Update src/index.js**:
   ```javascript
   // Uncomment the import
   import zipcodesCA from '../data/zipcodes.ca.json';
   
   // Add the route handler
   if (pathname.startsWith('/api/ca')) {
     return handleCALookup(request, env);
   }
   
   // Uncomment and modify handleCALookup function
   ```

3. **Test Canada endpoint**:
   ```bash
   curl -s "http://localhost:8787/api/ca?city=Toronto&province=ON"
   ```

## Troubleshooting

### Common Issues

1. **"Module not found" errors**
   - Ensure JSON files exist in the `data/` directory
   - Check import paths in `src/index.js`

2. **CORS errors in browser**
   - The worker includes CORS headers
   - Ensure preflight OPTIONS requests are handled

3. **Worker not responding**
   - Check `wrangler dev` output for errors
   - Verify wrangler.toml configuration

4. **Custom domain not working**
   - Verify DNS CNAME record
   - Check domain is proxied through Cloudflare
   - Wait up to 15 minutes for SSL certificate

### Debugging

```bash
# View worker logs
wrangler tail

# Test locally with verbose output
wrangler dev --verbose
```

## Performance Considerations

- **Static JSON bundling**: Fast cold starts, but increases bundle size
- **KV storage**: Slower cold starts, but smaller bundles and easier updates
- **R2 storage**: Best for large datasets, requires runtime JSON parsing

Choose the storage method based on your data size and update frequency needs.
