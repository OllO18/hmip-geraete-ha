"""HmIP Geräteverwaltung: Seitenleisten-Panel zum Erfassen von Homematic-IP-Geräten."""
from __future__ import annotations

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
    ID_PATTERN,
    MAX_PHOTO_CHARS,
    MAX_THUMB_CHARS,
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


class DeviceStore:
    """Geräteliste in .storage; jedes Foto in einer eigenen Datei."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self.devices: dict[str, dict[str, Any]] = {}

    async def async_load(self) -> None:
        data = await self._store.async_load()
        self.devices = dict((data or {}).get("devices", {}))

    async def _persist(self) -> None:
        await self._store.async_save({"devices": self.devices})

    def _photo_store(self, device_id: str) -> Store:
        return Store(self.hass, STORAGE_VERSION, f"{DOMAIN}.photo_{device_id}")

    async def async_list(self) -> list[dict[str, Any]]:
        return list(self.devices.values())

    async def async_get_photo(self, device_id: str) -> str:
        data = await self._photo_store(device_id).async_load()
        return (data or {}).get("photo", "")

    async def async_save(self, device: dict[str, Any], photo: str | None) -> None:
        device_id = device["id"]
        record = {"id": device_id}
        for key in TEXT_FIELDS:
            record[key] = str(device.get(key, ""))[:2000]
        thumb = str(device.get("thumb", ""))
        record["thumb"] = thumb if len(thumb) <= MAX_THUMB_CHARS else ""
        existing = self.devices.get(device_id, {})
        has_photo = bool(existing.get("hasPhoto", False))
        if photo is not None:
            if photo == "":
                await self._photo_store(device_id).async_remove()
                has_photo = False
            else:
                await self._photo_store(device_id).async_save({"photo": photo})
                has_photo = True
        record["hasPhoto"] = has_photo
        if not has_photo:
            record["thumb"] = ""
        self.devices[device_id] = record
        await self._persist()

    async def async_import_ha(self, ha_devices: list[dict[str, str]]) -> dict[str, int]:
        """Geräte aus Home Assistant übernehmen. Eigene Eingaben bleiben erhalten."""
        by_sgtin = {_norm(d.get("sgtin")): d for d in self.devices.values() if d.get("sgtin")}
        now = datetime.now(timezone.utc).isoformat()
        added = updated = 0
        for item in ha_devices:
            existing = by_sgtin.get(item["sgtin"])
            if existing is None:
                device_id = "ha" + item["sgtin"]
                self.devices[device_id] = {
                    "id": device_id,
                    "raw": "",
                    "loc": "",
                    "note": "",
                    "created": now,
                    "updated": now,
                    "thumb": "",
                    "hasPhoto": False,
                    **{k: item[k] for k in ("sgtin", "name", "type", "fw", "room")},
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
            if changed:
                existing["updated"] = now
                updated += 1
        await self._persist()
        return {"added": added, "updated": updated}

    async def async_delete(self, device_id: str) -> None:
        if device_id in self.devices:
            await self._photo_store(device_id).async_remove()
            del self.devices[device_id]
            await self._persist()


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
        connection.send_error(msg["id"], "not_ready", "HmIP Geräteverwaltung ist nicht eingerichtet")
    return store


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/list"})
@websocket_api.async_response
async def ws_list(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], await store.async_list())


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/photo",
        vol.Required("device_id"): vol.Match(ID_PATTERN),
    }
)
@websocket_api.async_response
async def ws_photo(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    connection.send_result(msg["id"], {"photo": await store.async_get_photo(msg["device_id"])})


@websocket_api.websocket_command(
    {
        vol.Required("type"): f"{DOMAIN}/save",
        vol.Required("device"): dict,
        vol.Optional("photo"): str,
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
    photo = msg.get("photo")
    if photo:
        if not photo.startswith("data:image/") or len(photo) > MAX_PHOTO_CHARS:
            connection.send_error(msg["id"], "invalid_format", "Ungültiges Foto")
            return
    await store.async_save(device, photo)
    connection.send_result(msg["id"], {"ok": True})


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


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/import_ha"})
@websocket_api.async_response
async def ws_import_ha(hass, connection, msg):
    if (store := _get_store(hass, connection, msg)) is None:
        return
    ha_devices, skipped = collect_ha_devices(hass)
    result = await store.async_import_ha(ha_devices)
    result.update(total=len(ha_devices), skipped=skipped)
    connection.send_result(msg["id"], result)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Websocket-Befehle einmalig registrieren."""
    for handler in (ws_list, ws_photo, ws_save, ws_delete, ws_import_ha):
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
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name=PANEL_ELEMENT,
        frontend_url_path=PANEL_URL_PATH,
        module_url=f"{STATIC_URL}/panel.js?v={integration.version}",
        sidebar_title="HmIP Geräte",
        sidebar_icon="mdi:barcode-scan",
        require_admin=False,
        embed_iframe=False,
        config={},
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    frontend.async_remove_panel(hass, PANEL_URL_PATH)
    hass.data.pop(DOMAIN, None)
    return True
