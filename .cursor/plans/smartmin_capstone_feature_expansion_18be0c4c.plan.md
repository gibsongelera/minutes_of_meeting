---
name: SmartMin Capstone Feature Expansion
overview: "Layer the consolidated capstone-defense feature set onto the existing SmartMin HTML/CSS/JS demo: dynamic meeting types with Capstone fields, document locking with amendment workflow, calendar view, faculty personal-meetings module, user profiles with photo, inclusive UI terminology, comments, dynamic document titles, pre-print selection, and folder-organized archives with auto-generated filenames."
todos:
  - id: data-model
    content: "Extend assets/js/seed.js + store.js: add meetingType/subType/projectTitle/chairpersonId/panelMemberIds/adviserId on meetings, lockedAt/lockedBy/amendments/comments/documentTitle on minutes, comments[] on transcripts, photoDataUrl on users, new personalMeetings LS key. Activate u_s2 (cross-dept secretary). Seed 2 Capstone meetings (Title Proposal + Final Presentation) with full panel and project title."
    status: completed
  - id: nav-terminology
    content: Update assets/js/shared.js NAV_LINKS with inclusive labels for the Secretary section (Meeting Schedule, Live Recording, Document Editor). Add Calendar entry to all roles, Profile entry to all roles, Personal Meetings entry to faculty. Render photo avatar (when user.photoDataUrl set) in topbar + sidebar identity chip, falling back to initials.
    status: completed
  - id: profile-page
    content: "Build profile.html (single shared page; mountLayout with no requiredRole): view/edit name + position + optional photo. Drag-drop and file picker for photo, preview, FileReader -> data URL, persisted via SMStore.upsert(users). Enforce explicitly no age/gender fields. Audit profile_updated."
    status: completed
  - id: calendar
    content: Build assets/js/calendar.js month grid widget (week toggle, color-coded by meetingType, click-date opens day list, click-meeting opens role-appropriate page). Add secretary/calendar.html, head/calendar.html, faculty/calendar.html — each scoped via SMStore.scopeMeetings. Faculty calendar overlays personalMeetings.
    status: completed
  - id: dynamic-schedule
    content: "Extend secretary/schedule.html: add Meeting Type (Regular | Capstone | Research) and Sub-Type select. Reveal Capstone fields (Chairperson, Panel Members multi-select, Adviser, Project Title) when meetingType=capstone (Research analogue when meetingType=research). Auto-derive default documentTitle from type+subType+projectTitle via summarizer.docTitleFor helper."
    status: completed
  - id: locking-amendment
    content: "Implement locking in head/approvals.html: on final Head sign, set min.lockedAt/lockedBy + meeting.status='approved'. In secretary/mom-editor.html: detect locked, show amber amendment banner; on save, clear Head signature, revert minutes.status='pending_approval' + meeting.status='pending_approval', audit minutes_amended, push notification to chairId. Add lock pill to admin/meetings.html status column."
    status: completed
  - id: mom-dynamic-comments
    content: "secretary/mom-editor.html: replace hard-coded title with docTitleFor(meeting); render Capstone meta block (project title, panel, adviser) when capstone; add Pre-Print modal (confirm/override subType, sets document.title to ProjectTitle_SubType_YYYY-MM-DD before window.print, then resets); add Comments section persisted to minutes.comments[]. Mirror dynamic title in head/approvals.html document viewer."
    status: completed
  - id: transcript-comments
    content: Add Comments panel to secretary/transcript.html (post + reply, stored on transcript.comments[]). Add read-only comments view to faculty/transcript-view.html for participants only. Audit comment_posted per entry; toast on post.
    status: completed
  - id: archives-personal
    content: "Rework secretary/archives.html into folder-style grouping by meetingType (tabs: Regular | Capstone — by subType | Research — by subType) with filter chips, auto-generated filename hint shown on each card. Build faculty/personal-meetings.html: create/list/edit/delete personal meetings (date, time, type, title, attendees, notes); simple print export; surfaces on faculty dashboard."
    status: completed
  - id: polish-smoketest
    content: Print stylesheet refinements (hide .lock-banner, .amend-banner, .comments-panel, .pre-print-modal). Audit log for every new mutation (lock, amend, comment, profile_updated, personal_meeting_created, calendar_view). Notification routing (head on amend; secretary on lock; faculty on transcript comment). Update README.md walkthrough with the new capstone flow. Smoke-test end-to-end on http://localhost/SmartMin/.
    status: completed
