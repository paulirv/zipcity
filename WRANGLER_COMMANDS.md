# Wrangler 4.14.1 Command Reference

This project uses the latest Wrangler CLI commands. Here's a quick reference for common operations:

## Development & Deployment

```bash
# Local development
wrangler dev                 # Start local dev server
wrangler dev --verbose       # Dev server with verbose logging

# Authentication  
wrangler login              # Login to Cloudflare account
wrangler logout             # Logout

# Deployment
wrangler deploy             # Deploy worker (replaces 'publish')
wrangler deploy --dry-run   # Test deployment without publishing
```

## R2 Storage Commands

```bash
# Bucket management
wrangler r2 bucket create <bucket-name>
wrangler r2 bucket list
wrangler r2 bucket delete <bucket-name>

# Object management
wrangler r2 object put <bucket>/<key> --file=<local-file>
wrangler r2 object get <bucket>/<key> --file=<output-file>
wrangler r2 object list <bucket>
wrangler r2 object delete <bucket>/<key>

# Examples for this project:
wrangler r2 object put zipcity/zipcodes.us.json --file=data/zipcodes.us.json
wrangler r2 object put zipcity/zipcodes.ca.json --file=data/zipcodes.ca.json
wrangler r2 object list zipcity
```

## KV Storage Commands

```bash
# Namespace management
wrangler kv namespace create "<namespace-name>"
wrangler kv namespace create "<namespace-name>" --preview
wrangler kv namespace list
wrangler kv namespace delete --namespace-id=<id>

# Key-value operations
wrangler kv key put --binding <binding> "<key>" "<value>"
wrangler kv key get --binding <binding> "<key>"
wrangler kv key list --binding <binding>
wrangler kv key delete --binding <binding> "<key>"

# Bulk operations
wrangler kv bulk put --binding <binding> <file.json>
wrangler kv bulk delete --binding <binding> <file.json>
```

## Monitoring & Debugging

```bash
# Logs
wrangler tail                # Real-time logs
wrangler tail --format pretty

# Worker information
wrangler whoami             # Current account info
wrangler types              # Generate TypeScript types
```

## Configuration

```bash
# Generate wrangler.toml
wrangler init               # Initialize new project
wrangler init --from-dash   # Import from dashboard

# Validation
wrangler deploy --dry-run   # Validate configuration
```

## Migration Notes

### From Wrangler 3.x to 4.x:
- `wrangler publish` → `wrangler deploy`
- `wrangler dev --local` → `wrangler dev` (local is now default)
- `wrangler auth login` → `wrangler login`
- `wrangler kv:namespace` → `wrangler kv namespace`

### This Project's Commands:
```bash
# Development
npm run dev          # wrangler dev
npm run deploy       # wrangler deploy

# Data management
wrangler r2 object put zipcity/zipcodes.us.json --file=data/zipcodes.us.json
wrangler r2 object put zipcity/zipcodes.ca.json --file=data/zipcodes.ca.json

# Testing
./test.sh           # Run comprehensive API tests
wrangler tail       # Monitor logs during testing
```
