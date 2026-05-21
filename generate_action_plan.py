#!/usr/bin/env python3
"""
Generates the Action Plan PDF for the Personal Automation Platform ("NumanOS").
Backend: Flask | Frontend: React | DB: PostgreSQL (managed) | AI: LangChain + RAG
Built with ReportLab Platypus.
"""

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, Table, TableStyle,
    PageBreak, ListFlowable, ListItem, HRFlowable, NextPageTemplate,
)

OUTPUT = "Action_Plan_NumanOS.pdf"
DOC_TITLE = "NumanOS — Action Plan"
CONTENT_W = 17.0 * cm  # usable content width with 2cm margins on A4

# ---------------------------------------------------------------- palette ----
NAVY      = colors.HexColor("#0B1220")
SLATE     = colors.HexColor("#0F172A")
INK       = colors.HexColor("#1E293B")
MUTED     = colors.HexColor("#64748B")
CYAN      = colors.HexColor("#0891B2")
INDIGO    = colors.HexColor("#4F46E5")
TEAL_BG   = colors.HexColor("#ECFEFF")
INDIGO_BG = colors.HexColor("#EEF2FF")
AMBER_BG  = colors.HexColor("#FEF3C7")
AMBER_BAR = colors.HexColor("#D97706")
GREEN_BG  = colors.HexColor("#ECFDF5")
GREEN_BAR = colors.HexColor("#059669")
LINE      = colors.HexColor("#CBD5E1")
ROW_ALT   = colors.HexColor("#F1F5F9")
HEAD_BG   = colors.HexColor("#0F172A")
WHITE     = colors.white

# ---------------------------------------------------------------- styles -----
_ss = getSampleStyleSheet()

def S(name, parent=None, **kw):
    return ParagraphStyle(name, parent=parent or _ss["Normal"], **kw)

st_h1     = S("H1", fontName="Helvetica-Bold", fontSize=17, textColor=SLATE, spaceBefore=4, spaceAfter=2, leading=21)
st_h1n    = S("H1n", fontName="Helvetica-Bold", fontSize=9, textColor=CYAN, spaceAfter=1, leading=11)
st_h2     = S("H2", fontName="Helvetica-Bold", fontSize=12.5, textColor=INDIGO, spaceBefore=11, spaceAfter=4, leading=16)
st_h3     = S("H3", fontName="Helvetica-Bold", fontSize=10.5, textColor=SLATE, spaceBefore=7, spaceAfter=2, leading=14)
st_body   = S("Body", fontName="Helvetica", fontSize=9.6, textColor=INK, leading=14.3, alignment=TA_JUSTIFY, spaceAfter=5)
st_bodyL  = S("BodyL", parent=st_body, alignment=TA_LEFT)
st_bullet = S("Bul", fontName="Helvetica", fontSize=9.5, textColor=INK, leading=13.4, spaceAfter=2)
st_small  = S("Small", fontName="Helvetica", fontSize=8.2, textColor=MUTED, leading=11)
st_cell   = S("Cell", fontName="Helvetica", fontSize=8.5, textColor=INK, leading=11.4)
st_cell_w = S("CellW", parent=st_cell, textColor=WHITE, fontName="Helvetica-Bold")
st_mono   = S("Mono", fontName="Courier", fontSize=8.0, textColor=INK, leading=11)
st_callT  = S("CallT", fontName="Helvetica-Bold", fontSize=9.6, textColor=SLATE, spaceAfter=3, leading=12)
st_callB  = S("CallB", fontName="Helvetica", fontSize=9.0, textColor=INK, leading=13)

st_cover_kick  = S("CK", fontName="Helvetica-Bold", fontSize=12, textColor=CYAN, alignment=TA_CENTER, leading=16)
st_cover_title = S("CT", fontName="Helvetica-Bold", fontSize=40, textColor=WHITE, alignment=TA_CENTER, leading=42)
st_cover_sub   = S("CS", fontName="Helvetica", fontSize=12.5, textColor=colors.HexColor("#CBD5E1"), alignment=TA_CENTER, leading=18)
st_cover_meta  = S("CM", fontName="Helvetica", fontSize=10, textColor=colors.HexColor("#94A3B8"), alignment=TA_CENTER, leading=15)

# ---------------------------------------------------------- flowable helpers -
def bullets(items, style=st_bullet, color=CYAN):
    lis = [ListItem(Paragraph(x, style), value="•", bulletColor=color) for x in items]
    return ListFlowable(lis, bulletType="bullet", leftIndent=12,
                        bulletFontSize=7.5, bulletColor=color, spaceBefore=1, spaceAfter=6)

