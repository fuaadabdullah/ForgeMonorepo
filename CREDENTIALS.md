# ForgeTM Login Credentials

**Email:** fuaadabdullah@gmail.com
**Username:** fuaadabdullah
**Password:** Attilla2025?#!

## How to Access Your Application

1. **Automatic Startup:** The ForgeTM servers will start automatically when you log into your Mac
2. **Manual Access:** If needed, you can access the application at:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:8000`

## Login Instructions

1. Open your browser and go to `http://localhost:3000`
2. Use the login form with:
   - Username: `fuaadabdullah`
   - Password: `Attilla2025?#!`

## Server Status

Both the backend (FastAPI) and frontend (Next.js) servers are configured to start automatically on login.

## Troubleshooting

If the servers don't start automatically:

1. Open Terminal
2. Run: `cd /Users/fuaadabdullah/ForgeMonorepo`
3. Start backend: `source ForgeTM/apps/backend/.venv/bin/activate && PYTHONPATH=ForgeTM/apps/backend/src uvicorn forge.main:app --host 127.0.0.1 --port 8000`
4. Start frontend: `cd ForgeTM/apps/frontend && pnpm run dev`

Created: October 27, 2025
