#!/usr/bin/env python3
"""Build the TACTICAL RECON topographic low-data basemap.

Inputs are an OSM GeoJSON export and public Mapzen Terrain Tiles.
Output is a compact GeoJSON optimized for the in-app Leaflet canvas renderer.
"""

from __future__ import annotations

import io
import json
import math
import subprocess
import urllib.request
from collections import defaultdict
from pathlib import Path

import numpy as np
import rasterio
from PIL import Image
from rasterio.transform import from_origin
from shapely.geometry import LineString, Point, box, mapping, shape
from shapely.ops import polygonize, unary_union

BBOX = (124.0, 32.5, 132.0, 39.5)
TERRAIN_ZOOM = 9
CONTOUR_INTERVAL_M = 100
INDEX_CONTOUR_INTERVAL_M = 500
MAX_OUTPUT_BYTES = 14_000_000

OSM_RAW = Path("/tmp/recon-topo.raw.geojson")
DEM_TIF = Path("/tmp/korea-dem.tif")
CONTOUR_3857 = Path("/tmp/korea-contours-3857.geojson")
CONTOUR_4326 = Path("/tmp/korea-contours.geojson")
OUTPUT = Path("offline/kr-low.geojson")


def tile_x(lon: float, zoom: int) -> int:
    n = 2**zoom
    return int(math.floor((lon + 180.0) / 360.0 * n))


def tile_y(lat: float, zoom: int) -> int:
    n = 2**zoom
    lat = max(min(lat, 85.05112878), -85.05112878)
    rad = math.radians(lat)
    return int(math.floor((1.0 - math.asinh(math.tan(rad)) / math.pi) / 2.0 * n))


def download_terrain_dem() -> None:
    west, south, east, north = BBOX
    z = TERRAIN_ZOOM
    n = 2**z
    x0, x1 = tile_x(west, z), tile_x(east, z)
    y0, y1 = tile_y(north, z), tile_y(south, z)

    width = (x1 - x0 + 1) * 256
    height = (y1 - y0 + 1) * 256
    dem = np.zeros((height, width), dtype=np.float32)

    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            url = f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{tx}/{ty}.png"
            request = urllib.request.Request(url, headers={"User-Agent": "TACTICAL-RECON-lowdata-builder/1.0"})
            with urllib.request.urlopen(request, timeout=45) as response:
                image = np.asarray(Image.open(io.BytesIO(response.read())).convert("RGB"), dtype=np.float32)
            elevation = (image[:, :, 0] * 256.0 + image[:, :, 1] + image[:, :, 2] / 256.0) - 32768.0
            oy = (ty - y0) * 256
            ox = (tx - x0) * 256
            dem[oy : oy + 256, ox : ox + 256] = elevation

    origin = 20037508.342789244
    world = origin * 2.0
    pixel = world / (n * 256.0)
    minx = -origin + x0 * 256.0 * pixel
    maxy = origin - y0 * 256.0 * pixel

    with rasterio.open(
        DEM_TIF,
        "w",
        driver="GTiff",
        width=width,
        height=height,
        count=1,
        dtype="float32",
        crs="EPSG:3857",
        transform=from_origin(minx, maxy, pixel, pixel),
        compress="DEFLATE",
    ) as dst:
        dst.write(dem, 1)

    print("terrain", {"tiles": [x0, x1, y0, y1], "raster": [width, height], "pixel_m": round(pixel, 1)})


def create_contours() -> None:
    subprocess.run(
        ["gdal_contour", "-i", str(CONTOUR_INTERVAL_M), "-a", "ele", str(DEM_TIF), str(CONTOUR_3857)],
        check=True,
    )
    subprocess.run(
        ["ogr2ogr", "-t_srs", "EPSG:4326", str(CONTOUR_4326), str(CONTOUR_3857)],
        check=True,
    )


def safe_shape(feature):
    try:
        geom = shape(feature.get("geometry"))
        return None if geom.is_empty else geom
    except Exception:
        return None


def parse_elevation(value):
    try:
        return int(round(float(str(value or "").lower().replace("m", "").strip())))
    except Exception:
        return None


