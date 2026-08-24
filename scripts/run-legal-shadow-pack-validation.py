#!/usr/bin/env python3
"""Bundle and run the TypeScript shadow validation against the real compiler."""
import pathlib,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
raise SystemExit(subprocess.run(['node','scripts/run-legal-shadow-pack-validation.mjs'],cwd=root).returncode)
