# Git Workflow Guide

This document outlines the git workflow for the Zip-City Lookup Cloudflare Worker project.

## Remotes

| Remote | Purpose |
|--------|---------|
| `origin` | GitHub repository (git@github.com:paulirv/zipcity.git) |

## Branch Strategy

```
main ────●────●────●────●────●────  (production)
              \         /
feature        ●──●──●─┘            (feature/fix-name)
```

### Branch Types

| Branch | Purpose | Naming Convention |
|--------|---------|-------------------|
| `main` | Production-ready code | Direct push allowed |
| Feature | New functionality | `feature/description` |
| Fix | Bug fixes | `fix/description` |
| Hotfix | Urgent production fixes | `hotfix/description` |

### Branch Naming Examples

```
feature/mexico-autocomplete
feature/kv-storage-migration
fix/cors-headers
fix/postal-code-detection
hotfix/d1-query-timeout
```

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) format. Omit AI-generated boilerplate text (e.g. Co-authored by) from all commit messages.

```
<type>: <description>

[optional body]
```

### Commit Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or functionality |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `chore` | Maintenance tasks, dependency updates |
| `docs` | Documentation only changes |
| `style` | Formatting, missing semicolons, etc. |
| `test` | Adding or updating tests |
| `perf` | Performance improvements |

### Commit Message Examples

```bash
# Good
feat: add Mexico autocomplete endpoint
fix: handle alphanumeric Canadian postal codes
refactor: migrate US data from R2 to D1
chore: update wrangler to 4.24
docs: add CLAUDE.md with project guidance

# Bad
Updated stuff
fix bug
WIP
```

### Commit Guidelines

- Use imperative mood: "add feature" not "added feature"
- Keep the first line under 72 characters
- One logical change per commit

## Workflow Steps

### 1. Starting New Work

```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Making Changes

```bash
# Stage changes
git add <files>

# Commit with conventional message
git commit -m "feat: add new autocomplete option"

# Push to remote (optional, for backup)
git push -u origin feature/your-feature-name
```

### 3. Keeping Branch Updated

```bash
# Rebase on main to keep history clean
git fetch origin
git rebase origin/main

# If conflicts occur, resolve them then:
git rebase --continue
```

### 4. Merging to Main

For smaller changes or when working solo:

```bash
git checkout main
git pull origin main
git merge feature/your-feature-name
git push origin main
```

For larger changes, consider creating a PR on GitHub for review before merging.

### 5. Cleanup

```bash
# Delete local branch
git branch -d feature/your-feature-name

# Delete remote branch (if pushed)
git push origin --delete feature/your-feature-name
```

## Deployment to Cloudflare

Deployment is manual via Wrangler CLI:

```bash
# Deploy to Cloudflare Workers
npm run deploy
# or
wrangler deploy
```

The worker will be deployed to:
- Workers.dev: `zip-city-lookup.paul-bb4.workers.dev`
- Custom domain: `zipcity.iwpi.com`

### Database Changes

If your changes include D1 schema updates:

```bash
# Apply schema to production D1
wrangler d1 execute zipcity-data --file=schema.sql

# Import data if needed
wrangler d1 execute zipcity-data --file=data/zipcodes.us.sql
```

### R2 Data Updates

For Mexico data (still using R2):

```bash
wrangler r2 object put zipcity/zipcodes.mx.json --file=data/zipcodes.mx.json
```

## Quick Reference

```bash
# Start new feature
git checkout main && git pull && git checkout -b feature/name

# Save work in progress
git add . && git commit -m "wip: description"

# Update branch with main
git fetch origin && git rebase origin/main

# Undo last commit (keep changes)
git reset --soft HEAD~1

# View branch history
git log --oneline -10

# Check what's staged
git diff --staged

# Deploy to Cloudflare
npm run deploy

# Monitor logs after deployment
wrangler tail
```

## Testing Before Deployment

```bash
# Run local dev server
npm run dev

# Run test suite against localhost
./test.sh

# Test specific endpoints manually
curl -s "http://localhost:8787/api/us?city=Burlington&state=WI"
curl -s "http://localhost:8787/api/autocomplete/us?q=bur&limit=5"
```
