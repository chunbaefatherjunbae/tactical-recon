#!/usr/bin/env python3
import json, math, sys
from pathlib import Path
from datetime import datetime, timezone

BBOX=(124.0,32.8,132.2,39.6)

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
    pts=[[round(float(x),5),round(float(y),5)] for x,y,*_ in coords if BBOX[0]-.2<=x<=BBOX[2]+.2 and BBOX[1]-.2<=y<=BBOX[3]+.2]
    if len(pts)<2: return None
    out=rdp(pts,eps)
    return [[p[1],p[0]] for p in out] if len(out)>=2 else None

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

def compact_name(p):
    return p.get("name:ko") or p.get("name") or p.get("ref") or ""

src=Path(sys.argv[1])
dst=Path(sys.argv[2])
data=json.loads(src.read_text(encoding="utf-8"))

roads=[]; rivers=[]; rails=[]; coast=[]; places=[]
road_eps={"motorway":.001,"trunk":.0015,"primary":.002,"secondary":.0035}

for f in data.get("features",[]):
    p=f.get("properties") or {}; g=f.get("geometry")
    if not g or not geom_hits(g.get("coordinates")): continue

    highway=p.get("highway")
    if highway in road_eps:
        cls={"motorway":"M","trunk":"T","primary":"P","secondary":"S"}[highway]
        for line in lines_from_geom(g,road_eps[highway]):
            roads.append({"c":cls,"n":compact_name(p),"p":line})
        continue

    waterway=p.get("waterway")
    if waterway in ("river","canal"):
        for line in lines_from_geom(g,.004):
            rivers.append({"c":"R" if waterway=="river" else "C","n":compact_name(p),"p":line})
        continue

    railway=p.get("railway")
    if railway in ("rail","light_rail"):
        for line in lines_from_geom(g,.003):
            rails.append({"c":"R","n":compact_name(p),"p":line})
        continue

    if p.get("natural")=="coastline":
        for line in lines_from_geom(g,.0025):
            coast.append({"p":line})
        continue

    place=p.get("place")
    if place in ("city","town") and g.get("type")=="Point":
        x,y=g.get("coordinates")[:2]
        if in_bbox([x,y]):
            places.append({"n":compact_name(p),"c":"C" if place=="city" else "T","p":[round(y,5),round(x,5)]})

# Remove pathological unnamed micro-segments and cap label noise.
roads=[r for r in roads if len(r["p"])>=2]
rivers=[r for r in rivers if len(r["p"])>=2]
rails=[r for r in rails if len(r["p"])>=2]
coast=[r for r in coast if len(r["p"])>=2]
places=sorted(places,key=lambda x:(x["c"]!="C",x["n"]))[:450]

payload={
  "version":1,
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
print(json.dumps({
  "bytes":dst.stat().st_size,
  "roads":len(roads),"rivers":len(rivers),"rails":len(rails),"coast":len(coast),"places":len(places)
}))
