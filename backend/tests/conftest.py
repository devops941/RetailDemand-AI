import os
os.environ["APP_ENV"] = "testing"

import pytest
from app.core.config import settings

settings.APP_ENV = "testing"

