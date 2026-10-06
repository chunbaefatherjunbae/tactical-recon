/* R2.1 runtime: HUD surface hierarchy, isolated position state, controlled address lookup. */
(function(root){
  'use strict';

  const VERSION='2.1';
  const DISPLAY_KEY='tactical_recon_location_display_v2';
  const FORMATS=['MGRS','WGS84','ADDRESS'];
  const DEFAULT_DISPLAY={primary:'MGRS',visible:['MGRS','WGS84','ADDRESS'],order:['MGRS','WGS84','ADDRESS']};
  const addressCache=new Map();
  const addressInFlight=new Map();
  let hudAddressToken=0;
  let hudAddressTimer=null;
  let hudAddressController=null;
  let cardAddressToken=0;
  let r2CardTarget=null;
  let installed=false;

  function lang(){return document.documentElement.lang==='en'?'en':'ko';}
  function txt(ko,en){return lang()==='ko'?ko:en;}
  function validCoords(c){
    return Array.isArray(c)&&c.length>=2&&Number.isFinite(Number(c[0]))&&Number.isFinite(Number(c[1]))&&Math.abs(Number(c[0]))<=90&&Math.abs(Number(c[1]))<=180;
  }
  function readJson(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw?JSON.parse(raw):fallback;
    }catch(e){return fallback;}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(e){return false;}
  }
  function normalizeDisplay(value){
    const raw=value&&typeof value==='object'?value:{};
    const order=[];
    (Array.isArray(raw.order)?raw.order:DEFAULT_DISPLAY.order).forEach(format=>{
      const f=String(format||'').toUpperCase();
      if(FORMATS.includes(f)&&!order.includes(f))order.push(f);
    });
    FORMATS.forEach(f=>{if(!order.includes(f))order.push(f);});
    const visible=[];
    (Array.isArray(raw.visible)?raw.visible:DEFAULT_DISPLAY.visible).forEach(format=>{
      const f=String(format||'').toUpperCase();
      if(FORMATS.includes(f)&&!visible.includes(f))visible.push(f);
    });
    let primary=String(raw.primary||DEFAULT_DISPLAY.primary).toUpperCase();
    if(!FORMATS.includes(primary))primary=DEFAULT_DISPLAY.primary;
    if(!visible.includes(primary))visible.push(primary);
    if(!visible.length)visible.push(primary);
    return {primary,visible,order};
  }
  function displaySettings(){return normalizeDisplay(readJson(DISPLAY_KEY,DEFAULT_DISPLAY));}
  function saveDisplaySettings(next){
    const normalized=normalizeDisplay(next);
    writeJson(DISPLAY_KEY,normalized);
    renderDisplaySettings();
    renderReticlePrimary(true);
    renderLocationFormats();
    return normalized;
  }
  function formatLabel(format){
    if(format==='MGRS')return 'MGRS';
    if(format==='WGS84')return 'WGS84';
    return lang()==='ko'?'주소':'ADDRESS';
  }
  function formatLatLon(coords){
    return Number(coords[0]).toFixed(6)+', '+Number(coords[1]).toFixed(6);
  }
  function formatMgrs(coords){
    try{
      return typeof calcMGRS==='function'?calcMGRS(Number(coords[0]),Number(coords[1])):'';
    }catch(e){return '';}
  }
  function cacheKey(coords){
    return Number(coords[0]).toFixed(5)+','+Number(coords[1]).toFixed(5);
  }
  function normalizedAddress(data,fallback){
    try{
      if(typeof normalizeKoreanAddress==='function'){
        const value=normalizeKoreanAddress(data,fallback);
        if(value)return value;
      }
    }catch(e){}
    const display=String(data&&data.display_name||'').trim();
    return display||fallback;
  }
  async function reverseAddress(coords,options){
    const opts=options||{};
    if(!validCoords(coords))return {state:'error',value:txt('주소 없음','NO ADDRESS')};
    const key=cacheKey(coords);
    if(addressCache.has(key))return {state:'ready',value:addressCache.get(key)};
    if(!navigator.onLine)return {state:'offline',value:txt('오프라인 · 주소 사용 불가','OFFLINE · ADDRESS UNAVAILABLE')};
    if(!opts.signal&&addressInFlight.has(key))return addressInFlight.get(key);

    const request=(async()=>{
      try{
        const url='https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat='+encodeURIComponent(coords[0])+'&lon='+encodeURIComponent(coords[1])+'&zoom=18&addressdetails=1&accept-language='+(lang()==='ko'?'ko':'en');
        const response=await fetch(url,{headers:{Accept:'application/json'},signal:opts.signal});
        if(!response.ok)throw new Error('REVERSE_GEOCODE_FAILED');
        const data=await response.json();
        const fallback=formatLatLon(coords);
        const value=normalizedAddress(data,fallback);
        addressCache.set(key,value);
        return {state:'ready',value};
      }catch(e){
        if(e&&e.name==='AbortError')return {state:'aborted',value:''};
        return {state:'error',value:txt('주소 확인 실패','ADDRESS UNAVAILABLE')};
      }finally{
        if(!opts.signal)addressInFlight.delete(key);
      }
    })();
    if(!opts.signal)addressInFlight.set(key,request);
    return request;
  }

  function copyText(value){
    const text=String(value||'').trim();
    if(!text)return Promise.resolve(false);
    try{
      if(typeof writeClipboardText==='function')return Promise.resolve(writeClipboardText(text));
    }catch(e){}
    if(navigator.clipboard&&window.isSecureContext){
      return navigator.clipboard.writeText(text).then(()=>true).catch(()=>false);
    }
    try{
      const ta=document.createElement('textarea');
      ta.value=text;ta.setAttribute('readonly','');
      ta.style.position='fixed';ta.style.left='-9999px';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();
      const ok=document.execCommand('copy');ta.remove();
      return Promise.resolve(Boolean(ok));
    }catch(e){return Promise.resolve(false);}
  }
  function notify(message){
    try{
      const box=document.getElementById('v29Toast');
      if(box){
        box.textContent=message;box.dataset.kind='info';box.classList.add('show');
        clearTimeout(box._r2Timer);
        box._r2Timer=setTimeout(()=>box.classList.remove('show'),1500);
        return;
      }
    }catch(e){}
  }

  function ensureDisplaySettingsSheet(){
    let sheet=document.getElementById('r2PositionDisplaySheet');
    if(sheet)return sheet;
    sheet=document.createElement('section');
    sheet.id='r2PositionDisplaySheet';
    sheet.className='r2-display-sheet';
    sheet.hidden=true;
    sheet.innerHTML=
      '<div class="r2-display-shell">'+
        '<div class="r2-display-head">'+
          '<div><small>R2.1 // POSITION DISPLAY</small><strong id="r2DisplayTitle"></strong></div>'+
          '<button class="r2-display-close" type="button" aria-label="Close">×</button>'+
        '</div>'+
        '<div class="r2-display-body">'+
          '<label class="r2-primary-field"><span id="r2PrimaryLabel"></span><select id="r2PrimarySelect"></select></label>'+
          '<div class="r2-display-section-title" id="r2VisibleLabel"></div>'+
          '<div id="r2FormatRows" class="r2-format-rows"></div>'+
          '<p class="r2-display-note" id="r2DisplayNote"></p>'+
        '</div>'+
      '</div>';
    document.body.appendChild(sheet);
    sheet.querySelector('.r2-display-close').addEventListener('click',closeDisplaySettings);
    sheet.addEventListener('click',event=>{if(event.target===sheet)closeDisplaySettings();});
    sheet.querySelector('#r2PrimarySelect').addEventListener('change',event=>{
      const current=displaySettings();
      current.primary=event.target.value;
      if(!current.visible.includes(current.primary))current.visible.push(current.primary);
      saveDisplaySettings(current);
    });
    return sheet;
  }
  function openDisplaySettings(){
    try{if(typeof closeFieldControls==='function')closeFieldControls();}catch(e){}
    try{root.r1&&root.r1.closeLocation&&root.r1.closeLocation(false);}catch(e){}
    const sheet=ensureDisplaySettingsSheet();
    renderDisplaySettings();
    sheet.hidden=false;
    document.body.classList.add('r2-display-open');
  }
  function closeDisplaySettings(){
    const sheet=document.getElementById('r2PositionDisplaySheet');
    if(sheet)sheet.hidden=true;
    document.body.classList.remove('r2-display-open');
  }
  function renderDisplaySettings(){
    const sheet=ensureDisplaySettingsSheet();
    const settings=displaySettings();
    const title=sheet.querySelector('#r2DisplayTitle');
    const primaryLabel=sheet.querySelector('#r2PrimaryLabel');
    const visibleLabel=sheet.querySelector('#r2VisibleLabel');
    const note=sheet.querySelector('#r2DisplayNote');
    if(title)title.textContent=txt('위치 표기','POSITION DISPLAY');
    if(primaryLabel)primaryLabel.textContent=txt('대표 표기','PRIMARY FORMAT');
    if(visibleLabel)visibleLabel.textContent=txt('표시 형식 및 순서','VISIBLE FORMATS & ORDER');
    if(note)note.textContent=txt(
      '지도 위치창에는 대표 표기 1개만 표시하고, POINT 상세에는 켠 형식을 설정한 순서대로 표시합니다. 위치의 출처와 표기 형식은 서로 독립입니다.',
      'THE MAP POSITION READOUT SHOWS ONLY THE PRIMARY FORMAT. POINT DETAILS SHOW ENABLED FORMATS IN THIS ORDER. POSITION SOURCE AND DISPLAY FORMAT ARE INDEPENDENT.'
    );
    const select=sheet.querySelector('#r2PrimarySelect');
    if(select){
      select.innerHTML=FORMATS.map(f=>'<option value="'+f+'">'+formatLabel(f)+'</option>').join('');
      select.value=settings.primary;
    }
    const rows=sheet.querySelector('#r2FormatRows');
    if(!rows)return;
    rows.textContent='';
    settings.order.forEach((format,index)=>{
      const row=document.createElement('div');
      row.className='r2-format-row';
      row.dataset.format=format;
      const check=document.createElement('label');
      check.className='r2-format-check';
      const input=document.createElement('input');
      input.type='checkbox';input.checked=settings.visible.includes(format);
      input.disabled=format===settings.primary;
      const span=document.createElement('span');span.textContent=formatLabel(format);
      check.append(input,span);
      input.addEventListener('change',()=>{
        const current=displaySettings();
        current.visible=input.checked
          ? Array.from(new Set(current.visible.concat(format)))
          : current.visible.filter(f=>f!==format);
        saveDisplaySettings(current);
      });
      const moves=document.createElement('div');moves.className='r2-format-moves';
      const up=document.createElement('button');up.type='button';up.textContent='↑';up.disabled=index===0;up.setAttribute('aria-label','Move up');
      const down=document.createElement('button');down.type='button';down.textContent='↓';down.disabled=index===settings.order.length-1;down.setAttribute('aria-label','Move down');
      up.addEventListener('click',()=>moveFormat(format,-1));
      down.addEventListener('click',()=>moveFormat(format,1));
      moves.append(up,down);row.append(check,moves);rows.appendChild(row);
    });
  }
  function moveFormat(format,delta){
    const current=displaySettings();
    const index=current.order.indexOf(format);
    const next=index+delta;
    if(index<0||next<0||next>=current.order.length)return;
    const copy=current.order.slice();
    const tmp=copy[index];copy[index]=copy[next];copy[next]=tmp;
    current.order=copy;
    saveDisplaySettings(current);
  }
  function installDisplayMenuEntry(){
    const grid=document.querySelector('#control-position .field-control-grid');
    if(!grid||document.getElementById('r2PositionDisplayBtn'))return false;
    const btn=document.createElement('button');
    btn.className='osb-btn';btn.id='r2PositionDisplayBtn';btn.type='button';
    btn.textContent=txt('위치 표기','POSITION DISPLAY');
    btn.addEventListener('click',openDisplaySettings);
    grid.appendChild(btn);
    return true;
  }
  function syncDisplayMenuText(){
    const btn=document.getElementById('r2PositionDisplayBtn');
    if(btn)btn.textContent=txt('위치 표기','POSITION DISPLAY');
  }

  function currentMapCoords(){
    try{
      const c=map.getCenter();
      const coords=[Number(c.lat),Number(c.lng)];
      return validCoords(coords)?coords:null;
    }catch(e){return null;}
  }
  function reticleValue(format,coords){
    if(format==='MGRS')return formatMgrs(coords)||'MGRS --';
    if(format==='WGS84')return formatLatLon(coords);
    const cached=addressCache.get(cacheKey(coords));
    if(cached)return cached;
    return navigator.onLine?txt('주소 확인…','RESOLVING ADDRESS…'):txt('오프라인 · 주소 사용 불가','OFFLINE · ADDRESS UNAVAILABLE');
  }
  function cancelHudAddressResolve(){
    if(hudAddressTimer){clearTimeout(hudAddressTimer);hudAddressTimer=null;}
    if(hudAddressController){hudAddressController.abort();hudAddressController=null;}
  }
  function scheduleHudAddressResolve(coords,value){
    cancelHudAddressResolve();
    const token=++hudAddressToken;
    const key=cacheKey(coords);
    hudAddressTimer=setTimeout(()=>{
      hudAddressTimer=null;
      const controller=typeof AbortController==='function'?new AbortController():null;
      hudAddressController=controller;
      reverseAddress(coords,{signal:controller?.signal}).then(result=>{
        if(token!==hudAddressToken||!result||result.state==='aborted')return;
        const now=currentMapCoords();
        if(!now||cacheKey(now)!==key)return;
        value.textContent=result.value;
      }).finally(()=>{
        if(hudAddressController===controller)hudAddressController=null;
      });
    },220);
  }
  function renderReticlePrimary(resolve){
    const coords=currentMapCoords();
    const value=document.getElementById('reticleMgrs');
    if(!coords||!value)return;
    const settings=displaySettings();
    const label=value.parentElement&&value.parentElement.querySelector('div:first-child');
    if(label)label.textContent=formatLabel(settings.primary);
    value.textContent=reticleValue(settings.primary,coords);
    const head=document.querySelector('.telemetry-osd .osd-head > span:first-child');
    if(head)head.textContent=txt('MAP POSITION','MAP POSITION');
    const optic=document.getElementById('currentOpticLabel');
    if(optic)optic.setAttribute('aria-hidden','true');
    const button=value.closest('.osd-mgrs-btn');
    if(button){
      button.title=txt('탭하여 이 위치의 작업 열기','TAP TO OPEN ACTIONS FOR THIS POSITION');
      button.setAttribute('aria-label',txt('현재 지도 위치 작업 열기','OPEN MAP POSITION ACTIONS'));
    }
    if(settings.primary==='ADDRESS'){
      if(resolve)scheduleHudAddressResolve(coords,value);
      else cancelHudAddressResolve();
    }else{
      cancelHudAddressResolve();
    }
  }
  function openMapPositionActions(){
    const coords=currentMapCoords();
    if(!coords||!root.r1||typeof root.r1.openLocation!=='function')return;
    const target={
      id:'R2-MAP-'+Date.now(),
      name:txt('선택 위치','SELECTED POSITION'),
      coords:coords.slice(),
      source:'MAP'
    };
    r2CardTarget=target;
    root.r1.openLocation(target,'LOCATION',{activateLegacyTarget:false});
    setTimeout(renderLocationFormats,0);
  }
  function installReticleOwnership(){
    const previous=root.updateReticleTelemetry;
    if(typeof previous==='function'&&!previous.__r2PositionDisplay){
      const wrapped=function(){
        const out=previous.apply(this,arguments);
        renderReticlePrimary(false);
        return out;
      };
      wrapped.__r2PositionDisplay=true;
      root.updateReticleTelemetry=wrapped;
    }
    const previousCopy=root.copyReticleMGRS;
    if(typeof previousCopy==='function'&&!previousCopy.__r2PositionActions){
      const wrapped=function(){
        openMapPositionActions();
      };
      wrapped.__r2PositionActions=true;
      wrapped.__r2Previous=previousCopy;
      root.copyReticleMGRS=wrapped;
    }
    try{
      if(typeof map!=='undefined'&&map&&typeof map.on==='function'){
        map.on('moveend',()=>renderReticlePrimary(true));
      }
    }catch(e){}
    renderReticlePrimary(true);
  }

  function currentCardTarget(){
    try{
      const selected=root.r1?.getLocationTarget?.();
      if(selected&&validCoords(selected.coords))return selected;
    }catch(e){}
    if(r2CardTarget&&validCoords(r2CardTarget.coords))return r2CardTarget;
    try{
      if(typeof currentActiveTarget!=='undefined'&&currentActiveTarget&&validCoords(currentActiveTarget.coords))return currentActiveTarget;
    }catch(e){}
    return null;
  }
  function ensureLocationFormats(){
    const card=document.getElementById('r1LocationCard');
    if(!card)return null;
    let box=card.querySelector('#r2LocationFormats');
    if(box)return box;
    box=document.createElement('div');
    box.id='r2LocationFormats';
    box.className='r2-location-formats';
    const legacy=card.querySelector('#r1LocationCoords');
    if(legacy){
      legacy.classList.add('r2-legacy-coords');
      legacy.insertAdjacentElement('afterend',box);
    }else{
      const head=card.querySelector('.r1-location-head');
      if(head)head.insertAdjacentElement('afterend',box);
    }
    return box;
  }
  async function resolveCardAddress(target,rowValue){
    const coords=target.coords.slice();
    const token=++cardAddressToken;
    const result=await reverseAddress(coords);
    if(token!==cardAddressToken||!result)return;
    const current=currentCardTarget();
    if(!current||cacheKey(current.coords)!==cacheKey(coords))return;
    rowValue.textContent=result.value;
    rowValue.dataset.copyValue=result.value;
  }
  function rowValueFor(format,target){
    if(format==='MGRS')return formatMgrs(target.coords)||'MGRS --';
    if(format==='WGS84')return formatLatLon(target.coords);
    if(target.address)return String(target.address);
    const cached=addressCache.get(cacheKey(target.coords));
    if(cached)return cached;
    return navigator.onLine?txt('주소 확인…','RESOLVING ADDRESS…'):txt('오프라인 · 주소 사용 불가','OFFLINE · ADDRESS UNAVAILABLE');
  }
  function renderLocationFormats(){
    const card=document.getElementById('r1LocationCard');
    const box=ensureLocationFormats();
    const target=currentCardTarget();
    if(!card||!box||card.hidden||!target)return;
    r2CardTarget=target;
    const settings=displaySettings();
    const formats=settings.order.filter(f=>settings.visible.includes(f));
    box.textContent='';
    formats.forEach(format=>{
      const row=document.createElement('button');
      row.type='button';row.className='r2-location-format';
      row.dataset.format=format;
      row.classList.toggle('primary',format===settings.primary);
      const label=document.createElement('span');label.className='r2-location-format-label';label.textContent=formatLabel(format);
      const value=document.createElement('strong');value.className='r2-location-format-value';
      const initial=rowValueFor(format,target);
      value.textContent=initial;value.dataset.copyValue=initial;
      const copy=document.createElement('span');copy.className='r2-location-format-copy';copy.textContent='COPY';
      row.append(label,value,copy);
      row.addEventListener('click',async()=>{
        const ok=await copyText(value.dataset.copyValue||value.textContent);
        if(ok){copy.textContent='COPIED';setTimeout(()=>{copy.textContent='COPY';},900);}
      });
      box.appendChild(row);
      if(format==='ADDRESS'&&!target.address&&!addressCache.has(cacheKey(target.coords))&&navigator.onLine){
        resolveCardAddress(target,value);
      }
    });
    if(formats.length>1){
      const all=document.createElement('button');
      all.type='button';all.className='r2-location-copy-all';
      all.textContent=txt('전체 위치정보 복사','COPY ALL POSITION DATA');
      all.addEventListener('click',async()=>{
        const lines=[];
        box.querySelectorAll('.r2-location-format').forEach(row=>{
          const label=row.querySelector('.r2-location-format-label')?.textContent||'';
          const value=row.querySelector('.r2-location-format-value')?.dataset.copyValue||row.querySelector('.r2-location-format-value')?.textContent||'';
          if(value&&!value.includes('확인…')&&!value.includes('RESOLVING'))lines.push(label+': '+value);
        });
        const ok=await copyText(lines.join('\n'));
        if(ok)notify(txt('위치정보를 복사했습니다.','POSITION DATA COPIED.'));
      });
      box.appendChild(all);
    }
    let source=card.querySelector('#r2LocationSource');
    if(!source){
      source=document.createElement('div');
      source.id='r2LocationSource';source.className='r2-location-source';
      const meta=card.querySelector('#r1LocationMeta');
      if(meta)meta.insertAdjacentElement('afterend',source);
      else box.insertAdjacentElement('afterend',source);
    }
    source.textContent='SOURCE '+String(target.source||target.type||'MAP').toUpperCase();
  }
  function installLocationCardOwnership(){
    ensureLocationFormats();
    if(root.r1&&typeof root.r1.openLocation==='function'&&!root.r1.openLocation.__r2Formats){
      const previous=root.r1.openLocation;
      const wrapped=function(target,status){
        if(target&&validCoords(target.coords))r2CardTarget=target;
        const out=previous.apply(this,arguments);
        setTimeout(renderLocationFormats,0);
        return out;
      };
      wrapped.__r2Formats=true;
      root.r1.openLocation=wrapped;
    }
    if(typeof root.openSitrep==='function'&&!root.openSitrep.__r2Formats){
      const previous=root.openSitrep;
      const wrapped=function(target,status){
        if(target&&validCoords(target.coords))r2CardTarget=target;
        const out=previous.apply(this,arguments);
        setTimeout(renderLocationFormats,0);
        return out;
      };
      wrapped.__r2Formats=true;
      root.openSitrep=wrapped;
    }
    const card=document.getElementById('r1LocationCard');
    const name=card&&card.querySelector('#r1LocationName');
    if(card&&!card.__r2Observed){
      const observer=new MutationObserver(()=>{if(!card.hidden)setTimeout(renderLocationFormats,0);});
      observer.observe(card,{attributes:true,attributeFilter:['hidden']});
      if(name)observer.observe(name,{childList:true,characterData:true,subtree:true});
      card.__r2Observed=true;
    }
  }

  function syncR2Text(){
    syncDisplayMenuText();
    const sheet=document.getElementById('r2PositionDisplaySheet');
    if(sheet&&!sheet.hidden)renderDisplaySettings();
    renderReticlePrimary(false);
    renderLocationFormats();
  }
  function install(){
    if(installed)return;installed=true;
    document.title='TACTICAL RECON // R2.1 FIELD TERMINAL';
    document.body.classList.add('r2-runtime');
    ensureDisplaySettingsSheet();
    if(!installDisplayMenuEntry())setTimeout(installDisplayMenuEntry,80);
    installReticleOwnership();
    installLocationCardOwnership();
    const records=document.querySelector('#r1RecordsSheet .r1-sheet-head small');
    if(records)records.textContent='TACTICAL RECON // R2.1';
    new MutationObserver(syncR2Text).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    root.addEventListener('online',()=>{renderReticlePrimary(true);renderLocationFormats();});
    root.addEventListener('offline',()=>{renderReticlePrimary(false);renderLocationFormats();});
    root.r2={
      version:VERSION,
      display:{get:displaySettings,set:saveDisplaySettings,open:openDisplaySettings},
      position:{openMapActions:openMapPositionActions,render:renderLocationFormats}
    };
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})(window);
