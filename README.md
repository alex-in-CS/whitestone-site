# Whitestone Labs — studio site

The website for Whitestone Labs, a small product design and engineering studio for AI, SaaS, fintech and startup teams.

**Live:** https://alex-in-cs.github.io/whitestone-site/

![Whitestone Labs hero: a dark particle bust beside the studio headline](.github/readme/hero.jpg)

## What's on the page

- **Hero:** a real-time WebGL bust made of grain, with dust trailing off to the right. The head turns toward the cursor, glitches on hover and blurs in on load. Machines without hardware graphics get a still image instead.
- **Live status bar:** local times in Chandigarh and London, plus the next open project slot.
- **Process board:** five steps that light up one after another in a loop, from discovery to ship.
- **Ways to work:** three engagement types (feature sprint, launch site, ongoing partner), each with its own animated illustration.
- **Case studies:** Fluke, the Fluke launch site and Sortie.
- **FAQ, booking panel and footer:** the footer wordmark keeps melting between WHITESTONE and LABS.
- **Cursor field:** a grid of characters that ripples under the mouse over open background.
- **Light and dark themes.**

## How it's built

A static site with no build step. Every file is served as it is.

| File | What it does |
|---|---|
| `index.html` | All markup, one page |
| `statue3d.js` | Hero renderer (three.js): bust mesh, grain shader, dust particles, head tracking, hover glitch |
| `sections.js` | Behaviour below the hero: card glitch, process board loop, button shader, footer wordmark, booking embed |
| `cursor.js` | Character field around the cursor |
| `main.js` | Nav, theme toggle, clocks, scroll reveals |
| `aller.css`, `styles.css` | Layout and type; `styles.css` holds the studio overrides, the dark theme and the scaling that fits the 1440px layout to screens from 1024 to 1440px wide |
| `assets/` | Logo, bust model (`hero/*.glb`), icons, case covers, illustrations |
| `vendor/` | three.js, GLTFLoader, BufferGeometryUtils |

## Run it locally

Any static file server works:

```bash
npx serve .
```

Then open the address it prints. Opening `index.html` straight from disk won't work, because the browser blocks loading the 3D model from `file://`.

## Deploy

GitHub Pages serves this repo from `main` (root folder). Push to `main`, and the site updates in about a minute.

## Status

- Built for desktop and laptop (1024px and wider). The phone layout is still in progress.
- Testimonials, client logos, social links and the booking link are placeholders until the real ones come in.

## License

Copyright © 2026 Whitestone Labs. All rights reserved; see [LICENSE](LICENSE). Third-party libraries in `vendor/` keep their own licenses.
