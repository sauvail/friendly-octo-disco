# Suivi Muscu 🏋️

A personal, single-page web app to track gym & powerlifting progress — programs, session
logging, bodyweight, e1RM/DOTS stats — that **syncs between your phone and computer** through
[jsonbin.io](https://jsonbin.io). No backend to run, no build step: it's one `index.html`.

Live app (GitHub Pages): **https://sauvail.github.io/friendly-octo-disco/**

## Features

- **Programme (kanban)** — build blocs → semaines → séances → exercices on a **drag-and-drop board** (collapsible week sections, workout cards). Plan sets as `%1RM` or absolute load with reps & RPE. **Muscle wildcards** — plan a slot by muscle (e.g. *Biceps 3×12 @8*) and pick the exact exercise (filtered to that muscle) when you run the workout, or keep it generic. Per-exercise **modifiers** (tempo, pause, rest-pause, drop-set, myo-reps, élastique, …) with their unit/notation. **Supersets** (link exercises A1/A2), **"bloc suivant"** auto-progression (+kg on reference 1RMs), and in-app rename/duplicate/delete with **undo**. A built-in **exercise library** (~60 movements, muscle-tagged) seeds new installs; *Compléter la bibliothèque* (Données) tops it up and auto-tags your existing exercises by name.
- **Run a workout** — start a séance from its card and log with **± steppers**, a **plate calculator** (per side, configurable bar), a **rest timer** (vibrate + beep, screen stays awake), and a **"last time"** reference showing your previous session for each lift.
- **Stats** — bodyweight, **DOTS & Wilks**, estimated-1RM records + relative strength, recent PRs, weekly tonnage, **volume by category**, **date-accurate** e1RM/volume charts, a **12-week consistency calendar**, per-exercise history, and **CSV export**.
- **Cloud sync (jsonbin.io)** — auto pull on open + debounced push (last-write-wins with conflict prompt), manual *Sync now*, **Master *or* Access key**, and **version history / restore**. Fully offline; syncs when back online.
- **Installable PWA** — "Add to Home Screen", offline app shell, and a **"new version available — reload"** prompt after each deploy.
- **Backups** — JSON export/import **and CSV export**, independent of the cloud.

All data lives in your browser's `localStorage` and (optionally) in your own jsonbin bin.
Your jsonbin key is stored **only on each device** and is never committed to this repo.

## Set up cloud sync (once)

1. Create a free account at **jsonbin.io**.
2. Open **API Keys** and copy your **Master Key** (`X-Master-Key`, starts with `$2a$10$...`).
3. In the app, go to **Données → Synchronisation cloud**, paste the key, and tap **Créer un bin & connecter**.
   The app creates a private bin and stores its **Bin ID** on this device.
4. On your **second device**: open the app, go to **Données**, enter the **same Master Key** and the **Bin ID**
   (copy it from the first device with *Copier le Bin ID*), then **Connecter à ce bin**.

That's it — edits on one device now appear on the other. Tap the status pill (top-right) any time to force a sync.

> Tip: in the app (Données → Type de clé) you can choose **Master Key** or a scoped **Access Key** (read + update) — the Access Key avoids putting your all-powerful Master Key on a device. Keep the bin **private**. Creating a new bin requires a Master Key (or an Access Key with `create` permission).

## Install on your phone / computer

- **iOS (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen*.
- **Desktop (Chrome/Edge):** the *Install* icon in the address bar.

## Conflict handling

Sync is last-write-wins by timestamp. If you edited the **same** data on two devices before either synced,
the app detects it on the next sync and asks whether to keep this device's version or the cloud's.
Using one device at a time avoids this entirely.

## Develop / run locally

It's a static site. Any static server works:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

(Service worker and PWA install require `http(s)://`, not `file://`. Cloud sync works either way.)

## Files

| File | Purpose |
|------|---------|
| `index.html` | The entire app (UI + logic + cloud sync). |
| `manifest.webmanifest` | PWA metadata (name, icons, theme). |
| `sw.js` | Service worker for offline caching. |
| `icons/` | App icons (192/512 + maskable). |

## Deploy (GitHub Pages)

Pages serves the repo root on the `main` branch. After pushing, enable **Settings → Pages →
Build and deployment → Deploy from a branch → `main` / `/ (root)`**. The app is then live at the URL above.
