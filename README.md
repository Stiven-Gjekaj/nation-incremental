# Nation Incremental

A lightweight, vanilla JavaScript incremental game. Choose a top economy, build industries, buy upgrades, earn achievements, and grow your GDP. Saves automatically and supports offline progress.

## Quick Start

- Pick a country (each has unique boosts).
- Click "Develop" and buy Industries. Upgrades unlock as you progress.
- The game autosaves every 10s. Use Settings to export/import or hard reset.

## Tech

- No dependencies (vanilla HTML/CSS/JS)
- LocalStorage save system with offline progress
- Responsive layout and accessible semantics

## Deploy

- Serve the `nation-incremental` folder as static files (e.g., GitHub Pages, Netlify, Vercel static).
- Entry file: `index.html`.

## Notes

- Achievements grant +1% global GPS each.
- Click power scales with GPS (1% of GPS + base).
- Industry milestone upgrades double output at 10/25/50/100 owned.
