# A3M Router — Launch Snapshot
**Saved:** Sat May 31 18:00 IST 2026
**Git:** f7559d9 — Add 10x better video: HYPE-first approach
**npm version:** 2.14.13
**GitHub stars:** 7

---

# 📊 STATS DASHBOARD

## NPM Downloads (May 2026)

```
Day-wise Downloads
────────────────────────────────────────────────────────
2026-05-15   552  ████████
2026-05-16   320  ████
2026-05-17 1,903  ████████████████████████████  ← PEAK
2026-05-18 1,449  █████████████████████
2026-05-19   431  ██████
2026-05-20   183  ██
2026-05-21 1,265  ██████████████████
2026-05-22 1,987  ████████████████████████████████████████  ← PEAK
2026-05-23   175  ██
2026-05-24   203  ███
2026-05-25   522  ███████
2026-05-26 1,034  ███████████████
2026-05-27 1,613  ████████████████████████
2026-05-28   914  █████████████
2026-05-29   637  █████████
2026-05-30 1,288  ███████████████████
────────────────────────────────────────────────────────
TOTAL:     14,476
Avg/day:      904 (on active days)
```

| Period | Downloads |
|--------|-----------|
| All time | 14,476 |
| Last 30 days | 13,188 |
| Last 7 days | 5,098 |
| Yesterday | 637 |

---

## SEO Status ✅

| Check | Status |
|-------|--------|
| robots.txt | ✅ All AI bots allowed (GPTBot, ClaudeBot, PerplexityBot, etc.) |
| sitemap.xml | ✅ 3 URLs indexed weekly |
| meta description | ✅ "76.43 RouterArena, $0.047/1K" |
| og:image | ✅ benchmark-chart.png |
| Schema.org | ✅ SoftwareApplication JSON-LD |
| canonical URL | ✅ https://das-rebel.github.io/a3m-router/ |

---

## GitHub

| Metric | Value |
|--------|-------|
| Stars | 7 |
| Forks | 0 |
| Watchers | 7 |
| Open Issues | 6 |
| Created | 2026-05-15 |
| Last Push | Today |

---

## Package Info

| Metric | Value |
|--------|-------|
| Version | 2.14.13 |
| Install Size | 26.6 MB |
| Dependencies | 2 (blessed, nanoid) |
| Versions | 106 |
| License | MIT |
| npm page | https://www.npmjs.com/package/adaptive-memory-multi-model-router |

---

# 🔍 GEO DATA INFRASTRUCTURE

## What's Required

NPM public API does NOT provide geo breakdown. To get geo data:

### Option 1: npm Enterprise (Paid)
- Provides: Country-level download stats
- Cost: ~$500/year
- Setup: enterprise.npmjs.com

### Option 2: Packetbeat NPM (Self-hosted)
- Open-source ClickHouse + Kibana setup
- Provides: Real-time geo tracking
- Repo: github.com/npm/packetbeat-npm

### Option 3: Custom Tracking (Implemented Below)
Add analytics to your website that tracks npm package downloads by geo.

---

## Implementation: Geo Tracker

### 1. Create geo tracking endpoint

```javascript
// Add to your website or serverless function
// Tracks: country, package, date, referrer

app.post('/api/track-download', (req, res) => {
  const { country, package, date, referrer } = req.body;
  
  // Store in database or analytics service
  // Example: Vercel Analytics, Plausible, Google Analytics
  
  // Note: npm downloads are tracked by npmjs.com directly
  // This is for your website/landing page geo data
});
```

### 2. Use existing analytics

Your GitHub Pages site can use:
- **Plausible Analytics** (privacy-friendly, geo data)
- **Vercel Analytics** (free, has geo)
- **Cloudflare Analytics** (free, country-level)

### 3. Add to site

```html
<!-- Add to _schema.html in docs/ -->
<script defer src="https://plausible.io/js/script.outbound-links.js"></script>
```

---

## Quick Setup: Plausible for Geo

```bash
# 1. Go to plausible.io
# 2. Create new site: a3m-router
# 3. Add this to your _schema.html:

<script defer data-domain="das-rebel.github.io/a3m-router" src="https://plausible.io/js/script.js"></script>

# 4. Get geo data from dashboard:
#    - Top countries
#    - Page views by country
#    - Bounce rate by geo
```

---

## Alternative: Google Analytics 4

```html
<!-- Add to _schema.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>

<!-- Then in Geo reports you get: -->
<!-- Reports → Acquisition → Geography -->
```

---

## Data Sources Summary

| Source | Geo Data | Cost |
|--------|----------|------|
| NPM Public API | ❌ | Free |
| npmtrends.com | ❌ (Cloudflare blocked) | Free |
| libnpm/anvaka | ❌ | Free |
| **Plausible Analytics** | ✅ | $6/mo |
| **Vercel Analytics** | ✅ | Free |
| **GA4** | ✅ | Free |
| **npm Enterprise** | ✅ | ~$500/yr |

---

# ✅ ASSETS READY

| Asset | Status | Location |
|-------|--------|----------|
| **Asciinema demo** | ✅ Uploaded | https://asciinema.org/a/RpqOZM9tFMALYWvs |
| **VHS GIF** | ✅ In assets | `assets/demo-hn.gif` (1.8MB) |
| **Product video (HYPE)** | ✅ Ready | `demo/product-video-hype-v1.mp4` (3.7MB, 22.9s) |
| **HN article** | ✅ Ready | `articles/SHOW_HN_FINAL.md` |
| **PH listing** | ✅ Ready | `articles/PRODUCTHUNT_LISTING.md` |
| **IH post** | ✅ Ready | `articles/INDIEHACKERS_POST.md` |
| **Twitter thread** | ✅ Ready | `articles/twitter-thread-cost-savings.md` |
| **HF Space** | ⏳ Ready to deploy | `hf-space/` |

---

# ⭕ MANUAL STEPS (do later)

1. **Deploy HF Space** (5 min) — Create HF token → push
2. **Add analytics** (5 min) — Add Plausible or GA4 to _schema.html
3. **Post to HN** (2 min) — Tue-Thu 8:30-10am ET is optimal
4. **Post to PH** (2 min) — Schedule for next week
5. **Post to IH** (2 min)
6. **Tweet thread** (5 min)