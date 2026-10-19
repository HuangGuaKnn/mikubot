"""Explicit user-controlled Windows startup registration for this app only."""
import os
import subprocess
import sys
from pathlib import Path


def autostart_status():
    if os.name != 'nt':
        return {'supported': False, 'autostart': False}
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run') as key:
            value, _ = winreg.QueryValueEx(key, 'Qunyu')
        return {'supported': True, 'autostart': bool(value)}
    except FileNotFoundError:
        return {'supported': True, 'autostart': False}


def set_autostart(enabled, data_dir):
    if os.name != 'nt':
        raise ValueError('此功能只支持 Windows')
    import winreg
    args = [sys.executable]
    if not getattr(sys, 'frozen', False):
        args.append(str(Path(__file__).resolve().parent.parent / 'launcher.py'))
    args += ['--data-dir', str(Path(data_dir).resolve()), '--minimized']
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Run') as key:
        if enabled:
            winreg.SetValueEx(key, 'Qunyu', 0, winreg.REG_SZ, subprocess.list2cmdline(args))
        else:
            try: winreg.DeleteValue(key, 'Qunyu')
            except FileNotFoundError: pass
    return autostart_status()
