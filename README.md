# OfferOS

OfferOS is a polished web app/PWA foundation for software engineering recruiting. It helps CS students manage applications, resume versions, coding prep, behavioral prep, deadlines, and recruiting analytics in one place.

This first pass is frontend-only: local mock data, no authentication, no database, and no backend routes.

## MVP Features

- Dashboard with recruiting KPIs, today's plan, deadlines, activity, and pipeline summary
- Kanban-style application tracker for internship and job opportunities
- Resume manager with targeted versions, keyword scores, and mock insights
- Interview prep workspace for coding, behavioral, and system design practice
- Analytics page with simple visual indicators for response and conversion trends
- Responsive dark-mode-first shell with desktop sidebar and mobile navigation

## Tech Stack

- Next.js App Router
- TypeScript
- React
- Tailwind CSS
- Local mock data
- shadcn-style local UI primitives

## Run Locally

```bash
npm install
npm run dev
```

The web app lives in `apps/web`. The root workspace scripts forward to that app.

## Build

```bash
npm run build
```

## Planned Roadmap

- Auth
- Database
- AI resume review
- AI mock interviews
- Chrome extension job saver
- Community company insights
