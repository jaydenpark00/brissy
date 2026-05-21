from fastapi import Header
import httpx
from backend.supabase_client import supabase


def get_current_user(authorization: str = Header(None)):
    """Returns user email from Bearer token (Supabase JWT or Google access token)."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization[7:]

    # Supabase JWT (from frontend)
    try:
        result = supabase.auth.get_user(token)
        if result.user and result.user.email:
            return result.user.email
    except Exception:
        pass

    # Google access token (from GPTs OAuth)
    try:
        resp = httpx.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"},
            timeout=5.0,
        )
        if resp.status_code == 200:
            email = resp.json().get("email")
            if email:
                return email
    except Exception:
        pass

    return None
