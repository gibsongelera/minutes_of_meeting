/* SmartMin AI - Chart.js helpers for admin dashboards */
(function () {
  'use strict';

  const PRIMARY = '#570000';
  const PRIMARY_LIGHT = 'rgba(87,0,0,0.12)';
  const TERTIARY = '#cba72f';
  const TERTIARY_LIGHT = 'rgba(203,167,47,0.18)';
  const SUCCESS = '#2e7d32';
  const ERROR = '#ba1a1a';
  const OUTLINE = '#e2bfb9';

  function commonOpts(opts = {}) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Inter', size: 12, weight: '600' }, color: '#5a413d' }, position: 'bottom' },
        tooltip: { backgroundColor: '#1a1c1c', titleFont: { family: 'Public Sans', weight: '600' }, padding: 10, cornerRadius: 8 },
      },
      scales: opts.noScales ? {} : {
        x: { grid: { display: false }, ticks: { color: '#5a413d', font: { family: 'Inter', size: 11 } } },
        y: { grid: { color: OUTLINE, drawBorder: false }, ticks: { color: '#5a413d', font: { family: 'Inter', size: 11 } } },
      },
      ...opts.extra,
    };
  }

  function meetingsPerMonth(canvas, meetings) {
    const counts = Array(12).fill(0);
    meetings.forEach(m => {
      const d = new Date(m.date);
      if (!isNaN(d)) counts[d.getMonth()] += 1;
    });
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'Meetings',
          data: counts,
          borderColor: PRIMARY,
          backgroundColor: PRIMARY_LIGHT,
          tension: 0.35,
          fill: true,
          pointRadius: 4,
          pointBackgroundColor: PRIMARY,
        }],
      },
      options: commonOpts(),
    });
  }

  function tasksDoughnut(canvas, tasks) {
    const buckets = { pending: 0, in_progress: 0, done: 0 };
    tasks.forEach(t => { if (buckets[t.status] != null) buckets[t.status]++; });
    return new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'In Progress', 'Done'],
        datasets: [{
          data: [buckets.pending, buckets.in_progress, buckets.done],
          backgroundColor: ['#e2bfb9', TERTIARY, PRIMARY],
          borderColor: '#ffffff',
          borderWidth: 3,
        }],
      },
      options: commonOpts({ noScales: true, extra: { cutout: '65%' } }),
    });
  }

  function usersByRole(canvas, users) {
    const buckets = { admin: 0, head: 0, secretary: 0, faculty: 0 };
    users.forEach(u => { if (buckets[u.role] != null) buckets[u.role]++; });
    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Admin', 'Head', 'Secretary', 'Faculty'],
        datasets: [{
          label: 'Users',
          data: [buckets.admin, buckets.head, buckets.secretary, buckets.faculty],
          backgroundColor: [PRIMARY, '#800000', TERTIARY, '#735c00'],
          borderRadius: 6,
        }],
      },
      options: commonOpts(),
    });
  }

  function aiAccuracyTrend(canvas) {
    // Synthesized monthly accuracy trend (96-99%)
    const data = [96.2, 97.1, 96.8, 97.5, 98.0, 97.9, 98.4, 98.2, 98.6, 98.4, 98.8, 98.9];
    return new Chart(canvas, {
      type: 'line',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'AI Accuracy %',
          data,
          borderColor: TERTIARY,
          backgroundColor: TERTIARY_LIGHT,
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointBackgroundColor: TERTIARY,
        }],
      },
      options: commonOpts({ extra: { scales: { y: { suggestedMin: 95, suggestedMax: 100, grid: { color: OUTLINE }, ticks: { color: '#5a413d' } }, x: { grid: { display: false }, ticks: { color: '#5a413d' } } } } }),
    });
  }

  window.SMCharts = { meetingsPerMonth, tasksDoughnut, usersByRole, aiAccuracyTrend };
})();
