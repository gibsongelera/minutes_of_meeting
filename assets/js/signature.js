/* SmartMin AI - Canvas signature pad */
(function () {
  'use strict';

  class SignaturePad {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.strokeStyle = opts.strokeStyle || '#570000';
      this.lineWidth = opts.lineWidth || 2.4;
      this.drawing = false;
      this.points = [];
      this._resize();
      this._bind();
    }

    _resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.ctx.scale(dpr, dpr);
      this.ctx.lineCap = 'round';
      this.ctx.lineJoin = 'round';
      this.ctx.strokeStyle = this.strokeStyle;
      this.ctx.lineWidth = this.lineWidth;
    }

    _coords(e) {
      const rect = this.canvas.getBoundingClientRect();
      const pt = e.touches ? e.touches[0] : e;
      return { x: pt.clientX - rect.left, y: pt.clientY - rect.top };
    }

    _bind() {
      const down = (e) => {
        e.preventDefault();
        this.drawing = true;
        const p = this._coords(e);
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y);
        this.points.push(p);
      };
      const move = (e) => {
        if (!this.drawing) return;
        e.preventDefault();
        const p = this._coords(e);
        this.ctx.lineTo(p.x, p.y);
        this.ctx.stroke();
        this.points.push(p);
      };
      const up = (e) => {
        if (!this.drawing) return;
        this.drawing = false;
      };
      this.canvas.addEventListener('mousedown', down);
      this.canvas.addEventListener('mousemove', move);
      this.canvas.addEventListener('mouseup', up);
      this.canvas.addEventListener('mouseleave', up);
      this.canvas.addEventListener('touchstart', down);
      this.canvas.addEventListener('touchmove', move);
      this.canvas.addEventListener('touchend', up);
    }

    clear() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.points = [];
    }

    isEmpty() { return this.points.length === 0; }

    toDataURL() { return this.canvas.toDataURL('image/png'); }
  }

  // Helper to open a signing modal
  function openSignModal({ title = 'Sign Document', subtitle = '', onConfirm }) {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-md no-print';
    overlay.innerHTML = `
      <div class="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-2xl w-full max-w-[560px] overflow-hidden">
        <div class="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-primary text-on-primary">
          <div>
            <h3 class="font-h3 text-h3">${SmartMin.escapeHtml(title)}</h3>
            ${subtitle ? `<p class="font-caption text-caption opacity-80 mt-xs">${SmartMin.escapeHtml(subtitle)}</p>` : ''}
          </div>
          <button data-close class="text-on-primary hover:opacity-80"><span class="material-symbols-outlined">close</span></button>
        </div>
        <div class="p-lg">
          <p class="font-body-sm text-body-sm text-on-surface-variant mb-sm">Draw your signature below using your mouse or finger.</p>
          <canvas class="sig-canvas" style="height:200px;"></canvas>
          <div class="flex gap-sm justify-end mt-md">
            <button data-clear class="px-md py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container">Clear</button>
            <button data-cancel class="px-md py-sm rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container">Cancel</button>
            <button data-confirm class="px-md py-sm rounded-lg bg-primary text-on-primary shadow-primary-md hover:opacity-90 flex items-center gap-xs">
              <span class="material-symbols-outlined text-[18px]">draw</span> Apply Signature
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const canvas = overlay.querySelector('canvas');
    const pad = new SignaturePad(canvas);
    overlay.querySelector('[data-close]').onclick   = () => overlay.remove();
    overlay.querySelector('[data-cancel]').onclick  = () => overlay.remove();
    overlay.querySelector('[data-clear]').onclick   = () => pad.clear();
    overlay.querySelector('[data-confirm]').onclick = () => {
      if (pad.isEmpty()) { SmartMin.toast('Please draw your signature first', 'error'); return; }
      const url = pad.toDataURL();
      overlay.remove();
      if (onConfirm) onConfirm(url);
    };
  }

  window.SMSignature = { SignaturePad, openSignModal };
})();
