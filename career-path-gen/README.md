# Career Path Generator — Frontend

Next.js 16 / React 19 frontend for the Career Path Generator system.

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **React 19** with concurrent features
- **Tailwind CSS v4**
- **Zustand** for global state
- **ReactFlow** for interactive roadmap graph visualization
- **Recharts** for analytics charts
- **jsPDF + html2canvas** for PDF export of roadmaps

## Development

```bash
npm install
npm run dev
# → http://localhost:3017
```

## Environment

```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## Features

- Landing page with animated hero section
- Auth flow (register / login)
- Career profile form (skills, domain, experience, life stage)
- Roadmap visualizer — ReactFlow graph with step-by-step breakdown
- PASSIONIT/PRUTL audit score radar chart (Recharts)
- Career demand analytics dashboard
- PDF export of generated roadmaps