def callout(title, body, bg=TEAL_BG, bar=CYAN):
    inner = []
    if title:
        inner.append(Paragraph(title, st_callT))
    inner += body if isinstance(body, list) else [Paragraph(body, st_callB)]
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBEFORE", (0, 0), (0, -1), 3, bar),
    ]))
    return t

def table(header, rows, widths, zebra=True):
    data = [[Paragraph(h, st_cell_w) for h in header]]
    for r in rows:
        data.append([c if hasattr(c, "wrap") else Paragraph(str(c), st_cell) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), HEAD_BG),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), ROW_ALT))
    t.setStyle(TableStyle(style))
    return t

def heading(num, text):
    return [Paragraph("SECTION %s" % num, st_h1n), Paragraph(text, st_h1),
            HRFlowable(width="100%", thickness=1.2, color=CYAN, spaceBefore=2, spaceAfter=8)]

def kpis(pairs):
    big = S("KB", fontName="Helvetica-Bold", fontSize=15, textColor=INDIGO, alignment=TA_CENTER, leading=17)
    lbl = S("KL", fontName="Helvetica", fontSize=7.6, textColor=MUTED, alignment=TA_CENTER, leading=9.5)
    row = [[Paragraph(b, big), Paragraph(l, lbl)] for b, l in pairs]
    t = Table([row], colWidths=[CONTENT_W / len(pairs)] * len(pairs))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), ROW_ALT),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE), ("INNERGRID", (0, 0), (-1, -1), 0.5, LINE),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t

