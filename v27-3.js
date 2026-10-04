/* Tactical Recon V27.3 language / display persistence / NAV draw */
(() => {
  'use strict';

  document.title = 'TACTICAL RECON // FIELD TERMINAL V27.3.1';
  document.body?.classList.add('v273','v2731');

  const LANG_KEY = 'tactical_recon_language_v1';
  const THEME_KEY = 'tactical_recon_optic_theme_v1';
  const ROAD_KEY = 'tactical_recon_road_boost_v1';
  const LAYERS_KEY = 'tactical_recon_marker_layers_v1';

  const I18N = {
    ko: {
      language:'언어', languageTitle:'언어 / LANGUAGE', korean:'한국어', english:'ENGLISH',
      fieldControls:'운용메뉴', fieldMenu:'운용메뉴', nearby:'탐색범위', layers:'지도표시', display:'화면모드', points:'거점',
      gpsStatus:'GPS 상태', followOn:'자동추적 켬', followOff:'자동추적 끔', roadBoost:'도로강조',
      tempAtReticle:'임시위치 지정', savePoint:'거점저장', setHome:'복귀점 지정', centerHome:'복귀점 이동',
      clearHome:'복귀점 삭제', clearTemp:'임시위치 삭제', registeredRange:'탐색범위',
      mapLayers:'지도표시', reconTask:'정찰 작업', displayMode:'화면모드',
      target:'목표', plan:'경로', menu:'메뉴', search:'탐색', set:'지정', draw:'작도',
      undo:'실행취소', exit:'종료', start:'출발점', via:'경유점', end:'도착점', done:'완료',
      route:'경로선', overlay:'표식선', clear:'지우기', pause:'일시정지', resume:'재개',
      nextLeg:'다음구간', stopNav:'항법종료', more:'더보기', trackRec:'궤적기록', backtrack:'역추적',
      share:'공유', revertLeg:'이전구간', exitTarget:'목표종료', navControls:'항법 제어',
      planPoints:'경로지점', quick:'빠른이동', point:'지점', pointInfo:'거점정보',
      deletePoint:'거점삭제', deleteHome:'복귀점 삭제',
      reference:'기준위치', home:'복귀점', temp:'임시위치', lastGps:'최종수신점',
      registered:'등록', unexplored:'미확인', secured:'확인완료', user:'사용자',
      reticle:'조준점', locationSearch:'위치탐색', targetSearch:'거점탐색', wildRecon:'미확인탐색',
      setPoint:'거점지정', copy:'복사', close:'닫기', cancel:'취소',
      noTarget:'목표 없음', notSet:'미지정', none:'없음', positionRequired:'기준위치 필요',
      gpsNoFix:'GPS 미수신', trackOff:'기록 꺼짐', refShort:'기준 --', hide:'접기',
      paused:'일시정지', stale:'이전수신', referenceTag:'기준위치', address:'주소',
      move:'이동', save:'저장', find:'탐색', northUp:'NORTH UP',
      currentPosition:'현위치', nav:'항법', targetModeTitle:'목표 // 경로계획',
      reticleTelemetry:'조준점 제원', followLabel:'자동추적', all:'전체',
      gpsFieldPosition:'GPS 상태 / 기준위치', loadRoute:'경로 불러오기', exportGpx:'GPX 내보내기',
      mapMove:'지도이동', secure:'확인완료',
      routeDash:'경로선 · 점선', overlaySolid:'표식선 · 실선',
      trackWait:'궤적 대기', trackSaved:'궤적 저장', siteEmpty:'저장된 거점이 없습니다.',
      deleteSite:'삭제', startPoint:'출발점', viaPoint:'경유점', endPoint:'도착점', homePoint:'복귀점'
    },
    en: {
      language:'LANGUAGE', languageTitle:'LANGUAGE', korean:'한국어', english:'ENGLISH',
      fieldControls:'FIELD CONTROLS', fieldMenu:'FIELD MENU', nearby:'SEARCH RANGE', layers:'LAYERS', display:'DISPLAY', points:'SITES',
      gpsStatus:'GPS STATUS', followOn:'FOLLOW ON', followOff:'FOLLOW OFF', roadBoost:'ROAD BOOST',
      tempAtReticle:'TEMP POS @ RETICLE', savePoint:'SAVE SITE', setHome:'SET RETURN PT', centerHome:'GO RETURN PT',
      clearHome:'CLEAR RETURN PT', clearTemp:'CLEAR TEMP POS', registeredRange:'SEARCH RANGE',
      mapLayers:'MAP LAYERS', reconTask:'RECON TASK', displayMode:'DISPLAY',
      target:'OBJECTIVE', plan:'ROUTE', menu:'MENU', search:'SEARCH', set:'SET', draw:'PLOT',
      undo:'UNDO', exit:'EXIT', start:'START', via:'VIA', end:'END', done:'DONE',
      route:'ROUTE', overlay:'OVERLAY', clear:'CLEAR', pause:'PAUSE', resume:'RESUME',
      nextLeg:'NEXT LEG', stopNav:'STOP NAV', more:'MORE', trackRec:'TRACK REC', backtrack:'BACKTRACK',
      share:'SHARE', revertLeg:'PREV LEG', exitTarget:'EXIT OBJECTIVE', navControls:'NAV CONTROLS',
      planPoints:'ROUTE POINTS', quick:'QUICK', point:'POINT', pointInfo:'SITE INFO',
      deletePoint:'DELETE SITE', deleteHome:'DELETE RETURN PT',
      reference:'REF POS', home:'RETURN PT', temp:'TEMP POS', lastGps:'LAST FIX',
      registered:'REGISTERED', unexplored:'UNVERIFIED', secured:'VERIFIED', user:'USER',
      reticle:'RETICLE', locationSearch:'POSITION SEARCH', targetSearch:'SEARCH SITES', wildRecon:'UNVERIFIED RECON',
      setPoint:'SET SITE', copy:'COPY', close:'CLOSE', cancel:'CANCEL',
      noTarget:'NO OBJECTIVE', notSet:'NOT SET', none:'NONE', positionRequired:'REF POS REQUIRED',
      gpsNoFix:'GPS NO FIX', trackOff:'TRACK OFF', refShort:'REF --', hide:'HIDE',
      paused:'PAUSED', stale:'STALE', referenceTag:'REF POS', address:'ADDRESS',
      move:'MOVE', save:'SAVE', find:'SEARCH', northUp:'NORTH UP',
      currentPosition:'CURRENT POSITION', nav:'NAV', targetModeTitle:'OBJECTIVE // ROUTE PLAN',
      reticleTelemetry:'RETICLE TELEMETRY', followLabel:'FOLLOW', all:'ALL',
      gpsFieldPosition:'GPS STATUS / REF POS', loadRoute:'LOAD ROUTE', exportGpx:'EXPORT GPX',
      mapMove:'MOVE MAP', secure:'VERIFIED',
      routeDash:'ROUTE · DASH', overlaySolid:'OVERLAY · SOLID',
      trackWait:'TRACK WAIT', trackSaved:'TRACK SAVED', siteEmpty:'NO SAVED SITES.',
      deleteSite:'DELETE', startPoint:'START PT', viaPoint:'VIA PT', endPoint:'END PT', homePoint:'RETURN PT'
    }
  };

  let currentLanguage = (() => {
    try {
      const saved = localStorage.getItem(LANG_KEY);
      return saved === 'en' || saved === 'ko' ? saved : 'ko';
    } catch (e) { return 'ko'; }
  })();

  window.reconT = key => I18N[currentLanguage]?.[key] ?? I18N.en[key] ?? key;
  window.reconFormatNavElapsed = (total, leg, paused) => {
    const t = typeof formatElapsed === 'function' ? formatElapsed(total) : '00:00:00';
    const l = typeof formatElapsed === 'function' ? formatElapsed(leg) : '00:00:00';
    return currentLanguage === 'ko'
      ? `전체 ${t} · 구간 ${l}${paused ? ' · 일시정지' : ''}`
      : `TOTAL ${t} · LEG ${l}${paused ? ' · PAUSED' : ''}`;
  };

  const SOURCE_KEYS = new Map(Object.entries({
    'FIELD CONTROLS':'fieldControls',
    'FIELD MENU':'fieldMenu',
    'NEARBY':'nearby',
    'LAYERS':'layers',
    'DISPLAY':'display',
    'POINTS':'points',
    'GPS STATUS':'gpsStatus',
    'FOLLOW OFF':'followOff',
    'FOLLOW ON':'followOn',
    'ROAD BOOST':'roadBoost',
    'TEMP POS @ RETICLE':'tempAtReticle',
    'SAVE POINT':'savePoint',
    'SET HOME':'setHome',
    'RECENTER HOME':'centerHome',
    'CLEAR HOME':'clearHome',
    'CLEAR TEMP POS':'clearTemp',
    'REGISTERED RANGE':'registeredRange',
    'MAP MARKER LAYERS':'mapLayers',
    'RECON TASK':'reconTask',
    'DISPLAY MODE':'displayMode',
    'TARGET':'target',
    'PLAN':'plan',
    'MENU':'menu',
    'SEARCH':'search',
    'SET':'set',
    'DRAW':'draw',
    'UNDO':'undo',
    'EXIT':'exit',
    'START':'start',
    'VIA':'via',
    'END':'end',
    'DONE':'done',
    'ROUTE':'route',
    'OVERLAY':'overlay',
    'CLEAR':'clear',
    'PAUSE':'pause',
    'RESUME':'resume',
    'NEXT LEG':'nextLeg',
    'STOP':'stopNav',
    'MORE':'more',
    'TRACK REC':'trackRec',
    'BACKTRACK':'backtrack',
    'SHARE':'share',
    'REVERT LEG':'revertLeg',
    'EXIT TARGET':'exitTarget',
    'NAV CONTROLS':'navControls',
    'PLAN POINTS':'planPoints',
    'QUICK':'quick',
    'POINT':'point',
    'POINT INFO':'pointInfo',
    'DELETE POINT':'deletePoint',
    'DELETE HOME':'deleteHome',
    'REFERENCE':'reference',
    'HOME':'home',
    'HOME / EXIT':'home',
    'TEMP POS':'temp',
    'LAST GPS':'lastGps',
    'HOME POINT':'homePoint',
    'START POINT':'startPoint',
    'VIA POINT':'viaPoint',
    'END POINT':'endPoint',
    'TRACK ACQUIRING':'trackWait',
    'TRACK SAVED':'trackSaved',
    'DRAW ON':'draw',
    'REGISTERED':'registered',
    'UNEXPLORED':'unexplored',
    'SECURED':'secured',
    'USER':'user',
    'LOCATION SEARCH':'locationSearch',
    'NO TARGET':'noTarget',
    'NOT SET':'notSet',
    'NONE':'none',
    'POSITION REQUIRED':'positionRequired',
    'GPS NO FIX':'gpsNoFix',
    'TRACK OFF':'trackOff',
    'REF --':'refShort',
    'HIDE':'hide',
    'COPY':'copy',
    'CLOSE':'close',
    'ADDRESS':'address',
    'NORTH UP':'northUp',
    'TARGET MODE // ROUTE PLAN':'targetModeTitle',
    'RETICLE TELEMETRY':'reticleTelemetry',
    'FOLLOW':'followLabel',
    'ALL':'all',
    'GPS STATUS / FIELD POSITION':'gpsFieldPosition',
    'ROUTE 불러오기':'loadRoute',
    'GPX 내보내기':'exportGpx',
    '지도에서 보기':'mapMove',
    '거점 저장':'savePoint',
    '개척 완료':'secure',
    '거점 탐색':'targetSearch',
    '미개척 정찰':'wildRecon',
    '거점 지정':'setPoint',
    '위치 검색':'locationSearch',
    '좌표 복사':'copy',
    '닫기':'close',
    '취소':'cancel',
    '찾기':'find',
    '삭제':'deletePoint'
  }));

  const UI_ROOTS = [
    '.mfd-bottom-bar', '#fieldControlTray', '#targetModePanel', '#planSearchSheet',
    '#planPointSheet', '#navMoreSheet', '#gpsDetailBackdrop', '#navOpticBackdrop',
    '#pointPlacementBackdrop', '#addressSearchBackdrop', '.telemetry-osd', '#gpsStatusOsd',
    '#wpDrawer', '.sitrep-panel'
  ];

  function bindKnownTexts(root = document) {
    const roots = root === document
      ? UI_ROOTS.map(sel => document.querySelector(sel)).filter(Boolean)
      : [root];
    roots.forEach(scope => {
      scope.querySelectorAll('button,span,strong,div').forEach(el => {
        if (el.dataset.reconI18n || el.childElementCount) return;
        const raw = String(el.textContent || '').trim();
        const key = SOURCE_KEYS.get(raw);
        if (key) el.dataset.reconI18n = key;
      });
    });
  }

  function applyBoundTexts(root = document) {
    root.querySelectorAll('[data-recon-i18n]').forEach(el => {
      const key = el.dataset.reconI18n;
      if (key) el.textContent = window.reconT(key);
    });
  }

  function syncLanguageButtons() {
    document.querySelectorAll('[data-recon-language]').forEach(btn => {
      const active = btn.dataset.reconLanguage === currentLanguage;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
  }

  function syncDynamicLanguage() {
    const search = document.getElementById('navSearchBtn');
    if (search) search.textContent = window.reconT('search');
    const pause = document.getElementById('navPauseBtn');
    if (pause) pause.textContent = window.reconT(pause.getAttribute('aria-pressed') === 'true' ? 'resume' : 'pause');
    const next = document.getElementById('targetNextLegBtn');
    if (next) next.textContent = window.reconT('nextLeg');
    const nextCompact = document.getElementById('navCollapsedNextLegBtn');
    if (nextCompact) nextCompact.textContent = window.reconT('nextLeg');
    const stop = document.getElementById('targetNavStopBtn');
    if (stop) stop.textContent = window.reconT('stopNav');
    const more = document.getElementById('navMoreBtn');
    if (more) more.textContent = window.reconT('more');
    const revert = document.getElementById('navRevertLegBtn');
    if (revert) revert.textContent = window.reconT('revertLeg');
    const temp = document.getElementById('tempQuickBtn');
    if (temp) temp.textContent = currentLanguage === 'ko' ? '임시' : 'TEMP';
    const kind = document.getElementById('targetDrawKindBtn');
    if (kind) kind.textContent = window.reconT(routeDrawKind === 'MARK' ? 'overlay' : 'route');

    document.querySelectorAll('.gps-follow-toggle').forEach(el => {
      if (el.id === 'navPauseBtn') return;
      el.textContent = window.reconT(gpsFollowEnabled ? 'followOn' : 'followOff');
    });

    const navDistanceLabel = document.getElementById('navHudDistanceLabel');
    if (navDistanceLabel && currentLanguage === 'ko') {
      const m = navDistanceLabel.textContent.match(/^DIRECT TO\s+(.+)$/);
      if (m) {
        const role = ({TARGET:'target',VIA:'via',END:'end',START:'start'})[m[1]] || null;
        navDistanceLabel.textContent = role ? `직행 · ${window.reconT(role)}` : navDistanceLabel.textContent;
      }
    }
    const navLeg = document.getElementById('navHudLeg');
    if (navLeg && currentLanguage === 'ko') {
      const m = navLeg.textContent.match(/^LEG\s+([^·]+)·\s*(.+)$/);
      if (m) {
        const rawRole = m[2].trim();
        const role = ({TARGET:'target',VIA:'via',END:'end',START:'start'})[rawRole];
        navLeg.textContent = `구간 ${m[1].trim()} · ${role ? window.reconT(role) : rawRole}`;
      }
    }
    const navRef = document.getElementById('navHudRef');
    if (navRef && currentLanguage === 'ko' && /^REF\s+/.test(navRef.textContent)) {
      const raw = navRef.textContent.replace(/^REF\s+/, '').trim();
      const key = raw === 'TEMP POS' ? 'temp' : raw === 'LAST GPS' ? 'lastGps' : null;
      navRef.textContent = `기준 ${key ? window.reconT(key) : raw}`;
    }

    const navDrawKind = document.getElementById('navDrawKindBtn');
    if (navDrawKind) navDrawKind.textContent = window.reconT(routeDrawKind === 'MARK' ? 'overlay' : 'route');
    const navDrawUndo = document.getElementById('navDrawUndoBtn');
    if (navDrawUndo) navDrawUndo.textContent = window.reconT('undo');
    const navDrawClear = document.getElementById('navDrawClearBtn');
    if (navDrawClear) navDrawClear.textContent = window.reconT('clear');
    const navDrawDone = document.getElementById('navDrawDoneBtn');
    if (navDrawDone) navDrawDone.textContent = window.reconT('done');

    document.querySelectorAll('.v2721-reference-head .wp-group-name').forEach(el => el.textContent = window.reconT('reference'));
    document.querySelectorAll('.v2721-reference-item').forEach(item => {
      const status = item.querySelector('.wp-item-status');
      const name = item.querySelector('.wp-item-name');
      const rawName = String(name?.textContent || '').trim();
      if (name) {
        if (['HOME / EXIT','HOME','복귀점'].includes(rawName)) name.textContent = window.reconT('home');
        else if (['TEMP POS','임시위치'].includes(rawName)) name.textContent = window.reconT('temp');
        else if (['LAST GPS','최근수신점'].includes(rawName)) name.textContent = window.reconT('lastGps');
      }
      if (status) {
        const isStale = /STALE|이전수신/.test(status.textContent);
        const type = rawName.includes('LAST') || rawName === '최근수신점' ? 'lastGps'
          : rawName.includes('TEMP') || rawName === '임시위치' ? 'temp' : 'home';
        status.textContent = `[${window.reconT(isStale ? 'stale' : 'referenceTag')}] ${window.reconT(type)}`;
      }
    });

    const drawButton = document.getElementById('targetDrawBtn');
    if (drawButton) drawButton.textContent = window.reconT('draw');

    const drawKindButton = document.getElementById('targetDrawKindBtn');
    if (drawKindButton) drawKindButton.textContent = window.reconT(routeDrawKind === 'MARK' ? 'overlaySolid' : 'routeDash');

    const navTrack = document.getElementById('navHudTrack');
    if (navTrack) {
      const raw = String(navTrack.textContent || '').trim();
      const km = raw.match(/·\s*([\d.]+\s*KM)$/)?.[1] || '';
      if (/TRACK ACQUIRING|궤적 대기/.test(raw)) navTrack.textContent = window.reconT('trackWait');
      else if (/TRACK REC|궤적기록/.test(raw)) navTrack.textContent = `${window.reconT('trackRec')}${km ? ` · ${km}` : ''}`;
      else if (/TRACK SAVED|궤적 저장/.test(raw)) navTrack.textContent = `${window.reconT('trackSaved')}${km ? ` · ${km}` : ''}`;
      else if (/TRACK OFF|기록 꺼짐/.test(raw)) navTrack.textContent = window.reconT('trackOff');
    }

    const pointType = document.getElementById('planPointType');
    if (pointType) {
      const raw = String(pointType.textContent || '').trim();
      const key = /HOME|복귀/.test(raw) ? 'homePoint'
        : /START|출발/.test(raw) ? 'startPoint'
        : /VIA|경유/.test(raw) ? 'viaPoint'
        : /END|도착/.test(raw) ? 'endPoint' : null;
      if (key) pointType.textContent = window.reconT(key);
    }

    document.querySelectorAll('#wpDrawer .wp-group:not(.v2721-reference-group)').forEach(section => {
      const groupName = section.querySelector('.wp-group-name');
      const rawGroup = String(groupName?.textContent || '').trim();
      const groupKey =
        ['REGISTERED','등록'].includes(rawGroup) ? 'registered' :
        ['UNEXPLORED','UNVERIFIED','미확인'].includes(rawGroup) ? 'unexplored' :
        ['SECURED','VERIFIED','확인완료'].includes(rawGroup) ? 'secured' :
        ['USER','사용자'].includes(rawGroup) ? 'user' : null;
      if (groupName && groupKey) groupName.textContent = window.reconT(groupKey);

      section.querySelectorAll('.wp-item-status').forEach(status => {
        const raw = String(status.textContent || '');
        const match = raw.match(/^\[([^\]]+)\]\s*(.*)$/);
        if (!match) return;
        const translated = match[1].split('·').map(part => {
          const token = part.trim();
          if (token === 'REGISTERED' || token === '등록') return window.reconT('registered');
          if (token === 'UNEXPLORED' || token === 'UNVERIFIED' || token === '미확인') return window.reconT('unexplored');
          if (token === 'SECURED' || token === 'VERIFIED' || token === '확인완료') return window.reconT('secured');
          if (token === 'USER' || token === '사용자') return window.reconT('user');
          return token;
        }).join(' · ');
        status.textContent = `[${translated}] ${match[2]}`;
      });

      section.querySelectorAll('.wp-item-delete').forEach(btn => btn.textContent = window.reconT('deleteSite'));
    });

    const empty = document.querySelector('#wpListContainer > div');
    if (empty && /저장된 POINTS가 없습니다|NO SAVED SITES/.test(empty.textContent || '')) {
      empty.textContent = window.reconT('siteEmpty');
    }

    syncSiteCounter();
    syncLanguageButtons();
  }

  function applyLanguage() {
    document.documentElement.lang = currentLanguage;
    bindKnownTexts();
    applyBoundTexts();
    syncDynamicLanguage();
    try { updateTargetModePanel(); } catch (e) {}
    try { renderWpDrawerList(); } catch (e) {}
  }

  function setLanguage(lang) {
    if (lang !== 'ko' && lang !== 'en') return;
    currentLanguage = lang;
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    applyLanguage();
    const title = document.getElementById('fieldControlTitle');
    if (document.getElementById('control-language')?.classList.contains('active') && title) {
      title.textContent = window.reconT('languageTitle');
    }
  }
  window.setReconLanguage = setLanguage;

  function ensureLanguagePanel() {
    const tray = document.getElementById('fieldControlTray');
    const menuGrid = document.querySelector('#control-menu .v26-menu-grid');
    if (!tray || !menuGrid) return;

    if (!document.getElementById('languageSettingsBtn')) {
      const btn = document.createElement('button');
      btn.className = 'osb-btn';
      btn.id = 'languageSettingsBtn';
      btn.type = 'button';
      btn.dataset.reconI18n = 'language';
      btn.onclick = () => {
        openFieldControls('language');
        const title = document.getElementById('fieldControlTitle');
        if (title) title.textContent = window.reconT('languageTitle');
      };
      const displayBtn = [...menuGrid.querySelectorAll('button')].find(el => String(el.getAttribute('onclick') || '').includes("openFieldControls('optic')"));
      if (displayBtn) displayBtn.insertAdjacentElement('afterend', btn);
      else menuGrid.appendChild(btn);
    }

    if (!document.getElementById('control-language')) {
      const section = document.createElement('div');
      section.className = 'field-control-section';
      section.id = 'control-language';
      section.innerHTML = `
        <div style="font-size:9px;color:var(--field-dim);margin-bottom:6px;" data-recon-i18n="languageTitle">LANGUAGE</div>
        <div class="language-option-grid">
          <button class="osb-btn" type="button" data-recon-language="ko">한국어</button>
          <button class="osb-btn" type="button" data-recon-language="en">ENGLISH</button>
        </div>
      `;
      section.querySelector('[data-recon-language="ko"]').onclick = () => setLanguage('ko');
      section.querySelector('[data-recon-language="en"]').onclick = () => setLanguage('en');
      tray.appendChild(section);
    }
    syncLanguageButtons();
  }

  // The global adaptive position control owns RECENTER/CENTERED/FOLLOW.
  // Keep it permanently visible and use the freed bottom slot for SITES.
  document.getElementById('primaryCenterBtn')?.remove();

  function ensureMainSitesButton() {
    const cluster = document.querySelector('.v26-main-cluster');
    const sites = document.getElementById('btnWpCount');
    if (!cluster || !sites) return;
    const menuButton = [...cluster.querySelectorAll('button')].find(el => String(el.getAttribute('onclick') || '').includes("openFieldControls('menu')"));
    sites.classList.add('v26-primary');
    sites.onclick = () => { try { closeFieldControls(); } catch (e) {} openWpDrawer(); };
    sites.dataset.reconI18n = 'points';
    if (sites.parentElement !== cluster || (menuButton && sites.nextElementSibling !== menuButton)) {
      cluster.insertBefore(sites, menuButton || null);
    }
  }

  function syncSiteCounter() {
    const counter = document.getElementById('btnWpCount');
    if (!counter) return;
    let count = 0;
    try { count = getWaypoints('ALL').length; } catch (e) {}
    counter.textContent = count > 0 ? `${window.reconT('points')} (${count})` : window.reconT('points');
  }

  const baseUpdateWpCounterV2731 = updateWpCounter;
  updateWpCounter = function() {
    try { baseUpdateWpCounterV2731(); } catch (e) {}
    syncSiteCounter();
  };

  // Persist DISPLAY theme, road emphasis and marker-layer visibility only.
  const baseSetOpticThemeV273 = setOpticTheme;
  setOpticTheme = function(themeName, btn) {
    const out = baseSetOpticThemeV273(themeName, btn);
    try { localStorage.setItem(THEME_KEY, themeName); } catch (e) {}
    return out;
  };

  const baseToggleRoadBoostV273 = toggleRoadBoost;
  toggleRoadBoost = function(btn) {
    const out = baseToggleRoadBoostV273(btn);
    try { localStorage.setItem(ROAD_KEY, roadBoostEnabled ? '1' : '0'); } catch (e) {}
    return out;
  };

  const baseToggleMapLayerV273 = toggleMapLayer;
  toggleMapLayer = function(layerKey, btn) {
    const out = baseToggleMapLayerV273(layerKey, btn);
    try { localStorage.setItem(LAYERS_KEY, JSON.stringify(markerLayerVisibility)); } catch (e) {}
    return out;
  };

  function restoreDisplayPreferences() {
    try {
      const theme = localStorage.getItem(THEME_KEY);
      if (['stealth','nvg-green','nvg-white','flir'].includes(theme)) setOpticTheme(theme, null);

      const savedLayers = JSON.parse(localStorage.getItem(LAYERS_KEY) || 'null');
      if (savedLayers && typeof savedLayers === 'object') {
        Object.keys(markerLayerVisibility).forEach(key => {
          if (typeof savedLayers[key] === 'boolean') markerLayerVisibility[key] = savedLayers[key];
        });
        document.querySelectorAll('[data-layer]').forEach(btn => {
          const key = btn.dataset.layer;
          if (!(key in markerLayerVisibility)) return;
          btn.classList.toggle('active', markerLayerVisibility[key]);
          btn.setAttribute('aria-pressed', String(markerLayerVisibility[key]));
        });
        syncMarkerVisibility();
      }

      if (localStorage.getItem(ROAD_KEY) === '1' && !roadBoostEnabled) {
        roadBoostEnabled = true;
        if (!map.hasLayer(roadBoostLayer)) roadBoostLayer.addTo(map);
        document.getElementById('roadBoostBtn')?.classList.add('active');
      }
    } catch (e) {}
  }

  // Allow DRAW while NAV remains active. NAV phase/timers/reference are untouched.
  let navDrawMode = false;
  let drawZoomSnapBefore = null;

  const baseSetMapRouteDrawInteractionV273 = setMapRouteDrawInteraction;
  setMapRouteDrawInteraction = function(enabled) {
    const allowed = targetModeActive && (targetModePhase === 'PLAN' || (targetModePhase === 'NAV' && navDrawMode));
    if (targetModePhase !== 'NAV') {
      if (enabled && drawZoomSnapBefore === null) drawZoomSnapBefore = map.options.zoomSnap;
      const out = baseSetMapRouteDrawInteractionV273(Boolean(enabled && allowed));
      if (routeDrawEnabled) map.options.zoomSnap = 0;
      else if (drawZoomSnapBefore !== null) {
        const z = map.getZoom();
        map.options.zoomSnap = drawZoomSnapBefore;
        drawZoomSnapBefore = null;
        map.setZoom(Math.round(z * 4) / 4, { animate:false });
      }
      return out;
    }

    const container = map.getContainer();
    routeDrawEnabled = Boolean(enabled && allowed);
    container.classList.toggle('route-draw-active', routeDrawEnabled);
    resetRouteGestureState(true);

    if (routeDrawEnabled) {
      if (drawZoomSnapBefore === null) drawZoomSnapBefore = map.options.zoomSnap;
      map.options.zoomSnap = 0;
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.enable();
      if (map.boxZoom) map.boxZoom.disable();
      if (gpsFollowEnabled) setGpsFollow(false, false);
    } else {
      map.dragging.enable();
      map.touchZoom.enable();
      map.doubleClickZoom.enable();
      map.scrollWheelZoom.enable();
      if (map.boxZoom) map.boxZoom.enable();
      if (drawZoomSnapBefore !== null) {
        const z = map.getZoom();
        map.options.zoomSnap = drawZoomSnapBefore;
        drawZoomSnapBefore = null;
        map.setZoom(Math.round(z * 4) / 4, { animate:false });
      }
    }
    updateTargetModePanel();
  };

  // Replace the threshold-based 0.25-step pinch with continuous fractional zoom.
  const legacyRoutePointerMoveV273 = handleRoutePointerMove;
  try { routeMapContainer.removeEventListener('pointermove', legacyRoutePointerMoveV273); } catch (e) {}

  handleRoutePointerMove = function(event) {
    if (!targetModeActive || !routeDrawEnabled || !routeActivePointers.has(event.pointerId)) return;
    const point = routeContainerPoint(event);
    routeActivePointers.set(event.pointerId, point);
    event.preventDefault();

    if (routeGestureMode) {
      const pair = routeGesturePair();
      if (!pair) return;
      const metrics = routeGestureMetrics(pair);

      if (routeGestureLastCenter) {
        const dx = metrics.center.x - routeGestureLastCenter.x;
        const dy = metrics.center.y - routeGestureLastCenter.y;
        if (Math.abs(dx) + Math.abs(dy) > 0.25) map.panBy([-dx, -dy], { animate:false, noMoveStart:true });
      }

      if (routeGestureLastDistance > 0 && metrics.distance > 0) {
        const ratio = metrics.distance / routeGestureLastDistance;
        const zoomDelta = Math.log2(ratio);
        if (Math.abs(zoomDelta) > 0.0025) {
          const nextZoom = Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), map.getZoom() + zoomDelta));
          map.setZoomAround(metrics.center, nextZoom, { animate:false });
          routeGestureLastDistance = metrics.distance;
        }
      }
      routeGestureLastCenter = metrics.center;
      return;
    }

    if (routePointerId !== event.pointerId || !routeCurrentSegment) return;
    const latlng = map.containerPointToLatLng(point);
    const next = [latlng.lat, latlng.lng];
    const prev = routeCurrentSegment[routeCurrentSegment.length - 1];
    const prevPx = map.latLngToContainerPoint(prev);
    if (prevPx.distanceTo(point) < 5) return;
    routeCurrentSegment.push(next);
    routeCurrentPolyline?.setLatLngs(routeCurrentSegment);
  };
  routeMapContainer.addEventListener('pointermove', handleRoutePointerMove, { passive:false });

  function ensureNavDrawControls() {
    const toolbar = document.getElementById('targetModeToolbar');
    if (toolbar && !document.getElementById('navDrawKindBtn')) {
      const specs = [
        ['navDrawKindBtn','route', () => {
          if (!navDrawMode || targetModePhase !== 'NAV') return;
          routeDrawKind = routeDrawKind === 'MARK' ? 'ROUTE' : 'MARK';
          if (routeCurrentPolyline) cancelCurrentRouteStroke();
          updateTargetModePanel();
        }],
        ['navDrawUndoBtn','undo', () => {
          if (!navDrawMode || targetModePhase !== 'NAV') return;
          undoRouteStroke();
          updateTargetModePanel();
        }],
        ['navDrawClearBtn','clear', () => {
          if (!navDrawMode || targetModePhase !== 'NAV') return;
          clearRouteDraft();
          updateTargetModePanel();
        }],
        ['navDrawDoneBtn','done', () => exitNavDrawMode(true)]
      ];
      specs.forEach(([id,key,handler]) => {
        const b = document.createElement('button');
        b.className = 'osb-btn nav-draw-only';
        b.id = id;
        b.type = 'button';
        b.textContent = window.reconT(key);
        b.onclick = handler;
        toolbar.appendChild(b);
      });
    }

    const grid = document.querySelector('#navMoreSheet .v271-more-grid');
    if (grid && !document.getElementById('navDrawBtn')) {
      const b = document.createElement('button');
      b.className = 'osb-btn';
      b.id = 'navDrawBtn';
      b.type = 'button';
      b.dataset.reconI18n = 'draw';
      b.textContent = window.reconT('draw');
      b.onclick = enterNavDrawMode;
      grid.insertBefore(b, grid.firstChild);
    }
  }

  function enterNavDrawMode() {
    if (!targetModeActive || targetModePhase !== 'NAV') return;
    closeNavMore();
    closePlanSearch();
    closePlanPointInfo();
    navDrawMode = true;
    document.body.classList.add('nav-draw-submode');
    setMapRouteDrawInteraction(true);
    updateTargetModePanel();
  }
  window.enterNavDrawMode = enterNavDrawMode;

  function exitNavDrawMode(save = true) {
    if (!navDrawMode) return;
    setMapRouteDrawInteraction(false);
    navDrawMode = false;
    document.body.classList.remove('nav-draw-submode');
    if (save && routeDirty) {
      try { saveTargetRoute(); } catch (e) {}
    }
    updateTargetModePanel();
  }
  window.exitNavDrawMode = exitNavDrawMode;

  const baseExitPlanSubmodeV2731 = exitPlanSubmode;
  exitPlanSubmode = function() {
    const needsSave = Boolean(targetModeActive && targetModePhase === 'PLAN' &&
      (routeDirty || (routeCurrentSegment && routeCurrentSegment.length >= 2)));
    if (needsSave && !saveTargetRoute()) return;
    return baseExitPlanSubmodeV2731();
  };

  const baseReturnToTargetPlanV273 = returnToTargetPlan;
  returnToTargetPlan = function() {
    if (navDrawMode) exitNavDrawMode(true);
    return baseReturnToTargetPlanV273();
  };

  const baseExitTargetModeV273 = exitTargetMode;
  exitTargetMode = function(force = false) {
    if (navDrawMode) exitNavDrawMode(true);
    return baseExitTargetModeV273(force);
  };

  const baseOpenFieldControlsV273 = openFieldControls;
  openFieldControls = function(section) {
    const out = baseOpenFieldControlsV273(section);
    const title = document.getElementById('fieldControlTitle');
    const keyMap = {
      menu:'fieldMenu', radar:'nearby', layers:'layers', target:'reconTask', optic:'displayMode', language:'languageTitle'
    };
    if (title && keyMap[section]) title.textContent = window.reconT(keyMap[section]);
    bindKnownTexts(document.getElementById('fieldControlTray'));
    applyBoundTexts(document.getElementById('fieldControlTray'));
    syncDynamicLanguage();
    return out;
  };

  const baseRefreshGpsPowerUiV273 = refreshGpsPowerUi;
  refreshGpsPowerUi = function() {
    const out = baseRefreshGpsPowerUiV273();
    syncDynamicLanguage();
    return out;
  };

  const baseRenderWpDrawerListV273 = renderWpDrawerList;
  renderWpDrawerList = function() {
    const out = baseRenderWpDrawerListV273();
    bindKnownTexts(document.getElementById('wpDrawer'));
    applyBoundTexts(document.getElementById('wpDrawer'));
    syncDynamicLanguage();
    return out;
  };

  const baseUpdateTargetModePanelV273 = updateTargetModePanel;
  updateTargetModePanel = function() {
    const out = baseUpdateTargetModePanelV273();
    document.body.classList.toggle('nav-draw-submode', Boolean(navDrawMode && targetModeActive && targetModePhase === 'NAV'));
    ensureNavDrawControls();
    bindKnownTexts(document.getElementById('targetModePanel'));
    applyBoundTexts(document.getElementById('targetModePanel'));
    syncDynamicLanguage();

    const undo = document.getElementById('navDrawUndoBtn');
    const clear = document.getElementById('navDrawClearBtn');
    const bucket = routeDrawKind === 'MARK' ? routeMarkSegments : routeDraftSegments;
    if (undo) undo.disabled = !bucket.length;
    if (clear) clear.disabled = !bucket.length;
    return out;
  };

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navDrawMode) {
      event.preventDefault();
      event.stopImmediatePropagation();
      exitNavDrawMode(true);
    }
  }, true);

  ensureMainSitesButton();
  ensureLanguagePanel();
  ensureNavDrawControls();
  restoreDisplayPreferences();
  applyLanguage();
  syncSiteCounter();
})();
