"""
NumanOS backend — core helpers.

Storage abstraction (MongoDB Atlas with an in-memory fallback so the app runs
out of the box), JWT auth, MFA (TOTP) helpers and small utilities.
"""
import os
import time
import uuid
import functools
from datetime import datetime, timezone

import jwt as pyjwt
from flask import request, jsonify, g

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-me")
JWT_ALG = "HS256"
ACCESS_TTL = 60 * 60 * 12      # 12h
MFA_TTL = 60 * 5               # 5m for the mid-login MFA step


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def new_id():
    return uuid.uuid4().hex


# --------------------------------------------------------------------------- #
#  Storage: a tiny pymongo-compatible interface with two backends             #
# --------------------------------------------------------------------------- #
class MemoryCollection:
    """Minimal in-memory stand-in for a pymongo collection."""

    def __init__(self):
        self.docs = []

    @staticmethod
    def _match(doc, query):
        return all(doc.get(k) == v for k, v in query.items())

    def insert_one(self, doc):
        self.docs.append(doc)
        return type("R", (), {"inserted_id": doc.get("_id")})()

    def find(self, query=None, sort=None):
        query = query or {}
        res = [d for d in self.docs if self._match(d, query)]
        if sort:
            key, direction = sort
            res = sorted(res, key=lambda d: d.get(key) or "", reverse=(direction == -1))
        return res

    def find_one(self, query):
        for d in self.docs:
            if self._match(d, query):
                return d
        return None

    def update_one(self, query, update):
        d = self.find_one(query)
        if d:
            d.update(update.get("$set", {}))
        return d

    def delete_one(self, query):
        d = self.find_one(query)
        if d:
            self.docs.remove(d)
        return d

    def count_documents(self, query=None):
        return len(self.find(query or {}))


class MemoryStore:
    def __init__(self):
        self._cols = {}

    def col(self, name):
        return self._cols.setdefault(name, MemoryCollection())


class MongoCollection:
    """Wrap a real pymongo collection in the same small interface."""

    def __init__(self, c):
        self.c = c

    def insert_one(self, doc):
        return self.c.insert_one(doc)

    def find(self, query=None, sort=None):
        cur = self.c.find(query or {})
        if sort:
            cur = cur.sort(sort[0], sort[1])
        return list(cur)

    def find_one(self, query):
        return self.c.find_one(query)

    def update_one(self, query, update):
        return self.c.update_one(query, update)

    def delete_one(self, query):
        return self.c.delete_one(query)

    def count_documents(self, query=None):
        return self.c.count_documents(query or {})


class MongoStore:
    def __init__(self, uri, dbname):
        from pymongo import MongoClient

        self.client = MongoClient(uri, serverSelectionTimeoutMS=4000)
        self.client.admin.command("ping")
        self.db = self.client[dbname]

    def col(self, name):
        return MongoCollection(self.db[name])


_store = None


def store():
    """Return the active store, connecting lazily. Falls back to memory."""
    global _store
    if _store is not None:
        return _store
    uri = os.environ.get("MONGODB_URI")
    if uri:
        try:
            _store = MongoStore(uri, os.environ.get("MONGODB_DB", "numanos"))
            print("[db] Connected to MongoDB Atlas")
            return _store
        except Exception as exc:  # pragma: no cover
            print(f"[db] MongoDB connection failed ({exc}); using in-memory store")
    else:
        print("[db] No MONGODB_URI set; using in-memory store (data resets on restart)")
    _store = MemoryStore()
    return _store


# --------------------------------------------------------------------------- #
#  Serialization                                                              #
# --------------------------------------------------------------------------- #
HIDDEN_FIELDS = {"password_hash", "mfa_secret", "mfa_pending_secret"}


def pub(doc):
    """Public-safe view of a document: expose `id`, drop secrets."""
    if not doc:
        return None
    out = {k: v for k, v in doc.items() if k not in HIDDEN_FIELDS and k != "_id"}
    out["id"] = doc.get("_id")
    return out


# --------------------------------------------------------------------------- #
#  JWT + auth decorator                                                        #
# --------------------------------------------------------------------------- #
def make_token(user_id, scope="access", ttl=ACCESS_TTL):
    payload = {"sub": user_id, "scope": scope, "exp": int(time.time()) + ttl}
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token):
    return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def require_auth(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        if not header.startswith("Bearer "):
            return jsonify(error="unauthorized"), 401
        try:
            payload = decode_token(header[7:])
            if payload.get("scope") != "access":
                raise ValueError("wrong scope")
        except Exception:
            return jsonify(error="invalid or expired token"), 401
        g.user_id = payload["sub"]
        return fn(*args, **kwargs)

    return wrapper


def current_user():
    return store().col("users").find_one({"_id": g.user_id})
