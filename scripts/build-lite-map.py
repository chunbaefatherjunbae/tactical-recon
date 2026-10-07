#!/usr/bin/env python3
import json, math, sys
from pathlib import Path
from datetime import datetime, timezone

BBOX=(124.0,32.8,132.2,39.6)
PRECISION=4
SCALE=10**PRECISION

def in_bbox(pt):
    x,y=pt[0],pt[1]
    return BBOX[0] <= x <= BBOX[2] and BBOX[1] <= y <= BBOX[3]

def geom_hits(coords):
    if not isinstance(coords,list): return False
    if len(coords)>=2 and isinstance(coords[0],(int,float)):
        return in_bbox(coords)
    return any(geom_hits(v) for v in coords)

def perpendicular_distance(p,a,b):
    x,y=p; x1,y1=a; x2,y2=b
    dx=x2-x1; dy=y2-y1
    if dx==0 and dy==0:
        return math.hypot(x-x1,y-y1)
    t=((x-x1)*dx+(y-y1)*dy)/(dx*dx+dy*dy)
    t=max(0,min(1,t))
    return math.hypot(x-(x1+t*dx),y-(y1+t*dy))

def rdp(points,eps):
    if len(points)<=2: return points
    a,b=points[0],points[-1]
    max_d=0; idx=0
    for i,p in enumerate(points[1:-1],1):
        d=perpendicular_distance(p,a,b)
        if d>max_d: max_d=d; idx=i
    if max_d>eps:
        left=rdp(points[:idx+1],eps)
        right=rdp(points[idx:],eps)
        return left[:-1]+right
    return [a,b]

def clean_line(coords,eps):
    pts=[[float(x),float(y)] for x,y,*_ in coords
         if BBOX[0]-.2<=x<=BBOX[2]+.2 and BBOX[1]-.2<=y<=BBOX[3]+.2]
    if len(pts)<2: return None
    out=rdp(pts,eps)
    return [[round(p[1],PRECISION),round(p[0],PRECISION)] for p in out] if len(out)>=2 else None

def lines_from_geom(g,eps):
    if not g: return []
    t=g.get("type"); c=g.get("coordinates") or []
    if t=="LineString":
        line=clean_line(c,eps); return [line] if line else []
    if t=="MultiLineString":
        return [line for part in c if (line:=clean_line(part,eps))]
    if t=="Polygon":
        return [line for ring in c if (line:=clean_line(ring,eps))]
    if t=="MultiPolygon":
        return [line for poly in c for ring in poly if (line:=clean_line(ring,eps))]
    return []

def encode_value(value):
    value = ~(value << 1) if value < 0 else value << 1
    out=[]
    while value >= 0x20:
        out.append(chr((0x20 | (value & 0x1f)) + 63))
        value >>= 5
    out.append(chr(value + 63))
    return ''.join(out)

def encode_polyline(points):
    last_lat=0; last_lon=0; chunks=[]
    for lat,lon in points:
        ilat=int(round(lat*SCALE)); ilon=int(round(lon*SCALE))
        chunks.append(encode_value(ilat-last_lat))
        chunks.append(encode_value(ilon-last_lon))
        last_lat=ilat; last_lon=ilon
    return ''.join(chunks)

def compact_name(p):
    return p.get("name:ko") or p.get("name") or p.get("ref") or ""

src=Path(sys.argv[1])
dst=Path(sys.argv[2])
data=json.loads(src.read_text(encoding="utf-8"))

roads={"M":[],"T":[],"P":[],"S":[]}
rivers=[]; rails=[]; coast=[]; places=[]
road_eps={"motorway":.001,"trunk":.0015,"primary":.0025,"secondary":.0045}

for f in data.get("features",[]):
    p=f.get("properties") or {}; g=f.get("geometry")
    if not g or not geom_hits(g.get("coordinates")): continue

    highway=p.get("highway")
    if highway in road_eps:
        cls={"motorway":"M","trunk":"T","primary":"P","secondary":"S"}[highway]
        for line in lines_from_geom(g,road_eps[highway]):
            if len(line)>=2: roads[cls].append(encode_polyline(line))
        continue

    waterway=p.get("waterway")
    if waterway=="river":
        for line in lines_from_geom(g,.006):
            if len(line)>=2: rivers.append(encode_polyline(line))
        continue

    railway=p.get("railway")
    if railway=="rail":
        for line in lines_from_geom(g,.005):
            if len(line)>=2: rails.append(encode_polyline(line))
        continue

    if p.get("natural")=="coastline":
        for line in lines_from_geom(g,.005):
            if len(line)>=2: coast.append(encode_polyline(line))
        continue

    place=p.get("place")
    if place in ("city","town") and g.get("type")=="Point":
        x,y=g.get("coordinates")[:2]
        name=compact_name(p)
        if name and in_bbox([x,y]):
            places.append([name,"C" if place=="city" else "T",round(y,PRECISION),round(x,PRECISION)])

# Keep labels sparse. Geometry remains complete for selected classes.
seen=set(); unique_places=[]
for row in sorted(places,key=lambda x:(x[1]!="C",x[0])):
    key=(row[0],row[1])
    if key in seen: continue
    seen.add(key); unique_places.append(row)
places=unique_places[:320]

payload={
  "version":2,
  "precision":PRECISION,
  "generatedAt":datetime.now(timezone.utc).isoformat(),
  "source":"OpenStreetMap / Geofabrik South Korea extract",
  "bbox":list(BBOX),
  "roads":roads,
  "rivers":rivers,
  "rails":rails,
  "coast":coast,
  "places":places
}

js="window.BaselineLiteOSM=Object.freeze("+json.dumps(payload,ensure_ascii=False,separators=(",",":"))+");\n"
dst.parent.mkdir(parents=True,exist_ok=True)
dst.write_text(js,encoding="utf-8")

stats={
  "bytes":dst.stat().st_size,
  "roads":{k:len(v) for k,v in roads.items()},
  "rivers":len(rivers),
  "rails":len(rails),
  "coast":len(coast),
  "places":len(places)
}
print(json.dumps(stats,ensure_ascii=False))
