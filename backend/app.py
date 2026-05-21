"""
NumanOS — Flask API for the personal automation platform (CRM).

Modules: auth + MFA, expenses, notes, projects, meetings, storage,
email generation (Claude), AI assistant (RAG over notes), integrations, stats.

Run:  python app.py        (defaults to http://localhost:5000)
"""
import os
import mimetypes

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    pass

from flask import Flask, request, jsonify, g, send_file
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import pyotp

from core import (
    store, pub, new_id, now_iso, make_token, decode_token,
    require_auth, current_user, MFA_TTL,
)

UPLOAD_ROOT = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_ROOT, exist_ok=True)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})


# --------------------------------------------------------------------------- #
#  Health                                                                      #
# --------------------------------------------------------------------------- #
@app.get("/api/health")
def health():
    backend = type(store()).__name__
    return jsonify(status="ok", store=backend, service="NumanOS API")


# --------------------------------------------------------------------------- #
#  Auth + MFA                                                                  #
# --------------------------------------------------------------------------- #
def _users():
    return store().col("users")


@app.post("/api/auth/login")
def login():
    body = request.get_json(force=True, silent=True) or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    if not email or not password:
        return jsonify(error="Email and password are required."), 400

    user = _users().find_one({"email": email})

    # Single-user platform: the first ever login creates the owner account.
    if user is None:
        if _users().count_documents({}) == 0:
            user = {
                "_id": new_id(),
                "email": email,
                "name": _name_from_email(email),
                "role": "Senior Multi-Cloud DevOps Engineer",
                "password_hash": generate_password_hash(password, method="pbkdf2:sha256"),
                "mfa_enabled": False,
                "created_at": now_iso(),
            }
            _users().insert_one(user)
            _seed_integrations(user["_id"])
        else:
            return jsonify(error="Invalid credentials."), 401
    elif not check_password_hash(user["password_hash"], password):
        return jsonify(error="Invalid credentials."), 401

    if user.get("mfa_enabled"):
        mfa_token = make_token(user["_id"], scope="mfa", ttl=MFA_TTL)
        return jsonify(mfa_required=True, mfa_token=mfa_token)

    return jsonify(token=make_token(user["_id"]), user=pub(user))


@app.post("/api/auth/mfa/verify")
def mfa_verify():
    body = request.get_json(force=True, silent=True) or {}
    try:
        payload = decode_token(body.get("mfa_token", ""))
        assert payload.get("scope") == "mfa"
    except Exception:
        return jsonify(error="MFA session expired. Please sign in again."), 401
    user = _users().find_one({"_id": payload["sub"]})
    if not user:
        return jsonify(error="User not found."), 404
    code = (body.get("code") or "").strip()
    if not pyotp.TOTP(user.get("mfa_secret", "")).verify(code, valid_window=1):
        return jsonify(error="Invalid authentication code."), 401
    return jsonify(token=make_token(user["_id"]), user=pub(user))


@app.get("/api/auth/me")
@require_auth
def me():
    return jsonify(user=pub(current_user()))


@app.post("/api/auth/mfa/setup")
@require_auth
def mfa_setup():
    user = current_user()
    secret = pyotp.random_base32()
    _users().update_one({"_id": user["_id"]}, {"$set": {"mfa_pending_secret": secret}})
    uri = pyotp.TOTP(secret).provisioning_uri(name=user["email"], issuer_name="NumanOS")
    return jsonify(secret=secret, otpauth_url=uri)


@app.post("/api/auth/mfa/enable")
@require_auth
def mfa_enable():
    body = request.get_json(force=True, silent=True) or {}
    user = current_user()
    secret = user.get("mfa_pending_secret")
    if not secret:
        return jsonify(error="Start MFA setup first."), 400
    if not pyotp.TOTP(secret).verify((body.get("code") or "").strip(), valid_window=1):
        return jsonify(error="Invalid code."), 400
    _users().update_one(
        {"_id": user["_id"]},
        {"$set": {"mfa_secret": secret, "mfa_enabled": True, "mfa_pending_secret": None}},
    )
    return jsonify(ok=True, mfa_enabled=True)


@app.post("/api/auth/mfa/disable")
@require_auth
def mfa_disable():
    _users().update_one(
        {"_id": g.user_id}, {"$set": {"mfa_enabled": False, "mfa_secret": None}}
    )
    return jsonify(ok=True, mfa_enabled=False)


def _name_from_email(email):
    local = email.split("@")[0]
    return " ".join(p.capitalize() for p in local.replace(".", " ").replace("_", " ").split()) or "Numan Iftikhar"


