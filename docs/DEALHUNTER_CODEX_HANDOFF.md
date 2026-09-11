# DealHunter Technical Handoff

## Executive summary

DealHunter is an Expo/React Native mobile deal-discovery prototype. It has a five-tab consumer UI, retrieves shopping search data through a local Node proxy backed by Scavio Google Shopping endpoints, maps responses into a shared `Product` model, opens retailer URLs, and (in the active working tree) persists saved deals and resolves fallback retailer links on demand.

Product vision: **"Don't make shoppers search for deals. Let the deals find the shoppers."** The current implementation is suitable for development/prototyping, not private-beta production. Material risks are retailer-link accuracy, provider-credit behavior, and missing production controls.

## Product purpose

The app presents live or mock shopping deals by category, supports search, opens retailer links, and saves product snapshots locally. Personalization and alerts are not implemented.

## Current technology stack

| Area | Version / implementation |
| --- | --- |
| Runtime inspected | Node `v24.20.0`; no `engines` field is declared, so deployment Node version needs verification. |
| Mobile | Expo `57.0.20`, React Native `0.86.3`, React `19.2.3` |
| Routing | Expo Router `57.0.19`; React Navigation bottom tabs `7.4.0` |
| Tooling | TypeScript `6.0.3`, ESLint `9.25.0`, `eslint-config-expo` `57.0.2` |
| Mobile services | AsyncStorage `2.2.0`, Expo Linking `57.0.9`, Status Bar `57.0.1`, safe-area-context `5.7.0`, screens `4.26.0`, vector icons `15.0.3` |
| Proxy | Node core `http`/`fs`; ESM `.mjs`; no server npm dependencies |
| Data provider | Scavio HTTP API; default base URL `https://api.scavio.dev` |

The root entry point is `expo-router/entry`. `app.json` configures Expo Router, portrait orientation, static web output, typed routes, and the React Compiler experiment.

## Repository structure and navigation

| Location | Responsibility |
| --- | --- |
| `app/_layout.tsx` | Root stack: tabs plus `product/[id]`. |
| `app/(tabs)/_layout.tsx` | Home, Categories, Saved, Alerts, Settings tabs. |
| `app/(tabs)/index.tsx` | Home feed and debounced search. |
| `app/(tabs)/categories.tsx` | Category feed. |
| `app/(tabs)/saved.tsx` | Saved-products grid. |
| `app/product/[id].tsx` | Details, saving, retailer link opening/resolution. |
| `components/DealCard.tsx` | Card, details navigation, direct View Deal action. |
| `components/DealSection.tsx`, `CategoryHeader.tsx` | Reusable feed UI. |
| `components/PlaceholderScreen.tsx` | Alerts/Settings placeholder UI. |
| `services/DealRepository.ts` | Repository contract. |
| `services/repository.ts` | Chooses live, mock, or live-with-mock-fallback repository. |
| `services/ScavioDealRepository.ts` | App-side proxy client and session catalog cache. |
| `services/MockDealRepository.ts`, `data/mockDeals.ts` | Fixtures and mock repository. |
| `services/savedDeals.ts` | AsyncStorage saved-product store and subscriptions. |
| `types/product.ts` | `Product` and fixed `DealCategory` types. |
| `server/index.mjs` | HTTP routes, five-minute in-memory cache, env loading/error translation. |
| `server/scavioClient.mjs` | Serialized, rate-spaced, timeout-controlled Scavio client. |
| `server/scavioMapper.mjs` | Response normalization, category inference, URL handling, scoring. |
| `.env.example`, `server/.env.example` | App URL and server configuration templates. |

Root stack routes to the five tabs and Details. A card serializes the full Product into `/product/[id]`. Alerts and Settings are placeholders; there is no auth, onboarding, profile, retailer, or dedicated search route.

## Architecture and data flow

```text
Home / Categories / Search / Details / Card
  -> dealRepository selection
  -> ScavioDealRepository (live) -> EXPO_PUBLIC_DEAL_API_URL proxy
  -> server/index.mjs cache/routes -> ScavioClient POST -> Scavio API
  -> scavioMapper -> Product[] JSON -> screens/components
```

Mock mode sends calls to `MockDealRepository`, which returns `data/mockDeals.ts` directly. The app never receives `SCAVIO_API_KEY`; it is server-side only as `[REDACTED]`.

## Scavio integration

| Scavio path | Method/body | Used by |
| --- | --- | --- |
| `/api/v2/google/shopping` | POST `{ query, on_sale?, gl: 'us', hl: 'en', device: 'mobile' }` | `/api/deals` search, featured feed, category source |
| `/api/v2/google/shopping/product` | POST `{ catalog_id, query, load_all_stores: true, gl: 'us', hl: 'en', device: 'mobile' }` | `/api/deals/:id`, `/api/resolve-product-url` |
| `/api/v1/walmart/search` | Implemented in client only | Unused |

Server authentication is `Authorization: Bearer [REDACTED]`. `server/index.mjs` parses `server/.env` itself. Required live configuration is `SCAVIO_API_KEY=[REDACTED]`; `PORT` defaults to `8787`.

