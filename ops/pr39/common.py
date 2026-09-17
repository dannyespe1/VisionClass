import ipaddress
import json
import math
import socket
from pathlib import Path
from urllib.parse import urlparse


def assert_local_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("Se requiere una URL http(s) absoluta")
    if parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("PR39 sólo permite nombres loopback explícitos")
    addresses = {item[4][0] for item in socket.getaddrinfo(parsed.hostname, parsed.port)}
    if not addresses or any(not ipaddress.ip_address(value).is_loopback for value in addresses):
        raise ValueError("PR39 sólo permite destinos loopback; no se ejecuta contra entornos reales")
    return url.rstrip("/")


def percentile(values, percentage):
    if not values:
        return None
    ordered = sorted(values)
    index = max(0, min(len(ordered) - 1, math.ceil(len(ordered) * percentage) - 1))
    return round(ordered[index], 3)


def write_json(path, payload):
    destination = Path(path)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
