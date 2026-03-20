import os
import subprocess
import tempfile
from collections import OrderedDict


def _run(cmd: list[str]) -> str:
    proc = subprocess.run(
        cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
    )
    return proc.stdout


def _parse_env(text: str) -> OrderedDict[str, str]:
    out: OrderedDict[str, str] = OrderedDict()
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            continue
        out[key] = value
    return out


def main() -> None:
    if len(os.sys.argv) < 3:
        raise SystemExit(
            "usage: python3 scripts/secrets-upsert-dotenv.py <encrypted.env> <KEY> [KEY ...] (values read from env)"
        )

    secret_file = os.sys.argv[1]
    keys = os.sys.argv[2:]

    plaintext = _run(
        ["sops", "-d", "--input-type", "dotenv", "--output-type", "dotenv", secret_file]
    )
    envmap = _parse_env(plaintext)

    for key in keys:
        value = os.environ.get(key)
        if value is None:
            raise SystemExit(f"missing env var: {key}")
        envmap[key] = value

    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8") as tmp:
        for k, v in envmap.items():
            tmp.write(f"{k}={v}\n")
        tmp_path = tmp.name

    encrypted = _run(
        [
            "sops",
            "--input-type",
            "dotenv",
            "--output-type",
            "dotenv",
            "--filename-override",
            secret_file,
            "-e",
            tmp_path,
        ]
    )
    with open(secret_file, "w", encoding="utf-8") as f:
        f.write(encrypted)


if __name__ == "__main__":
    main()
