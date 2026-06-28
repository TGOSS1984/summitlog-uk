from .base import *  # noqa: F401, F403

DEBUG = False

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# The frontend (Vercel) and backend (Render) live on different domains, which
# makes the session/CSRF cookies cross-site from the browser's point of view.
# Without SameSite=None, browsers won't send these cookies on cross-origin
# fetch requests, so login would appear to work but every following
# authenticated request would silently fail. Secure=True above is required
# for SameSite=None to be honoured.
SESSION_COOKIE_SAMESITE = "None"
CSRF_COOKIE_SAMESITE = "None"