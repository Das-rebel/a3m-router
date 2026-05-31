# A3M Router — Launch Snapshot
**Saved:** Sat May 31 18:00 IST 2026
**Git:** 114dda2 — Update LAUNCH_SNAPSHOT with geo infrastructure
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

## SEO Status ✅ (GitHub Pages: https://das-rebel.github.io/a3m-router/)

| Check | Status |
|-------|--------|
| robots.txt | ✅ All AI bots allowed (GPTBot, ClaudeBot, PerplexityBot, etc.) |
| sitemap.xml | ✅ 3 URLs indexed weekly |
| meta description | ✅ "76.43 RouterArena, $0.047/1K" |
| og:image | ✅ benchmark-chart.png |
| Schema.org | ✅ SoftwareApplication JSON-LD |
| canonical URL | ✅ https://das-rebel.github.io/a3m-router/ |
| ai-plugin.json | ✅ ChatGPT Plugin manifest |
| openapi.json | ✅ API specification |

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

# 🌎 GEOGRAPHIC DATA — What's Available

## Problem: NPM does NOT provide geo data via public API

The npm public registry only provides aggregate download counts, NOT geographic breakdown.

---

## Option 1: npmjs.com Bundle (Easiest)

Already deployed at: https://www.npmjs.com/package/adaptive-memory-multi-model-router

**Available data:**
- Total downloads (by time range)
- Version history
- Dependent packages

**NOT available:**
- Country breakdown
- Region breakdown

---

## Option 2: npm Trends (Free)

Visit: https://www.npmtrends.com/adaptive-memory-multi-model-router

**Shows:**
- Download comparison with other packages
- Historical trend charts

**Blocked:** Cloudflare requires browser JS to show full data

---

## Option 3: Add Analytics to GitHub Pages (Recommended)

Since the site is at `das-rebel.github.io/a3m-router/`, add analytics to track visitor geo:

### Step 1: Add Plausible (Privacy-friendly, $6/mo)

```html
<!-- Add to docs/_schema.html before </head> -->
<script defer data-domain="das-rebel.github.io/a3m-router" src="https://plausible.io/js/script.js"></script>
```

Get geo data:
- Top countries visiting your site
- Page views by country
- Bounce rate by geo
- Referral sources by geo

### Step 2: Alternative - Vercel Analytics (Free)

If you migrate to Vercel:
```html
<script src="https://vercel.com/analytics/script.js"></script>
```

### Step 3: Alternative - Cloudflare Analytics (Free, on your domain)

If you add Cloudflare to das-rebel.github.io:
- Country-level page views
- Bandwidth by geo
- Cache hit ratio by geo

---

## Option 4: Custom Serverless Tracker

```javascript
// Create serverless function (Vercel/Netlify)
export default async function handler(req, res) {
  const { country, path, referrer } = req.body;
  
  // Store in KV/database
  await ANALYTICS.put(`${country}:${path}`, Date.now());
  
  res.json({ success: true });
}
```

---

## Option 5: GitHub Pages + Cloudflare (Zero Cost)

1. Add Cloudflare to your GitHub Pages domain
2. Enable Cloudflare Analytics
3. Get: Country, city, device, browser, referrer

**Setup:**
1. Go to cloudflare.com
2. Add site: das-rebel.github.io
3. Update nameservers
4. Enable "Analytics" in dashboard
5. Wait 24hrs for data

---

## Quick Comparison

| Method | Geo Data | Cost | Setup Time |
|--------|----------|------|------------|
| npm public API | ❌ | Free | N/A |
| npmjs.com | Partial | Free | 0 min |
| Plausible | ✅ Full | $6/mo | 5 min |
| Vercel Analytics | ✅ Full | Free | 5 min |
| Cloudflare | ✅ Full | Free | 15 min |
| npm Enterprise | ✅ Full | ~$500/yr | Complex |

---

## Recommended Setup

**For zero cost + good data:**

1. **Cloudflare** (15 min setup)
   - Go to cloudflare.com
   - Add das-rebel.github.io
   - Update nameservers
   - Enable Analytics

2. **Plausible** (5 min setup, $6/mo)
   - Sign up at plausible.io
   - Add site: das-rebel.github.io/a3m-router
   - Add script to docs/_schema.html

---

## What You'll Get

With either analytics tool:

```
Country     Pageviews  Bounce Rate  Time on Site
──────────────────────────────────────────────
🇺🇸 USA         1,234       45%         2m 30s
🇬🇧 UK           567        52%         1m 45s
🇮🇳 India         423        38%         3m 15s
🇩🇪 Germany       234        61%         1m 20s
🇫🇷 France        189        55%         2m 00s
```

This tells you:
- Where your users are coming from
- Which content they prefer
- Where to focus marketing ($)
- Where to translate content

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

# ⭕ MANUAL STEPS

1. **Add geo tracking** (15 min) — Cloudflare or Plausible
2. **Deploy HF Space** (5 min) — Create HF token → push
3. **Post to HN** (2 min) — Tue-Thu 8:30-10am ET is optimal
4. **Post to PH** (2 min) — Schedule for next week
5. **Post to IH** (2 min)
6. **Tweet thread** (5 min)