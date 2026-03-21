"""
Samvid AI - Re-export shared errors for backward compatibility.
Primary definitions live in backend/layers/shared/python/errors.py
"""
from sys import path as _path
_path.insert(0, "/opt/python")

try:
    from errors import *  # noqa: F401,F403
except ImportError:
    import os, sys
    _here = os.path.dirname(__file__)
    _layer = os.path.join(_here, "..", "layers", "shared", "python")
    sys.path.insert(0, _layer)
    from errors import *  # noqa: F401,F403
