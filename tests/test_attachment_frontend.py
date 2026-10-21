"""Run actual attachment selection and management handlers in the UI VM."""
from pathlib import Path
import shutil
import subprocess

import pytest


def test_attachment_ui_lifecycle():
    node = shutil.which('node')
    if not node:
        pytest.skip('Node.js unavailable')
    result = subprocess.run([node, str(Path(__file__).with_name('frontend_attachment_lifecycle.cjs'))],
                            capture_output=True, text=True, encoding='utf-8', timeout=30)
    assert result.returncode == 0, result.stdout + result.stderr