| Proxy route | Behavior |
| --- | --- |
| `GET /api/health` | Reports configured status; no Scavio request. |
| `GET /api/categories` | Fixed nine categories; no Scavio request. |
| `GET /api/deals?featured=true` | Searches one fixed broad product query. |
| `GET /api/deals?category=...` | Would search `"{category} deals"`; app filters its featured catalog instead. |
| `GET /api/deals?query=...` | Searches supplied query. |
| `GET /api/deals/:id?query=...` | Fetches a product and maps its stores. |
| `GET /api/resolve-product-url?...` | Fetches stores, chooses matching direct retailer URL where recognizable. |

The proxy has a process-local five-minute `Map` cache. It caches successful results only; there is no cache eviction beyond expiry or in-flight request coalescing. `ScavioClient` serializes requests and spaces starts by 1,100 ms, but does not deduplicate identical calls. It times out at 90 seconds. Proxy maps 429 to 429, timeout to 504, all other failures to 502. The mobile client treats all non-OK replies as errors and has no timeout, retry, abort, or status-specific UI.

### Mapping to Product

`scavioMapper.mjs` maps search results or product stores to `Product`: title/name, prices, brand, images, availability, description, and catalog/product ID. IDs become `scavio-google-shopping:{catalogId}`. Retailer is inferred from source/seller/store/merchant fields and normalized for Walmart, Amazon, Target, Best Buy, and eBay. Category is keyword-inferred from category/type/title/name, otherwise it uses the request category. One broad source payload can therefore leave fixed category sections empty.

`dealScore = min(99, 60 + round(discountPercent * 0.6))`; it uses only listed discount. Missing/invalid previous price normally produces score 60.

## Product URL / View Deal flow

1. `productUrl(row)` recursively scans non-image fields, preferring non-Google HTTP values under URL/link-like keys, then other non-Google HTTP values; candidates include `product_link`, `link`, `url`, `offer_link`.
2. If none is found, mapper constructs a retailer search URL from inferred retailer and title.
3. `Product.productUrl` is serialized by `DealCard` and parsed by Details.
4. Details and cards use `Linking.openURL`; Details validates HTTP(S), cards use an HTTP regex.
5. For recognized retailer search URLs, Details and Card call `/api/resolve-product-url`; proxy fetches stores and picks a matching direct link or first non-Google link. Details holds it only in local state; Card does not retain it.

Direct Scavio URL values are not intentionally discarded. Exact-link correctness nonetheless **needs verification** with real payload samples because selection is heuristic. A search page opens when no direct retailer URL was mapped, retailer inference supplied a search fallback, or resolution cannot find a matching direct store link. Unknown search patterns can open as-is.

Smallest likely durable fix (not implemented): explicitly select/store `product_results.stores[].link` for the chosen retailer, retain retailer/store identifiers, resolve only truly linkless records, and persist resolved direct URLs.

## Product Details and request estimate

Details primarily uses the Product passed from the prior screen. It calls `getDealById(product.id, product.name)` only for a Scavio-prefixed ID with invalid/missing URL. Mapper normally gives mapped live products a valid search fallback, so this normally makes **zero** calls; the lookup appears intended to hydrate/repair incomplete products. View Deal separately resolves recognized search URLs.

| Flow, cold app/server cache | Scavio calls | Notes |
| --- | --- | --- |
| Home initial load | 1 | Categories is local; a featured catalog is shared by all category filtering through `catalogPromise`. |
| Search after 350 ms idle | 1 per distinct debounced query | No client search cache; five-minute proxy cache can answer repeats. |
| Open Details | Normally 0 | Passed Product is used. |
| Open recognized fallback URL | 1 first resolution per catalog ID/server-cache window | Details retains it only while mounted. |

The client catalog promise never expires during an app session; it saves credits but prevents feed freshness until repository/process reload. It resets only on error.

## Home, discovery, and search

Home gets categories and featured deals together, then gets deals for each category. In live mode categories filter one broad featured payload; no category-specific provider calls occur. Mock mode starts with fixtures. "Today's Best Deals" is static hero copy. "Extreme Deals" is the featured catalog sorted by discount then score. Mock mode uses score >= 90 fixtures; live mode does not, so that label is UI-only.

Typing updates `query`; after 350 ms unchanged nonblank input, `searchDeals()` runs. Effect cleanup clears the timer and marks old requests inactive, preventing stale writes but not aborting started requests. UI shows spinner/results/empty state. Errors become empty results without user-visible feedback. There is no pagination, minimum query length, client cache, cancellation, retry/backoff, or explicit 429/504 UI. Mock search checks name/store/category/subcategory and sorts by discount/score.

## Saved Deals

Active working-tree code uses AsyncStorage key `@dealhunter/saved-products`, persisting complete Product snapshots. A module Map holds loaded state; one initialization promise avoids duplicate reads. `toggleDealSaved(product)` adds/removes by ID, writes the list, notifies subscribers, and returns saved state. `SavedScreen` reads at mount and subscribes, so state shares in-app and persists after restart when writes succeed.

