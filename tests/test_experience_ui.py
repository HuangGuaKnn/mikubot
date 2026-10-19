"""Exercise the dependency-free UI's trust boundaries and API interactions."""
from pathlib import Path
import shutil
import subprocess
import pytest


def test_experience_ui_safety_and_api_interactions():
    node = shutil.which('node')
    if not node:
        pytest.skip('Optional frontend regression requires Node.js')
    result = subprocess.run([node,str(Path(__file__).with_name('frontend_experience.cjs'))],capture_output=True,text=True,encoding='utf-8',timeout=20)
    assert result.returncode == 0, result.stdout + result.stderr


def test_password_ui_bootstrap_login_and_recovery_boundaries():
    node = shutil.which('node')
    if not node:
        pytest.skip('Optional frontend regression requires Node.js')
    result = subprocess.run([node,str(Path(__file__).with_name('frontend_auth.cjs'))],capture_output=True,text=True,encoding='utf-8',timeout=20)
    assert result.returncode == 0, result.stdout + result.stderr


def test_model_catalog_and_runtime_log_interactions():
    node = shutil.which('node')
    if not node:
        pytest.skip('Optional frontend regression requires Node.js')
    result = subprocess.run([node,str(Path(__file__).with_name('frontend_workspace_pages.cjs'))],capture_output=True,text=True,encoding='utf-8',timeout=20)
    assert result.returncode == 0, result.stdout + result.stderr


def test_github_update_selection_and_install_boundaries():
    node = shutil.which('node')
    if not node: pytest.skip('Optional frontend regression requires Node.js')
    result = subprocess.run([node,str(Path(__file__).with_name('frontend_updates.cjs'))],capture_output=True,text=True,encoding='utf-8',timeout=20)
    assert result.returncode == 0, result.stdout + result.stderr
