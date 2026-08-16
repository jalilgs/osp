from .base import *

DEBUG = False

# Restrict allowed hosts – read from .env already, but you can harden:
# ALLOWED_HOSTS = ['yourdomain.com', 'www.yourdomain.com']

# Strict CORS for production (if you serve the backend separately)
# Replace with your actual frontend domain if deployed
CORS_ALLOWED_ORIGINS = [
    'https://yourfrontend.com',   # Change this!
]

# Disable browsable API
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
]

# Logging, security, etc. can be added later
