"""Scan manual weather drop folders without moving or mutating source files."""
from __future__ import annotations
import hashlib,json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"data/sources/drone-license/weather/manual-drop"
OUT=ROOT/"work/weather-reconciliation/manual-recovery-scan.json"

def inspect(folder):
    files=[p for p in folder.iterdir() if p.is_file() and p.name not in {"metadata.json","README.md"}]
    results=[]
    for path in files:
        raw=path.read_bytes(); prefix=raw[:1024].lower()
        blockers=[]
        if len(raw)<1024:blockers.append("FILE_TOO_SMALL")
        if any(x in prefix for x in (b"firewall",b"access denied",b"blocked")):blockers.append("FIREWALL_BODY")
        if not raw.startswith(b"%PDF"):blockers.append("PDF_SIGNATURE_MISSING")
        results.append({"file":str(path.relative_to(ROOT)).replace("\\","/"),"size":len(raw),
            "checksum":"sha256-"+hashlib.sha256(raw).hexdigest(),"status":"VALID" if not blockers else "BLOCKED","blockers":blockers})
    return results

def main():
    result={folder.name:inspect(folder) for folder in BASE.iterdir() if folder.is_dir()}
    OUT.parent.mkdir(parents=True,exist_ok=True);OUT.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    print(json.dumps(result,ensure_ascii=False))
if __name__=="__main__":main()
