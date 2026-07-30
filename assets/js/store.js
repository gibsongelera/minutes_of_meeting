/* SmartMin AI - Local data store (localStorage + IndexedDB) */
(function () {
  'use strict';

  const LS_KEYS = {
    users: 'sm_users',
    departments: 'sm_departments',
    meetings: 'sm_meetings',
    tasks: 'sm_tasks',
    transcripts: 'sm_transcripts',
    minutes: 'sm_minutes',
    signatures: 'sm_signatures',
    audit: 'sm_audit',
    settings: 'sm_settings',
    notifications: 'sm_notifications',
    offlineQueue: 'sm_offline_queue',
    personalMeetings: 'sm_personal_meetings',
    taxonomy: 'sm_meeting_taxonomy',
    seeded: 'sm_seeded_v3',
  };

  function read(key, fallback) {
    try { const v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); }
    catch { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
  }

  // ============================================================
  // IndexedDB for binary audio storage
  // ============================================================
  const DB_NAME = 'SmartMinDB';
  const DB_VER = 1;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('audio')) {
          db.createObjectStore('audio', { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  async function saveAudio(id, blob, meta = {}) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('audio', 'readwrite');
      tx.objectStore('audio').put({ id, blob, meta, savedAt: Date.now() });
      tx.oncomplete = () => res(id);
      tx.onerror = () => rej(tx.error);
    });
  }

  async function getAudio(id) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('audio', 'readonly');
      const req = tx.objectStore('audio').get(id);
      req.onsuccess = () => res(req.result || null);
      req.onerror = () => rej(req.error);
    });
  }

  async function listAudio() {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('audio', 'readonly');
      const req = tx.objectStore('audio').getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
  }

  async function deleteAudio(id) {
    const db = await openDB();
    return new Promise((res, rej) => {
      const tx = db.transaction('audio', 'readwrite');
      tx.objectStore('audio').delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  }

  // ============================================================
  // Generic CRUD helpers
  // ============================================================
  function listAll(key) { return read(key, []); }
  function getById(key, id) { return read(key, []).find(x => x.id === id) || null; }
  function upsert(key, item) {
    const arr = read(key, []);
    const idx = arr.findIndex(x => x.id === item.id);
    if (idx >= 0) arr[idx] = { ...arr[idx], ...item, updatedAt: Date.now() };
    else arr.unshift({ ...item, createdAt: Date.now(), updatedAt: Date.now() });
    write(key, arr);
    return item;
  }
  function remove(key, id) {
    const arr = read(key, []).filter(x => x.id !== id);
    write(key, arr);
  }

  // ============================================================
  // Scope filters - admin sees everything, others see scoped data
  // ============================================================
  function scopeMeetings(user, meetings) {
    if (!user) return [];
    if (user.role === 'admin') return meetings;
    if (user.role === 'head')      return meetings.filter(m => m.departmentId === user.departmentId);
    if (user.role === 'secretary') return meetings.filter(m => m.departmentId === user.departmentId || m.secretaryId === user.id);
    if (user.role === 'faculty')   return meetings.filter(m => (m.participantIds||[]).includes(user.id) || m.departmentId === user.departmentId);
    return [];
  }

  function scopeTasks(user, tasks) {
    if (!user) return [];
    if (user.role === 'admin') return tasks;
    if (user.role === 'head')      return tasks.filter(t => t.departmentId === user.departmentId);
    if (user.role === 'secretary') return tasks.filter(t => t.departmentId === user.departmentId);
    if (user.role === 'faculty')   return tasks.filter(t => t.assigneeId === user.id);
    return [];
  }

  function scopeUsers(user, users) {
    if (!user) return [];
    if (user.role === 'admin') return users;
    if (user.role === 'head' || user.role === 'secretary')
      return users.filter(u => u.departmentId === user.departmentId);
    return users.filter(u => u.id === user.id);
  }

  function scopePersonalMeetings(user, items) {
    if (!user) return [];
    if (user.role === 'admin') return items;
    return items.filter(p => p.userId === user.id);
  }

  // ============================================================
  // Audit log
  // ============================================================
  function audit(action, detail = '') {
    const user = JSON.parse(localStorage.getItem('sm_currentUser') || 'null');
    const log = read(LS_KEYS.audit, []);
    log.unshift({
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
      ts: Date.now(),
      action,
      detail,
      userId: user?.id || 'anonymous',
      userName: user?.name || 'Anonymous',
      role: user?.role || 'guest',
    });
    if (log.length > 500) log.length = 500;
    write(LS_KEYS.audit, log);
  }

  // ============================================================
  // Settings
  // ============================================================
  function getSettings() {
    return read(LS_KEYS.settings, {
      aiEnabled: true,
      autoTranscribe: true,
      autoSummarize: true,
      autoUploadOnReconnect: true,
      localProcessingOnly: true,
      retentionDays: 365,
      defaultLanguage: 'en-US',
      institutionName: 'Zamboanga Peninsula Polytechnic State University',
      institutionShort: 'ZPPSU',
    });
  }
  function setSettings(s) {
    write(LS_KEYS.settings, { ...getSettings(), ...s });
    audit('settings_changed', Object.keys(s).join(', '));
  }

  // ============================================================
  // Notifications
  // ============================================================
  function pushNotification(notif) {
    const arr = read(LS_KEYS.notifications, []);
    arr.unshift({
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).slice(2,5),
      ts: Date.now(),
      read: false,
      ...notif,
    });
    if (arr.length > 100) arr.length = 100;
    write(LS_KEYS.notifications, arr);
  }

  // ============================================================
  // Locking / amendment helpers
  // ============================================================
  function lockMinutes(minutesId, byUserId) {
    const arr = read(LS_KEYS.minutes, []);
    const i = arr.findIndex(m => m.id === minutesId);
    if (i < 0) return null;
    arr[i] = { ...arr[i], lockedAt: Date.now(), lockedBy: byUserId, status: 'approved' };
    write(LS_KEYS.minutes, arr);
    return arr[i];
  }

  function amendMinutes(minutesId, summary) {
    const arr = read(LS_KEYS.minutes, []);
    const i = arr.findIndex(m => m.id === minutesId);
    if (i < 0) return null;
    const me = JSON.parse(localStorage.getItem('sm_currentUser') || 'null');
    const min = arr[i];
    const amendments = Array.isArray(min.amendments) ? min.amendments.slice() : [];
    amendments.push({ ts: Date.now(), byUserId: me?.id || 'anonymous', byName: me?.name || 'Anonymous', summary: summary || 'Minutes amended after lock' });
    arr[i] = {
      ...min,
      signatures: (min.signatures || []).filter(s => s.role && !/dean|chair|head|president/i.test(s.role)),
      lockedAt: null, lockedBy: null,
      status: 'pending_approval',
      amendments,
    };
    write(LS_KEYS.minutes, arr);

    const meetings = read(LS_KEYS.meetings, []);
    const mi = meetings.findIndex(m => m.id === min.meetingId);
    if (mi >= 0) {
      meetings[mi] = { ...meetings[mi], status: 'pending_approval' };
      write(LS_KEYS.meetings, meetings);
    }
    return arr[i];
  }

  // ============================================================
  // Meeting taxonomy
  // ============================================================
  function getTaxonomy() {
    return read(LS_KEYS.taxonomy, {
      capstone: ['Title Proposal', 'Pre-Oral', 'Mock Defense', 'Final Presentation', 'Other'],
      research: ['Proposal', 'Progress', 'Final'],
    });
  }
  function setTaxonomy(tx) { write(LS_KEYS.taxonomy, tx); audit('taxonomy_updated', Object.keys(tx).join(', ')); }

  // ============================================================
  // Stats helpers
  // ============================================================
  function statsFor(user) {
    const m = scopeMeetings(user, listAll(LS_KEYS.meetings));
    const t = scopeTasks(user, listAll(LS_KEYS.tasks));
    const u = scopeUsers(user, listAll(LS_KEYS.users));
    const now = new Date();
    const thisMonth = m.filter(x => {
      const d = new Date(x.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    return {
      totalUsers: u.length,
      activeUsers: u.filter(x => x.active !== false).length,
      totalMeetings: m.length,
      meetingsThisMonth: thisMonth.length,
      pendingApprovals: m.filter(x => x.status === 'pending_approval').length,
      pendingTasks: t.filter(x => x.status === 'pending').length,
      tasksInProgress: t.filter(x => x.status === 'in_progress').length,
      tasksDone: t.filter(x => x.status === 'done').length,
      aiHoursSaved: Math.round(m.filter(x=>x.aiProcessed).reduce((s,x)=>s + (x.durationMin||30)*0.8/60, 0) * 10) / 10,
    };
  }

  // ============================================================
  // Public API
  // ============================================================
  window.SMStore = {
    KEYS: LS_KEYS,
    read, write, listAll, getById, upsert, remove,
    saveAudio, getAudio, listAudio, deleteAudio, openDB,
    scopeMeetings, scopeTasks, scopeUsers, scopePersonalMeetings,
    audit, getSettings, setSettings, pushNotification, statsFor,
    lockMinutes, amendMinutes,
    getTaxonomy, setTaxonomy,
  };
})();
