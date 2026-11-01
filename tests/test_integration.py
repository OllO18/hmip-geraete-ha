"""Backend-Tests: Config Flow, Panel-Registrierung, Websocket-API, Persistenz."""
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.hmip_geraete.const import DOMAIN, PANEL_URL_PATH

PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg=="


async def _setup(hass):
    entry = MockConfigEntry(domain=DOMAIN, data={}, title="HmIP")
    entry.add_to_hass(hass)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    return entry


async def test_config_flow(hass):
    r = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert r["type"] is FlowResultType.FORM
    r = await hass.config_entries.flow.async_configure(r["flow_id"], {})
    assert r["type"] is FlowResultType.CREATE_ENTRY
    r2 = await hass.config_entries.flow.async_init(DOMAIN, context={"source": config_entries.SOURCE_USER})
    assert r2["type"] is FlowResultType.ABORT


async def test_panel_registered_and_removed(hass):
    entry = await _setup(hass)
    panel = hass.data["frontend_panels"][PANEL_URL_PATH]
    assert panel.sidebar_title == "HmIP Geräte"
    assert panel.require_admin is False
    assert panel.config["_panel_custom"]["name"] == "hmip-geraete-panel"
    assert "/hmip_geraete_static/panel.js" in panel.config["_panel_custom"]["module_url"]
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert PANEL_URL_PATH not in hass.data["frontend_panels"]
    # erneutes Laden darf nicht an doppelter Registrierung scheitern
    assert await hass.config_entries.async_setup(entry.entry_id)
    assert PANEL_URL_PATH in hass.data["frontend_panels"]


async def test_websocket_crud(hass, hass_ws_client):
    await _setup(hass)
    c = await hass_ws_client(hass)

    async def call(**m):
        await c.send_json({"id": call.n, **m})
        call.n += 1
        return await c.receive_json()

    call.n = 1
    r = await call(type="hmip_geraete/list")
    assert r["success"] and r["result"] == []

    dev = {"id": "abc123", "raw": "RAW", "sgtin": "3014F711A0000000AB12CD34", "name": "Fenster", "room": "Küche", "thumb": "data:image/jpeg;base64,AAAA"}
    r = await call(type="hmip_geraete/save", device=dev, photo=PHOTO)
    assert r["success"], r
    r = await call(type="hmip_geraete/list")
    (d,) = r["result"]
    assert d["id"] == "abc123" and d["hasPhoto"] is True and d["room"] == "Küche" and d["thumb"].startswith("data:")
    r = await call(type="hmip_geraete/photo", device_id="abc123")
    assert r["result"]["photo"] == PHOTO

    # Speichern ohne photo-Feld lässt das Foto unverändert
    dev["name"] = "Fenster neu"
    assert (await call(type="hmip_geraete/save", device=dev))["success"]
    r = await call(type="hmip_geraete/list")
    assert r["result"][0]["name"] == "Fenster neu" and r["result"][0]["hasPhoto"] is True
    assert (await call(type="hmip_geraete/photo", device_id="abc123"))["result"]["photo"] == PHOTO

    # Foto entfernen (leerer String) entfernt auch die Vorschau
    assert (await call(type="hmip_geraete/save", device=dev, photo=""))["success"]
    d = (await call(type="hmip_geraete/list"))["result"][0]
    assert d["hasPhoto"] is False and d["thumb"] == ""

    # Ungültige Eingaben
    r = await call(type="hmip_geraete/save", device={**dev, "id": "../evil"})
    assert not r["success"] and r["error"]["code"] == "invalid_format"
    r = await call(type="hmip_geraete/save", device=dev, photo="javascript:alert(1)")
    assert not r["success"]
    r = await call(type="hmip_geraete/photo", device_id="../x")
    assert not r["success"]

    assert (await call(type="hmip_geraete/delete", device_id="abc123"))["success"]
    assert (await call(type="hmip_geraete/list"))["result"] == []


