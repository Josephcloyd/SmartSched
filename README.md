# SmartSched by GetLaunchPH

Live at **https://smartschedule.getlaunchph.com**

SmartSched is a local-first school schedule planner. It does not use Supabase, accounts, cloud storage, or a backend. Your schedule is stored in the browser on the current device.

## What It Does

- Add and edit classes, quizzes, exams, assignments, labs, and events
- Save everything locally in the browser
- Warn when two items overlap on the same day
- Download an HD PNG schedule wallpaper sized for your phone, tablet, or laptop
- Export an `.ics` calendar file with reminder alarms
- Enable browser notifications while the app is open or installed
- Detect the current country/region and pause reminders on recorded public holidays
- Export/import a JSON backup for moving the schedule to another browser or phone
- Share classes with a classmate by QR code or link (the schedule travels inside the link's `#` fragment, so it never reaches a server)
- Works offline after the first visit
- Install as a PWA from supported browsers

## Important Phone Limits

A web app cannot silently set your phone wallpaper or native alarm. SmartSched can generate the HD wallpaper file and calendar alarm file. On your phone, open the downloaded PNG to set it as wallpaper, and open the `.ics` file to add the schedule alarms to your calendar.

Browser notifications work only after permission is granted, and local reminder checks are most reliable while SmartSched is open or installed.

Holiday protection asks for location permission only when you choose **Detect location & holidays**. Exact GPS coordinates are not saved. The detected country/region and downloaded public-holiday dates are stored locally and included in backups. Location detection generally requires HTTPS or localhost, and refreshing holiday dates requires an internet connection.

## Run On This Computer

Open PowerShell in this project folder:

```powershell
cd "C:\Users\Joseph Clyde\Desktop\Cloy's Project\Attendance Scheduler"
```

Install dependencies if needed:

```powershell
npm install
```

Start the app:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000
```

## Use On A Phone

For quick testing on the same Wi-Fi network:

```powershell
npm run dev -- --hostname 0.0.0.0
```

Find your computer IP address:

```powershell
ipconfig
```

On your phone, open:

```text
http://YOUR-COMPUTER-IP:3000
```

For PWA install prompts and some notification behavior, phones may require HTTPS or localhost. For everyday use, open the live site above and add it to your home screen.

## Build And Check

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

`npm test` runs the Vitest unit tests in `src/lib/*.test.ts` (saving/restoring schedules, calendar export, reminders, share links, splash timing). Use `npm run test:watch` while developing.

## Deploy

The Vercel project `smart-sched` deploys automatically from GitHub:

- Push to `main` → production (smartschedule.getlaunchph.com)
- Push to any other branch (e.g. `dev`) → preview URL

No environment variables are needed. Anonymous visit counts use Vercel Web Analytics (enable it under the project's **Analytics** tab); the URL's `?query` and `#hash` are stripped before anything is sent. Before pushing UI or PWA changes, run the checks above, and bump `CACHE_NAME` in `public/sw.js` so installed copies pick up the new build.

## Files Of Interest

- `src/components/schedule-app.tsx`: app state and screens (editor, wallpaper, reminders, backup, sharing)
- `src/lib/schedule-storage.ts`: saving/loading and validating schedules (local storage, backups, share links)
- `src/lib/ics.ts`, `src/lib/reminders.ts`: calendar export and reminder timing
- `src/lib/share-link.ts`, `src/components/share/`: classmate share links and QR codes
- `src/lib/splash.ts`, `src/components/brand/splash-gate.tsx`: loading-screen timing
- `src/lib/seo.ts`, `src/components/seo/about-section.tsx`, `src/app/robots.ts`, `src/app/sitemap.ts`: search title/description, the About + FAQ section, structured data (JSON-LD), robots.txt and sitemap.xml. Edit FAQ text in `seo.ts` only, so the page and the structured data stay in sync.
- `src/app/page.tsx`: main app route
- `src/app/manifest.ts`: PWA manifest
- `public/sw.js`: simple offline cache service worker
- `public/icon.svg`, `public/icon-*.png`, `src/app/apple-icon.png`: app icons (PNG sizes for Android/iPhone home screens)
- `src/app/opengraph-image.png`: link-preview image for Messenger, Facebook, etc.
- `next.config.ts`: security headers (the CSP only allows the holiday and reverse-geocode APIs)

## Backup

Use `Backup JSON` before clearing browser data or moving phones. Use `Import backup` to restore that file.