isProject: false
---

# SmartMin Capstone Feature Expansion

## Context

The base SmartMin demo (38 files, ~280 KB) is already in place at `c:\xampp\htdocs\SmartMin`. This plan adds the consolidated capstone-defense feature set you pasted, without breaking the existing flows. Constraints from your panel notes: **HTML, CSS, vanilla JS only; no database yet**. Locking behavior is `amend` (edit clears Head's signature and reverts to pending). Calendar is per-role.

## Decisions locked in

- **Lock workflow**: Head signature locks the minutes. Secretary may still edit, but on save the Head's signature is cleared, status reverts to `pending_approval`, the Head is re-notified, and an `minutes_amended` audit entry is written.
- **Calendar**: separate page per role, sharing one widget. Faculty calendar also overlays personal meetings.
- **Meeting taxonomy** (default; configurable in admin settings later):
  - `regular` — Faculty Senate, Department Sync, etc. (current behavior)
  - `capstone` with sub-types: `Title Proposal`, `Pre-Oral`, `Mock Defense`, `Final Presentation`, `Other`
  - `research` with sub-types: `Proposal`, `Progress`, `Final`
- **Profile**: name, position, optional photo (data URL). No age, no gender, anywhere.
- **UI terminology**: nav labels use inclusive role-neutral phrasing ("Meeting Schedule", "Live Recording", "Document Editor"). The role name remains only on the user identity chip.

## New data flow (high level)

```mermaid
flowchart LR
    schedule["Schedule meeting (type + subType)"] --> capstoneFields["Capstone fields: chair, panel, adviser, project title"]
    capstoneFields --> record["Live recording / upload"]
    record --> transcript["Transcript + comments"]
    transcript --> momDraft["Minutes draft (dynamic title)"]
    momDraft --> headSign["Head signs"]
    headSign --> locked["Locked + status=approved"]
    locked --> secEdit{"Secretary edits?"}
    secEdit -- "yes" --> amend["Clear Head sig, revert to pending, notify Head"]
    secEdit -- "no" --> printFlow["Pre-print modal: pick subType, auto filename, print/PDF"]
    amend --> headSign
    printFlow --> archives["Archives grouped by meeting type"]
    schedule --> calendar["Calendar (per role)"]
    personalMeeting["Faculty personal meeting"] --> calendar
```

## Files affected (cited)

**New files**
- `c:\xampp\htdocs\SmartMin\assets\js\calendar.js` — month/week grid widget
- `c:\xampp\htdocs\SmartMin\profile.html` — single page reused by every role
- `c:\xampp\htdocs\SmartMin\secretary\calendar.html`
- `c:\xampp\htdocs\SmartMin\head\calendar.html`
- `c:\xampp\htdocs\SmartMin\faculty\calendar.html`
- `c:\xampp\htdocs\SmartMin\faculty\personal-meetings.html`

**Modified files**
- [`assets/js/seed.js`](assets/js/seed.js) — extend schema, add 2 capstone meetings, activate cross-dept secretary `u_s2`
- [`assets/js/store.js`](assets/js/store.js) — new LS keys (`personalMeetings`, `comments`), helpers for lock/unlock/amend, photo persistence
- [`assets/js/shared.js`](assets/js/shared.js) — inclusive `NAV_LINKS` labels, add Calendar/Profile/Personal Meetings entries, render photo avatar in topbar/sidebar when present (`buildSidebar`/`buildTopbar` around lines 195-260)
- [`assets/js/summarizer.js`](assets/js/summarizer.js) — title generator helper `docTitleFor(meeting)`
- [`assets/css/theme.css`](assets/css/theme.css) — lock badge styles, amber amendment banner, calendar grid utilities, print refinements (hide `.lock-banner`, `.amend-banner`, `.comments-panel`)
- [`secretary/schedule.html`](secretary/schedule.html) — add type + subType selects, conditional Capstone fields (chair, panel multi-select, adviser, project title)
- [`secretary/mom-editor.html`](secretary/mom-editor.html) — dynamic title from `docTitleFor()`, Pre-Print modal, lock banner, comments section, Capstone meta header
- [`secretary/transcript.html`](secretary/transcript.html) — comments panel; comments persisted on `transcript.comments[]`
- [`secretary/archives.html`](secretary/archives.html) — folder grouping by `meetingType` + `subType`, auto filename
- [`secretary/live-recording.html`](secretary/live-recording.html) — surface project title + type in header
- [`head/approvals.html`](head/approvals.html) — write `lockedAt`/`lockedBy` on final sign; lock indicator
- [`head/dashboard.html`](head/dashboard.html) — surface pending re-approvals (amendments)
- [`head/reports.html`](head/reports.html) — Capstone summary section when present
- [`faculty/dashboard.html`](faculty/dashboard.html) — personal-meeting quick action, calendar tile
- [`faculty/my-meetings.html`](faculty/my-meetings.html) — type filter and badges
- [`faculty/transcript-view.html`](faculty/transcript-view.html) — read-only comments mirror
- [`admin/users.html`](admin/users.html) — explicit "Secretary for other department" UX hint; photo upload in modal
- [`admin/settings.html`](admin/settings.html) — meeting-type taxonomy editor (Capstone/Research subtypes)
- [`README.md`](README.md) — walkthrough updated

## Data model deltas

Stored in `localStorage` (no DB), all backwards-compatible (older records default to `meetingType: 'regular'`).

```text
meeting += {
  meetingType: 'regular' | 'capstone' | 'research',
  subType:    'Title Proposal' | 'Pre-Oral' | 'Mock Defense' | 'Final Presentation' | 'Proposal' | 'Progress' | 'Final' | 'Other' | '',
  projectTitle:    string,
  chairpersonId:   userId,
  panelMemberIds:  userId[],
  adviserId:       userId,
}

minutes += {
  lockedAt:   number | null,
  lockedBy:   userId  | null,
  amendments: [{ ts, byUserId, summary }],
  comments:   [{ id, ts, userId, name, text, parentId? }],
  documentTitle: string,   // dynamic; defaults to docTitleFor(meeting)
}

transcript += { comments: [...] }

user += { photoDataUrl: string }

personalMeetings: { id, userId, date, time, type, title, attendees, notes }
```

## Implementation order

The todos below mirror the natural sequence: foundation first, then features layered on top, then polish. Every change preserves the existing audit log, role scoping, and offline behavior.

## Out of scope (explicitly)

- Real DB persistence (panel said "no database yet")
- Server-side notifications / email (local toast + in-app notifications only)
- Real Whisper/LLaMA integration (continuing the canned + Web Speech fallback)
- Mobile-native shell (still responsive web)
- Multi-tenant SaaS controls

## Validation checkpoints

After each todo, smoke-test:
1. Sign in as Secretary → schedule a Capstone meeting with full panel → record → AI-extract → MoM uses dynamic title with project title visible
2. Sign in as Head → sign minutes → status flips to approved + locked
3. Sign in as Secretary → edit locked minutes → banner appears → save → status back to pending + Head notified
4. Open Faculty Calendar → personal meeting visible alongside department meetings
5. Print MoM → filename auto-includes Capstone project title and subType
6. Open Archives → tabs group meetings by type; clicking a Capstone Title Proposal opens correctly