"""Konstanten der HmIP Geräteverwaltung."""
import re

DOMAIN = "hmip_geraete"
PANEL_URL_PATH = "hmip-geraete"
PANEL_ELEMENT = "hmip-geraete-panel"
STATIC_URL = "/hmip_geraete_static"
STORAGE_VERSION = 1
STORAGE_KEY = f"{DOMAIN}.devices"
ID_PATTERN = r"^[A-Za-z0-9_-]{1,40}$"
ID_RE = re.compile(ID_PATTERN)
TEXT_FIELDS = ("raw", "sgtin", "name", "type", "room", "loc", "note", "fw", "created", "updated")
SERIAL_RE = re.compile(r"^[0-9A-F]{24}$")
MAX_PHOTO_CHARS = 3_000_000
MAX_THUMB_CHARS = 60_000
