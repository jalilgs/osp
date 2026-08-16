from .base import *

DEBUG = True

# Allow all origins in development (Electron on localhost/file://)
CORS_ALLOW_ALL_ORIGINS = True

# Or you can set a list:
# CORS_ALLOWED_ORIGINS = [
#     'http://localhost:3000',
#     'http://127.0.0.1:3000',
# ]

# Enable browsable API for testing
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] += [
    'rest_framework.renderers.BrowsableAPIRenderer',
]

# You can add other dev‑only settings here
