# Proto-Vorlage

Proto-Vorlage is a Torah textual-tradition alignment tool. It compares generated word-level alignments across Dead Sea Scroll witnesses, Septuagint, Vulgate, and the Masoretic Text, with provenance metadata and cache review controls for editorial follow-up.

Live site: https://www.protovorlage.com

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS
- Anthropic SDK for generated alignments
- Upstash Redis for production cache and rate limiting
- Vercel for hosting and GitHub-based deployment

## Local Development

```bash
npm install
npm run dev
```

The development server runs on `http://localhost:3000`.

## Verification

```bash
npm run test
npm run lint
npm run build
npm run test:e2e
npm audit --audit-level=moderate
```

`npm run test:e2e` builds the app, starts `next start` on `127.0.0.1:3100`, runs Playwright smoke tests, and cleans up the server process.

## Required Environment

Production expects these Vercel environment variables:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY` if `ALIGNMENT_PROVIDER=openai`
- `ALIGNMENT_PROVIDER` (`anthropic` by default, `openai` to use OpenAI)
- `ANTHROPIC_ALIGNMENT_MODEL` (optional, defaults to `claude-opus-4-6`)
- `OPENAI_ALIGNMENT_MODEL` (optional, defaults to `gpt-5.5`)
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CACHE_ADMIN_SECRET`

Local development can use `.env.local`. Do not commit local environment files.

## Admin Operations

Admin endpoints require the `x-cache-admin-secret` header.

```bash
curl https://www.protovorlage.com/api/admin \
  -H "x-cache-admin-secret: $CACHE_ADMIN_SECRET"

curl -X POST https://www.protovorlage.com/api/admin \
  -H "content-type: application/json" \
  -H "x-cache-admin-secret: $CACHE_ADMIN_SECRET" \
  -d '{"ref":"Genesis 1:1","status":"reviewed","reviewer":"name","note":"checked against source"}'

curl -X DELETE "https://www.protovorlage.com/api/admin?ref=Genesis%201:1" \
  -H "x-cache-admin-secret: $CACHE_ADMIN_SECRET"
```

Use `POST /api/admin` to record review metadata. Use `DELETE /api/admin?ref=...` to clear one cached verse so it can regenerate.

## Deployment

The Vercel project is connected to GitHub. Pushing to `main` triggers a production deployment.

Recommended GitHub repository settings:

- Require pull requests before merging to `main`.
- Require the `CI / verify` workflow before merging.
- Require branches to be up to date before merging.
- Restrict force pushes and branch deletion on `main`.

## Maintenance

- Dependabot is configured for npm packages and GitHub Actions.
- GitHub Actions runs audit, unit tests, lint, build, and browser smoke tests.
- Generated Playwright artifacts are ignored by Git.
