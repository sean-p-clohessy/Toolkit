# Toolkit

Toolkit is the front door for a growing collection of practical education tools. Each tool remains an independent application and repository; this site provides a shared identity, catalogue, and update feed.

## Local development

This is a dependency-free static site. Serve the repository root with any local web server, for example `python -m http.server 8080`, then open `http://localhost:8080`.

## Adding a tool

Add one object to `assets/js/config.js`. The card grid is generated from that central configuration. Each tool supports a title, category, description, URL, repository, accent colour, icon, explicit status tags, CTA text, and optional visual variant.

If the repository should appear in the update feed, also add its display name and repository name to the `tools` array in `scripts/fetch-updates.mjs`.

## Automatic updates

`.github/workflows/update-feed.yml` runs every six hours and can also be triggered manually. It uses the repository-scoped GitHub Actions token on the server, retrieves recent public commits for each configured tool, removes merge/dependency noise, and writes the ten newest meaningful entries to `data/updates.json`. It commits only when the generated file changes, then deploys the current site directly to GitHub Pages so automated feed updates become visible without a second workflow trigger. No GitHub credential is exposed to the browser.

The homepage reads this static JSON and displays a graceful empty state before the first successful aggregation.

## GitHub Pages deployment

`.github/workflows/pages.yml` deploys the static site on each push to `main`. In the repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions** if it is not selected automatically.

## Visit counter

The footer uses the same account-free Hits service as CPD Finder, with a separate counter for `edutools.uk`. `assets/js/visits.js` loads the badge once per page load on the published Toolkit domains only. Local previews do not count, and all supported domains use one shared total. Clicking the badge opens the public totals on Hits.

The total is approximate, starts on 25 September 2026, and cannot recover previous traffic. Repeat loads may count again; caching, blocked requests and bots can affect accuracy. The image request goes to hits.sh with no referrer or visited-page query string. No account, API key or third-party JavaScript is required. If the image fails, the counter stays hidden. Do not poll the badge: each request can add a hit.

## Custom domain

The site uses **edutools.uk** as its custom domain. Configure the apex domain with the DNS records recommended by GitHub Pages, then enable **Enforce HTTPS** after DNS has propagated. The committed `CNAME` file keeps the domain attached to the deployment.
