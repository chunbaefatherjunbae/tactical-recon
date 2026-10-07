(() => {
  'use strict';

  const PROGRESS_KEY = 'tr_baseline_site_progress_v1';
  const USER_KEY = 'tr_baseline_user_sites_v1';

  function readObject(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  let progress = readObject(PROGRESS_KEY, {});
  let userSites = readObject(USER_KEY, []);
  if (!Array.isArray(userSites)) userSites = [];

  function emit(reason) {
    window.dispatchEvent(new CustomEvent('baseline-sites-change', {
      detail: { reason }
    }));
  }

  function isSecured(id) {
    return progress[String(id)]?.status === 'SECURED';
  }

  function secure(id) {
    const key = String(id);
    progress[key] = { status:'SECURED', securedAt:Date.now() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    emit('secure');
    return progress[key];
  }

  function unsecure(id) {
    const key = String(id);
    delete progress[key];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    emit('unsecure');
  }

  function getRegistered() {
    return (window.BaselineSiteData?.registered || []).map(item => ({
      ...item,
      status: isSecured(item.id) ? 'SECURED' : 'REGISTERED',
      source: 'REGISTERED'
    }));
  }

  function persistUserSites() {
    localStorage.setItem(USER_KEY, JSON.stringify(userSites));
  }

  function getUserSites() {
    return userSites.map(item => ({ ...item, source:item.source || 'USER' }));
  }

  function getSecured() {
    return [
      ...getRegistered().filter(item => item.status === 'SECURED'),
      ...getUserSites().filter(item => item.status === 'SECURED')
    ];
  }

  function find(id) {
    const key = String(id);
    return getRegistered().find(item => String(item.id) === key)
      || getUserSites().find(item => String(item.id) === key)
      || null;
  }

  function addUserSite(site) {
    if (!site || !Array.isArray(site.coords)) return null;
    const normalized = {
      id:String(site.id || ('USER-' + Date.now())),
      opCode:String(site.opCode || 'USER-SITE'),
      name:String(site.name || '새 거점'),
      cat:String(site.cat || '사용자 거점'),
      coords:[Number(site.coords[0]), Number(site.coords[1])],
      desc:String(site.desc || ''),
      tips:String(site.tips || ''),
      status:site.status === 'SECURED' ? 'SECURED' : 'UNEXPLORED',
      source:String(site.source || 'USER'),
      createdAt:String(site.createdAt || new Date().toISOString())
    };
    userSites = [normalized, ...userSites.filter(item => String(item.id) !== normalized.id)];
    persistUserSites();
    emit('add-user-site');
    return { ...normalized };
  }

  function setLocalStatus(id, status) {
    const key = String(id);
    let changed = false;
    userSites = userSites.map(item => {
      if (String(item.id) !== key) return item;
      changed = true;
      return { ...item, status };
    });
    if (changed) {
      persistUserSites();
      emit(status === 'SECURED' ? 'secure-local' : 'unsecure-local');
    }
    return changed;
  }

  const originalSecure = secure;
  const originalUnsecure = unsecure;

  function secureAny(id) {
    if (getUserSites().some(item => String(item.id) === String(id))) {
      setLocalStatus(id, 'SECURED');
      return { status:'SECURED', securedAt:Date.now() };
    }
    return originalSecure(id);
  }

  function unsecureAny(id) {
    if (getUserSites().some(item => String(item.id) === String(id))) {
      setLocalStatus(id, 'UNEXPLORED');
      return;
    }
    originalUnsecure(id);
  }

  window.BaselineSites = {
    getRegistered,
    getUserSites,
    getSecured,
    find,
    isSecured,
    addUserSite,
    secure:secureAny,
    unsecure:unsecureAny
  };
})();
