# OfferOS

OfferOS is a polished, installable recruiting workspace for software engineering students. It brings applications, resume versions, coding prep, behavioral prep, deadlines, and recruiting analytics into one local-first app.

OfferOS is frontend-only. Workspace data is stored in the browser with `localStorage`; there are no backend routes, accounts, or cloud data services.

## MVP Features

- Dashboard with recruiting KPIs, today's plan, deadlines, activity, and pipeline summary
- Kanban-style application tracker for internship and job opportunities
- Resume manager with targeted versions, keyword scores, and mock insights
- Interview prep workspace for coding, behavioral, and system design practice
- Analytics page with simple visual indicators for response and conversion trends
- Responsive dark-mode-first shell with desktop sidebar and mobile navigation
- Installable PWA with standalone display, iOS metadata, connection awareness, and basic offline asset caching

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Browser `localStorage`
- shadcn-style local UI primitives

## Run Locally

```bash
npm install
npm run dev
```

The web app lives in `apps/web`. The root workspace scripts forward to that app.

## Production Build

```bash
npm run build
npm run start
```

## Test PWA Installation Locally

The service worker registers in production mode only so it does not interfere with Next.js development refreshes.

1. Run `npm run build`, then `npm run start`.
2. Open `http://localhost:3000` in Chrome or Edge. Localhost is treated as a secure context for PWA testing.
3. Open DevTools, then **Application**. Confirm the manifest, 192px and 512px icons, and `/sw.js` service worker are detected.
4. Use the browser install icon or the **Install OfferOS** action in Settings.
5. In DevTools Network conditions, switch offline and reload a previously visited route to verify the cached app shell.

On iPhone or iPad, open OfferOS in Safari and choose **Share > Add to Home Screen**.

## Current Limitations

- Data is stored only in the current browser profile with `localStorage`.
- There is no cloud sync or cross-device backup yet.
- There is no authentication or account recovery.
- Offline support covers the app shell and previously cached assets; it is not a cloud synchronization system.

## Planned Roadmap

- Portable import and export
- Optional account and cloud synchronization
- Calendar and reminder integrations
