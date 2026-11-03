"""HmIP Gerätedokumentation: Seitenleisten-Panel zum Erfassen von Homematic-IP-Geräten."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import voluptuous as vol

from homeassistant.components import frontend, panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry as ar
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.storage import Store
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .const import (
    DOMAIN,
    FMT_RE,
    ID_PATTERN,
    ID_RE,
    MAX_SLOTS,
    KEY_RE,
    PANEL_ELEMENT,
    PANEL_URL_PATH,
    SERIAL_RE,
    STATIC_URL,
    STORAGE_KEY,
    STORAGE_VERSION,
    TEXT_FIELDS,
)

_LOGGER = logging.getLogger(__name__)
_STATIC_FLAG = f"{DOMAIN}_static_registered"


def _asset_hash(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()[:10]


class DeviceStore:
    """Geräteliste in .storage/hmip_geraete.devices (enthält die Geräteschlüssel, nur für Admins erreichbar)."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}
        # Eigene Bögen: {id: {"id", "name", "slots": [Geräte-ID oder ""], "updated"}}
        self.layouts: dict[str, dict[str, Any]] = {}

    async def async_load(self) -> None:
        data = await self._store.async_load()
        self.devices = dict((data or {}).get("devices", {}))
        self.layouts = dict((data or {}).get("layouts", {}))
        # Migration von Version 1.1.x: Fotos und Vorschaubilder gibt es nicht mehr.
        migrated = False
        for device_id, record in self.devices.items():
            if record.pop("thumb", None) is not None:
                migrated = True
            if record.pop("hasPhoto", None):
                await Store(self.hass, STORAGE_VERSION, f"{DOMAIN}.photo_{device_id}").async_remove()
                migrated = True
        if migrated:
            await self._persist()

    async def _persist(self) -> None:
        await self._store.async_save({"devices": self.devices, "layouts": self.layouts})

    async def async_list(self) -> list[dict[str, Any]]:
        return list(self.devices.values())

    async def async_save(self, device: dict[str, Any]) -> None:
        record: dict[str, Any] = {"id": device["id"]}
        for key in TEXT_FIELDS:
            record[key] = str(device.get(key, ""))[:2000]
        record["sgtin"] = _norm(record["sgtin"])
        record["key"] = _norm(record["key"]) if KEY_RE.match(_norm(record["key"])) else ""
        record["fmt"] = record["fmt"].strip().upper() if FMT_RE.match(record["fmt"].strip().upper()) else ""
        self.devices[device["id"]] = record
        await self._persist()

    async def async_save_layout(self, layout: dict[str, Any]) -> None:
        slots = layout.get("slots") or []
        if not isinstance(slots, list) or len(slots) > MAX_SLOTS:
            raise vol.Invalid("Zu viele Felder")
        clean = [str(x) if x and ID_RE.match(str(x)) else "" for x in slots]
        self.layouts[layout["id"]] = {
            "id": layout["id"],
            "name": str(layout.get("name", ""))[:100] or "Eigener Bogen",
            "slots": clean,
            "updated": datetime.now(timezone.utc).isoformat(),
        }
        await self._persist()

    async def async_delete_layout(self, layout_id: str) -> None:
        if self.layouts.pop(layout_id, None) is not None:
            await self._persist()

    async def async_delete(self, device_id: str) -> None:
        if device_id in self.devices:
            del self.devices[device_id]
            await self._persist()

    async def async_import_ha(self, ha_devices: list[dict[str, str]]) -> dict[str, int]:
        """Geräte aus Home Assistant übernehmen. Eigene Eingaben bleiben erhalten.

        Neue Geräte werden angelegt, die Firmware wird aktualisiert, leere Felder werden ergänzt.
        Den aktuellen Stand der Quelle (Name, Raum, Typ) merkt sich der Eintrag in src_*; weicht er von den
        eigenen Werten ab, zeigt das Panel eine Änderung an. Geräte, die es in der Quelle nicht mehr gibt,
        werden mit missing="1" markiert (nicht gelöscht).
        """
        by_sgtin = {_norm(d.get("sgtin")): d for d in self.devices.values() if d.get("sgtin")}
        now = datetime.now(timezone.utc).isoformat()
        added = updated = removed = 0
        present: set[str] = set()
        for item in ha_devices:
            present.add(item["sgtin"])
            src = {"src_name": item["name"], "src_room": item["room"], "src_type": item["type"], "missing": ""}
            existing = by_sgtin.get(item["sgtin"])
            if existing is None:
                device_id = "ha" + item["sgtin"]
                self.devices[device_id] = {
                    "id": device_id,
                    "raw": "",
                    "key": "",
                    "fmt": "",
                    "loc": "",
                    "note": "",
                    "created": now,
                    "updated": now,
                    "ack_name": "",
                    "ack_room": "",
                    **{k: item[k] for k in ("sgtin", "name", "type", "fw", "room")},
                    **src,
                }
                added += 1
                continue
            changed = False
            for key in ("name", "type", "room"):
                if not existing.get(key) and item[key]:
                    existing[key] = item[key]
                    changed = True
            if item["fw"] and existing.get("fw") != item["fw"]:
                existing["fw"] = item["fw"]
                changed = True
            existing.update(src)
            if changed:
                existing["updated"] = now
                updated += 1
        for dev in self.devices.values():
            known = dev.get("src_name") or dev.get("src_type") or str(dev.get("id", "")).startswith("ha")
            if dev.get("sgtin") and _norm(dev["sgtin"]) not in present and known and dev.get("missing") != "1":
                dev["missing"] = "1"
                removed += 1
        await self._persist()
        changes = sum(1 for d in self.devices.values() if _pending(d))
        return {"added": added, "updated": updated, "removed": removed, "changes": changes}


