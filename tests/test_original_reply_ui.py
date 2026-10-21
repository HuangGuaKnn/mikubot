"""Verify history rendering of adjusted AI replies using the real browser module."""
from pathlib import Path
import shutil
import subprocess

import pytest


def test_adjusted_reply_original_foldout():
    node = shutil.which('node')
    if not node:
        pytest.skip('Node.js unavailable')
    result = subprocess.run([node, str(Path(__file__).with_name('frontend_original_reply.cjs'))],
                            capture_output=True, text=True, encoding='utf-8', timeout=20)
    assert result.returncode == 0, result.stdout + result.stderr