# ----------------------------------------------------------- page furniture -
def cover_bg(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(NAVY); canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setFillColor(CYAN); canvas.rect(0, A4[1] - 6 * mm, A4[0], 6 * mm, stroke=0, fill=1)
    canvas.setFillColor(INDIGO); canvas.rect(0, 0, A4[0], 6 * mm, stroke=0, fill=1)
    canvas.restoreState()

def chrome(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.5)
    canvas.line(2 * cm, 1.4 * cm, A4[0] - 2 * cm, 1.4 * cm)
    canvas.setFont("Helvetica", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(2 * cm, 1.0 * cm, DOC_TITLE)
    canvas.drawCentredString(A4[0] / 2, 1.0 * cm, "Prepared for Numan Iftikhar  •  Confidential")
    canvas.drawRightString(A4[0] - 2 * cm, 1.0 * cm, "Page %d" % (doc.page - 1))
    canvas.setFillColor(CYAN); canvas.rect(2 * cm, A4[1] - 1.5 * cm, 1.0 * cm, 2.5, stroke=0, fill=1)
    canvas.setFont("Helvetica-Bold", 7.5); canvas.setFillColor(MUTED)
    canvas.drawString(3.2 * cm, A4[1] - 1.55 * cm, "PERSONAL AUTOMATION PLATFORM")
    canvas.restoreState()

# ----------------------------------------------------------------- content --
def content():
    E = []

    # ============================ COVER ============================
    E += [Spacer(1, 3.0 * cm),
          Paragraph("ACTION PLAN  •  v1.0", st_cover_kick),
          Spacer(1, 0.5 * cm),
          Paragraph("NumanOS", st_cover_title),
          Spacer(1, 0.2 * cm),
          Paragraph("Personal Automation Platform", S("CT2", parent=st_cover_title, fontSize=17, leading=20)),
          Spacer(1, 0.5 * cm),
          Paragraph("A unified, secure, AI-augmented personal CRM and portfolio that automates "
                    "everything currently done by hand — expenses, files, notes, client meetings, "
                    "emails and projects.", st_cover_sub),
          Spacer(1, 1.3 * cm)]

    bd = S("bd", fontName="Helvetica", fontSize=9, textColor=WHITE, alignment=TA_CENTER, leading=13)
    badges = [[Paragraph("<b>Frontend</b><br/>React + Vite + TS", bd),
               Paragraph("<b>Backend</b><br/>Python Flask", bd),
               Paragraph("<b>Database</b><br/>MongoDB Atlas", bd),
               Paragraph("<b>Cloud / AI</b><br/>AWS EC2 · Claude", bd)]]
    bt = Table(badges, colWidths=[(A4[0] - 4.4 * cm) / 4] * 4)
    bt.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#111C30")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E293B")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#1E293B")),
        ("LINEABOVE", (0, 0), (-1, 0), 2, CYAN),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    E += [bt, Spacer(1, 2.0 * cm),
          Paragraph("Prepared for <b>Numan Iftikhar</b> — Senior Multi-Cloud DevOps Engineer", st_cover_meta),
          Paragraph("Date: 21 May 2026", st_cover_meta),
          Paragraph("Profile: numaniftikhar.com   •   Design reference: ericwadkins.com", st_cover_meta),
          NextPageTemplate("Body"), PageBreak()]

    # ===================== 1. EXECUTIVE SUMMARY =====================
    E += heading("1", "Executive Summary")
    E += [Paragraph(
        "This document is the build plan for <b>NumanOS</b> — a single private platform that turns your "
        "manual day-to-day workflows into automated, auditable software. Today you track expenses, store "
        "files, write notes, book client meetings, draft emails and manage projects across scattered tools. "
        "NumanOS folds all of that into one secure web application with a public portfolio front-end, backed "
        "by a managed cloud database (<b>MongoDB Atlas</b>) and an AI layer (LangChain + Retrieval-Augmented "
        "Generation) that can answer questions over your own data and draft your emails.", st_body)]
    E += [Paragraph(
        "The stack per your direction: a <b>React</b> single-page front-end, a <b>Python Flask</b> REST API, "
        "and <b>MongoDB Atlas</b> as the managed cloud database — all hosted on <b>AWS</b>, with "
        "<b>Anthropic Claude</b> powering the AI features. To start, the whole stack runs on a single "
        "<b>EC2</b> instance via Docker Compose (lean and cheap); because every service is containerised it "
        "stays EKS-ready for the day you scale onto Kubernetes — squarely in your wheelhouse as a K8s and IaC "
        "specialist. Delivery is split into <b>8 phases</b> so a usable product ships early (auth + portfolio "
        "+ meetings) and the heavier AI and automation features layer in afterward.", st_body)]
    E += [kpis([("10", "Feature pillars"), ("8", "Delivery phases"),
                ("3", "Tier architecture"), ("~16–22 wk", "Solo build estimate")]),
          Spacer(1, 6)]
    E += [callout("Guiding principle",
                  "Automate the manual, secure by default, and ship in thin vertical slices. Every phase ends "
                  "with something you can actually log into and use — not a half-built layer.", INDIGO_BG, INDIGO)]

    # ===================== 2. ABOUT (PORTFOLIO SOURCE) =====================
    E += [Spacer(1, 4)] + heading("2", "Profile — Source Content for the Portfolio")
    E += [Paragraph("Pulled from numaniftikhar.com to seed the public portfolio module. You will be able to "
                    "edit all of this from the admin UI; nothing is hard-coded.", st_bodyL)]
    E += [table(
        ["Field", "Value"],
        [["Name / Title", "Numan Iftikhar — Senior Multi-Cloud DevOps Engineer"],
         ["Positioning", "Kubernetes Architect & IaC Expert; turns manual workflows into GitOps-driven automation"],
         ["Experience", "5+ years across Azure, AWS and GCP; current: Sr. DevOps @ TrueMedIT (2023–present)"],
         ["Core stack", "Kubernetes (AKS/EKS/GKE), Docker, Terraform, Ansible, ArgoCD, Helm, KEDA, Istio"],
         ["CI/CD & Sec", "GitHub Actions, GitLab CI, Jenkins, Cloud Build; Vault, OPA, Trivy, Cosign, Prisma"],
         ["Observability", "Prometheus, Grafana, Cloud Monitoring"],
         ["Certifications", "8 total — GCP DevOps/Architect/ACE, AWS SAA + DVA, Azure Admin, Terraform Assoc."],
         ["Flagship work", "FinGuard (multi-cloud banking, PCI-DSS/SOC 2); Lab Mgmt SaaS on AKS (HIPAA, 99.97%)"],
         ["Contact", "hellonumaniftikhar@gmail.com  •  linkedin.com/in/numaniftikhar  •  github.com/numaniftikhar1088"]],
        widths=[3.6 * cm, CONTENT_W - 3.6 * cm])]

    E += [PageBreak()]

    # ===================== 3. ARCHITECTURE =====================
    E += heading("3", "System Architecture")
    E += [Paragraph("NumanOS is a classic three-tier app hardened for cloud: a React SPA talks to a Flask REST "
                    "API over HTTPS/JWT; the API owns all business logic and is the only thing that touches "
                    "MongoDB Atlas, S3 storage and the AI services. Long-running work (document indexing, email "
                    "drafting, file processing) is pushed to a background worker so the API stays responsive.",
                    st_bodyL)]

    def arch_box(text, bg, tc=WHITE):
        return Paragraph(text, S("ab", fontName="Helvetica-Bold", fontSize=8.4, textColor=tc,
                                 alignment=TA_CENTER, leading=11))
    layers = [
        [arch_box("CLIENT — React SPA (Vite + TS, Tailwind/shadcn): Portfolio · Dashboard · Notes · Files · Expenses · AI Chat", INDIGO)],
        [arch_box("EDGE — HTTPS · JWT auth + MFA gate · rate limiting · CORS · WAF / reverse proxy (Nginx / Ingress)", CYAN)],
        [arch_box("API — Flask (blueprints) · SQLAlchemy · Marshmallow validation · service layer · OpenAPI", SLATE)],
        [arch_box("ASYNC — Celery workers + Redis broker:  RAG indexing · email drafting · OCR · file scans · reminders", colors.HexColor("#7C3AED"))],
        [arch_box("DATA — PostgreSQL (+ pgvector for embeddings)   |   Object storage (S3 / GCS / Blob)   |   Redis cache", colors.HexColor("#0F766E"))],
        [arch_box("AI — LangChain orchestration · embeddings · LLM (Claude / configurable) · retrieval over pgvector", colors.HexColor("#B45309"))],
        [arch_box("PLATFORM — Docker · Kubernetes (AKS/EKS/GKE) · Terraform IaC · GitHub Actions CI/CD · Prometheus + Grafana", colors.HexColor("#1E293B"))],
    ]
    at = Table(layers, colWidths=[CONTENT_W])
    sty = [("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
           ("BOX", (0, 0), (-1, -1), 0.5, WHITE)]
    bgs = [INDIGO, CYAN, SLATE, colors.HexColor("#7C3AED"),
           colors.HexColor("#0F766E"), colors.HexColor("#B45309"), colors.HexColor("#1E293B")]
    for i, c in enumerate(bgs):
        sty.append(("BACKGROUND", (0, i), (-1, i), c))
        sty.append(("LINEBELOW", (0, i), (-1, i), 2, WHITE))
    at.setStyle(TableStyle(sty))
    E += [at, Spacer(1, 6)]
    E += [callout("Why pgvector instead of a separate vector DB",
                  "Storing embeddings in PostgreSQL via the pgvector extension keeps the entire system on one "
                  "managed database — one backup story, one access-control model, one bill. It satisfies your "
                  "'proper single cloud database' requirement and removes a moving part (no Pinecone/Weaviate to run).",
                  GREEN_BG, GREEN_BAR)]

    # ===================== 4. TECH STACK =====================
    E += [Spacer(1, 4)] + heading("4", "Technology Stack")
    E += [table(
        ["Layer", "Choice", "Notes"],
        [["Frontend", "React 18 + Vite + TypeScript", "Fast builds, typed; SPA with code-splitting"],
         ["UI / styling", "Tailwind CSS + shadcn/ui", "Modern, accessible components; dark-mode native"],
         ["Client state", "TanStack Query + Zustand", "Server cache + light global state"],
         ["Routing", "React Router", "Public portfolio + protected app routes"],
         ["Backend", "Flask + Blueprints", "REST API; per-feature modules"],
         ["ORM / migrations", "SQLAlchemy + Alembic", "Versioned schema changes"],
         ["Validation / docs", "Marshmallow + apispec (OpenAPI)", "Request schemas + auto Swagger UI"],
         ["Async", "Celery + Redis", "Background jobs and scheduled tasks (beat)"],
         ["Database", "PostgreSQL + pgvector", "Managed: Cloud SQL / RDS / Azure DB"],
         ["Object storage", "S3 / GCS / Azure Blob", "Personal cloud storage + receipts/attachments"],
         ["Auth", "JWT (access+refresh) + pyotp TOTP", "Argon2 hashing; MFA + backup codes"],
         ["AI", "LangChain + LLM + embeddings", "RAG over personal data; email drafting"],
         ["Infra", "Docker + Kubernetes + Terraform", "CI/CD via GitHub Actions; Prometheus/Grafana"]],
        widths=[3.0 * cm, 5.4 * cm, CONTENT_W - 8.4 * cm])]

    E += [PageBreak()]

    # ===================== 5. FEATURE BREAKDOWN =====================
    E += heading("5", "Feature Breakdown — The 10 Pillars")
    E += [Paragraph("Each pillar maps to a backend module, a set of React screens and its own tables. "
                    "Below: scope, key tech and the core data each owns.", st_bodyL)]

    feats = [
        ("1 · Expense Tracker",
         "Transactions, categories, budgets and recurring expenses with charts and CSV import/export. "
         "Receipt upload to object storage with optional OCR auto-fill. Monthly dashboards and alerts.",
         "Tables: accounts, transactions, categories, budgets, receipts."),
        ("2 · Personal Cloud Storage",
         "Upload / download / preview, nested folders, versioning, share links with expiry, and per-account "
         "quota. Files in object storage; metadata + permissions in PostgreSQL; encrypted at rest.",
         "Tables: files, folders, file_versions, share_links."),
        ("3 · Portfolio + Client Meetings",
         "Public, editable portfolio (hero, about, projects, certs, services) plus client booking: availability "
         "rules, time-slot picker, auto Google Meet/Zoom link, email + calendar invite, reminders.",
         "Tables: profile, portfolio_sections, availability, bookings."),
        ("4 · MFA / Security",
         "TOTP via authenticator apps (pyotp), one-time backup codes, optional email OTP, enforced at login "
         "with a recovery flow. Argon2 password hashing; refresh-token rotation.",
         "Tables: users, mfa_secrets, backup_codes, sessions."),
        ("5 · Cloud Database Foundation",
         "Managed PostgreSQL with Alembic migrations, automated backups + PITR, connection pooling (PgBouncer), "
         "and pgvector enabled for the AI layer. Read replica optional later.",
         "Cross-cutting: powers every other module."),
        ("6 · RAG + LangChain",
         "Ingest notes, files and emails -> chunk -> embed -> store in pgvector. A LangChain retrieval chain "
         "answers questions over your own knowledge base with citations back to the source document.",
         "Tables: documents, chunks, embeddings (vector), chat_threads."),
        ("7 · Email Generation",
         "LLM-drafted emails (client follow-ups, cold outreach, meeting confirmations) with reusable templates "
         "and tone control; review-then-send via Gmail API; full sent-history log.",
         "Tables: email_templates, drafts, sent_emails."),
        ("8 · Notes (Notion-style)",
         "Block-based rich-text editor (TipTap / BlockNote), nested pages, tags, full-text search and "
         "markdown. Notes feed straight into the RAG index so the AI can reason over them.",
         "Tables: notes, blocks (JSONB), note_tags."),
        ("9 · Service Integrations",
         "OAuth connection framework for Gmail, Google Calendar, Google Drive, Calendly, Slack, GitHub and "
         "Stripe (invoicing). Each integration is a pluggable module with stored, scoped tokens.",
         "Tables: integrations, oauth_tokens, webhooks."),
        ("10 · Projects / 'Now'",
         "Kanban board of projects with status, tech stack, links and notes; the 'what I'm working on now' "
         "view publishes selected items straight to the public portfolio.",
         "Tables: projects, project_tasks, project_links."),
    ]
    rows = [[Paragraph("<b>%s</b><br/><font size=8 color='#64748B'>%s</font>" % (t, d), st_cell),
             Paragraph("<font size=7.6 color='#475569'>%s</font>" % data, st_cell)] for t, d, data in feats]
    E += [table(["Pillar / Scope", "Owns (data)"], rows, widths=[11.4 * cm, CONTENT_W - 11.4 * cm])]

    E += [PageBreak()]

    # ===================== 6. DATA MODEL =====================
    E += heading("6", "Data Model — Core Entities")
    E += [Paragraph("High-level relational map. A single <b>users</b> row anchors everything; the AI layer reuses "
                    "the same database via pgvector rather than a separate store.", st_bodyL)]
    E += [table(
        ["Domain", "Primary tables", "Key relationships"],
        [["Identity", "users, sessions, mfa_secrets, backup_codes", "user 1—* sessions; user 1—1 mfa_secret"],
         ["Expenses", "accounts, transactions, categories, budgets, receipts", "account 1—* transactions; txn *—1 category"],
         ["Storage", "folders, files, file_versions, share_links", "folder 1—* files; file 1—* versions"],
         ["Portfolio", "profile, portfolio_sections, availability, bookings", "profile 1—* sections; availability -> bookings"],
         ["Notes", "notes, blocks, note_tags", "note 1—* blocks; note *—* tags"],
         ["AI / RAG", "documents, chunks, embeddings, chat_threads, messages", "document 1—* chunks; chunk 1—1 embedding(vector)"],
         ["Email", "email_templates, drafts, sent_emails", "template 1—* drafts; draft 1—1 sent_email"],
         ["Integrations", "integrations, oauth_tokens, webhooks", "integration 1—* tokens"],
         ["Projects", "projects, project_tasks, project_links", "project 1—* tasks / links"]],
        widths=[2.7 * cm, 6.7 * cm, CONTENT_W - 9.4 * cm])]
    E += [Spacer(1, 6),
          callout("Migrations & integrity",
                  "Every schema change ships as an Alembic migration in version control. Foreign keys, NOT NULL "
                  "and CHECK constraints are enforced at the DB level — not just in app code — so data stays "
                  "consistent even under concurrent background jobs.", TEAL_BG, CYAN)]

    # ===================== 7. SECURITY & MFA =====================
    E += [Spacer(1, 4)] + heading("7", "Security & MFA")
    E += [bullets([
        "<b>Authentication:</b> email + password (Argon2id), then mandatory TOTP MFA. Short-lived JWT access "
        "tokens with rotating refresh tokens; sessions revocable from the UI.",
        "<b>MFA flows:</b> enrol via QR code (pyotp), 10 single-use backup codes, optional email OTP fallback, "
        "and a documented account-recovery path.",
        "<b>Authorization:</b> single-owner model now, with a role/permission table ready for future shared access.",
        "<b>Data protection:</b> TLS everywhere; secrets in a vault (HashiCorp Vault / cloud secrets manager — "
        "your toolset); object storage and DB encrypted at rest; signed, expiring URLs for file access.",
        "<b>App hardening:</b> input validation (Marshmallow), parameterised queries (SQLAlchemy), rate limiting, "
        "CORS allow-list, security headers, audit log of sensitive actions.",
        "<b>Pipeline security:</b> Trivy image scans, dependency scanning, and SBOM/Cosign signing in CI — "
        "reusing the DevSecOps stack from your portfolio.",
    ])]

    E += [PageBreak()]

    # ===================== 8. AI LAYER =====================
    E += heading("8", "AI Layer — RAG, LangChain & Email Generation")
    E += [Paragraph("The AI layer is what makes NumanOS feel automated rather than just a database with forms. "
                    "It runs as services behind the Flask API and does its heavy lifting in Celery workers.",
                    st_bodyL)]
    E += [Paragraph("Retrieval-Augmented Generation pipeline", st_h3)]
    E += [bullets([
        "<b>Ingest:</b> notes, uploaded files (PDF/DOCX/TXT) and selected emails are normalised to text.",
        "<b>Chunk + embed:</b> text is split into overlapping chunks and embedded; vectors land in pgvector.",
        "<b>Retrieve + answer:</b> a LangChain retrieval chain pulls the most relevant chunks and the LLM answers "
        "with inline citations linking back to the source note or file.",
        "<b>Chat:</b> threaded conversations stored in PostgreSQL; ask things like 'summarise my Q2 expenses' or "
        "'what did I note about the FinGuard failover design?'",
    ])]
    E += [Paragraph("Email generation", st_h3)]
    E += [bullets([
        "Pick a template + intent (follow-up, proposal, meeting confirm) and the LLM drafts a tone-matched email.",
        "RAG can inject real context (the client's project notes, last meeting summary) into the draft.",
        "Always review-then-send; sending goes through the Gmail integration and is logged.",
    ])]
    E += [callout("LLM provider — recommendation",
                  "Default to Anthropic Claude (latest Sonnet/Opus) for drafting and RAG answers, with the provider "
                  "kept behind a thin LangChain interface so it stays swappable (OpenAI, or a self-hosted open model "
                  "on your own GPU/K8s if you prefer full data residency). This is a decision to confirm — see Section 12.",
                  AMBER_BG, AMBER_BAR)]

    # ===================== 9. REPO STRUCTURE =====================
    E += [Spacer(1, 4)] + heading("9", "Repository & Project Structure")
    E += [Paragraph("A monorepo keeps frontend, backend and infrastructure versioned together for clean CI/CD.", st_bodyL)]
    tree = (
        "numanos/\n"
        "├─ frontend/                 # React + Vite + TS SPA\n"
        "│   ├─ src/{components,pages,features,hooks,lib,api}\n"
        "│   └─ Dockerfile\n"
        "├─ backend/                  # Flask API\n"
        "│   ├─ app/\n"
        "│   │   ├─ modules/          # expenses, storage, notes, ai, email, ...\n"
        "│   │   ├─ core/             # auth, mfa, config, db, security\n"
        "│   │   ├─ workers/          # celery tasks\n"
        "│   │   └─ extensions.py\n"
        "│   ├─ migrations/           # alembic\n"
        "│   ├─ tests/\n"
        "│   └─ Dockerfile\n"
        "├─ infra/                    # terraform (db, storage, k8s, secrets)\n"
        "├─ deploy/                   # helm charts / k8s manifests\n"
        "├─ .github/workflows/        # CI: lint, test, scan, build, deploy\n"
        "└─ docker-compose.yml        # local dev (api, db, redis, worker, web)\n"
    )
    tb = Table([[Paragraph(tree.replace("\n", "<br/>").replace(" ", "&nbsp;"), st_mono)]], colWidths=[CONTENT_W])
    tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                            ("TEXTCOLOR", (0, 0), (-1, -1), WHITE),
                            ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                            ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    # recolor mono text to light for dark box
    tb = Table([[Paragraph(tree.replace("\n", "<br/>").replace(" ", "&nbsp;"),
                           S("monoL", fontName="Courier", fontSize=7.8,
                             textColor=colors.HexColor("#E2E8F0"), leading=11))]], colWidths=[CONTENT_W])
    tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#0F172A")),
                            ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                            ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10)]))
    E += [tb]

    E += [PageBreak()]

    # ===================== 10. ROADMAP =====================
    E += heading("10", "Delivery Roadmap — 8 Phases")
    E += [Paragraph("Vertical slices: each phase ends with something usable. Estimates assume a focused solo "
                    "build; they compress significantly with help.", st_bodyL)]
    E += [table(
        ["Phase", "Focus", "Key deliverables", "Est."],
        [["0", "Foundations", "Monorepo, Docker compose, CI skeleton, base Flask+React, Postgres connected", "1 wk"],
         ["1", "Auth + MFA", "Signup/login, JWT, TOTP MFA, backup codes, sessions, user profile", "1–2 wk"],
         ["2", "Portfolio + Meetings", "Public portfolio (editable), projects, booking + calendar invites", "2–3 wk"],
         ["3", "Notes", "Block editor, nested pages, tags, search", "2 wk"],
         ["4", "Cloud Storage", "Upload/download, folders, versioning, share links, quotas", "2 wk"],
         ["5", "Expense Tracker", "Transactions, budgets, receipts, dashboards, CSV", "2 wk"],
         ["6", "AI Layer", "pgvector RAG, LangChain chat, email generation", "2–3 wk"],
         ["7", "Integrations + Hardening", "Gmail/Calendar/Drive/Slack/GitHub, observability, IaC deploy", "2–3 wk"]],
        widths=[1.1 * cm, 3.4 * cm, CONTENT_W - 6.3 * cm, 1.8 * cm])]
    E += [Spacer(1, 6),
          callout("Why this order",
                  "Auth + portfolio + meetings go first so you get a real, public, client-facing tool live within "
                  "weeks. Notes and storage build the content that the AI layer (Phase 6) then indexes — so RAG has "
                  "something to retrieve the moment it ships.", INDIGO_BG, INDIGO)]

    # ===================== 11. DEVOPS / DEPLOY =====================
    E += [Spacer(1, 4)] + heading("11", "DevOps, Deployment & Infrastructure")
    E += [Paragraph("This section leans on your own specialty — the platform is designed to be deployed the way "
                    "you already build for clients.", st_bodyL)]
    E += [bullets([
        "<b>Containers:</b> each service (api, worker, web) ships as a minimal multi-stage Docker image.",
        "<b>Orchestration:</b> Kubernetes (AKS/EKS/GKE) via Helm; HPA/KEDA for the worker, Ingress + cert-manager for TLS.",
        "<b>IaC:</b> Terraform provisions the managed Postgres, object storage, secrets, DNS and the cluster — "
        "reproducible across environments.",
        "<b>CI/CD:</b> GitHub Actions — lint, test, Trivy scan, build, sign (Cosign), push, then GitOps deploy (ArgoCD).",
        "<b>Observability:</b> Prometheus metrics + Grafana dashboards + structured logs; uptime and error alerting.",
        "<b>Environments:</b> local (docker-compose) -> staging -> production, with automated DB backups + PITR.",
    ])]
    E += [callout("Lean start option",
                  "For a single-user app you don't need a full cluster on day one. A managed Postgres + a single "
                  "container host (Cloud Run / App Runner / a small VM) runs NumanOS cheaply, and the Terraform + "
                  "Helm setup means you can graduate to full Kubernetes whenever you want — no rewrite.",
                  GREEN_BG, GREEN_BAR)]

    E += [PageBreak()]

    # ===================== 12. COSTS =====================
    E += heading("12", "Indicative Monthly Running Cost")
    E += [Paragraph("Rough, single-user, production-grade estimate (USD). Actuals depend on cloud, region and usage.",
                    st_bodyL)]
    E += [table(
        ["Component", "Lean setup", "Scaled / K8s setup"],
        [["Managed PostgreSQL (+pgvector)", "$15–30", "$50–120"],
         ["Object storage + egress", "$2–10", "$10–40"],
         ["Compute (API + worker)", "$10–25 (Cloud Run / small VM)", "$70–200 (K8s nodes)"],
         ["Redis (cache + broker)", "$0–10", "$15–40"],
         ["LLM + embeddings (API usage)", "$5–30 (usage-based)", "$30–150"],
         ["Domain + TLS + email sending", "$2–10", "$5–20"],
         ["Estimated total / month", "≈ $35–115", "≈ $180–570"]],
        widths=[6.4 * cm, 5.0 * cm, CONTENT_W - 11.4 * cm])]
    E += [Spacer(1, 4),
          Paragraph("<font size=8 color='#64748B'>Self-hosting the LLM on your own GPU/K8s removes per-token cost "
                    "but adds compute. Start lean; the architecture scales without a rewrite.</font>", st_small)]

    # ===================== 13. RISKS =====================
    E += [Spacer(1, 6)] + heading("13", "Risks & Mitigations")
    E += [table(
        ["Risk", "Impact", "Mitigation"],
        [["Scope is very large (10 pillars)", "Burnout / stalls", "Strict phased slices; each phase shippable on its own"],
         ["AI cost / quality drift", "Cost + UX", "Provider behind interface; cap usage; cache embeddings"],
         ["Sensitive data (expenses, files)", "Privacy/security", "MFA, encryption, vault secrets, audit log, least privilege"],
         ["Third-party API limits/changes", "Integration breakage", "Pluggable integrations, retries, webhook verification"],
         ["Solo maintenance load", "Long-term upkeep", "IaC + CI/CD + tests so it is reproducible and safe to change"]],
        widths=[4.6 * cm, 2.8 * cm, CONTENT_W - 7.4 * cm])]

    # ===================== 14. DECISIONS / NEXT STEPS =====================
    E += [Spacer(1, 6)] + heading("14", "Open Decisions & Immediate Next Steps")
    E += [Paragraph("Decisions to confirm before Phase 0", st_h3)]
    E += [bullets([
        "<b>Cloud provider</b> — GCP (fits your Pro Cloud Architect cert), AWS, or Azure? Drives Terraform + managed services.",
        "<b>LLM provider</b> — Anthropic Claude (recommended), OpenAI, or self-hosted open model?",
        "<b>Deployment target</b> — start lean (Cloud Run / small VM) or go straight to Kubernetes?",
        "<b>Brand / name</b> — keep working title 'NumanOS' or use your own product name and domain?",
        "<b>Auth scope</b> — single-user only, or design now for future client logins / multi-user?",
    ])]
    E += [Paragraph("Immediate next steps (on approval)", st_h3)]
    E += [bullets([
        "Confirm the decisions above (I can also recommend defaults and just proceed).",
        "Scaffold the monorepo: Flask API + React app + docker-compose + Postgres, running locally end-to-end.",
        "Build Phase 1 (Auth + MFA) as the first vertical slice you can log into.",
        "Stand up the Terraform + CI skeleton in parallel so deploys work from day one.",
    ], color=INDIGO)]
    E += [Spacer(1, 8),
          callout("Ready when you are",
                  "Approve this plan (or tell me your picks for the open decisions) and I'll start with the monorepo "
                  "scaffold and Phase 1. I'll keep delivering one usable slice at a time.", TEAL_BG, CYAN)]

    return E

# ----------------------------------------------------------------- build ----
def main():
    doc = BaseDocTemplate(OUTPUT, pagesize=A4,
                          leftMargin=2 * cm, rightMargin=2 * cm,
                          topMargin=2 * cm, bottomMargin=1.8 * cm,
                          title="NumanOS Action Plan")
    body_frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    cover_frame = Frame(2.2 * cm, 3 * cm, A4[0] - 4.4 * cm, A4[1] - 6 * cm, id="cover")
    doc.addPageTemplates([
        PageTemplate(id="Cover", frames=[cover_frame], onPage=cover_bg),
        PageTemplate(id="Body", frames=[body_frame], onPage=chrome),
    ])
    doc.build(content())
    print("Wrote", OUTPUT)

if __name__ == "__main__":
    main()
