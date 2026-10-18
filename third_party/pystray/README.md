# pystray 0.19.5 source

This directory preserves the unmodified Python package source used by mikubot,
copyright (C) 2016-2022 Moses Palmér, under LGPL-3.0-or-later as stated in the
original file headers. `COPYING` is the GNU GPL text and `COPYING.LGPL` is the
additional GNU LGPL text. Both are retained verbatim.

`pystray/` is the complete installed Python package. `UPSTREAM-METADATA.txt`
preserves the distribution's metadata. `SOURCE_MANIFEST.json` identifies version
0.19.5 and records SHA-256 hashes for the original package files and metadata.
The original package files were checked against the installed wheel's `RECORD`
before inclusion. Bytecode, local paths and installation-generated files are
excluded.

Upstream: https://github.com/moses-palmer/pystray

Release: https://pypi.org/project/pystray/0.19.5/

Read the root `THIRD_PARTY_NOTICES.md` for the corresponding application source,
library replacement instructions and mikubot rebuild commands. The distributed
copy is not imported by the application; the build uses the `pystray` package in
the build virtual environment, so you can replace that package and rebuild.
