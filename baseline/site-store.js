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

  function getUserSites() {
    return userSites.map(item => ({ ...item, source:'USER' }));
  }

  function getSecured() {
    return getRegistered().filter(item => item.status === 'SECURED');
  }

  function find(id) {
    const key = String(id);
    return getRegistered().find(item => String(item.id) === key)
      || getUserSites().find(item => String(item.id) === key)
      || null;
  }

  window.BaselineSites = {
    getRegistered,
    getUserSites,
    getSecured,
    find,
    isSecured,
    secure,
    unsecure
  };
})();
