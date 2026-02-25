# GOTHYXAN Elite AI System Blueprint

## 1) AI Training System Architecture

### Layered pipeline
1. `InputAnalyzerService` normalizes request + strict bounds.
2. `StyleClassifierService` maps aliases to canonical style.
3. `BudgetEngineService` resolves deterministic budget/tier policy.
4. `TrendIntelligenceService` computes `trendInfluenceCoefficient` and dynamic brand weights from rolling logs.
5. `BrandSelectorService` ranks candidates with style, trend, affinity, budget fit, monetization signals.
6. `WeatherAdapterService` enforces weather-aware accessory/outerwear plan.
7. `OutfitComposerService` builds combinations with silhouette and ratio constraints.
8. `ValidationLayerService` rejects non-compliant outputs (style, weather, budget, color, layering, seasonal).
9. `ResponseFormatterService` resolves media/cards and computes full score vector.

### Structured Fashion Knowledge Layer
- `backend/src/ai/constants/fashion-knowledge.ts`
  - Brand metadata (`prestigeWeight`, `affiliatePriority`, style affinities)
  - Tier price distributions
  - Color family map + compatibility matrix
  - Seasonal rules
  - Layering constraints
  - Silhouette compatibility map
  - Top/Bottom ratio rules

## 2) Updated Outfit Scoring Formulas

### Style coherence
```text
style_coherence =
  0.25 * style_coverage +
  0.20 * cross_item_compatibility +
  0.17 * color_harmony +
  0.16 * silhouette_balance +
  0.10 * layering_score +
  0.12 * top_bottom_ratio
```

### Overall score
```text
overall =
  0.20 * style_coherence +
  0.12 * budget_efficiency +
  0.11 * weather_compatibility +
  0.11 * brand_prestige +
  0.10 * personalization_confidence +
  0.09 * trend_influence +
  0.10 * visual_coherence +
  0.09 * conversion_likelihood +
  0.08 * margin_score
```

### Added score channels
- `top_bottom_ratio`
- `color_harmony`
- `trend_influence`
- `visual_coherence`
- `image_harmony`
- `aesthetic_density`
- `minimalist_maximalist_fit`
- `conversion_likelihood`
- `margin_score`

## 3) User Adaptive Model Logic

### Feedback loop inputs
- Generations (`OutfitGenerationLog`)
- Ratings (`AuditLog` action `OUTFIT_RATE`)
- Saves (`AuditLog` action `OUTFIT_SAVE`)
- Regenerates (`AuditLog` action `OUTFIT_REGENERATE`)

### Adaptive profile output
- `adaptiveIndex`
- `avgRating`
- `saveRate`
- `regenerateRate`
- `favoriteBrands`
- `preferredStyles`
- `brandAffinity`
- `budgetSensitivity`
- `styleBiasScore`

### Adaptive index formula
```text
adaptiveIndex =
  0.22 * dataVolume +
  0.24 * ratingNorm +
  0.18 * saveNorm +
  0.14 * (1 - regenerateNorm) +
  0.10 * styleBalance +
  0.12 * budgetSignal
```

## 4) Trend Coefficient Implementation

### Trend sources
- Rolling 30-day generation logs
- Recency weighting
- High-confidence boost from `outputJson.scores.overall`

### Coefficient
```text
trendInfluenceCoefficient =
  0.75 * styleTrendScore +
  0.25 * seasonalShiftScore
```

### Runtime effect
- Candidate brand ranking boost
- Outfit score contribution (`trend_influence`)
- Explanation metadata in response

## 5) Monetization-Aware Generation Logic

### Signals
- `affiliateAware`
- `luxuryBias`
- `premiumOnly`
- `highMarginBoost`
- `conversionBoost`

### Engine behavior
- Brand ranking includes affiliate priority and margin potential.
- Premium/luxury modes boost tier-2/3 candidate weighting.
- Conversion likelihood score blends budget fit, trend, personalization, affiliate potential.

## 6) Production Domain Deployment Guide

1. Set production envs:
   - `NODE_ENV=production`
   - `API_PUBLIC_BASE_URL=https://api.yourdomain.com`
   - `CORS_ORIGIN=https://yourdomain.com`
   - `FORCE_HTTPS=true`
   - `CSRF_PROTECTION_ENABLED=true`
   - `CSRF_TOKEN_SECRET=<strong-secret>`
   - `ADMIN_ROUTE_SECRET=<strong-secret>`
2. Build:
   - `npm run build --workspace backend`
   - `npm run build --workspace web`
   - `npm run build --workspace mobile`
3. Run backend behind reverse proxy (see `infra/nginx/gothyxan.conf`).
4. Enable secure auth cookie mode if browser refresh-cookie flow is needed:
   - `AUTH_REFRESH_COOKIE_ENABLED=true`
   - `AUTH_COOKIE_SECURE=true`
   - `AUTH_COOKIE_SAMESITE=strict`

## 7) SSL + DNS Setup Guide

### DNS
- Root domain:
  - `A @ -> <server-ip>`
- API:
  - `A api -> <server-ip>` or `CNAME api -> <platform-host>`
- Web:
  - `CNAME www -> cname.vercel-dns.com` (if Vercel)

### SSL
- If self-hosted Nginx:
  - Use Let's Encrypt (`certbot`) for `yourdomain.com` and `api.yourdomain.com`.
- If Vercel:
  - SSL is automatic after domain verification.

## 8) Backend Domain Configuration

Mandatory:
- `API_PUBLIC_BASE_URL=https://api.yourdomain.com`
- `CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com`
- `FORCE_HTTPS=true`
- `ABUSE_DETECTION_ENABLED=true`
- `CSRF_PROTECTION_ENABLED=true`

Recommended:
- `ABUSE_SCORE_THRESHOLD=12`
- `ABUSE_BLOCK_DURATION_MS=300000`
- `ABUSE_WINDOW_MS=60000`

## 9) Telegram Webhook Domain Configuration

If using webhook mode:
1. Set env:
   - `TELEGRAM_BACKEND_URL=https://api.yourdomain.com`
   - `TELEGRAM_WEBHOOK_SECRET=<secret>`
2. Register webhook:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"https://api.yourdomain.com/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>\"}"
```
3. Restrict accepted webhook path to secretized route.

## 10) Security Hardening Implementation

Implemented:
- Helmet with strict CSP and HSTS in production.
- Global validation (`whitelist`, `forbidNonWhitelisted`, transform).
- Global + route-specific throttling.
- CSRF middleware (`x-csrf-token` + origin allowlist).
- Abuse detection middleware with temporary IP blocking.
- Optional HTTPS enforcement redirect.
- Optional secure refresh cookie settings.
- Admin route secret guard (`x-admin-secret`) on top of role checks.
- Audit logging for feedback loop actions.

Residual hardening checklist:
- Add SAST + dependency scanning in CI.
- Add WAF rules at edge/CDN.
- Rotate secrets automatically.
- Add anomaly dashboards for `AuditLog` and abuse events.

