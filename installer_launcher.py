"""PyInstaller onefile entry point; the payload stays offline and self-contained."""
from qunyu.installer import main

if __name__ == '__main__':
    raise SystemExit(main())
