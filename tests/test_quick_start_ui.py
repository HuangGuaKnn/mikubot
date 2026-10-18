"""Run the dependency-free browser logic regression under Node when available."""
from pathlib import Path
import shutil
import subprocess

import pytest


def test_quick_start_preserves_configuration_and_skips_without_writes():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is only needed for the optional frontend logic check")
    result = subprocess.run(
        [node, str(Path(__file__).with_name("frontend_quick_start.cjs"))],
        capture_output=True, text=True, encoding="utf-8", timeout=20,
    )
    assert result.returncode == 0, result.stdout + result.stderr