def collect_lines(geom, clip, tolerance: float, min_length: float = 0.0):
    try:
        geom = geom.intersection(clip).simplify(tolerance, preserve_topology=False)
    except Exception:
        return []
    lines = []

    def visit(g):
        if g is None or g.is_empty:
            return
        if g.geom_type == "LineString":
            coords = list(g.coords)
            if len(coords) >= 2 and g.length >= min_length:
                lines.append(coords)
        elif g.geom_type in ("MultiLineString", "GeometryCollection"):
            for part in g.geoms:
                visit(part)

    visit(geom)
    return lines


def packed_lines(kind, cls, geoms, clip, tolerance, min_length=0.0, extra=None):
    coords = []
    for geom in geoms:
        coords.extend(collect_lines(geom, clip, tolerance, min_length))
    if not coords:
        return None
    props = {"kind": kind, "class": cls}
    if extra:
        props.update(extra)
    return {
        "type": "Feature",
        "properties": props,
        "geometry": {"type": "MultiLineString", "coordinates": coords},
    }


def derive_land(boundaries, coastlines, clip):
    polygons = []
    for geom in boundaries:
        if geom.geom_type in ("Polygon", "MultiPolygon"):
            try:
                candidate = geom.intersection(clip)
                if not candidate.is_empty:
                    polygons.append(candidate)
            except Exception:
                pass
    if polygons:
        return unary_union(polygons)

    # Fallback if the country relation was missing from the extract.
    try:
        merged = unary_union(coastlines)
        candidates = [poly for poly in polygonize(merged) if poly.intersects(clip)]
        if candidates:
            return unary_union(candidates).intersection(clip)
    except Exception:
        pass
    return None


def quantize(value):
    if isinstance(value, float):
        return round(value, 4)
    if isinstance(value, (list, tuple)):
        return [quantize(v) for v in value]
    if isinstance(value, dict):
        return {key: quantize(val) for key, val in value.items()}
    return value


