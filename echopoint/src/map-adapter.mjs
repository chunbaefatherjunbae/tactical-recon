function markerIcon(L,label,kind='point'){
  const safe=String(label).replace(/[&<>"']/g,'');
  return L.divIcon({
    className:'',
    html:`<div class="map-marker map-marker--${kind}"><span>${safe}</span></div>`,
    iconSize:[30,30],
    iconAnchor:[15,15]
  });
}

export function createMapAdapter({element,L,initial,onMove,onDragStart,onMapTap,onPlanTap,onTempTap,onSelectedTap}){
  const map=L.map(element,{zoomControl:false,attributionControl:true,preferCanvas:true,tap:false}).setView([initial.lat,initial.lon],initial.zoom||14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    minZoom:2,maxZoom:19,attribution:'© OpenStreetMap contributors'
  }).addTo(map);

  const layers={
    reference:L.layerGroup().addTo(map),
    selected:L.layerGroup().addTo(map),
    plan:L.layerGroup().addTo(map),
    route:L.layerGroup().addTo(map),
    track:L.layerGroup().addTo(map)
  };

  map.on('move',()=>onMove?.(getCenter()));
  map.on('dragstart',()=>onDragStart?.());
  map.on('click',e=>onMapTap?.({lat:e.latlng.lat,lon:e.latlng.lng}));

  function getCenter(){const c=map.getCenter();return {lat:c.lat,lon:c.lng};}
  function setCenter(point,zoom=Math.max(map.getZoom(),15)){map.setView([point.lat,point.lon],zoom,{animate:false});}
  function setFollowCenter(point){map.panTo([point.lat,point.lon],{animate:false});}
  function clear(name){layers[name]?.clearLayers();}

  function renderReferences({gpsFix,temp}={}){
    clear('reference');
    if(gpsFix)L.marker([gpsFix.lat,gpsFix.lon],{icon:markerIcon(L,'●','current'),keyboard:false}).addTo(layers.reference);
    if(temp)L.marker([temp.lat,temp.lon],{icon:markerIcon(L,'T','temp')}).addTo(layers.reference).on('click',()=>onTempTap?.(temp));
  }

  function renderSelected(selected){
    clear('selected');
    if(selected)L.marker([selected.lat,selected.lon],{icon:markerIcon(L,'+','selected')}).addTo(layers.selected).on('click',()=>onSelectedTap?.(selected));
  }

  function renderPlan(points,{nextIndex=null,completedBefore=0}={}){
    clear('plan');
    (points||[]).forEach((point,index)=>{
      let kind='point';
      if(index<completedBefore)kind='completed';
      if(index===nextIndex)kind='next';
      L.marker([point.lat,point.lon],{icon:markerIcon(L,String(index+1),kind)})
        .addTo(layers.plan)
        .on('click',()=>onPlanTap?.(point,index));
    });
  }

  function renderRoute(strokes){
    clear('route');
    for(const stroke of strokes||[]){
      const pts=(stroke.points||[]).map(p=>[p.lat,p.lon]);
      if(pts.length>=2)L.polyline(pts,{interactive:false,color:'#D7E58B',weight:2.4,opacity:.88,lineCap:'round',lineJoin:'round'}).addTo(layers.route);
    }
  }

  function renderTrack(track){
    clear('track');
    for(const seg of track?.segments||[]){
      if(seg.kind==='MEASURED'){
        const pts=(seg.points||[]).map(p=>[p.lat,p.lon]);
        if(pts.length>=2)L.polyline(pts,{interactive:false,color:'#D1A04C',weight:2.2,opacity:.82,dashArray:'4 7',lineCap:'round'}).addTo(layers.track);
      }else if(seg.kind==='ESTIMATED'&&seg.from&&seg.to){
        L.polyline([[seg.from.lat,seg.from.lon],[seg.to.lat,seg.to.lon]],{interactive:false,color:'#D1A04C',weight:1.6,opacity:.48,dashArray:'2 9'}).addTo(layers.track);
      }
    }
  }

  function setDrawInteraction(mode){
    if(mode==='HAND'){map.dragging.enable();map.touchZoom.enable();}
    else if(mode==='PEN'||mode==='ERASE'){map.dragging.disable();map.touchZoom.enable();}
    else{map.dragging.enable();map.touchZoom.enable();}
  }

  function clientToGeo(clientX,clientY){
    const rect=map.getContainer().getBoundingClientRect();
    const ll=map.containerPointToLatLng([clientX-rect.left,clientY-rect.top]);
    return {lat:ll.lat,lon:ll.lng};
  }

  function pixelRadiusMeters(clientX,clientY,pixels=18){
    const rect=map.getContainer().getBoundingClientRect();
    const x=clientX-rect.left,y=clientY-rect.top;
    const a=map.containerPointToLatLng([x,y]);
    const b=map.containerPointToLatLng([x+pixels,y]);
    return map.distance(a,b);
  }

  return {
    map,getCenter,setCenter,setFollowCenter,renderReferences,renderSelected,renderPlan,renderRoute,renderTrack,
    setDrawInteraction,clientToGeo,pixelRadiusMeters,
    invalidate(){map.invalidateSize();}
  };
}
