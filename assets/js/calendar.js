/* SmartMin AI - Month/week calendar widget */
(function () {
  'use strict';

  const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const WEEK_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
  function sameDay(a, b) { return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate(); }
  function ymd(d) { return d.toISOString().slice(0,10); }

  function colorClassFor(meetingType) {
    if (meetingType === 'capstone') return 'capstone';
    if (meetingType === 'research') return 'research';
    return 'regular';
  }

  function eventDate(ev) {
    if (ev.kind === 'personal') return new Date(`${ev.date}T${ev.time || '00:00'}`);
    return new Date(ev.date);
  }

  function flattenEvents(meetings, personalMeetings) {
    const out = [];
    (meetings || []).forEach(m => out.push({ kind: 'meeting', ...m }));
    (personalMeetings || []).forEach(p => out.push({ kind: 'personal', ...p }));
    return out;
  }

  // Build a month grid for `currentDate`, calling `onClickEvent(ev)` & `onClickDay(d, events)`.
  function buildMonth(currentDate, events) {
    const first = startOfMonth(currentDate);
    const startWeekday = first.getDay();
    const gridStart = addDays(first, -startWeekday);
    const cells = [];
    for (let i = 0; i < 42; i++) {
      const day = addDays(gridStart, i);
      const dayEvents = events.filter(ev => sameDay(eventDate(ev), day));
      cells.push({ day, dayEvents });
    }
    return cells;
  }

  function renderInto(container, opts) {
    const o = Object.assign({
      mode: 'month',
      events: [],
      onEventClick: () => {},
      onDayClick: () => {},
      role: 'guest',
    }, opts);

    let current = new Date(o.initialDate || new Date());

    function rerender() {
      const cells = buildMonth(current, o.events);
      const todayD = new Date();

      const head = WEEK_SHORT.map(w => `<div class="cal-head">${w}</div>`).join('');
      const body = cells.map(c => {
        const muted = c.day.getMonth() !== current.getMonth();
        const isToday = sameDay(c.day, todayD);
        const dayEventsHtml = c.dayEvents.slice(0, 3).map((ev, i) => {
          const t = ev.kind === 'personal' ? 'personal' : colorClassFor(ev.meetingType);
          const label = (ev.title || ev.projectTitle || 'Untitled').slice(0, 28);
          return `<span class="cal-event ${t}" data-ev-idx="${eventIndex(ev, o.events)}">${SmartMin.escapeHtml(label)}</span>`;
        }).join('');
        const more = c.dayEvents.length > 3 ? `<span class="cal-more" data-day="${ymd(c.day)}">+${c.dayEvents.length-3} more</span>` : '';
        return `
          <div class="cal-cell ${muted?'muted':''} ${isToday?'today':''}" data-day="${ymd(c.day)}">
            <span class="cal-daynum">${c.day.getDate()}</span>
            ${dayEventsHtml}
            ${more}
          </div>
        `;
      }).join('');

      container.innerHTML = `
        <div class="bg-surface-container-lowest border border-outline-variant rounded-xl p-md">
          <div class="flex items-center justify-between mb-md flex-wrap gap-sm">
            <div class="flex items-center gap-sm">
              <button class="px-sm py-xs rounded-lg border border-outline-variant hover:bg-surface-container-low" data-act="prev"><span class="material-symbols-outlined text-[18px] align-middle">chevron_left</span></button>
              <button class="px-sm py-xs rounded-lg border border-outline-variant hover:bg-surface-container-low" data-act="today">Today</button>
              <button class="px-sm py-xs rounded-lg border border-outline-variant hover:bg-surface-container-low" data-act="next"><span class="material-symbols-outlined text-[18px] align-middle">chevron_right</span></button>
              <h3 class="font-h3 text-h3 ml-sm">${MONTH_NAMES[current.getMonth()]} ${current.getFullYear()}</h3>
            </div>
            <div class="flex items-center gap-md text-caption font-caption text-on-surface-variant flex-wrap">
              <span class="flex items-center gap-xs"><span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(87,0,0,0.40)"></span> Regular</span>
              <span class="flex items-center gap-xs"><span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(203,167,47,0.65)"></span> Capstone</span>
              <span class="flex items-center gap-xs"><span class="inline-block w-3 h-3 rounded-sm" style="background:rgba(46,125,50,0.40)"></span> Research</span>
              <span class="flex items-center gap-xs"><span class="inline-block w-3 h-3 rounded-sm border border-dashed"></span> Personal</span>
            </div>
          </div>
          <div class="cal-grid">${head}${body}</div>
          <div id="day-detail" class="mt-md"></div>
        </div>
      `;

      container.querySelector('[data-act="prev"]').addEventListener('click', () => { current = new Date(current.getFullYear(), current.getMonth()-1, 1); rerender(); });
      container.querySelector('[data-act="next"]').addEventListener('click', () => { current = new Date(current.getFullYear(), current.getMonth()+1, 1); rerender(); });
      container.querySelector('[data-act="today"]').addEventListener('click', () => { current = new Date(); rerender(); });

      container.querySelectorAll('.cal-event').forEach(el => {
        el.addEventListener('click', e => {
          e.stopPropagation();
          const idx = Number(el.dataset.evIdx);
          if (!Number.isNaN(idx)) o.onEventClick(o.events[idx]);
        });
      });

      container.querySelectorAll('.cal-cell').forEach(el => {
        el.addEventListener('click', e => {
          if (e.target.closest('.cal-event')) return;
          const dayStr = el.dataset.day;
          const day = new Date(dayStr + 'T00:00');
          const events = o.events.filter(ev => sameDay(eventDate(ev), day));
          renderDayDetail(day, events);
          o.onDayClick(day, events);
        });
      });
    }

    function renderDayDetail(day, events) {
      const target = container.querySelector('#day-detail');
      if (!target) return;
      if (!events.length) {
        target.innerHTML = `<div class="border border-dashed border-outline-variant rounded-lg p-md text-on-surface-variant text-body-sm">No events on ${day.toDateString()}.</div>`;
        return;
      }
      target.innerHTML = `
        <h4 class="font-body-md font-semibold mb-sm">${day.toDateString()}</h4>
        <div class="space-y-sm">
        ${events.map(ev => {
          const t = ev.kind === 'personal' ? 'personal' : colorClassFor(ev.meetingType);
          const time = ev.kind === 'personal'
            ? `${ev.time || ''}`
            : SmartMin.fmtDate(ev.date, true).split(',').slice(-1)[0].trim();
          const venue = ev.kind === 'personal' ? (ev.type || 'Personal') : (ev.venue || '');
          return `
            <button class="w-full text-left p-sm rounded-lg border border-outline-variant hover:bg-surface-container-low transition-colors" data-ev-id="${ev.id}">
              <div class="flex items-center gap-sm">
                <span class="cal-event ${t}" style="font-size:10px">${t.toUpperCase()}</span>
                <p class="font-body-sm font-semibold truncate flex-1">${SmartMin.escapeHtml(ev.title || ev.projectTitle || 'Untitled')}</p>
                <span class="font-caption text-caption text-on-surface-variant">${SmartMin.escapeHtml(time)}</span>
              </div>
              <p class="font-caption text-caption text-on-surface-variant ml-[60px]">${SmartMin.escapeHtml(venue)}</p>
            </button>
          `;
        }).join('')}
        </div>
      `;
      target.querySelectorAll('button[data-ev-id]').forEach(b => {
        b.addEventListener('click', () => {
          const ev = events.find(e => e.id === b.dataset.evId);
          if (ev) o.onEventClick(ev);
        });
      });
    }

    rerender();
  }

  function eventIndex(ev, all) {
    return all.findIndex(x => x.id === ev.id && x.kind === ev.kind);
  }

  window.SMCalendar = {
    renderInto,
    flattenEvents,
    MONTH_NAMES, WEEK_SHORT,
  };
})();
