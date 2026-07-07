# FH6 Tuning Assistant

A free, browser-based tuning calculator for **Forza Horizon 6**. Pick a car, pick a use case, and get a complete tuning sheet, a class-targeted build plan, and a handling troubleshooter — tailored to whether you play on controller or wheel.

**No sign-up, no backend, no build step.** Everything runs client-side in plain HTML/CSS/JavaScript.

## Features

- **572-car database** with searchable/browsable picker — auto-fills weight, horsepower, drivetrain, front weight distribution, and stock PI/class
- **Full tuning sheet**: tire pressure, gearing (with individual gear ratios; 9-speed for drag), alignment, anti-roll bars, springs & ride height, damping, brakes, differential, and aero — in the game's real units and slider conventions (Imperial or Metric, including Forza's non-physical KGF/MM spring display)
- **Seven use cases**: Circuit, Drag, Drift, Rally, Cross Country, Street, Touge — each with its own tuning philosophy
- **Controller vs Wheel**: the tune itself adapts to your input device (toe, caster, damping platform, brake pressure, diff decel)
- **Build plan**: target a PI class and get an ordered parts list — tune-unlock parts first (with discipline variants: Race/Rally/Drift), grip parts matched to the class budget, then engine parts in PI-efficiency order
- **Handling troubleshooter**: use-case-specific symptoms ("hard to initiate the drift", "bogs off the line") with ordered fixes across tune settings, parts, and technique
- **Quality of life**: copy tune as text, shareable links, saved-tunes garage, Night/Daylight themes, installable PWA with offline support

## Running locally

No tooling needed — it's a static site:

```
# any static file server works, e.g.:
python -m http.server 8000
# or just open index.html directly in a browser
```

## Deploying

Drag the folder (or a zip of it) onto [Netlify Drop](https://app.netlify.com/drop), or connect this repo to Netlify/GitHub Pages/Cloudflare Pages. All files are static; `index.html` must sit at the site root.

After deploying to a final domain, update the `og:image` meta tag in `index.html` to the absolute URL.

## Affiliate links

`gear.js` contains the Recommended Gear section. Links are plain retailer searches until `AFFILIATE_TAG` is set at the top of that file (e.g. an Amazon Associates tag) — then every link picks up the tracking parameter automatically. The FTC/Amazon disclosure line is already in the page.

## Analytics

Not enabled by default. To turn on free, privacy-friendly traffic stats: add this site at [Cloudflare Web Analytics](https://dash.cloudflare.com) (Analytics → Web Analytics → Add site), then in `index.html` swap in the token it gives you and uncomment the beacon `<script>` tag near the top of `<head>`.

## SEO

`robots.txt` and `sitemap.xml` are already in place, pointing at the Netlify domain. After deploying to a final/custom domain, update the URL in both files (and the `og:url`/`og:image` meta tags in `index.html`), then submit the site in [Google Search Console](https://search.google.com/search-console) to get it indexed.

## Data sources

- Car specs (weight, power, drivetrain, front %) — community-maintained FH6 spec sheet
- Stock PI and class per car — [codmunity.gg](https://codmunity.gg/forza/cars)
- Tuning calibration (pressure baselines, diff tables, ARB/damping/aero conventions, engine part ordering) — [ForzaFire guides](https://www.forzafire.com/guides), plus in-game verification
- Class boundaries (D 100–400 through R 901–998) derived empirically from the full car list

## Disclaimer

Unofficial fan-made tool. Not affiliated with, endorsed by, or connected to Microsoft, Xbox, Playground Games, or Turn 10 Studios. "Forza" and "Forza Horizon" are trademarks of Microsoft Corporation. All tuning values are computed starting points — fine-tune on track.
