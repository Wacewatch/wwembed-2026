"""
WWEmbed end-to-end backend API tests.
Covers: health, auth (register/login/me/logout), embed routes, /api/db RBAC,
TMDB-backed /api/search and /api/media/movie/{id}.
All requests go through the public preview URL → FastAPI proxy → Next.js.
"""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://zt-embed-download.preview.emergentagent.com").rstrip("/")

ADMIN_EMAIL = "admin@wwembed.test"
ADMIN_PASSWORD = "admin1234"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def http():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_session():
    """Logged-in admin session (httpOnly cookies in jar)."""
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return s


# ---------- Health ----------
def test_health(http):
    r = http.get(f"{BASE_URL}/api/health", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"


# ---------- Frontend root (sanity) ----------
def test_homepage_html_200():
    r = requests.get(f"{BASE_URL}/", timeout=30)
    assert r.status_code == 200
    body = r.text.lower()
    # Should be HTML (Next.js)
    assert "<html" in body or "<!doctype" in body


# ---------- Auth ----------
def test_register_creates_user():
    s = requests.Session()
    unique = uuid.uuid4().hex[:8]
    payload = {
        "email": f"qa-user-{unique}@wwembed.test",
        "password": "qaqaqa1234",
        "username": f"qauser{unique}",
    }
    r = s.post(f"{BASE_URL}/api/auth/register", json=payload, timeout=30)
    assert r.status_code in (200, 201), f"register failed {r.status_code}: {r.text[:300]}"
    data = r.json()
    # Some implementations wrap user, some return flat
    user = data.get("user") or data
    assert payload["email"] in str(user).lower() or user.get("email") == payload["email"]
    # Cookie jar should hold ww_access (httpOnly)
    cookies = {c.name for c in s.cookies}
    assert "ww_access" in cookies, f"ww_access cookie not set, got: {cookies}"


def test_login_admin_sets_cookie():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text[:300]}"
    data = r.json()
    user = data.get("user") or data
    assert user.get("email") == ADMIN_EMAIL
    cookies = {c.name for c in s.cookies}
    assert "ww_access" in cookies


def test_login_invalid_credentials_returns_401(http):
    r = http.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": "wrongpass"},
        timeout=30,
    )
    assert r.status_code == 401


def test_me_returns_admin(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/auth/me", timeout=30)
    assert r.status_code == 200
    data = r.json()
    user = data.get("user") or data
    assert user.get("email") == ADMIN_EMAIL
    assert user.get("role") == "admin"


def test_logout_clears_cookies():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert r.status_code == 200
    r2 = s.post(f"{BASE_URL}/api/auth/logout", timeout=30)
    assert r2.status_code in (200, 204)
    # /me should now be unauthenticated
    r3 = s.get(f"{BASE_URL}/api/auth/me", timeout=30)
    assert r3.status_code in (401, 200)
    if r3.status_code == 200:
        body = r3.json()
        # Some impls return {user: null}
        assert (body.get("user") in (None, {})) or body.get("error")


# ---------- Embed routes ----------
WW_ID = "ww-movie-617120"


def test_streaming_html():
    r = requests.get(f"{BASE_URL}/api/v1/streaming/{WW_ID}", timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    ct = r.headers.get("content-type", "")
    assert "html" in ct.lower(), f"unexpected content-type: {ct}"


def test_download_html():
    r = requests.get(f"{BASE_URL}/api/v1/download/{WW_ID}", timeout=30)
    assert r.status_code == 200
    assert "html" in r.headers.get("content-type", "").lower()


def test_links_json():
    r = requests.get(f"{BASE_URL}/api/v1/links/{WW_ID}", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "streaming" in data
    assert "download" in data
    assert isinstance(data["streaming"], list)
    assert isinstance(data["download"], list)


# ---------- TMDB-backed ----------
def test_search_tmdb():
    r = requests.get(f"{BASE_URL}/api/search", params={"q": "batman"}, timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    data = r.json()
    # Accept either {results:[...]} or list
    results = data.get("results") if isinstance(data, dict) else data
    assert results is not None
    assert isinstance(results, list)
    assert len(results) > 0


def test_media_movie_detail():
    r = requests.get(f"{BASE_URL}/api/media/movie/617120", timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    data = r.json()
    assert "tmdbData" in data or "id" in data or "title" in data


# ---------- /api/db RBAC ----------
def test_db_anonymous_select_live_tv_channels():
    r = requests.post(
        f"{BASE_URL}/api/db",
        json={"table": "live_tv_channels", "op": "select"},
        timeout=30,
    )
    # spec says returns {data, error}
    assert r.status_code in (200, 401, 403), f"{r.status_code}: {r.text[:200]}"
    if r.status_code == 200:
        data = r.json()
        assert "data" in data or "error" in data


def test_db_disallowed_users_table_returns_403():
    r = requests.post(
        f"{BASE_URL}/api/db",
        json={"table": "users", "op": "select"},
        timeout=30,
    )
    assert r.status_code in (401, 403), f"expected 401/403, got {r.status_code}: {r.text[:200]}"
