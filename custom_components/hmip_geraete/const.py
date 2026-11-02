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
TEXT_FIELDS = (
    "raw", "sgtin", "key", "fmt", "name", "type", "room", "loc", "note", "fw", "created", "updated",
    # Stand der Quelle (HA) beim letzten Abgleich, bestätigte Abweichungen und "nicht mehr vorhanden"
    "src_name", "src_room", "src_type", "ack_name", "ack_room", "missing",
)
SERIAL_RE = re.compile(r"^[0-9A-F]{24}$")
KEY_RE = re.compile(r"^[0-9A-F]{32}$")
FMT_RE = re.compile(r"^[A-Z0-9]{2,8}$")
