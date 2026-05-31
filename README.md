# Bullfrog Bash — Trip Management Scaffold

Private trip management web app scaffold for 16 friends travelling to Bullfrog Lake (June 16–18, 2026).

Tech: React + TypeScript + Vite, Tailwind, Node + Express + TypeScript, Prisma + PostgreSQL, JWT, Resend, Socket.io

Quick start (backend & frontend separate):

1. Copy env examples and fill values:

```powershell
cd backend
cp .env.example .env
cd ../frontend
cp .env.example .env || echo "no frontend env needed"
```

2. Install:

```powershell
cd backend
npm install
cd ../frontend
npm install
```

3. Generate Prisma client & start Postgres, then run dev servers:

```powershell
cd backend
npx prisma generate
npm run dev

cd ../frontend
npm run dev
```

This scaffold provides a starting point: Prisma schema, basic Express auth endpoints, React pages for login/onboarding/dashboard, and Tailwind setup. Implement UI details, email templates, and Socket.io flows next.
