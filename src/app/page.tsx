/*
 * TEMPORARY design-token smoke test. Replaced by the real landing page (a port
 * of the legacy index.html) in the feature-routes phase.
 */
export default function TokenSmokeTest() {
  return (
    <main className="p-lg max-w-container-max mx-auto w-full flex flex-col gap-lg">
      <header className="flex items-center gap-sm">
        <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-primary-md">
          <span className="material-symbols-outlined">account_balance</span>
        </div>
        <div>
          <h1 className="font-h1 text-h1 text-primary">ZPPSU SmartMin</h1>
          <p className="font-caption text-caption text-on-surface-variant">
            Design token smoke test
          </p>
        </div>
      </header>

      <span className="ai-badge">
        <span className="material-symbols-outlined text-[14px]">auto_awesome</span> Local AI
      </span>

      <section className="glass-panel rounded-xl p-md flex flex-col gap-sm">
        <h2 className="font-h2 text-h2 text-on-surface">Panel</h2>
        <p className="font-body-md text-body-md text-on-surface">Body medium copy.</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">Body small copy.</p>
        <p className="font-label-caps text-label-caps text-on-surface">LABEL CAPS</p>
        <div className="flex gap-xs flex-wrap">
          <span className="pill pill-pending">Pending</span>
          <span className="pill pill-progress">In progress</span>
          <span className="pill pill-done">Done</span>
          <span className="pill pill-locked">Locked</span>
          <span className="pill pill-amend">2 amend</span>
          <span className="pill pill-capstone">Capstone</span>
        </div>
      </section>

      <div className="lock-banner">
        <span className="material-symbols-outlined">lock</span>
        <p className="font-body-sm text-body-sm">This document is locked.</p>
      </div>

      <div className="amend-banner">
        <span className="material-symbols-outlined">edit_note</span>
        <p className="font-body-sm text-body-sm">Amendment in progress.</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-md">
        <p className="font-display text-display text-primary">48</p>
      </div>
    </main>
  );
}
