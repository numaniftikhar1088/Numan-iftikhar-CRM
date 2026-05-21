# NumanOS — Portfolio + Personal Automation Platform (CRM)

Numan Iftikhar's portfolio website with an integrated, sign-in-gated CRM
("NumanOS") covering the full feature roadmap.

```
.
├─ portfolio-website/        # Public site (vanilla HTML/CSS/JS) + CRM pages
│  ├─ index.html             #   portfolio (Sign In button in the navbar)
│  ├─ login.html             #   CRM sign-in (MFA-aware)
│  ├─ dashboard.html         #   CRM dashboard shell (10 modules)
│  ├─ css/ (style, auth, dashboard)
│  └─ js/  (api, auth, dashboard, script, chatbot)
└─ backend/                  # Flask API
   ├─ app.py, core.py        #   routes + storage/auth helpers
   ├─ requirements.txt, .env.example
   └─ venv/                  #   virtualenv (created by you)
```

## Features (CRM modules)
1. Expense Tracker · 2. Personal Cloud Storage · 3. Portfolio + Meetings ·
4. MFA (TOTP) · 5. Cloud database (MongoDB Atlas) · 6. RAG + LangChain/Claude AI ·
7. Email generation · 8. Notes (Notion-style) · 9. Integrations · 10. Projects.

## Stack
- **Frontend:** the existing portfolio (HTML/CSS/JS) + CRM pages in the same style.
- **Backend:** Python **Flask** REST API.
- **Database:** **MongoDB Atlas** (falls back to an in-memory store if no URI set).
- **AI:** **Anthropic Claude** for email drafting + the RAG assistant (graceful demo
  fallback if no API key).

## Run it
Two processes — the API and a static file server.

```bash
# 1) Backend (http://localhost:5050)
cd backend
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
PORT=5050 ./venv/bin/python app.py

# 2) Frontend (http://127.0.0.1:5500) — in a second terminal
cd portfolio-website
python3 -m http.server 5500
```

Or use the helper: `./start.sh`

Then open **http://127.0.0.1:5500**, click **Sign In** (top-right).
The **first** sign-in creates your owner account (use any email + password).

> Port 5000 is avoided because macOS AirPlay Receiver uses it; the API runs on 5050.

## Going to production (per the action plan)
Set these in `backend/.env` (copy from `.env.example`):
- `MONGODB_URI` / `MONGODB_DB` — your MongoDB Atlas cluster
- `ANTHROPIC_API_KEY` — enables real Claude-powered email + RAG
- `JWT_SECRET` — a long random string

Deploy target: a single AWS EC2 running both processes behind Nginx (containerise
later for EKS). Single-user by design.
