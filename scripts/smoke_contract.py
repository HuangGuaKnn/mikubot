"""Keep release labels separate from the historical smoke-test feature gates."""
from __future__ import annotations

import re


def effective_contract_version(version: str) -> tuple[int, int]:
    """Run the full current contract for the renamed first public release.

    Internal builds used 0.2 through 0.10 to introduce the smoke checks. The
    first public release was renamed from 0.10.0 to 0.1.0 without removing any
    capabilities. Public 0.1.x fixes keep that contract. Other internal labels
    retain their original feature gates.
    """
    match = re.fullmatch(r'(\d+)\.(\d+)(?:\.(\d+))?', version)
    if not match:
        raise ValueError('Expected a numeric major.minor.patch release version')
    if (int(match[1]), int(match[2])) == (0, 1):
        return (0, 10)
    return int(match[1]), int(match[2])