def build_output() -> None:
    clip = box(*BBOX)
    raw = json.load(OSM_RAW.open(encoding="utf-8"))
    contour_raw = json.load(CONTOUR_4326.open(encoding="utf-8"))

    roads = {key: [] for key in ("motorway", "trunk", "primary", "secondary")}
    water_lines = []
    water_areas = []
    coast = []
    boundaries = []
    places = []
    peaks = []

    for feature in raw.get("features", []):
        props = feature.get("properties") or {}
        geom = safe_shape(feature)
        if geom is None:
            continue

        highway = props.get("highway")
        if highway in roads:
            roads[highway].append(geom)
            continue

        if props.get("waterway") in {"river", "canal"}:
            water_lines.append(geom)
            continue

        if props.get("natural") == "water" or props.get("water") == "reservoir":
            if geom.geom_type in ("Polygon", "MultiPolygon") and geom.area >= 0.000015:
                water_areas.append(geom)
            continue

        if props.get("natural") == "coastline":
            coast.append(geom)
            continue

        if str(props.get("admin_level", "")) == "2":
            boundaries.append(geom)
            continue

        if props.get("place") in {"city", "town", "village"} and geom.geom_type == "Point":
            name = props.get("name:ko") or props.get("name") or props.get("name:en") or ""
            if not name:
                continue
            out_props = {"kind": "place", "class": props.get("place"), "name": name}
            try:
                if props.get("population") is not None:
                    out_props["population"] = int(str(props.get("population")).replace(",", ""))
            except Exception:
                pass
            places.append({"type": "Feature", "properties": out_props, "geometry": mapping(geom)})
            continue

        if props.get("natural") == "peak" and geom.geom_type == "Point":
            name = props.get("name:ko") or props.get("name") or props.get("name:en") or ""
            ele = parse_elevation(props.get("ele"))
            if name and ele is not None:
                peaks.append(
                    {
                        "type": "Feature",
                        "properties": {"kind": "peak", "name": name, "ele": ele},
                        "geometry": mapping(geom),
                    }
                )

    output = []
    land = derive_land(boundaries, coast, clip)
    if land is not None and not land.is_empty:
        land = land.simplify(0.0012, preserve_topology=True)
        output.append(
            {"type": "Feature", "properties": {"kind": "land", "class": "country"}, "geometry": mapping(land)}
        )

    for cls, tolerance in (
        ("motorway", 0.0005),
        ("trunk", 0.0007),
        ("primary", 0.0009),
        ("secondary", 0.0013),
    ):
        feature = packed_lines("road", cls, roads[cls], clip, tolerance)
        if feature:
            output.append(feature)

    feature = packed_lines("water", "river", water_lines, clip, 0.0012)
    if feature:
        output.append(feature)

    for geom in sorted(water_areas, key=lambda item: item.area, reverse=True)[:1200]:
        try:
            candidate = geom.intersection(clip).simplify(0.0008, preserve_topology=True)
            if not candidate.is_empty:
                output.append(
                    {
                        "type": "Feature",
                        "properties": {"kind": "water_area", "class": "water"},
                        "geometry": mapping(candidate),
                    }
                )
        except Exception:
            pass

    feature = packed_lines("coast", "coastline", coast, clip, 0.0007)
    if feature:
        output.append(feature)

    feature = packed_lines("boundary", "country", boundaries, clip, 0.0012)
    if feature:
        output.append(feature)

    contours = defaultdict(list)
    contour_labels = []
    for feature in contour_raw.get("features", []):
        props = feature.get("properties") or {}
        try:
            ele = int(round(float(props.get("ele")) / CONTOUR_INTERVAL_M) * CONTOUR_INTERVAL_M)
        except Exception:
            continue
        geom = safe_shape(feature)
        if geom is None:
            continue

        # Drop tiny closed loops and simplify aggressively enough for phone rendering.
        lines = collect_lines(geom, clip, 0.0015, min_length=0.014)
        if not lines:
            continue
        contours[ele].extend(lines)

        if ele % INDEX_CONTOUR_INTERVAL_M == 0:
            for coords in lines:
                try:
                    line = LineString(coords)
                    if line.length < 0.04:
                        continue
                    point = line.interpolate(0.5, normalized=True)
                    contour_labels.append(
                        {
                            "type": "Feature",
                            "properties": {"kind": "contour_label", "ele": ele},
                            "geometry": mapping(Point(point.x, point.y)),
                        }
                    )
                except Exception:
                    pass

    for ele, coords in sorted(contours.items()):
        output.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "contour",
                    "class": "index" if ele % INDEX_CONTOUR_INTERVAL_M == 0 else "intermediate",
                    "ele": ele,
                },
                "geometry": {"type": "MultiLineString", "coordinates": coords},
            }
        )

    places.sort(
        key=lambda feature: (
            {"city": 0, "town": 1, "village": 2}.get(feature["properties"].get("class"), 3),
            -int(feature["properties"].get("population") or 0),
        )
    )
    peaks.sort(key=lambda feature: -int(feature["properties"].get("ele") or 0))
    output.extend(places[:3200])
    output.extend(peaks[:1600])
    output.extend(contour_labels[:700])

    for feature in output:
        feature["geometry"] = quantize(feature["geometry"])

    final = {
        "type": "FeatureCollection",
        "name": "TACTICAL RECON South Korea Topographic Low Data Basemap",
        "source": "OpenStreetMap via Geofabrik + Mapzen Terrain Tiles via AWS Open Data",
        "license": "OSM ODbL 1.0; terrain source-specific attribution applies",
        "contourIntervalM": CONTOUR_INTERVAL_M,
        "indexContourIntervalM": INDEX_CONTOUR_INTERVAL_M,
        "features": output,
    }

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(final, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    kinds = defaultdict(int)
    for feature in output:
        kinds[(feature.get("properties") or {}).get("kind", "?")] += 1
    size = OUTPUT.stat().st_size
    print("feature kinds", dict(kinds))
    print("output bytes", size)
    if size > MAX_OUTPUT_BYTES:
        raise SystemExit(f"topographic low-data basemap exceeds {MAX_OUTPUT_BYTES} bytes")


def main() -> None:
    if not OSM_RAW.exists():
        raise SystemExit(f"missing OSM input: {OSM_RAW}")
    download_terrain_dem()
    create_contours()
    build_output()


if __name__ == "__main__":
    main()
