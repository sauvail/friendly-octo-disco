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
  settings: { round, sex, bar, rest },
  exercises: [ Exercise ],    // the library
  bodyweight: [ { id, date, kg } ],
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

Set (weight) = { id, load, reps, rpe, aLoad, aReps, aRpe, done, date }   // reps may be the string "AMRAP"
Set (carry)  = { id, load, dist, aLoad, aDist, done, date }              // load (kg) × distance (m)
Set (cardio) = { id, dur, dist, aDur, aDist, done, date }
  planned fields above; a* fields = actual (logged); done + date set on completion.
```

### Storage keys
- `localStorage["pl_app_v1"]` → `S` (the training data; this is what syncs to jsonbin).
- `localStorage["pl_cloud_v1"]` → `{ binId, key, keyType, lastSyncedAt }` — **device-local credentials, never synced, never committed.**

### Constants
- **MUSCLES** (13): Pectoraux, Dos, Épaules, Biceps, Triceps, Avant-bras, Quadriceps, Ischios, Fessiers, Mollets, Abdos, Lombaires, Trapèzes.
- **MODIFIERS** (9): Tempo, Pause (s), Rest-pause (s), Drop set (%), Myo-reps, Élastique/Chaîne, Partiel, Unilatéral, Note.
- **Default settings:** rounding `2.5 kg`, sex `M`, bar `20 kg`, default rest `120 s`.

### Navigation (bottom tabs)
**🗓️ Programme** · **📈 Stats** · **⚙️ Données**. A persistent top bar shows the app name and the cloud **sync status pill**.

---

## 2. Program board (kanban)

The Programme tab shows the selected program as a **vertical kanban**.

- **Program switcher** — horizontal "chips" at the top; tap to switch program, `＋` chip to create one. Programs are renamed/duplicated/deleted from the program **⋯ menu**, which also has **"Bloc suivant (progression)"** (§9) and **"Nouveau programme"**.
- **Weeks** — each week is a collapsible section (▼/▶) showing its workout count. Week **⋯ menu**: Renommer / Dupliquer / Supprimer. `＋ Semaine` adds one.
- **Workout cards** — each séance card shows its name, a preview of its first exercises, the **estimated duration + Stress Index** (§5b), and a **progress bar** (logged sets / total). Tap the card body to open its editor; the blue **▶** button runs it. `＋ Séance` adds a workout to that week. Week headers also show the **week's total Stress Index**.
- **Drag & drop** (via the `⋮⋮` grips): reorder **workouts** within a week, **move workouts across weeks**, and reorder **weeks**. A floating "ghost" + accent **drop-line** indicate the target, and the board **auto-scrolls** when you drag near the top/bottom edge.

---

## 3. Workout editor

Two ways to edit, sharing one renderer (`itemsEditorHtml(wi, di, …)`), so they always stay in sync. Each editor header shows the séance's **estimated duration** and **Stress Index** (you run workouts from the board's ▶ — the editor itself has no "Démarrer" button):

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

- **Stress Index** — an RTS-style training-stress number. RTS's exact formula is proprietary, so this is a transparent **exertion-load** equivalent: each rep is weighted by its proximity to failure (reps-in-reserve) — `setStress = load × Σ_reps e^(−0.215 · RIR_rep)` — summed per **workout** and per **week**. Heavier / higher-rep / closer-to-failure work scores more; cardio & carry are excluded (no rep×RPE structure); AMRAP sets assume a nominal 8 reps for the estimate.
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

Start a workout from a card's **▶** (on the board or an edit-all column — the editor has no run button). The run view focuses on logging:

- **± steppers** on load and reps (no keyboard needed); RPE is a direct input. Load step = the rounding setting; reps step = 1.
- **Plate calculator** — for each set, shows the plates **per side** for the target/actual load given the configured **bar weight** (chips, e.g. `25 25 2.5 / côté`). Greedy from `[25, 20, 15, 10, 5, 2.5, 1.25]`.
- **"Last time" reference** — `↺ <date> : <top set>` from your most recent previous session for that exercise (or muscle slot), so you can progress at a glance.
- **Rest timer** — checking a set off **auto-starts** a countdown using that exercise's **rest** (or the 120 s default; `−15 / +15 / Passer`), with **vibration + beep** at zero. The "Terminer" button always scrolls clear of the timer bar.
- **Wake lock** — the screen stays on during a workout (released on leaving / finishing).
- **Haptics** — a short buzz when a set is completed.
- **Checking a set** fills its actuals from the plan if blank, stamps the date, updates the progress bar, and shows the live **e1RM**.
- **Terminer & enregistrer** finalises the session and returns to the board.

Cardio runs log **min / km**; carries log **kg / m** — both against the planned targets.

---

## 9. Program progression

- **Dupliquer** — copy a program / week / workout (logs reset on copies).
- **Bloc suivant (progression)** — duplicates the current program as the next block with logs cleared, **adding a chosen +kg to every planned load** (you pick the increment). Wildcard choices reset so each block is fresh.

---

## 10. Stats

Computed from your **logged** sets. **Estimated 1RM** uses the **Tuchscherer / RTS RPE→%1RM chart** (`e1RM = load ÷ (chart[reps][RPE] / 100)`), falling back to **Epley** (`load × (1 + reps/30)`) when a set is outside the table (reps > 12, or no logged RPE).

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
- **Service worker** (`sw.js`) caches the app shell: navigations are **network-first** (so deploys are picked up) with an offline cache fallback; same-origin assets are cache-first; the jsonbin API is never cached.
- **Update prompt** — when a new version is deployed, a **"Nouvelle version disponible — Recharger"** snackbar (its own `#updbar`) lets you activate it immediately (no silent swaps). The SW is skipped under Cypress.
- **Icon** — a gritty old-school gym **badge** (beagle gripping a barbell), generated as 192/512 + maskable PNGs.

