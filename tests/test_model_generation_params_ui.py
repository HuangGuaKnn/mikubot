"""Run the dependency-free generation-parameter UI regression under Node when available."""
from pathlib import Path
import shutil
import subprocess

import pytest


def test_generation_parameter_sliders_and_catalog_editor_match_the_contract():
    node = shutil.which("node")
    if node is None:
        pytest.skip("Node.js is only needed for the optional frontend logic check")
    result = subprocess.run(
        [node, str(Path(__file__).with_name("frontend_model_generation_params.cjs"))],
        capture_output=True, text=True, encoding="utf-8", timeout=30,
    )
    assert result.returncode == 0, result.stdout + result.stderr