async def test_persistence_across_reload(hass, hass_ws_client):
    entry = await _setup(hass)
    c = await hass_ws_client(hass)
    await c.send_json({"id": 1, "type": "hmip_geraete/save", "device": {"id": "p1", "name": "Persist"}, "photo": PHOTO})
    assert (await c.receive_json())["success"]
    assert await hass.config_entries.async_unload(entry.entry_id)
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    await c.send_json({"id": 2, "type": "hmip_geraete/list"})
    r = await c.receive_json()
    assert r["result"][0]["name"] == "Persist" and r["result"][0]["hasPhoto"] is True


async def test_import_from_ha_registry(hass, hass_ws_client):
    from homeassistant.helpers import area_registry as ar
    from homeassistant.helpers import device_registry as dr

    await _setup(hass)
    cfg = MockConfigEntry(domain="hcu_integration", data={})
    cfg.add_to_hass(hass)
    area = ar.async_get(hass).async_create("Kinderzimmer 2")
    reg = dr.async_get(hass)
    s1, s2, s3 = "3014F711A000109F29A8082D", "3014F711A0003922699B372C", "3014F711A000AAAABBBBCCCC"
    d1 = reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", s1)}, manufacturer="eQ-3",
                                 model="HmIP-SWDO-I", name="Fensterkontakt KZ2", sw_version="1.18.10", serial_number=s1)
    reg.async_update_device(d1.id, area_id=area.id)
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", s2)}, manufacturer="eQ-3",
                            model="HmIP-WTH-1", name="Wandthermostat HWR", sw_version="1.2.8", serial_number=s2)
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", s3)}, manufacturer="eQ-3",
                            model="HmIP-BSL", name="Signalleuchte", sw_version="1.0.0", serial_number=s3)
    # kein 24-stelliger Wert -> übersprungen; anderer Hersteller -> ignoriert
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("hcu_integration", "virtuell")}, manufacturer="eQ-3", model="X", name="virtuell")
    reg.async_get_or_create(config_entry_id=cfg.entry_id, identifiers={("other", "1")}, manufacturer="Philips", model="Hue", name="Lampe")

    c = await hass_ws_client(hass)

    async def call(n, **m):
        await c.send_json({"id": n, **m})
        return await c.receive_json()

    # Ein vorher von Hand angelegtes Gerät mit gleicher SGTIN wird zugeordnet, nicht dupliziert
    manual = {"id": "manuell1", "sgtin": s3, "name": "", "raw": "X"}
    assert (await call(1, type="hmip_geraete/save", device=manual))["success"]

    r = await call(2, type="hmip_geraete/import_ha")
    assert r["success"], r
    assert r["result"] == {"added": 2, "updated": 1, "total": 3, "skipped": 1}
    devs = {d["sgtin"]: d for d in (await call(3, type="hmip_geraete/list"))["result"]}
    assert len(devs) == 3
    assert devs[s3]["id"] == "manuell1" and devs[s3]["name"] == "Signalleuchte" and devs[s3]["raw"] == "X"
    d = devs[s1]
    assert d["id"] == "ha" + s1 and d["name"] == "Fensterkontakt KZ2" and d["type"] == "HmIP-SWDO-I"
    assert d["room"] == "Kinderzimmer 2" and d["fw"] == "1.18.10" and d["hasPhoto"] is False and d["raw"] == ""

    # Eigene Eingaben bleiben erhalten; Firmware wird nachgeführt; erneuter Import legt nichts doppelt an
    mine = {**d, "name": "Mein Name", "loc": "links oben", "raw": "SCANNED"}
    assert (await call(4, type="hmip_geraete/save", device=mine, photo=PHOTO))["success"]
    reg.async_update_device(d1.id, sw_version="1.19.0")
    r = await call(5, type="hmip_geraete/import_ha")
    assert r["result"]["added"] == 0 and r["result"]["updated"] == 1
    devs = {x["sgtin"]: x for x in (await call(6, type="hmip_geraete/list"))["result"]}
    assert len(devs) == 3
    assert devs[s1]["name"] == "Mein Name" and devs[s1]["loc"] == "links oben" and devs[s1]["raw"] == "SCANNED"
    assert devs[s1]["fw"] == "1.19.0" and devs[s1]["hasPhoto"] is True
