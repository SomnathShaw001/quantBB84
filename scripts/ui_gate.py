"""Anti-AI-look UI gate: scans frontend files for banned visual patterns.

Usage: python scripts/ui_gate.py frontend
Exit code 1 if violations found.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

PATTERNS: list[tuple[str, str]] = [
    (r"backdrop-filter", "glassmorphism (backdrop-filter)"),
    (r"filter:\s*blur\(", "blur filter"),
    (r"text-shadow", "text glow"),
    (r"box-shadow:[^;]*0\s+0\s+\d+px", "glow box-shadow"),
    (r"background-clip:\s*text", "gradient text"),
    (r"-webkit-background-clip:\s*text", "gradient text"),
    (r"#6366f1|#8b5cf6|#3b82f6|#a855f7|#7c3aed|#06b6d4|#22d3ee|#ec4899", "AI palette hex"),
    (r"\b(indigo|violet|purple|magenta|cyan)\b", "banned colour keyword"),
    (r"\bneon\b|\bglow\b", "neon/glow naming"),
    (r"font-family:[^;]*\b(Inter|Geist|Poppins)\b", "default AI font"),
    (r"✨|🚀|🔒|⚡|🔐|💡", "emoji icon"),
]
RADIUS = re.compile(r"border-radius:\s*(\d+(?:\.\d+)?)(px|rem|em)")


def scan(root: Path) -> list[str]:
    issues: list[str] = []
    for f in root.rglob("*"):
        if f.suffix not in {".css", ".html", ".js", ".svg"} or not f.is_file():
            continue
        for n, line in enumerate(f.read_text(encoding="utf-8").splitlines(), 1):
            if "ui-gate: allow" in line:
                continue
            for pat, label in PATTERNS:
                if re.search(pat, line, re.IGNORECASE):
                    issues.append(f"{f}:{n}: {label}: {line.strip()[:90]}")
            for m in RADIUS.finditer(line):
                val, unit = float(m.group(1)), m.group(2)
                px = val if unit == "px" else val * 16
                if px > 4:
                    issues.append(f"{f}:{n}: radius {m.group(0)} > 4px")
    return issues


if __name__ == "__main__":
    target = Path(sys.argv[1] if len(sys.argv) > 1 else "frontend")
    found = scan(target)
    for i in found:
        print(i)
    print(f"\nui_gate: {len(found)} issue(s) in {target}")
    sys.exit(1 if found else 0)
