import os
from app.core.config import settings


def resolve_file_path(path: str) -> str:
    """Resolve a file path that might be relative to project root, backend folder, or uploads directory."""
    if not path:
        return path
    if os.path.isabs(path) and os.path.exists(path):
        return path
    basename = os.path.basename(path)
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    candidates = [
        path,
        os.path.join(base_dir, path),
        os.path.join(base_dir, "uploads", basename),
        os.path.join(base_dir, "backend", "uploads", basename),
        os.path.join(base_dir, "uploads", "models", basename),
        os.path.join(base_dir, "backend", "uploads", "models", basename),
        os.path.join("backend", path),
        os.path.join(settings.UPLOAD_DIR, basename),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return path

