"""Backend-Tests: Config Flow, Panel, Websocket-API (nur Admins), Schlüssel, Migration, Import aus Home Assistant."""
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from homeassistant.helpers.storage import Store
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.hmip_geraete.const import DOMAIN, PANEL_URL_PATH

SGTIN = "3014F711A000000000001234"
KEY = "00112233445566778899AABBCCDDEEFF"


async def _setup(hass):
    entry = MockConfigEntry(domain=DOMAIN, data={}, title="HmIP")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


class Caller:
    def __init__(self, client):
        self.c, self.n = client, 0

    async def __call__(self, **m):
        self.n += 1
        await self.c.send_json({"id": self.n, **m})
        return await self.c.receive_json()


async def test_config_flow(hass):
    r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert r["type"] is FlowResultType.FORM
    r = await hass.config_entries.flow.async_configure(r["flow_id"], {})
    assert r["type"] is FlowResultType.CREATE_ENTRY
    r2 = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert r2["type"] is FlowResultType.ABORT


async def test_panel_registered_admin_only_and_removed(hass):
    entry = await _setup(hass)
    panel = hass.data["frontend_panels"][PANEL_URL_PATH]
    assert panel.sidebar_title == "HmIP Geräte"
    assert panel.require_admin is True
    assert panel.config["_panel_custom"]["name"] == "hmip-geraete-panel"
    assert "/hmip_geraete_static/panel.js" in panel.config["_panel_custom"]["module_url"]
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_URL_PATH not in hass.data["frontend_panels"]
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert PANEL_URL_PATH in hass.data["frontend_panels"]


async def test_websocket_crud_and_key_handling(hass, hass_ws_client):
    await _setup(hass)
    call = Caller(await hass_ws_client(hass))
    r = await call(type="hmip_geraete/list")
    assert r["success"] and r["result"] == []

    dev = {"id": "abc123", "sgtin": "3014 f711-a000-0000-0000-1234", "key": KEY.lower(), "fmt": "eq01",
           "name": "Melder", "room": "Garage", "fw": "1.0", "photo": "ignoriert", "thumb": "ignoriert"}
    r = await call(type="hmip_geraete/save", device=dev)
    assert r["success"], r
    (d,) = (await call(type="hmip_geraete/list"))["result"]
    assert d["sgtin"] == SGTIN and d["key"] == KEY and d["fmt"] == "EQ01" and d["room"] == "Garage"
    assert "photo" not in d and "thumb" not in d and "hasPhoto" not in d

    # ungültiger Schlüssel wird nicht gespeichert, ungültiges Format leer
    bad = {**dev, "key": "ZZZ", "fmt": "x"}
    assert (await call(type="hmip_geraete/save", device=bad))["success"]
    d = (await call(type="hmip_geraete/list"))["result"][0]
    assert d["key"] == "" and d["fmt"] == ""

    # Ungültige ID
    r = await call(type="hmip_geraete/save", device={**dev, "id": "../evil"})
    assert not r["success"] and r["error"]["code"] == "invalid_format"
    assert not (await call(type="hmip_geraete/delete", device_id="../x"))["success"]
    # Die frühere Foto-Abfrage gibt es nicht mehr
    assert not (await call(type="hmip_geraete/photo", device_id="abc123"))["success"]

    assert (await call(type="hmip_geraete/delete", device_id="abc123"))["success"]
    assert (await call(type="hmip_geraete/list"))["result"] == []


async def test_non_admin_is_refused(hass, hass_ws_client, hass_read_only_access_token):
    await _setup(hass)
    call = Caller(await hass_ws_client(hass, hass_read_only_access_token))
    r = await call(type="hmip_geraete/list")
    assert not r["success"] and r["error"]["code"] == "unauthorized"
    r = await call(type="hmip_geraete/import_ha")
    assert not r["success"] and r["error"]["code"] == "unauthorized"


async def test_persistence_and_migration_from_1_1(hass, hass_ws_client):
    entry = await _setup(hass)
    call = Caller(await hass_ws_client(hass))
    assert (await call(type="hmip_geraete/save", device={"id": "p1", "name": "Persist", "sgtin": SGTIN, "key": KEY}))["success"]
    assert await hass.config_entries.async_unload(entry.entry_id)
    # Stand von Version 1.1: Foto und Vorschau im Speicher
    store = Store(hass, 1, "hmip_geraete.devices")
    await store.async_save({"devices": {"old": {"id": "old", "name": "Alt", "thumb": "data:image/jpeg;base64,AAAA", "hasPhoto": True}}})
    await Store(hass, 1, "hmip_geraete.photo_old").async_save({"photo": "data:image/jpeg;base64,BBBB"})
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    devs = {d["id"]: d for d in (await call(type="hmip_geraete/list"))["result"]}
    assert set(devs) == {"old"}
    assert "thumb" not in devs["old"] and "hasPhoto" not in devs["old"] and devs["old"]["name"] == "Alt"
    assert await Store(hass, 1, "hmip_geraete.photo_old").async_load() is None
    # neu gespeicherte Geräte bleiben über einen Neustart der Integration erhalten
    assert (await call(type="hmip_geraete/save", device={"id": "p2", "name": "Neu", "sgtin": SGTIN, "key": KEY}))["success"]
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    devs = {d["id"]: d for d in (await call(type="hmip_geraete/list"))["result"]}
    assert devs["p2"]["key"] == KEY