Gaps: parse/read errors are silently swallowed; write failures have no UI handling; writes are not serialized, so rapid toggles can race; snapshots become stale; no migration/versioning/account sync exists. `isDealSaved()` can briefly be false before async initialization, then Details corrects it.

## Mock/live mode and running

```sh
npm run server    # node server/index.mjs; default PORT=8787
npm start         # Expo dev server
npm run android | npm run ios | npm run web
npm run lint
npm run typecheck
```

The proxy must be reachable from the device/emulator at `EXPO_PUBLIC_DEAL_API_URL`. `.env.example` documents that public non-secret value. `server/.env.example` documents `SCAVIO_API_KEY=[REDACTED]`, optional `SCAVIO_BASE_URL`, optional `PORT`.

| Condition | Behavior |
| --- | --- |
| No `EXPO_PUBLIC_DEAL_API_URL` | Mock repository only. |
| URL set, fallback not exactly `true` | Live proxy only; caller receives errors. |
| URL set and `EXPO_PUBLIC_USE_MOCK_FALLBACK=true` | Each rejected repository operation returns mock data. |

Mock fixture URLs point to `example.com`, not retailers.

## Known issues / technical debt

- Direct retailer URL selection is heuristic; search-result fallback and extra resolver calls remain.
- `walmartSearch()` is unused.
- Cache is memory-only, unbounded, without in-flight deduplication or observability; catalog cache is session-indefinite.
- Live Home is one broad query then local filtering; category coverage is uneven. Categories has no loading/error state and no rejected-load catch.
- Search hides errors and cannot abort in-flight work. Mobile calls lack timeout/retry/status-specific feedback.
- Saved persistence has silent read errors, unhandled write failures, races, no migration, stale snapshots.
- Alerts/Settings are placeholders. No identity, personalization, notifications, analytics, monitoring, tests, CI/CD, deployment, privacy policy, or accessibility review is present.
- No affiliate/referral transformation, click attribution, disclosure, partner configuration, conversion reporting, or safeguards exist.
- Committed `.gitignore` contains merge-conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) although `git ls-files -u` has no unresolved index entries.
- Current working tree has uncommitted app/proxy/dependency changes; treat them as in-progress user work, not baseline history.

## Prioritized next steps

### P0 — before private beta

1. Validate real Scavio payloads; make direct retailer product links first-class mapped data; do not present search results as buy-ready links.
2. Add credit/request controls: in-flight deduplication, bounded/persistent cache policy, deliberate feed strategy, telemetry, rate-limit/backoff.
3. Test/harden live, error, timeout, 429, and offline paths; add visible states and automated tests.
4. Harden saved deals: serialized writes, storage error UX, validation/migration, supported-device persistence tests.
5. Resolve `.gitignore` markers, deliberately review/commit working-tree changes, and ensure lint/typecheck/reproducible install are clean.
6. Define production proxy controls: secret hosting, HTTPS, CORS, monitoring, redacted logs, rate limiting, provider-failure behavior.

### P1 — shortly after beta

1. Use verified price comparison/history, retailer confidence, availability, and freshness for explainable ranking.
2. Improve category discovery with targeted queries/taxonomy; add pagination, filters, sorting, freshness policy.
3. Add privacy-conscious impression/search/detail/link-out/link-failure analytics.
4. Build affiliate readiness: eligibility review, canonical affiliate URLs, click attribution, disclosure, conversion reconciliation.
5. Implement alerts/preferences, then permission flow and server-side scheduling.

### P2 — later / optional

1. Accounts, cross-device lists, price history/watchlists, personalization.
2. Broader retailer coverage, offer comparison, richer normalization/moderation.
3. Offline, localization, web polish, advanced accessibility, experiments.

## Important files by next task

| Task | Start with |
| --- | --- |
| Retailer URL correctness | `server/scavioMapper.mjs`, `server/index.mjs`, `app/product/[id].tsx`, `components/DealCard.tsx`, `types/product.ts` |
| Provider usage/caching | `services/ScavioDealRepository.ts`, `server/index.mjs`, `server/scavioClient.mjs`, `app/(tabs)/index.tsx` |
| Feed/category quality | `app/(tabs)/index.tsx`, `app/(tabs)/categories.tsx`, `services/ScavioDealRepository.ts`, `server/scavioMapper.mjs` |
| Search | `app/(tabs)/index.tsx`, `services/repository.ts`, `services/ScavioDealRepository.ts`, `server/index.mjs` |
| Saved deals | `services/savedDeals.ts`, `app/(tabs)/saved.tsx`, `app/product/[id].tsx` |
| Navigation/placeholders | `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/alerts.tsx`, `app/(tabs)/settings.tsx` |
| Proxy/configuration | `.env.example`, `server/.env.example`, `server/index.mjs`, `server/scavioClient.mjs`, `package.json` |

## Inspection constraints observed

No Scavio/API/network request was made, no app/server was started, no `.env` file was read or changed, and no application source/dependency/configuration file was modified. This document is the sole intended new documentation file. Findings requiring real Scavio response samples are explicitly marked as needing verification.