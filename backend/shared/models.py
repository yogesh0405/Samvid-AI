"""
Samvid AI - Re-export shared models for backward compatibility.
Primary definitions live in backend/layers/shared/python/models.py
"""
from sys import path as _path
_path.insert(0, "/opt/python")

try:
    from models import *  # noqa: F401,F403
except ImportError:
    # Local development fallback - import directly
    import os, sys
    _here = os.path.dirname(__file__)
    _layer = os.path.join(_here, "..", "layers", "shared", "python")
    sys.path.insert(0, _layer)
    from models import *  # noqa: F401,F403
