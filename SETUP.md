# Zip-City Lookup Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Development
```bash
# Run locally with Wrangler
npm run dev

# Or directly with wrangler
wrangler dev --local
```

### 3. Test the API
```bash
# Run the test script
./test.sh

# Or manually test with curl
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"
```

### 4. Deploy to Cloudflare
```bash
# Login to Cloudflare (if not already)
wrangler auth login

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
   wrangler publish
   ```

### Verification
```bash
# Test the custom domain
curl -s "https://zipcity.iwpi.com/api/us?city=Burlington&state=WI"
```

## Migration to Cloudflare KV (Future)

### 1. Create KV Namespace
```bash
# Create KV namespace for US data
wrangler kv:namespace create "ZIP_US"

# Create preview namespace
wrangler kv:namespace create "ZIP_US" --preview
```

### 2. Upload Data to KV
```bash
# Transform and upload US zipcode data
node scripts/upload-to-kv.js
```

### 3. Update wrangler.toml
```toml
[[kv_namespaces]]
binding = "ZIP_US"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

### 4. Update Worker Code
The worker code already includes TODO comments showing where to integrate KV storage. Simply uncomment and modify the KV sections in `src/index.js`.

## Migration to Cloudflare R2 (Future)

### 1. Create R2 Bucket
```bash
wrangler r2 bucket create zip-city-data
```

### 2. Upload JSON Files
```bash
wrangler r2 object put zip-city-data/zipcodes.us.json --file=data/zipcodes.us.json
wrangler r2 object put zip-city-data/zipcodes.ca.json --file=data/zipcodes.ca.json
```

### 3. Update wrangler.toml
```toml
[[r2_buckets]]
binding = "ZIP_DATA"
bucket_name = "zip-city-data"
```

### 4. Update Worker Code
The worker code includes TODO comments for R2 integration.

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
wrangler dev --local --verbose
```

## Performance Considerations

- **Static JSON bundling**: Fast cold starts, but increases bundle size
- **KV storage**: Slower cold starts, but smaller bundles and easier updates
- **R2 storage**: Best for large datasets, requires runtime JSON parsing

Choose the storage method based on your data size and update frequency needs.
