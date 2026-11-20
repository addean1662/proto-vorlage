# Proto-Vorlage

Proto-Vorlage is a Torah textual-tradition comparison tool. It displays Samaritan Pentateuch, Dead Sea Scroll witnesses, Septuagint, Vulgate, and Masoretic Text in that left-to-right order. Each tradition retains its source word order; generated word correspondences drive cross-column hover highlighting.

## Samaritan Pentateuch

Text and lexical glosses come from [DT-UCPH/sp 7.3.0](https://github.com/DT-UCPH/sp/tree/8842267d29e37bf786b95209c76852461c389144), pinned to the revision recorded in `data/samaritan/manifest.json`. Data is **CC BY-NC 4.0**; retain attribution and noncommercial use terms (see `data/samaritan/LICENSE.txt`). Source feature files and hashes are included for reproducibility. Run `npm run build:samaritan` to rebuild book JSON from those files.

The importer joins morphemes by source word boundaries and normalizes Hebrew presentation forms. It preserves source numbering: 5,841 entries, with Exodus 30:1–10 located within 26:35 and Deuteronomy 34:2–3 represented by the description at 34:1. The API returns explicit location notes for those twelve references. Text is never substituted from MT. The public `/samaritan-pentateuch` page supplies full attribution and edition details.

Legacy four-tradition cache entries are regenerated on request. No cache is bulk-deleted. Both lookup endpoints share the validated five-tradition pipeline; adding SP does not increment the verse count when replacing an existing entry.

Live site: https://www.protovorlage.com

## Bible_Evidence

The Bible evidence collection is temporarily hosted at `/Bible_Evidence`, with a link on the home page. It includes the book-by-book timeline, discovery pages, source library, artifact gallery and interactive map with seven historical period choices. All 1,399 data points, including all 1,285 geographic entries, are preserved. The standalone Text & Stone deployment remains available separately.

The collection is served directly from `public/Bible_Evidence` through local Next.js rewrites; it does not require the separate Sites host or an iframe. HTML resources, data requests, discovery links and return navigation stay under `/Bible_Evidence`. The collection's brand links back to the ProtoVorlage home page.

The timeline opens in a dense Overview, with Discoveries and Passages controls for progressive detail. Selecting a book opens its compact discovery tiles; point links retain the selected view and return location. `index.html`, `timeline.html`, `reference.js` and `timeline.css` in `public/Bible_Evidence` are maintained locally and preserved by the import script. Shared styles, detail pages, maps and the dataset continue to refresh from the standalone collection. The import manifest records both upstream hashes and local presentation hashes.

To refresh from its source checkout, run `node scripts/sync-bible-evidence.mjs <text-and-stone-checkout>`. The importer preserves dataset contents, image credits, map provenance and licenses, and records the source commit/file hashes in `integration-manifest.json`. Review changes before importing a snapshot with different record counts. Imported static code is excluded from React/TypeScript linting; check its syntax and complete timeline–detail–map navigation when refreshing.

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
