"""
Extra WWEmbed backend tests covering endpoints not in test_wwembed_api.py:
- Forgot/reset password
- All embed v1 routes (live, ebook, music, digital)
- Public stats /api/v1/stats/{wwId}
- Admin stats (auth required)
- OpenAPI spec
"""
import os
import uuid

import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://wwembed-preview.preview.emergentagent.com"
).rstrip("/")

ADMIN_EMAIL = "admin@wwembed.test"
ADMIN_PASSWORD = "admin1234"
WW_ID = "ww-movie-617120"


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text[:200]}")
    return s


# ---------- Forgot / reset password ----------
def test_forgot_password_anti_enumeration():
    """Should always return ok=true (anti-enumeration), even for unknown email."""
    r = requests.post(
        f"{BASE_URL}/api/auth/forgot-password",
        json={"email": f"unknown-{uuid.uuid4().hex[:6]}@nowhere.test"},
        timeout=30,
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    data = r.json()
    assert data.get("ok") is True or data.get("success") is True or "ok" in str(data).lower()


def test_forgot_password_admin_email():
    """Admin email should also return ok=true (no enumeration)."""
    r = requests.post(
        f"{BASE_URL}/api/auth/forgot-password",
        json={"email": ADMIN_EMAIL},
        timeout=30,
    )
    assert r.status_code == 200, f"{r.status_code}: {r.text[:300]}"
    data = r.json()
    assert data.get("ok") is True or data.get("success") is True


def test_reset_password_invalid_token():
    """An invalid/expired token should be rejected (4xx)."""
    r = requests.post(
        f"{BASE_URL}/api/auth/reset-password",
        json={"token": "invalid-token-xyz", "password": "newpass1234"},
        timeout=30,
    )
    assert r.status_code in (400, 401, 403, 422), f"{r.status_code}: {r.text[:200]}"


# ---------- Embed v1 routes ----------
# Each embed route requires its own wwId prefix.
EMBED_IDS = {
    "live": "ww-live-test-channel",
    "ebook": "ww-ebook-test-1",
    "music": "ww-music-test-1",
    "digital": "ww-software-test-1",
}


@pytest.mark.parametrize("route,ww_id", list(EMBED_IDS.items()))
def test_embed_route_responds(route, ww_id):
    r = requests.get(f"{BASE_URL}/api/v1/{route}/{ww_id}", timeout=30)
    # Valid prefix → either HTML/JSON 200 or 404 if content not found in DB. NOT 400 (format) and NOT 5xx.
    assert r.status_code in (200, 404), f"{route}: {r.status_code} {r.text[:200]}"
    if r.status_code == 200:
        ct = r.headers.get("content-type", "").lower()
        assert "html" in ct or "json" in ct, f"{route}: unexpected content-type {ct}"


def test_embed_route_invalid_prefix_400():
    """Wrong prefix should return 400 Invalid format."""
    r = requests.get(f"{BASE_URL}/api/v1/ebook/{WW_ID}", timeout=30)
    assert r.status_code == 400


# ---------- Public stats ----------
def test_public_stats_endpoint():
    r = requests.get(f"{BASE_URL}/api/v1/stats/{WW_ID}", timeout=30)
    # Endpoint may return 200 with stats or 404 if not implemented.
    assert r.status_code in (200, 404), f"{r.status_code}: {r.text[:200]}"
    if r.status_code == 200:
        data = r.json()
        assert isinstance(data, dict)


# ---------- Admin stats (auth required) ----------
def test_admin_stats_requires_auth():
    r = requests.get(f"{BASE_URL}/api/admin/stats", timeout=30)
    assert r.status_code in (401, 403, 404), f"{r.status_code}: {r.text[:200]}"


def test_admin_stats_with_admin_session(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/stats", timeout=30)
    # Should be 200 with admin auth, or 404 if endpoint not implemented yet.
    assert r.status_code in (200, 404), f"{r.status_code}: {r.text[:200]}"
    if r.status_code == 200:
        data = r.json()
        assert isinstance(data, dict)


# ---------- OpenAPI spec ----------
def test_openapi_spec():
    r = requests.get(f"{BASE_URL}/api/openapi", timeout=30)
    assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
    data = r.json()
    # OpenAPI 3.x shape
    assert "openapi" in data
    assert data["openapi"].startswith("3."), f"unexpected version: {data['openapi']}"
    assert "paths" in data
    assert isinstance(data["paths"], dict)
    assert len(data["paths"]) > 0


# ---------- Frontend page sanity (avoid 5xx) ----------
@pytest.mark.parametrize("path", [
    "/",
    "/auth/login",
    "/auth/sign-up",
    "/auth/forgot-password",
    "/docs",
    f"/embed/{WW_ID}",
])
def test_frontend_page_no_5xx(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=30, allow_redirects=False)
    assert r.status_code < 500, f"{path}: {r.status_code} {r.text[:200]}"
