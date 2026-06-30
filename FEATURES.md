# Suivi Muscu — Feature Reference

A complete, detailed reference of every feature in the app, for future development and maintenance.

- **What it is:** a personal gym & powerlifting tracker — build programs, run workouts, track stats — that syncs between devices.
- **Live app:** https://sauvail.github.io/friendly-octo-disco/
- **Stack:** one static `index.html` (vanilla JS, no build step, no framework), `localStorage` for data, optional [jsonbin.io](https://jsonbin.io) for cross-device sync, installable as a PWA.
- **UI language:** French.

---

## 1. Architecture & data model

### Files
| File | Role |
|------|------|
| `index.html` | The entire app — markup, CSS, and all logic in one file. |
| `manifest.webmanifest` | PWA metadata (name, theme, icons, `display: standalone`). |
| `sw.js` | Service worker: offline app-shell cache + update signalling. |
| `icons/` | App icons: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. |
| `cypress/`, `cypress.config.js`, `package.json` | E2E test suite (dev only; not shipped to the app). |

### State object `S` (persisted, and what syncs to the cloud)
```text
S = {
  v: 2,                       // schema version
  updatedAt: ISO string,      // bumped on every change → drives last-write-wins sync
  settings: { round, sex, bar, rest, notify, theme },   // notify = rest notif; theme = "dark"|"light"
  exercises: [ Exercise ],    // the library
  bodyweight: [ { id, date, kg } ],
  sessions: [ Session ],      // recorded executions (decoupled from the plan) — see §8/§10
  programs: [ Program ]
}

Exercise = { id, name, category, muscle, metric, lift, orm }
  category : "Principal" | "Haut du corps" | "Bas du corps" | "Cardio" | "Autre"
  muscle   : one of MUSCLES (below) or null
  metric   : "weight" | "carry" (distance × weight) | "cardio"
  lift     : "squat" | "bench" | "deadlift" | null   (competition lift, for DOTS/Wilks)
  orm      : always 0 — the 1RM-reference mechanic was removed (see §5)

Program = { id, name, weeks: [ Week ] }
Week    = { id, name, days: [ Workout ] }           // "days" === séances/workouts
Workout = { id, name, items: [ Item ] }
Item    = { id, exId, muscle?, group?, mods?, rest?, sets: [ Set ] }
  exId   : exercise id, or null for an unfilled muscle wildcard
  muscle : set when the item is a muscle "joker" (wildcard) slot
  group  : superset group id (shared by linked items)
  mods   : [ { key, value } ] modifiers (tempo, pause, …)
  rest   : per-exercise rest seconds (defaults to settings.rest); feeds the rest timer + duration estimate

Set (weight) = { id, load, reps, rpe }     // TARGETS only. reps may be the string "AMRAP"
Set (carry)  = { id, load, dist }          // load (kg) × distance (m)
Set (cardio) = { id, dur, dist }
  Plan sets hold targets only — a run never mutates them. Actuals are stored in S.sessions.

Session = { id, ts, date, programName, weekName, dayId, dayName, entries: [ Entry ] }
Entry   = { exId, muscle, name, metric, sets: [ { load, reps, rpe } | {load,dist} | {dur,dist} ] }
  One Session is appended each time you finish a run; only the sets you marked done are kept.
  dayId links a session back to the plan day it came from (used for the board's "last session" line).
```

### Storage keys
- `localStorage["pl_app_v1"]` → `S` (the training data; this is what syncs to jsonbin).
- `localStorage["pl_cloud_v1"]` → `{ binId, key, keyType, lastSyncedAt }` — **device-local credentials, never synced, never committed.**

### Constants
- **MUSCLES** (13): Pectoraux, Dos, Épaules, Biceps, Triceps, Avant-bras, Quadriceps, Ischios, Fessiers, Mollets, Abdos, Lombaires, Trapèzes.
- **MODIFIERS** (9): Tempo, Pause (s), Rest-pause (s), Drop set (%), Myo-reps, Élastique/Chaîne, Partiel, Unilatéral, Note.
- **Default settings:** rounding `2.5 kg`, sex `M`, bar `20 kg`, default rest `120 s`, rest notifications `off`.

### Navigation (bottom tabs)
**🗓️ Programme** · **📈 Stats** · **⚙️ Données**. A persistent top bar shows the app name and the cloud **sync status pill**.

---

## 2. Program board (kanban)

The Programme tab shows the selected program as a **vertical kanban**.

- **Program switcher** — horizontal "chips" at the top; tap to switch program, `＋` chip to create one. Programs are renamed/duplicated/deleted from the program **⋯ menu**, which also has **"Bloc suivant (progression)"** (§9) and **"Nouveau programme"**.
- **Weeks** — each week is a collapsible section (▼/▶) showing its workout count. Week **⋯ menu**: Renommer / Dupliquer / Supprimer. `＋ Semaine` adds one.
- **Workout cards** — each séance card shows its name, a preview of its first exercises, the **estimated duration + Stress Index** (§5b), and a **status line**: a live progress bar while it's the **running** séance, otherwise **✓ last-session date + set count** (from `S.sessions`), or *à faire / à planifier*. Tap the card body to open its editor; the blue **▶** button runs it. `＋ Séance` adds a workout to that week. Week headers also show the **week's total Stress Index**.
- **Drag & drop** (via the `⋮⋮` grips): reorder **workouts** within a week, **move workouts across weeks**, and reorder **weeks**. A floating "ghost" + accent **drop-line** indicate the target, and the board **auto-scrolls** when you drag near the top/bottom edge.

---

## 3. Workout editor

Two ways to edit, sharing one renderer (`itemsEditorHtml(wi, di, …)`), so they always stay in sync. Each editor header shows the séance's **estimated duration** and **Stress Index**, and **every exercise card shows its own Stress Index** (both update live as you change reps/RPE). You run workouts from the board's ▶ — the editor itself has no "Démarrer" button:

- **Single séance** — tap a workout card. Header has the name and a **⋯ menu** (rename/duplicate/delete). Exercises can be reordered by drag.
- **Tout éditer (multi-column)** — the **"✎ Tout éditer les séances"** button on the board opens *every* séance of the program as **side-by-side editable columns**. The strip breaks out to the **full viewport width**, so a wide screen shows them all at once; on mobile the columns are ~86 % wide with **scroll-snap** so you swipe between them. Each column has its own ▶ run and ⋯ menu, and **exercises can be dragged to reorder within their column**.

Within an exercise you can: add/remove **séries**, edit **kg / reps / RPE** inline (reps toggle to **AMRAP** via the ∞ button), set a **per-exercise rest** (seconds, feeds the timer + duration), add a **modifier** (§6), **link a superset** (§7), and delete the exercise (with undo). `＋ Exercice` opens the picker (§4).

---

## 4. Exercise library

- **Curated default library** (~58 movements) covering every muscle group + cardio, each pre-tagged with **category** and **muscle**; the three competition lifts carry a `lift` tag.
- **Library editor** (Données → Bibliothèque): per exercise you set **name, category, metric (charge×reps / distance×charge / cardio), competition lift, and muscle**. Add or delete exercises.
- **✨ Compléter (muscles + exercices courants)** — one tap **merges in any missing standard exercises** (dedup by name) **and auto-tags** your existing exercises' muscles by matching their names (keyword → muscle). Useful after upgrading from an older, sparse library.
- **Exercise picker** (when adding to a workout) — a searchable modal listing **muscles first** (to create a wildcard) then **exercises**, plus **＋ Nouvel exercice** to create one inline.

### Muscle "wildcard" (joker) slots
Plan a slot **by muscle** instead of a fixed exercise — e.g. *💪 Biceps 3×12 @8* (tagged `joker` in the editor). When you **run** the workout, the slot shows a **choisir** button: pick a concrete exercise **filtered to that muscle**, create a new one, or **keep it generic**. The choice is per-week-instance and **resets on Dupliquer / Bloc suivant** so each block is a fresh wildcard. Stats credit a filled slot to the chosen exercise; a slot logged generically is grouped under `💪 <muscle>`.

---

## 5. Set planning (kg · reps · RPE · AMRAP)

Sets are planned in **absolute kg + reps + RPE**. (The previous **%1RM / "1RM de référence" mechanic was removed**; `orm` is always `0` and no longer shown. Any old `%1RM` plans were **baked into absolute loads on upgrade** by the migration, so nothing was lost.) Reps can be toggled to **AMRAP** (as-many-reps-as-possible) with the ∞ button. By exercise **metric**: **carry** plans **load (kg) × distance (m)** (loaded carries — farmer's walk, sled…); **cardio** plans **duration (min) + distance (km)**.

## 5b. Stress Index & duration (shown when building)

To balance a program, every workout shows two **planning** metrics — on the board card, the week header, and the editor header — computed from the **planned** sets (not from logging):

- **Stress Index** — the RTS training-stress number, read from a **reps × target-RPE lookup table** (`SI_RPE`, reps 1–20 × RPE 6–10 in ½ steps). It is **load-independent** — it measures effort/fatigue, so **RPE-only programming** (planning by reps + target RPE with no preset load) still scores. Per set = `SI_RPE[RPE][reps]`; shown **per exercise** (in each exercise card) and summed **per workout** and **per week**. Defaults: blank RPE → 8; reps clamped to 1–20; AMRAP → nominal 8 reps. Cardio/carry sets have no reps so they score 0.
- **Estimated duration** — `Σ over sets of (exercise rest + ~35 s work)`, using each exercise's rest (or the default). Shown as `≈ N min`.

---

## 6. Modifiers

Per-exercise programming notes, each with a unit and notation. **+ modificateur** on an exercise opens a picker; you then enter the value. They render as chips in the editor and during the workout.

| Modifier | Unit / notation | Example |
|----------|-----------------|---------|
| Tempo | 4 digits (ecc-pause-conc-pause) | `Tempo 3-1-1-0` |
| Pause | seconds | `Pause 2s` |
| Rest-pause | seconds | `Rest-pause 15s` |
| Drop set | % load drop | `Drop set 20%` |
| Myo-reps | rep clusters | `Myo-reps 5+3+3` |
| Élastique / Chaîne | free text | accommodating resistance |
| Partiel | free text | `1/2 amplitude` |
| Unilatéral | — | per side |
| Note | free text | anything |

---

## 7. Supersets

Link consecutive exercises into a superset with **⛓ lier** (and **⛓ délier** to unlink). Linked exercises get an accent border and **A1 / A2 / …** labels, in both the editor and the run view.

---

## 8. Running a workout

Start a workout from a card's **▶** (on the board or an edit-all column — the editor has no run button). The run view focuses on logging.

- **Plan ⟂ execution (decoupled)** — a run operates on a private **draft** copied from the plan's targets; **it never modifies the saved program**. On **Terminer & enregistrer** the draft's completed sets are written as one **Session** in `S.sessions` (§10). Re-running the same séance another day produces another, separate session — your plan stays a clean template and history accumulates.
- **± steppers** on load and reps (no keyboard needed); RPE is a direct input. Load step = the rounding setting; reps step = 1.
- **RPE → load suggestion** — for an **RPE-only set** (planned by reps + target RPE, no preset load), the run suggests a working kg = `best e1RM(exercise) × RPE_PCT[reps][RPE]/100`, shown as a tap-to-fill 💡 hint (`suggestLoad`). It also seeds the input placeholder, the plate calc, the ± stepper base, and auto-fills when you tick the set off. Needs prior logged history for that exercise.
- **Warm-up ramp** — for a loaded exercise, a `🔥 Échauffement : bar · …` line ramps ~40/55/70/85 % to the working load (`warmupRamp`).
- **Plate calculator** — for each set, shows the plates **per side** for the target/actual load given the configured **bar weight** (chips, e.g. `25 25 2.5 / côté`). Greedy from `[25, 20, 15, 10, 5, 2.5, 1.25]`.
- **"Last time" reference** — `↺ <date> : <top set>` from your most recent **session** for that exercise. A **joker slot** also shows `↺ <date> · <exercise> <load>×<reps>` for that **muscle** (whatever filled it last time), and the run-time chooser annotates each candidate with its last result.
- **Clear "set done" state** — a completed set's row turns green with an accent border, an enlarged ✓, and the target line struck through.
- **Rest timer** — checking a set off **auto-starts** a countdown using that exercise's **rest** (or the 120 s default; `−15 / +15 / Passer`). It is **deadline-based**, so it stays accurate across screen-lock / app-backgrounding (it re-syncs on return to the foreground). At zero: **vibration + a triple beep** (one shared `AudioContext`, unlocked on first tap) and, if enabled, an **OS notification** (§13). The "Terminer" button always scrolls clear of the timer bar.
- **Wake lock** — the screen stays on during a workout (released on leaving / finishing).
- **Checking a set** fills its actuals from the plan target if blank, updates the progress bar, and shows the live **e1RM**.
- **Muscle joker** — pick the exercise at run time (or keep it generic); the choice lives on the draft only and is recorded in the session.

Cardio runs log **min / km**; carries log **kg / m** — both against the planned targets.

---

## 9. Program progression

- **Dupliquer** — copy a program / week / workout (logs reset on copies).
- **Bloc suivant (progression)** — duplicates the current program as the next block with logs cleared, **adding a chosen +kg to every planned load** (you pick the increment). Wildcard choices reset so each block is fresh.

---

## 10. Stats

Computed from your **logged** sets. **Estimated 1RM** uses the **Tuchscherer / RTS RPE→%1RM chart** (`e1RM = load ÷ (chart[reps][RPE] / 100)`), falling back to **Epley** (`load × (1 + reps/30)`) when a set is outside the table (reps > 12, or no logged RPE).

- **Séances récentes (historique d'exécution)** — a reverse-chronological list of your stored sessions; tap one to see every exercise and the exact sets you logged (kg×reps@RPE / min·km / kg·m, with e1RM), plus a **Supprimer cette séance** action (undoable). The heading is **always shown** — before your first finished run it displays a placeholder so you know where history will appear. Each logged set also stores its **plan target** (`t`), so the detail shows **planned vs actual** ("cible …") wherever you deviated. Every stat below is computed from these sessions (`loggedSets()` flattens them — the single source of truth).
- **Séries par muscle (7 j)** — working sets per muscle group over the last 7 days (from muscle tags), with a colour-coded bar and a hypertrophy guide range (~10–20 sets/muscle/week): orange = under, green = in range, red = over.
- **Poids de corps** — log today's bodyweight + a date-accurate line chart; relative strength uses the latest value.
- **Score DOTS / Wilks** — from the best logged e1RM of squat + bench + deadlift (by `lift` tag) and latest bodyweight + sex. Both coefficient sets are implemented (men/women).
- **Records (e1RM estimé)** — best estimated 1RM per main lift, with **× bodyweight** relative strength; tap through to the exercise's history.
- **Records récents** — chronological list of new e1RM PRs.
- **Tonnage par semaine** — weekly volume (Σ load×reps) bars.
- **Volume par catégorie** — total volume grouped by exercise category.
- **Régularité (12 semaines)** — a training-day **heatmap** calendar (intensity = sets that day).
- **Progression e1RM** — per-lift line charts, **x-axis scaled by real dates** (not sample index).
- **Historique par exercice** — tap any exercise for its e1RM/volume charts and full set list.
- **Charts** (`lineSvg`) accept `{ t, v }` points; when `t` is a timestamp the x-axis is date-proportional with date labels.

---

## 11. Cloud sync (jsonbin.io)

Optional, configured in **Données → Synchronisation cloud**.

- **Setup** — choose **Master Key** *or* a scoped **Access Key** (`X-Access-Key`), then either **create a new private bin** or connect to an existing **Bin ID**. The second device enters the same key + Bin ID. Credentials live only in `pl_cloud_v1` on each device.
- **Behaviour** — **auto pull on open / focus / online**; **debounced auto-push** (~2 s) after edits; **last-write-wins** by `updatedAt`. A **conflict** (both sides changed) prompts to keep cloud vs this device. Manual **Synchroniser maintenant** and a **status pill** (`à jour / synchro… / à envoyer / hors-ligne / erreur`). Fully offline-capable; syncs when back online.
- **Version history / restore** — **⟲ Versions / restaurer** lists the bin's saved versions and restores one (with undo). Degrades gracefully if versioning isn't available on the plan.
- **API** (base `https://api.jsonbin.io/v3`): `POST /b` create · `GET /b/<id>/latest` read · `PUT /b/<id>` update · `GET /b/<id>/versions[/<n>]` history. CORS is enabled, so the browser calls it directly.

---

## 12. PWA & offline

- **Installable** ("Add to Home Screen" / Install) via the manifest; opens standalone with the theme colour and the beagle icon.
- **Service worker** (`sw.js`) caches the app shell: navigations are **network-first** (so deploys are picked up) with an offline cache fallback; same-origin assets are cache-first; the jsonbin API is never cached. It also handles **`notificationclick`** (focus/open the app) for rest-end notifications.
- **Update prompt** — when a new version is deployed, a **"Nouvelle version disponible — Recharger"** snackbar (its own `#updbar`) lets you activate it immediately (no silent swaps). The SW is skipped under Cypress.
- **Icon** — a gritty old-school gym **badge** (beagle gripping a barbell), generated as 192/512 + maskable PNGs.

---

## 13. Data management & UX

- **In-app modals** replace all native `prompt()/confirm()` — bottom-sheet prompt, confirm, and a searchable chooser. Pop-over **⋯ menus** for program/week/workout actions.
- **Undo** — destructive actions (delete program/week/séance/exercise/série, **delete a session**, restore a version) snapshot state and show an **Annuler** snackbar (~6 s).
- **Phone Back button** — the hardware/browser **Back** gesture pops the **topmost layer** (open modal → pop-over menu → run / editor / stat-detail → board) instead of leaving the app, via the History API (a single "trap" entry kept in sync with whatever's open).
- **Visual polish** — exercise cards carry a **muscle-coloured left accent** (`muscleColor`, a stable hue per muscle) for fast scanning; line charts have **gridlines + a mid-value label** and use theme variables; a first-run **onboarding hint** on the board points to ▶ and the Stats history until you log your first session.
- **Backups** — **Exporter (JSON)** / **Importer** a full backup, and **Exporter les séries (CSV)** of all logged sets. **Réinitialiser tout** restores the example.
- **Settings** (Données) — a **Thème** switch (dark / light, via `body.light` CSS-variable overrides), sex (for DOTS/Wilks), load rounding (1 / 2.5 / 5 kg), bar weight (for plates), default rest duration, and a **🔔 rest-end notification** toggle (requests OS permission on enable; fires a notification + sound + vibration when the timer hits 0, even backgrounded on Android — `notificationclick` focuses the app; iOS PWAs get the sound/vibration only).

---

## 14. Deployment & testing

- **Deploy** — GitHub Pages serves the repo root on `main`; pushing to `main` auto-deploys to the live URL. (This is a personal repo: ship by pushing to `main`, no PR.)
- **E2E tests** — Cypress (`cypress/e2e/app.cy.js`) covers each feature area: board/programs, weeks & workouts (incl. the workout-delete regression), the editor (sets, exercises, modifiers, supersets), running, stats, données/library, *Tout éditer*, muscle wildcards, the planning extras (stress index, duration estimate, per-exercise rest, AMRAP reps, distance×charge carries, edit-all exercise reordering), and the execution model (a finished run stores a **session** without mutating the plan, the Stats **history** list + session detail, the **set-done** class, **joker history**, and **phone Back** returning to the board from a run/editor). Run with `npm install` then `npm run e2e` (serves the app and runs headless). 39 specs.

---

## Formula reference

- **Estimated 1RM (RTS RPE chart):** `e1RM = load ÷ (chart[reps][RPE] / 100)` using the Tuchscherer / Reactive Training Systems RPE→%1RM table (reps 1–12 × RPE 6–10, half-RPE steps). **Epley** (`load × (1 + reps / 30)`) is the fallback outside the table.
- **Stress Index (RTS table):** per planned set = `SI_RPE[target RPE][reps]`, a reps (1–20) × RPE (6–10, ½ steps) lookup — **load-independent** (effort-based, so RPE-only plans score). Summed per **exercise**, **workout** and **week**, shown only while **building** a program. Blank RPE defaults to 8; AMRAP counts as a nominal 8 reps.
- **Duration estimate:** `Σ over sets (rest + 35 s work)`, using each exercise's `rest` (or the default), shown on cards and editors.
- **DOTS:** `500 / (A + B·bw + C·bw² + D·bw³ + E·bw⁴) × total`, with separate men/women coefficients; total = best e1RM of S + B + D.
- **Wilks:** `500 / (a + b·bw + … + f·bw⁵) × total`, men/women coefficients.
- **Plates per side:** greedy over `[25, 20, 15, 10, 5, 2.5, 1.25]` for `(target − bar) / 2`.
