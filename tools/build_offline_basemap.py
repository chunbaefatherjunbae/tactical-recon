#!/usr/bin/env python3
"""
Build a compact South Korea offline basemap for TACTICAL RECON.

Source: Natural Earth 1:10m public-domain vector data.
Output: data/offline-basemap.geojson

The runtime keeps Leaflet as the only map engine. This file only supplies a
low-detail local context layer when network tiles are disabled.
"""
from __future__ import annotations

import json
import math
import tempfile
import urllib.request
import zipfile
from pathlib import Path

import shapefile
from shapely.geometry import box, mapping, shape

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "offline-basemap.geojson"

# South Korea plus a small navigation-context margin.
BBOX = (124.0, 32.8, 132.0, 39.8)  # west, south, east, north
CLIP = box(*BBOX)

SOURCES = [
    {
        "name": "ne_10m_land",
        "group": "10m_physical",
        "layer": "land",
        "simplify": 0.010,
        "rank_max": None,
    },
    {
        "name": "ne_10m_coastline",
        "group": "10m_physical",
        "layer": "coastline",
        "simplify": 0.006,
        "rank_max": None,
    },
    {
        "name": "ne_10m_lakes",
        "group": "10m_physical",
        "layer": "lake",
        "simplify": 0.008,
        "rank_max": None,
    },
    {
        "name": "ne_10m_rivers_lake_centerlines",
        "group": "10m_physical",
        "layer": "river",
        "simplify": 0.008,
        "rank_max": 9,
    },
    {
        "name": "ne_10m_admin_1_states_provinces_lines",
        "group": "10m_cultural",
        "layer": "admin1",
        "simplify": 0.008,
        "rank_max": 8,
    },
    {
        "name": "ne_10m_roads",
        "group": "10m_cultural",
        "layer": "road",
        "simplify": 0.004,
        "rank_max": 8,
    },
    {
        "name": "ne_10m_populated_places_simple",
        "group": "10m_cultural",
        "layer": "place",
        "simplify": 0.0,
        "rank_max": 7,
    },
]


def download_extract(name: str, group: str, work: Path) -> Path:
    url = f"https://naturalearth.s3.amazonaws.com/{group}/{name}.zip"
    archive = work / f"{name}.zip"
    target = work / name
    target.mkdir(parents=True, exist_ok=True)
    print(f"download {url}")
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "TACTICAL-RECON-offline-basemap-builder/1.0"},
    )
    with urllib.request.urlopen(req, timeout=120) as response, archive.open("wb") as fp:
        fp.write(response.read())
    with zipfile.ZipFile(archive) as zf:
        zf.extractall(target)
    shp = target / f"{name}.shp"
    if not shp.exists():
        candidates = list(target.glob("*.shp"))
        if not candidates:
            raise FileNotFoundError(f"No shapefile in {archive}")
        shp = candidates[0]
    return shp


def lower_props(record: dict) -> dict:
    return {str(k).lower(): v for k, v in record.items()}


def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError, ValueError):
        return None


def choose_name(props: dict) -> str:
    p = lower_props(props)
    for key in ("name_ko", "name_en", "nameascii", "name"):
        value = p.get(key)
        if value not in (None, "", "-99"):
            return str(value)
    return ""


def feature_rank(props: dict):
    p = lower_props(props)
    for key in ("scalerank", "scale_rank", "rank_max", "min_zoom"):
        n = number(p.get(key))
        if n is not None:
            return n
    return None


def bbox_intersects(bounds) -> bool:
    west, south, east, north = bounds
    return not (
        east < BBOX[0]
        or west > BBOX[2]
        or north < BBOX[1]
        or south > BBOX[3]
    )


def compact_properties(props: dict, layer: str, rank) -> dict:
    p = lower_props(props)
    out = {"layer": layer}
    name = choose_name(props)
    if name:
        out["name"] = name
    if rank is not None:
        out["rank"] = round(float(rank), 2)
    for key in ("type", "featurecla", "class"):
        value = p.get(key)
        if value not in (None, "", "-99"):
            out["class"] = str(value)
            break
    if layer == "place":
        pop = number(p.get("pop_max"))
        if pop is not None and pop > 0:
            out["population"] = int(pop)
    return out


def read_features(shp_path: Path, cfg: dict) -> list[dict]:
    reader = shapefile.Reader(str(shp_path), encoding="utf-8", encodingErrors="ignore")
    features: list[dict] = []
    for item in reader.iterShapeRecords():
        shp = item.shape
        if getattr(shp, "shapeType", None) == shapefile.NULL:
            continue
        raw_bbox = getattr(shp, "bbox", None)
        if raw_bbox is not None and len(raw_bbox) == 4 and not bbox_intersects(raw_bbox):
            continue
        props = item.record.as_dict()
        rank = feature_rank(props)
        if cfg["rank_max"] is not None and rank is not None and rank > cfg["rank_max"]:
            continue
        try:
            geom = shape(shp.__geo_interface__)
        except Exception:
            continue
        if geom.is_empty or not geom.intersects(CLIP):
            continue
        try:
            geom = geom.intersection(CLIP)
        except Exception:
            continue
        if geom.is_empty:
            continue
        tol = float(cfg["simplify"])
        if tol and geom.geom_type not in ("Point", "MultiPoint"):
            geom = geom.simplify(tol, preserve_topology=True)
        if geom.is_empty:
            continue
        features.append(
            {
                "type": "Feature",
                "properties": compact_properties(props, cfg["layer"], rank),
                "geometry": mapping(geom),
            }
        )
    print(cfg["layer"], len(features))
    return features


def build() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    features: list[dict] = []
    with tempfile.TemporaryDirectory(prefix="recon-ne-") as td:
        work = Path(td)
        for cfg in SOURCES:
            shp = download_extract(cfg["name"], cfg["group"], work)
            features.extend(read_features(shp, cfg))

    doc = {
        "type": "FeatureCollection",
        "name": "TACTICAL_RECON_LOW_DATA_KR",
        "bbox": list(BBOX),
        "properties": {
            "source": "Natural Earth 1:10m",
            "license": "Public Domain",
            "purpose": "Low-detail offline navigation context; not for precision mapping",
        },
        "features": features,
    }
    payload = json.dumps(doc, ensure_ascii=False, separators=(",", ":"))
    OUT.write_text(payload, encoding="utf-8")
    size = OUT.stat().st_size
    print(f"wrote {OUT} {size / 1024:.1f} KiB, {len(features)} features")
    if size > 4 * 1024 * 1024:
        raise SystemExit(f"offline basemap too large: {size} bytes")


if __name__ == "__main__":
    build()
