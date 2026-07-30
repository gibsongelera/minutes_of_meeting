/* SmartMin AI - Shared layout, auth guard, role router, toast system */
(function () {
  'use strict';

  // ============================================================
  // Tailwind theme config (single source of truth for all pages)
  // ============================================================
  window.SmartMinTailwindConfig = {
    darkMode: 'class',
    theme: {
      extend: {
        colors: {
          'on-secondary-container': '#616363',
          'on-error': '#ffffff',
          'on-primary-container': '#ff8371',
          'secondary': '#5d5f5f',
          'on-background': '#1a1c1c',
          'tertiary': '#735c00',
          'surface-bright': '#f9f9f9',
          'primary-container': '#800000',
          'on-secondary-fixed-variant': '#454747',
          'tertiary-fixed': '#ffe088',
          'error': '#ba1a1a',
          'on-tertiary': '#ffffff',
          'on-secondary': '#ffffff',
          'inverse-surface': '#2f3131',
          'surface-container-high': '#e8e8e8',
          'surface-tint': '#b22b1d',
          'primary-fixed': '#ffdad4',
          'on-tertiary-container': '#4e3d00',
          'surface-container-highest': '#e2e2e2',
          'outline-variant': '#e2bfb9',
          'secondary-container': '#dfe0e0',
          'primary-fixed-dim': '#ffb4a8',
          'on-surface-variant': '#5a413d',
          'tertiary-container': '#cba72f',
          'on-secondary-fixed': '#1a1c1c',
          'surface': '#f9f9f9',
          'on-primary-fixed-variant': '#8f0f07',
          'on-primary': '#ffffff',
          'surface-dim': '#dadada',
          'error-container': '#ffdad6',
          'background': '#f9f9f9',
          'surface-container': '#eeeeee',
          'primary': '#570000',
          'on-tertiary-fixed-variant': '#574500',
          'inverse-on-surface': '#f1f1f1',
          'surface-variant': '#e2e2e2',
          'secondary-fixed-dim': '#c6c6c7',
          'on-error-container': '#93000a',
          'secondary-fixed': '#e2e2e2',
          'inverse-primary': '#ffb4a8',
          'on-tertiary-fixed': '#241a00',
          'outline': '#8e706c',
          'surface-container-lowest': '#ffffff',
          'on-primary-fixed': '#410000',
          'on-surface': '#1a1c1c',
          'tertiary-fixed-dim': '#e9c349',
          'surface-container-low': '#f3f3f3',
          'success': '#2e7d32',
          'success-container': 'rgba(46,125,50,0.12)',
        },
        borderRadius: {
          DEFAULT: '0.25rem',
          'lg': '0.5rem',
          'xl': '0.75rem',
          'full': '9999px'
        },
        spacing: {
          'unit': '8px',
          'margin': '32px',
          'lg': '24px',
          'xs': '4px',
          'xxl': '64px',
          'md': '16px',
          'container-max': '1440px',
          'xl': '40px',
          'gutter': '24px',
          'sm': '8px'
        },
        fontFamily: {
          'body-md':   ['Inter'],
          'h1':        ['Public Sans'],
          'h3':        ['Public Sans'],
          'h2':        ['Public Sans'],
          'body-sm':   ['Inter'],
          'label-caps':['Inter'],
          'body-lg':   ['Inter'],
          'caption':   ['Inter'],
          'display':   ['Public Sans']
        },
        fontSize: {
          'body-md':   ['16px', { lineHeight: '1.6', fontWeight: '400' }],
          'h1':        ['32px', { lineHeight: '1.2', fontWeight: '600' }],
          'h3':        ['20px', { lineHeight: '1.4', fontWeight: '600' }],
          'h2':        ['24px', { lineHeight: '1.3', fontWeight: '600' }],
          'body-sm':   ['14px', { lineHeight: '1.5', fontWeight: '400' }],
          'label-caps':['12px', { lineHeight: '1', letterSpacing: '0.05em', fontWeight: '600' }],
          'body-lg':   ['18px', { lineHeight: '1.6', fontWeight: '400' }],
          'caption':   ['12px', { lineHeight: '1.4', fontWeight: '400' }],
          'display':   ['48px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }]
        }
      }
    }
  };

  if (typeof tailwind !== 'undefined') tailwind.config = window.SmartMinTailwindConfig;

  // ============================================================
  // Role & Page protection
  // ============================================================
  const ROLE_DASHBOARDS = {
    admin: '/admin/dashboard.html',
    head: '/head/dashboard.html',
    secretary: '/secretary/dashboard.html',
    faculty: '/faculty/dashboard.html',
  };

  function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('sm_currentUser') || 'null'); }
    catch { return null; }
  }

  function setCurrentUser(user) {
    if (user) localStorage.setItem('sm_currentUser', JSON.stringify(user));
    else localStorage.removeItem('sm_currentUser');
  }

  function logout() {
    if (window.SMStore) window.SMStore.audit('logout', 'User logged out');
    setCurrentUser(null);
    location.href = resolvePath('/login.html');
  }

  // Resolve absolute paths relative to site root regardless of folder depth
  function resolvePath(p) {
    if (!p.startsWith('/')) return p;
    // detect base path - the site lives under /SmartMin/ when served from xampp
    const segments = location.pathname.split('/').filter(Boolean);
    const knownRoles = ['admin', 'head', 'secretary', 'faculty'];
    // walk up until we find the project root
    let basePath = '';
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      if (knownRoles.includes(seg) || seg.endsWith('.html')) break;
      basePath += '/' + seg;
    }
    return basePath + p;
  }

  function guardPage(requiredRole) {
    const user = getCurrentUser();
    if (!user) {
      location.href = resolvePath('/login.html');
      return null;
    }
    if (requiredRole && user.role !== requiredRole) {
      location.href = resolvePath(ROLE_DASHBOARDS[user.role] || '/login.html');
      return null;
    }
    return user;
  }

  // ============================================================
  // Sidebar/topbar injection
  // ============================================================
  const NAV_LINKS = {
    admin: [
      { href: '/admin/dashboard.html',   icon: 'dashboard',       label: 'Dashboard' },
      { href: '/admin/users.html',       icon: 'group',           label: 'User Management' },
      { href: '/admin/departments.html', icon: 'corporate_fare',  label: 'Departments & Offices' },
      { href: '/admin/meetings.html',    icon: 'event_note',      label: 'All Meetings' },
      { href: '/admin/audit.html',       icon: 'security',        label: 'Audit & Privacy' },
      { href: '/admin/settings.html',    icon: 'settings',        label: 'System Settings' },
      { href: '/profile.html',           icon: 'account_circle',  label: 'My Profile' },
    ],
    head: [
      { href: '/head/dashboard.html',  icon: 'dashboard',           label: 'Dashboard' },
      { href: '/head/calendar.html',   icon: 'calendar_month',      label: 'Calendar' },
      { href: '/head/approvals.html',  icon: 'fact_check',          label: 'Approvals & Signing' },
      { href: '/head/delegate.html',   icon: 'view_kanban',         label: 'Task Delegation' },
      { href: '/head/reports.html',    icon: 'assessment',          label: 'Reports' },
      { href: '/profile.html',         icon: 'account_circle',      label: 'My Profile' },
    ],
    secretary: [
      { href: '/secretary/dashboard.html',      icon: 'dashboard',      label: 'Dashboard' },
      { href: '/secretary/calendar.html',       icon: 'calendar_month', label: 'Calendar' },
      { href: '/secretary/schedule.html',       icon: 'event',          label: 'Meeting Schedule' },
      { href: '/secretary/live-recording.html', icon: 'mic',            label: 'Live Recording' },
      { href: '/secretary/upload-audio.html',   icon: 'upload_file',    label: 'Upload Audio' },
      { href: '/secretary/transcript.html',     icon: 'closed_caption', label: 'Transcripts' },
      { href: '/secretary/mom-editor.html',     icon: 'description',    label: 'Document Editor' },
      { href: '/secretary/archives.html',       icon: 'history_edu',    label: 'Archives' },
      { href: '/profile.html',                  icon: 'account_circle', label: 'My Profile' },
    ],
    faculty: [
      { href: '/faculty/dashboard.html',         icon: 'dashboard',      label: 'Dashboard' },
      { href: '/faculty/calendar.html',          icon: 'calendar_month', label: 'Calendar' },
      { href: '/faculty/my-tasks.html',          icon: 'task_alt',       label: 'My Tasks' },
      { href: '/faculty/my-meetings.html',       icon: 'groups',         label: 'My Meetings' },
      { href: '/faculty/personal-meetings.html', icon: 'event_available',label: 'Personal Meetings' },
      { href: '/faculty/transcript-view.html',   icon: 'closed_caption', label: 'Transcripts' },
      { href: '/profile.html',                   icon: 'account_circle', label: 'My Profile' },
    ],
  };

  const ROLE_LABEL = {
    admin: 'System Administrator',
    head: 'College Dean / Head',
    secretary: 'Faculty Secretary',
    faculty: 'Faculty Member',
  };

  function buildSidebar(user) {
    const links = NAV_LINKS[user.role] || [];
    const here = location.pathname.toLowerCase();
    return `
      <aside class="app-sidebar hidden md:flex flex-col h-full w-[280px] py-lg bg-surface-container border-r border-outline-variant fixed left-0 top-0 z-40">
        <div class="px-lg mb-lg flex items-center gap-sm">
          <div class="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-primary-md">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' 1;">account_balance</span>
          </div>
          <div>
            <h1 class="font-h3 text-h3 text-primary leading-tight">ZPPSU SmartMin</h1>
            <p class="font-caption text-caption text-on-surface-variant">Institutional Governance</p>
          </div>
        </div>

        <div class="px-md mb-md">
          <a href="${resolvePath('/secretary/live-recording.html')}" class="w-full bg-primary text-on-primary rounded-lg py-sm px-md flex items-center justify-center gap-xs font-bold shadow-primary-md hover:opacity-90 transition-all text-body-sm ${user.role==='faculty'?'pointer-events-none opacity-50':''}">
            <span class="material-symbols-outlined text-[20px]">mic</span> Quick Record
          </a>
        </div>

        <nav class="flex-1 overflow-y-auto">
          <ul class="space-y-1">
            ${links.map(l => {
              const path = resolvePath(l.href);
              const active = here.endsWith(l.href.toLowerCase());
              return `
                <li>
                  <a href="${path}" class="${active
                    ? 'bg-primary text-on-primary shadow-primary-md font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-highest hover:translate-x-1'} rounded-lg mx-sm my-xs px-md py-sm flex items-center gap-md transition-all duration-200">
                    <span class="material-symbols-outlined">${l.icon}</span>
                    <span class="font-body-md text-body-md">${l.label}</span>
                  </a>
                </li>
              `;
            }).join('')}
          </ul>
        </nav>

        <div class="mt-auto pt-md border-t border-outline-variant mx-sm">
          <a href="${resolvePath('/profile.html')}" class="flex items-center gap-sm px-md py-sm rounded-lg bg-surface-container-low border border-outline-variant mb-sm hover:bg-surface-container-highest transition-colors" title="Open profile">
            ${avatarMarkup(user, 'w-9 h-9 text-body-sm')}
            <div class="min-w-0 flex-1">
              <p class="font-body-sm text-body-sm font-semibold text-on-surface truncate">${escapeHtml(user.name)}</p>
              <p class="font-caption text-caption text-on-surface-variant truncate">${escapeHtml(user.position || ROLE_LABEL[user.role] || user.role)}</p>
            </div>
          </a>
          <button onclick="SmartMin.logout()" class="w-full text-left text-on-surface-variant hover:bg-surface-container-highest rounded-lg px-md py-sm flex items-center gap-md transition-all">
            <span class="material-symbols-outlined">logout</span>
            <span class="font-body-md text-body-md">Sign Out</span>
          </button>
        </div>
      </aside>
    `;
  }

  function buildTopbar(user, opts = {}) {
    const title = opts.title || '';
    return `
      <header class="bg-surface/80 backdrop-blur-md sticky top-0 z-30 shadow-sm border-b border-outline-variant px-lg py-sm flex justify-between items-center w-full h-[64px] no-print">
        <div class="flex items-center gap-md flex-1">
          <button class="md:hidden p-xs text-on-surface" onclick="SmartMin.toggleSidebar()"><span class="material-symbols-outlined">menu</span></button>
          ${title ? `<h2 class="font-h3 text-h3 text-on-surface hidden md:block">${title}</h2>` : ''}
          <div class="relative w-full max-w-md hidden lg:block">
            <span class="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
            <input class="w-full bg-surface-container border-transparent focus:border-primary focus:ring-0 rounded-lg pl-xl pr-md py-sm font-body-sm text-body-sm" placeholder="Search meetings, tasks, or transcripts..." type="text"/>
          </div>
        </div>
        <div class="flex items-center gap-md">
          <span id="net-status" class="hidden md:inline-flex items-center gap-xs px-sm py-xs rounded-full font-label-caps text-label-caps border"></span>
          <button class="p-xs text-on-surface-variant hover:text-primary transition-colors relative" title="Notifications">
            <span class="material-symbols-outlined">notifications</span>
            <span class="absolute top-1 right-1 w-2 h-2 bg-error rounded-full border border-surface"></span>
          </button>
          <div class="w-[1px] h-6 bg-outline-variant mx-xs hidden md:block"></div>
          <a href="${resolvePath('/profile.html')}" class="flex items-center gap-sm hover:opacity-80 transition-opacity">
            <div class="text-right hidden md:block">
              <p class="font-label-caps text-label-caps text-on-surface">${escapeHtml(user.name)}</p>
              <p class="font-caption text-caption text-on-surface-variant">${escapeHtml(ROLE_LABEL[user.role]||user.role)}</p>
            </div>
            ${avatarMarkup(user, 'w-9 h-9 text-body-sm')}
          </a>
        </div>
      </header>
    `;
  }

  function initials(name) {
    return (name || '').split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || '').join('') || 'U';
  }

  function avatarMarkup(user, sizeClasses) {
    const size = sizeClasses || 'w-9 h-9 text-body-sm';
    if (user && user.photoDataUrl) {
      return `<img src="${user.photoDataUrl}" alt="${escapeHtml(user.name||'avatar')}" class="${size} rounded-full object-cover border border-outline-variant" />`;
    }
    return `<div class="${size} rounded-full bg-primary text-on-primary flex items-center justify-center font-bold">${initials(user?.name||'')}</div>`;
  }

  // ============================================================
  // Page bootstrap helper - called from each page's body
  // ============================================================
  function mountLayout(opts = {}) {
    const user = guardPage(opts.requiredRole);
    if (!user) return null;

    // Inject sidebar/topbar into placeholders or prepend to body
    const body = document.body;
    let mountPoint = document.getElementById('app-shell');
    if (!mountPoint) {
      mountPoint = document.createElement('div');
      mountPoint.id = 'app-shell';
      mountPoint.className = 'flex min-h-screen';
      // Move existing children into a main content area
      const main = document.createElement('main');
      main.className = 'app-main flex-1 md:ml-[280px] flex flex-col min-h-screen';
      while (body.firstChild) main.appendChild(body.firstChild);

      mountPoint.innerHTML = buildSidebar(user);
      mountPoint.appendChild(main);
      body.appendChild(mountPoint);

      // Topbar + page content area
      const topbar = document.createElement('div');
      topbar.innerHTML = buildTopbar(user, opts);
      main.insertBefore(topbar.firstElementChild, main.firstChild);
    }

    // Toast stack
    if (!document.getElementById('toast-stack')) {
      const ts = document.createElement('div');
      ts.id = 'toast-stack';
      document.body.appendChild(ts);
    }

    updateNetStatus();
    window.addEventListener('online', () => { updateNetStatus(); flushOfflineQueue(); });
    window.addEventListener('offline', updateNetStatus);

    if (window.SMStore) window.SMStore.audit('page_view', location.pathname.split('/').pop());

    return user;
  }

  function updateNetStatus() {
    const el = document.getElementById('net-status');
    if (!el) return;
    if (navigator.onLine) {
      el.className = 'hidden md:inline-flex items-center gap-xs px-sm py-xs rounded-full font-label-caps text-label-caps border bg-success-container text-success border-success/30';
      el.innerHTML = '<span class="material-symbols-outlined text-[14px]">wifi</span> ONLINE';
    } else {
      el.className = 'hidden md:inline-flex items-center gap-xs px-sm py-xs rounded-full font-label-caps text-label-caps border bg-tertiary-fixed text-on-tertiary-fixed-variant border-tertiary-container/40';
      el.innerHTML = '<span class="material-symbols-outlined text-[14px]">wifi_off</span> OFFLINE MODE';
    }
  }

  async function flushOfflineQueue() {
    if (window.SMRecorder && typeof window.SMRecorder.processQueue === 'function') {
      const n = await window.SMRecorder.processQueue();
      if (n > 0) toast(`Synced ${n} offline recording${n>1?'s':''}. AI processing complete.`, 'ai');
    }
  }

  function toggleSidebar() {
    const sb = document.querySelector('.app-sidebar');
    if (sb) sb.classList.toggle('open');
  }

  // ============================================================
  // Toast notifications
  // ============================================================
  function toast(message, type = 'success', timeout = 4000) {
    let stack = document.getElementById('toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    const icon = type === 'success' ? 'check_circle'
              : type === 'error'   ? 'error'
              : type === 'ai'      ? 'auto_awesome' : 'info';
    el.innerHTML = `
      <span class="material-symbols-outlined text-[20px] ${type==='ai'?'text-tertiary-container':type==='error'?'text-error':type==='success'?'text-success':'text-primary'}">${icon}</span>
      <div class="flex-1 text-on-surface">${message}</div>
      <button class="text-on-surface-variant hover:text-on-surface" onclick="this.parentElement.remove()"><span class="material-symbols-outlined text-[16px]">close</span></button>
    `;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(24px)'; setTimeout(()=>el.remove(), 250); }, timeout);
  }

  // ============================================================
  // Utility helpers exposed globally
  // ============================================================
  function fmtDate(d, withTime = false) {
    if (!d) return '';
    const date = new Date(d);
    const opts = { year: 'numeric', month: 'short', day: 'numeric' };
    if (withTime) { opts.hour = 'numeric'; opts.minute = '2-digit'; }
    return date.toLocaleString('en-US', opts);
  }

  function fmtTime(s) {
    if (s == null) return '00:00';
    s = Math.floor(s);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }

  function uid(prefix = 'id') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  // ============================================================
  // Expose API
  // ============================================================
  window.SmartMin = {
    getCurrentUser, setCurrentUser, logout, mountLayout, guardPage,
    toast, toggleSidebar, resolvePath, fmtDate, fmtTime, uid, escapeHtml,
    initials, avatarMarkup, ROLE_LABEL, ROLE_DASHBOARDS, updateNetStatus,
  };
})();
