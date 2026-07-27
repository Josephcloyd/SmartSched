# SmartSched Local

SmartSched is now a local-first school schedule planner. It does not use Supabase, accounts, cloud storage, or a backend. Your schedule is stored in the browser on the current device.

## What It Does

- Add and edit classes, quizzes, exams, assignments, labs, and events
- Save everything locally in the browser
- Warn when two items overlap on the same day
- Download a high-definition `1440x2560` PNG schedule wallpaper
- Export an `.ics` calendar file with reminder alarms
- Enable browser notifications while the app is open or installed
- Export/import a JSON backup for moving the schedule to another browser or phone
- Install as a PWA from supported browsers

## Important Phone Limits

A web app cannot silently set your phone wallpaper or native alarm. SmartSched can generate the HD wallpaper file and calendar alarm file. On your phone, open the downloaded PNG to set it as wallpaper, and open the `.ics` file to add the schedule alarms to your calendar.

Browser notifications work only after permission is granted, and local reminder checks are most reliable while SmartSched is open or installed.

## Run On This Computer

Open PowerShell in this project folder:

```powershell
cd "C:\Users\Joseph Clyde\OneDrive\Desktop\Cloy's\Cloy's Project\Attendance Scheduler"
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

For PWA install prompts and some notification behavior, phones may require HTTPS or localhost. For true phone-only use without keeping your computer running, deploy the static app later or wrap it as a native app.

## Build And Check

```powershell
npm run lint
npm run typecheck
npm run build
```

## Files Of Interest

- `src/components/schedule-app.tsx`: local schedule editor, wallpaper export, reminders, backup import/export
- `src/app/page.tsx`: main app route
- `src/app/manifest.ts`: PWA manifest
- `public/sw.js`: simple offline cache service worker
- `public/icon.svg`: PWA icon

## Backup

Use `Backup JSON` before clearing browser data or moving phones. Use `Import backup` to restore that file.