# --------------------------------------------------------------------------- #
#  Generic CRUD factory (expenses, notes, projects, meetings, integrations)   #
# --------------------------------------------------------------------------- #
def add_crud(name, immutable=("_id", "id", "user_id", "created_at")):
    base = f"/api/{name}"

    def _list():
        docs = store().col(name).find({"user_id": g.user_id}, sort=("created_at", -1))
        return jsonify([pub(d) for d in docs])

    def _create():
        body = request.get_json(force=True, silent=True) or {}
        doc = {
            "_id": new_id(),
            "user_id": g.user_id,
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        doc.update({k: v for k, v in body.items() if k not in immutable})
        store().col(name).insert_one(doc)
        return jsonify(pub(doc)), 201

    def _update(item_id):
        body = request.get_json(force=True, silent=True) or {}
        upd = {k: v for k, v in body.items() if k not in immutable}
        upd["updated_at"] = now_iso()
        store().col(name).update_one({"_id": item_id, "user_id": g.user_id}, {"$set": upd})
        doc = store().col(name).find_one({"_id": item_id, "user_id": g.user_id})
        return (jsonify(pub(doc)), 200) if doc else (jsonify(error="not found"), 404)

    def _delete(item_id):
        store().col(name).delete_one({"_id": item_id, "user_id": g.user_id})
        return jsonify(ok=True)

    app.add_url_rule(base, f"{name}_list", require_auth(_list), methods=["GET"])
    app.add_url_rule(base, f"{name}_create", require_auth(_create), methods=["POST"])
    app.add_url_rule(f"{base}/<item_id>", f"{name}_update", require_auth(_update), methods=["PUT", "PATCH"])
    app.add_url_rule(f"{base}/<item_id>", f"{name}_delete", require_auth(_delete), methods=["DELETE"])


for _resource in ("expenses", "notes", "projects", "meetings"):
    add_crud(_resource)


# --------------------------------------------------------------------------- #
#  Expenses summary + dashboard stats                                          #
# --------------------------------------------------------------------------- #
@app.get("/api/expenses/summary")
@require_auth
def expenses_summary():
    docs = store().col("expenses").find({"user_id": g.user_id})
    total = 0.0
    by_category = {}
    for d in docs:
        amt = float(d.get("amount") or 0)
        total += amt
        cat = d.get("category") or "Other"
        by_category[cat] = round(by_category.get(cat, 0) + amt, 2)
    return jsonify(total=round(total, 2), count=len(docs), by_category=by_category)


@app.get("/api/stats")
@require_auth
def stats():
    s = store()
    uid = g.user_id
    expenses = s.col("expenses").find({"user_id": uid})
    total = round(sum(float(e.get("amount") or 0) for e in expenses), 2)
    return jsonify(
        expenses_total=total,
        expenses_count=len(expenses),
        notes=s.col("notes").count_documents({"user_id": uid}),
        projects=s.col("projects").count_documents({"user_id": uid}),
        meetings=s.col("meetings").count_documents({"user_id": uid}),
        files=s.col("files").count_documents({"user_id": uid}),
    )


# --------------------------------------------------------------------------- #
#  Personal cloud storage (local disk; S3-ready)                              #
# --------------------------------------------------------------------------- #
@app.get("/api/storage")
@require_auth
def storage_list():
    docs = store().col("files").find({"user_id": g.user_id}, sort=("created_at", -1))
    return jsonify([pub(d) for d in docs])


@app.post("/api/storage")
@require_auth
def storage_upload():
    if "file" not in request.files:
        return jsonify(error="No file provided."), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify(error="Empty filename."), 400
    fid = new_id()
    safe = secure_filename(f.filename)
    user_dir = os.path.join(UPLOAD_ROOT, g.user_id)
    os.makedirs(user_dir, exist_ok=True)
    path = os.path.join(user_dir, f"{fid}__{safe}")
    f.save(path)
    doc = {
        "_id": fid,
        "user_id": g.user_id,
        "name": f.filename,
        "size": os.path.getsize(path),
        "mime": f.mimetype or mimetypes.guess_type(f.filename)[0] or "application/octet-stream",
        "path": path,
        "created_at": now_iso(),
    }
    store().col("files").insert_one(doc)
    return jsonify(pub(doc)), 201


@app.get("/api/storage/<file_id>/download")
@require_auth
def storage_download(file_id):
    doc = store().col("files").find_one({"_id": file_id, "user_id": g.user_id})
    if not doc or not os.path.exists(doc["path"]):
        return jsonify(error="not found"), 404
    return send_file(doc["path"], as_attachment=True, download_name=doc["name"])


@app.delete("/api/storage/<file_id>")
@require_auth
def storage_delete(file_id):
    doc = store().col("files").find_one({"_id": file_id, "user_id": g.user_id})
    if doc:
        try:
            os.remove(doc["path"])
        except OSError:
            pass
        store().col("files").delete_one({"_id": file_id, "user_id": g.user_id})
    return jsonify(ok=True)


# --------------------------------------------------------------------------- #
#  Integrations                                                                #
# --------------------------------------------------------------------------- #
DEFAULT_INTEGRATIONS = [
    {"key": "gmail", "name": "Gmail", "desc": "Send generated emails", "icon": "fa-envelope"},
    {"key": "gcal", "name": "Google Calendar", "desc": "Sync client meetings", "icon": "fa-calendar"},
    {"key": "gdrive", "name": "Google Drive", "desc": "Back up your files", "icon": "fa-hard-drive"},
    {"key": "slack", "name": "Slack", "desc": "Notifications", "icon": "fa-slack"},
    {"key": "github", "name": "GitHub", "desc": "Sync projects", "icon": "fa-github"},
    {"key": "stripe", "name": "Stripe", "desc": "Invoicing", "icon": "fa-stripe-s"},
]


def _seed_integrations(user_id):
    col = store().col("integrations")
    for item in DEFAULT_INTEGRATIONS:
        col.insert_one({
            "_id": new_id(), "user_id": user_id, "key": item["key"], "name": item["name"],
            "desc": item["desc"], "icon": item["icon"], "connected": False, "created_at": now_iso(),
        })


@app.get("/api/integrations")
@require_auth
def integrations_list():
    col = store().col("integrations")
    docs = col.find({"user_id": g.user_id})
    if not docs:
        _seed_integrations(g.user_id)
        docs = col.find({"user_id": g.user_id})
    return jsonify([pub(d) for d in docs])


@app.post("/api/integrations/<item_id>/toggle")
@require_auth
def integrations_toggle(item_id):
    col = store().col("integrations")
    doc = col.find_one({"_id": item_id, "user_id": g.user_id})
    if not doc:
        return jsonify(error="not found"), 404
    col.update_one({"_id": item_id}, {"$set": {"connected": not doc.get("connected", False)}})
    return jsonify(pub(col.find_one({"_id": item_id})))


# --------------------------------------------------------------------------- #
#  AI: email generation + RAG assistant (Anthropic Claude, graceful fallback) #
# --------------------------------------------------------------------------- #
def _claude(system, user_msg, max_tokens=900):
    """Call Claude if configured; otherwise return None so callers can fall back."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=key)
        model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-6")
        resp = client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_msg}],
        )
        return "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
    except Exception as exc:  # pragma: no cover
        print(f"[ai] Claude call failed: {exc}")
        return None


@app.post("/api/email/generate")
@require_auth
def email_generate():
    body = request.get_json(force=True, silent=True) or {}
    intent = body.get("intent", "follow-up")
    recipient = body.get("recipient", "the client")
    context = body.get("context", "")
    tone = body.get("tone", "professional")
    user = current_user()

    system = (
        "You are an expert assistant that drafts concise, effective business emails for "
        f"{user.get('name', 'a DevOps consultant')}, a Senior Multi-Cloud DevOps Engineer. "
        "Return only the email (subject line + body), ready to send."
    )
    prompt = (
        f"Write a {tone} {intent} email to {recipient}.\n"
        f"Context / notes: {context or 'No extra context provided.'}"
    )
    out = _claude(system, prompt)
    if out is None:
        out = (
            f"Subject: {intent.title()} — Numan Iftikhar\n\n"
            f"Hi {recipient},\n\n"
            f"I hope you're doing well. {context or 'Following up on our recent conversation.'}\n\n"
            "I'd be glad to help you build secure, scalable cloud infrastructure — from multi-cloud "
            "architecture to GitOps pipelines. Let me know a good time to connect.\n\n"
            "Best regards,\nNuman Iftikhar\nSenior Multi-Cloud DevOps Engineer\n\n"
            "— (Demo draft. Set ANTHROPIC_API_KEY to generate with Claude.)"
        )
    # store the draft
    draft = {
        "_id": new_id(), "user_id": g.user_id, "intent": intent, "recipient": recipient,
        "tone": tone, "content": out, "created_at": now_iso(),
    }
    store().col("email_drafts").insert_one(draft)
    return jsonify(pub(draft))


@app.post("/api/ai/chat")
@require_auth
def ai_chat():
    body = request.get_json(force=True, silent=True) or {}
    question = (body.get("message") or "").strip()
    if not question:
        return jsonify(error="Empty message."), 400

    # Simple RAG: retrieve the user's notes as context.
    notes = store().col("notes").find({"user_id": g.user_id})
    context_blocks = []
    for n in notes[:20]:
        context_blocks.append(f"# {n.get('title','Untitled')}\n{n.get('content','')}")
    context = "\n\n".join(context_blocks)

    system = (
        "You are NumanOS Assistant. Answer using the user's own notes and data when relevant. "
        "Be concise and cite the note title when you use one."
    )
    prompt = f"Notes:\n{context or '(no notes yet)'}\n\nQuestion: {question}"
    out = _claude(system, prompt)

    if out is None:
        # Keyword fallback over notes
        import re
        q_words = {w for w in re.findall(r"[a-z0-9]+", question.lower()) if len(w) > 3}
        hits = []
        for n in notes:
            blob = (n.get("title", "") + " " + n.get("content", "")).lower()
            if any(w in blob for w in q_words):
                hits.append(n.get("title", "Untitled"))
        if hits:
            out = ("Based on your notes, these look relevant: "
                   + ", ".join(hits[:5])
                   + ".\n\n(Set ANTHROPIC_API_KEY to get full Claude-powered answers.)")
        else:
            out = ("I couldn't find matching notes. Add notes and set ANTHROPIC_API_KEY to enable "
                   "full RAG answers with Claude.")
    return jsonify(answer=out)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"[NumanOS] API on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