def _pending(dev: dict[str, Any]) -> bool:
    """Name oder Raum weicht in der Quelle ab und wurde noch nicht bestätigt."""
    for key in ("name", "room"):
        src = dev.get(f"src_{key}") or ""
        if src and src != (dev.get(key) or "") and src != (dev.get(f"ack_{key}") or ""):
            return True
    return False

def _norm(value: Any) -> str:
    return "".join(str(value or "").split()).replace("-", "").upper()


def collect_ha_devices(hass: HomeAssistant) -> tuple[list[dict[str, str]], int]:
    """eQ-3-Geräte mit 24-stelliger Seriennummer (SGTIN-Format) aus der Geräteregistrierung."""
    dev_reg = dr.async_get(hass)
    area_reg = ar.async_get(hass)
    found: dict[str, dict[str, str]] = {}
    skipped = 0
    for dev in dev_reg.devices.values():
        if (dev.manufacturer or "").strip().lower() != "eq-3" or dev.disabled_by is not None:
            continue
        serial = _norm(dev.serial_number)
        if not serial:
            for _domain, ident in dev.identifiers:
                if SERIAL_RE.match(_norm(ident)):
                    serial = _norm(ident)
                    break
        if not SERIAL_RE.match(serial):
            skipped += 1
            continue
        area = area_reg.async_get_area(dev.area_id) if dev.area_id else None
        found[serial] = {
            "sgtin": serial,
            "name": dev.name_by_user or dev.name or "",
            "type": dev.model or "",
            "fw": dev.sw_version or "",
            "room": area.name if area else "",
        }
    return list(found.values()), skipped


def _get_store(hass: HomeAssistant, connection, msg) -> DeviceStore | None:
    store = hass.data.get(DOMAIN)
    if store is None:
        connection.send_error(msg["id"], "not_ready", "HmIP Gerätedokumentation ist nicht eingerichtet")
    return store


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list"})
@websocket_api.async_response
async def ws_list(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await store.async_list())


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save",
        vol.Required("device"): dict,
    }
)
@websocket_api.async_response
async def ws_save(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    device = msg["device"]
    device_id = str(device.get("id", ""))
    try:
        vol.Match(ID_PATTERN)(device_id)
    except vol.Invalid:
        connection.send_error(msg["id"], "invalid_format", "Ungültige Geräte-ID")
        return
    device["id"] = device_id
    await store.async_save(device)
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.require_admin
@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/delete",
        vol.Required("device_id"): vol.Match(ID_PATTERN),
    }
)
@websocket_api.async_response
async def ws_delete(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    await store.async_delete(msg["device_id"])
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/import_ha"})
@websocket_api.async_response
async def ws_import_ha(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    ha_devices, skipped = collect_ha_devices(hass)
    result = await store.async_import_ha(ha_devices)
    result.update(total=len(ha_devices), skipped=skipped)
    connection.send_result(msg["id"], result)


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/layouts"})
@websocket_api.async_response
async def ws_layouts(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], list(store.layouts.values()))


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/layout_save", vol.Required("layout"): dict})
@websocket_api.async_response
async def ws_layout_save(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    layout = msg["layout"]
    if not ID_RE.match(str(layout.get("id", ""))):
        connection.send_error(msg["id"], "invalid_format", "Ungültige Bogen-ID")
        return
    try:
        await store.async_save_layout(layout)
    except vol.Invalid as err:
        connection.send_error(msg["id"], "invalid_format", str(err))
        return
    connection.send_result(msg["id"], {"ok": True})


@websocket_api.require_admin
@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/layout_delete", vol.Required("layout_id"): vol.Match(ID_PATTERN)})
@websocket_api.async_response
async def ws_layout_delete(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    await store.async_delete_layout(msg["layout_id"])
    connection.send_result(msg["id"], {"ok": True})


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Websocket-Befehle einmalig registrieren."""
    for handler in (ws_list, ws_save, ws_delete, ws_import_ha, ws_layouts, ws_layout_save, ws_layout_delete):
        websocket_api.async_register_command(hass, handler)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = DeviceStore(hass)
    await store.async_load()
    hass.data[DOMAIN] = store

    if not hass.data.get(_STATIC_FLAG):
        await hass.http.async_register_static_paths(
            [StaticPathConfig(STATIC_URL, str(Path(__file__).parent / "www"), False)]
        )
        hass.data[_STATIC_FLAG] = True

    integration = await async_get_integration(hass, DOMAIN)
    # Hash der Panel-Datei in der Adresse, damit Browser und Companion-App nach Updates die neue Datei laden
    asset = await hass.async_add_executor_job(_asset_hash, Path(__file__).parent / "www" / "panel.js")
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_ELEMENT,
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{STATIC_URL}/panel.js?v={integration.version}-{asset}",
        sidebar_title="HmIP Geräte",
        sidebar_icon="mdi:barcode-scan",
        require_admin=True,
        embed_iframe=False,
        config={},
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    hass.data.pop(DOMAIN, None)
    return True