---

## 13. Data management & UX

- **In-app modals** replace all native `prompt()/confirm()` — bottom-sheet prompt, confirm, and a searchable chooser. Pop-over **⋯ menus** for program/week/workout actions.
- **Undo** — destructive actions (delete program/week/séance/exercise/série, restore a version) snapshot state and show an **Annuler** snackbar (~6 s).
- **Backups** — **Exporter (JSON)** / **Importer** a full backup, and **Exporter les séries (CSV)** of all logged sets. **Réinitialiser tout** restores the example.
- **Settings** (Données) — sex (for DOTS/Wilks), load rounding (1 / 2.5 / 5 kg), bar weight (for plates), default rest duration.

---

## 14. Deployment & testing

- **Deploy** — GitHub Pages serves the repo root on `main`; pushing to `main` auto-deploys to the live URL. (This is a personal repo: ship by pushing to `main`, no PR.)
- **E2E tests** — Cypress (`cypress/e2e/app.cy.js`) covers each feature area: board/programs, weeks & workouts (incl. the workout-delete regression), the editor (sets, exercises, modifiers, supersets), running, stats, données/library, *Tout éditer*, muscle wildcards, and the planning extras (stress index, duration estimate, per-exercise rest, AMRAP reps, distance×charge carries, edit-all exercise reordering). Run with `npm install` then `npm run e2e` (serves the app and runs headless).

---

## Formula reference

- **Estimated 1RM (RTS RPE chart):** `e1RM = load ÷ (chart[reps][RPE] / 100)` using the Tuchscherer / Reactive Training Systems RPE→%1RM table (reps 1–12 × RPE 6–10, half-RPE steps). **Epley** (`load × (1 + reps / 30)`) is the fallback outside the table.
- **Stress Index (exertion-load proxy):** per planned set, `setStress = load × Σ_reps e^(−0.215 · RIR_rep)`, where `RIR_rep` is the reps-in-reserve of each rep (final RIR = `10 − RPE`, counting up for earlier reps); summed over a séance and a week, shown only while **building** a program. *(RTS's exact Stress Index formula is proprietary; this is a transparent equivalent.)*
- **Duration estimate:** `Σ over sets (rest + 35 s work)`, using each exercise's `rest` (or the default), shown on cards and editors.
- **DOTS:** `500 / (A + B·bw + C·bw² + D·bw³ + E·bw⁴) × total`, with separate men/women coefficients; total = best e1RM of S + B + D.
- **Wilks:** `500 / (a + b·bw + … + f·bw⁵) × total`, men/women coefficients.
- **Plates per side:** greedy over `[25, 20, 15, 10, 5, 2.5, 1.25]` for `(target − bar) / 2`.
