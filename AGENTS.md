<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project Notes

- Main app UI lives in `src/components/schedule-app.tsx`.
- Shared schedule and wallpaper types live in `src/lib/types.ts`.
- Keep wallpaper exports readable on small portrait sizes. Prefer vertically stacked schedule cards for phone wallpapers instead of squeezing multiple cards side-by-side.
- Saturday and Sunday should remain available in the scheduler, but empty weekend days should not appear in wallpaper exports or wallpaper previews.
- When changing cached PWA behavior or generated app shell assets, bump `CACHE_NAME` in `public/sw.js` so browsers do not keep stale bundles.
- Run `npm run typecheck`, `npm run lint`, and `npm run build` before handing off UI/export changes.