async def test_import_from_ha_registry(hass, hass_ws_client):
    from homeassistant.helpers import area_registry as ar
    from homeassistant.helpers import device_registry as dr

    await _setup(hass)
    cfg = MockConfigEntry(domain="hcu_integration", data={})
    cfg.add_to_hass(hass)
    area = ar.async_get(hass).async_create("Kinderzimmer 2")
    reg = dr.async_get(hass)
    s1, s2, s3 = "3014F711A000000000000A01", "3014F711A000000000000A02", SGTIN
    d1 = reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", s1)}, manufacturer="eQ-3",
                                 model="HmIP-SWDO-I", name="Fensterkontakt KZ2", sw_version="1.18.10", serial_number=s1)
    reg.async_update_device(d1.id, area_id=area.id)
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", s2)}, manufacturer="eQ-3",
                            model="HmIP-WTH-1", name="Wandthermostat HWR", sw_version="1.2.8", serial_number=s2)
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", s3)}, manufacturer="eQ-3",
                            model="HmIP-SMO230-A", name="Bewegungsmelder", sw_version="1.0.0", serial_number=s3)
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", "virtuell")}, manufacturer="eQ-3", model="X", name="virtuell")
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("other", "1")}, manufacturer="Philips", model="Hue", name="Lampe")

    call = Caller(await hass_ws_client(hass))
    # vorher gescannter Aufkleber (nur SGTIN + Schlüssel) wird zugeordnet, nicht dupliziert
    manual = {"id": "manuell1", "sgtin": s3, "key": KEY, "fmt": "EQ01", "name": ""}
    assert (await call(type="hmip_geraete/save", device=manual))["success"]

    r = await call(type="hmip_geraete/import_ha")
    assert r["success"], r
    assert r["result"] == {"added": 2, "updated": 1, "removed": 0, "changes": 0, "total": 3, "skipped": 1}
    devs = {d["sgtin"]: d for d in (await call(type="hmip_geraete/list"))["result"]}
    assert len(devs) == 3
    assert devs[s3]["id"] == "manuell1" and devs[s3]["name"] == "Bewegungsmelder" and devs[s3]["key"] == KEY and devs[s3]["type"] == "HmIP-SMO230-A"
    d = devs[s1]
    assert d["id"] == "ha" + s1 and d["name"] == "Fensterkontakt KZ2" and d["room"] == "Kinderzimmer 2" and d["fw"] == "1.18.10"
    assert d["key"] == "" and d["raw"] == ""

    # Eigene Eingaben bleiben erhalten; Firmware wird nachgeführt; erneuter Import legt nichts doppelt an
    assert (await call(type="hmip_geraete/save", device={**d, "name": "Mein Name", "loc": "links oben", "key": KEY}))["success"]
    reg.async_update_device(d1.id, sw_version="1.19.0")
    r = await call(type="hmip_geraete/import_ha")
    assert r["result"]["added"] == 0 and r["result"]["updated"] == 1
    devs = {x["sgtin"]: x for x in (await call(type="hmip_geraete/list"))["result"]}
    assert len(devs) == 3
    assert devs[s1]["name"] == "Mein Name" and devs[s1]["loc"] == "links oben" and devs[s1]["key"] == KEY and devs[s1]["fw"] == "1.19.0"
    # Abweichung zur Quelle wird gemeldet, bis sie bestätigt ist
    assert r["result"]["changes"] == 1 and devs[s1]["src_name"] == "Fensterkontakt KZ2"
    assert (await call(type="hmip_geraete/save", device={**devs[s1], "ack_name": "Fensterkontakt KZ2"}))["success"]
    r = await call(type="hmip_geraete/import_ha")
    assert r["result"]["changes"] == 0
    # In der Quelle umbenannt: wieder als Änderung gemeldet
    reg.async_update_device(d1.id, name_by_user="Fenster Kinderzimmer")
    r = await call(type="hmip_geraete/import_ha")
    assert r["result"]["changes"] == 1
    # Gerät verschwindet aus der Quelle: markiert, nicht gelöscht
    reg.async_remove_device(next(x.id for x in reg.devices.values() if x.serial_number == s2))
    r = await call(type="hmip_geraete/import_ha")
    assert r["result"]["removed"] == 1
    devs = {x["sgtin"]: x for x in (await call(type="hmip_geraete/list"))["result"]}
    assert len(devs) == 3 and devs[s2]["missing"] == "1" and devs[s1]["missing"] == ""
    r = await call(type="hmip_geraete/import_ha")
    assert r["result"]["removed"] == 0  # nur neu fehlende zählen


async def test_layouts(hass, hass_ws_client):
    entry = await _setup(hass)
    call = Caller(await hass_ws_client(hass))
    assert (await call(type="hmip_geraete/layouts"))["result"] == []
    r = await call(type="hmip_geraete/layout_save", layout={"id": "b1", "name": "Sicherungskasten", "slots": ["d1", "", None, "../x", "d2"]})
    assert r["success"], r
    lay = (await call(type="hmip_geraete/layouts"))["result"]
    assert len(lay) == 1 and lay[0]["slots"] == ["d1", "", "", "", "d2"] and lay[0]["name"] == "Sicherungskasten"
    assert not (await call(type="hmip_geraete/layout_save", layout={"id": "../b", "slots": []}))["success"]
    assert not (await call(type="hmip_geraete/layout_save", layout={"id": "b2", "slots": [""] * 601}))["success"]
    # bleibt über einen Neustart erhalten
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert len((await call(type="hmip_geraete/layouts"))["result"]) == 1
    assert (await call(type="hmip_geraete/layout_delete", layout_id="b1"))["success"]
    assert (await call(type="hmip_geraete/layouts"))["result"] == []
