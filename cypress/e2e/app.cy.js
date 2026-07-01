/// <reference types="cypress" />

// End-to-end coverage for Suivi Muscu. Each test starts from a clean seed
// (see cypress/support/e2e.js).

describe("Board & programs", () => {
  it("loads the seeded program", () => {
    cy.contains(".chip", "Bloc 1");
    cy.contains("#app h1", "Bloc 1");
    cy.contains(".weekcol", "Semaine 1");
    cy.get(".wcard").should("have.length.at.least", 2);
    cy.contains(".wcard", "Séance A");
    cy.contains(".wcard", "Séance B");
  });

  it("creates a new program", () => {
    cy.get(".chip.add").click();
    cy.promptType("Bloc test");
    cy.contains("#app h1", "Bloc test");
    cy.get(".progchips").should("contain", "Bloc test");
  });

  it("renames a program via the ⋯ menu", () => {
    cy.progMenu().contains("Renommer").click();
    cy.promptType("Bloc renommé");
    cy.contains("#app h1", "Bloc renommé");
  });

  it("duplicates a program via the ⋯ menu", () => {
    cy.progMenu().contains("Dupliquer").click();
    cy.get(".progchips").should("contain", "(copie)");
  });

  it("deletes a program via the ⋯ menu", () => {
    cy.get(".chip.add").click();
    cy.promptType("Jetable");
    cy.contains("#app h1", "Jetable");
    cy.progMenu().contains("Supprimer").click();
    cy.confirmOk();
    cy.get(".progchips").should("not.contain", "Jetable");
  });
});

describe("Weeks & workouts", () => {
  it("adds a week", () => {
    cy.contains("button", "Semaine").click();
    cy.get(".weekcol").should("have.length", 2);
  });

  it("collapses and expands a week", () => {
    cy.get(".weekcol .wtoggle").first().click();
    cy.get(".weekcol .wcard").should("not.exist");
    cy.get(".weekcol .wtoggle").first().click();
    cy.get(".weekcol .wcard").should("exist");
  });

  it("adds a workout to a week", () => {
    cy.contains(".addcard", "Séance").click();
    cy.promptType("Séance C");
    cy.contains(".wcard", "Séance C");
  });

  it("opens a workout and renames it via its ⋯ menu", () => {
    cy.openWorkout("Séance A");
    cy.contains("#app h1", "Séance A");
    cy.workoutMenu().contains("Renommer").click();
    cy.promptType("Séance Push");
    cy.contains("#app h1", "Séance Push");
  });

  // REGRESSION: deleting a workout from its ⋯ menu must actually remove it.
  // (Workout delete is immediate + undo — there is no confirm dialog.)
  it("deletes a workout via its ⋯ menu", () => {
    cy.openWorkout("Séance B");
    cy.contains("#app h1", "Séance B");
    cy.workoutMenu().contains("Supprimer").click();
    cy.get("#app .weekcol").should("not.contain", "Séance B");
    cy.contains(".wcard", "Séance A");
    cy.get("#snack").should("have.class", "show"); // undo is offered
  });

  it("duplicates a workout via its ⋯ menu", () => {
    cy.openWorkout("Séance A");
    cy.workoutMenu().contains("Dupliquer").click();
    cy.get(".crumb a").click(); // back to board
    cy.contains(".wcard", "(copie)");
  });

  it("undoes a week deletion via the snackbar", () => {
    cy.contains("button", "Semaine").click();
    cy.get(".weekcol").should("have.length", 2);
    cy.get(".weekcol").eq(1).find(".iconbtn").click();
    cy.get(".popmenu").contains("Supprimer").click();
    cy.get(".weekcol").should("have.length", 1);
    cy.get("#snack").should("have.class", "show");
    cy.get("#snackbtn").click(); // Annuler
    cy.get(".weekcol").should("have.length", 2);
  });
});

describe("Editor: exercises, sets, modifiers, supersets", () => {
  beforeEach(() => cy.openWorkout("Séance A"));

  it("edits a set load in kg and it persists", () => {
    cy.get('input[data-f="load"]').first().clear().type("137.5");
    cy.reload();
    cy.openWorkout("Séance A");
    cy.get('input[data-f="load"]').first().should("have.value", "137.5");
  });

  it("adds and deletes a série", () => {
    cy.get(".card").first().find('input[data-f="load"]').then(($i) => {
      const n = $i.length;
      cy.get(".card").first().contains("button", "série").click();
      cy.get(".card").first().find('input[data-f="load"]').should("have.length", n + 1);
      cy.get(".card").first().find(".setrow .sm.danger").first().click();
      cy.get(".card").first().find('input[data-f="load"]').should("have.length", n);
    });
  });

  it("adds an exercise from the library", () => {
    cy.contains("button", "Exercice").click();
    cy.get("#m_s").type("Curl");
    cy.get(".mlist button").contains("Curl").first().click();
    cy.get(".card").should("contain", "Curl");
  });

  it("adds a muscle wildcard (joker) slot", () => {
    cy.contains("button", "Exercice").click();
    cy.get("#m_s").type("Biceps");
    cy.get(".mlist button").contains("Biceps").click();
    cy.contains(".card", "Biceps").find(".tag").should("contain", "joker");
  });

  it("adds a tempo modifier", () => {
    cy.get(".card").first().contains("button", "modificateur").click();
    cy.get(".mlist button").contains("Tempo").click();
    cy.get(".modal #m_i").type("3-1-1-0");
    cy.get(".modal #m_o").click();
    cy.contains(".modchip", "Tempo 3-1-1-0");
  });

  it("links two exercises into a superset (A1/A2)", () => {
    cy.contains(".card", "Squat").contains("button", "lier").click();
    cy.contains(".sslabel", "A1");
    cy.contains(".sslabel", "A2");
  });

  it("removes an exercise (offers undo)", () => {
    cy.get(".card").its("length").then((n) => {
      cy.get(".card").first().find(".row .sm.danger").click(); // header ✕
      cy.get("#snack").should("have.class", "show");
      cy.get(".card").should("have.length", n - 1);
    });
  });
});

describe("Running a workout", () => {
  it("logs sets with steppers + plate calc, then finishes", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains("#app h1", "Séance A");
    cy.get(".setline").should("exist");
    cy.get(".plate").should("exist"); // plate calculator chips
    cy.get(".setline").first().find(".stepbtn").last().click(); // +kg stepper
    cy.get(".chk").first().click();
    cy.get(".chk.on").should("exist");
    cy.get("#rest").should("have.class", "show"); // rest timer auto-started
    // "Terminer" must be reachable even while the rest timer bar is showing (no overlap)
    cy.contains("Terminer & enregistrer").click();
    cy.get(".wcard").should("exist"); // back to the board
  });
});

describe("Stats", () => {
  it("logs bodyweight and shows it", () => {
    cy.tab("Stats");
    cy.get("#bwInput").type("80");
    cy.get("#bwInput").siblings("button").click();
    cy.contains(".stat", "80");
  });

  it("shows records and the consistency calendar after logging", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.get(".chk").first().click(); // log the first squat set
    cy.contains("Terminer & enregistrer").click(); // reachable despite the rest timer
    cy.tab("Stats");
    cy.contains("h2", "Records");
    cy.get(".cal .d").should("have.length.at.least", 30); // 12-week heatmap
    cy.contains("h2", "Historique par exercice");
  });
});

describe("Données / library / settings", () => {
  beforeEach(() => cy.tab("Données"));

  it("shows cloud setup (Master/Access key) and settings", () => {
    cy.contains("Synchronisation cloud");
    cy.get("#ckey").should("exist");
    cy.get("#ckt").should("exist"); // key type select
    cy.contains("Barre");   // bar weight setting
    cy.contains("Repos");   // rest timer setting
  });

  it("re-adds missing exercises via Compléter", () => {
    // the seed already ships the full library, so remove one to create a gap first
    cy.get('.card input[data-k="exname"]').its("length").then((before) => {
      cy.get('button:contains("Supprimer")').last().click(); // delete the last exercise
      cy.confirmOk();
      cy.get('.card input[data-k="exname"]').should("have.length", before - 1);
      cy.contains("button", "Compléter").click(); // opens a confirm
      cy.get(".modal #m_o").click();              // confirm the top-up
      cy.get('.card input[data-k="exname"]').its("length").should("be.gte", before);
    });
  });

  it("offers JSON and CSV export", () => {
    cy.contains("Exporter (JSON)").should("exist");
    cy.contains("Exporter les séries (CSV)").should("exist");
  });
});

describe("Tout éditer (multi-column)", () => {
  it("edits every séance at once in columns", () => {
    cy.contains("button", "Tout éditer").click();
    cy.get(".editcol").should("have.length.at.least", 2);
    cy.get(".editcol").first().find('input[data-f="load"]').first().clear().type("142.5");
    cy.get(".editcol").first().find('input[data-f="load"]').first().should("have.value", "142.5");
  });

  it("shows one week at a time with prev/next navigation", () => {
    cy.contains("button", "Semaine").click(); // add an empty week 2
    cy.contains("button", "Tout éditer").click();
    cy.get(".weeknav").should("contain", "1/2"); // starts on week 1
    cy.get(".editcol").should("have.length", 2); // Séance A + B only (week 1)
    cy.get(".weeknav button").contains("Suiv.").click();
    cy.get(".weeknav").should("contain", "2/2"); // advanced to week 2
    cy.contains("Aucune séance dans cette semaine"); // week 2 is empty
  });
});

describe("Muscle wildcard at run time", () => {
  it("lets you choose / keep an exercise for a muscle slot", () => {
    cy.openWorkout("Séance A");
    cy.contains("button", "Exercice").click();
    cy.get("#m_s").type("Biceps");
    cy.get(".mlist button").contains("Biceps").click();
    cy.get(".crumb a").first().click(); // back to board
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "Biceps").contains("button", "choisir").click();
    cy.get(".mlist button").contains("Garder").click(); // keep it generic
  });
});

describe("Stress index, duration, rest, AMRAP, carry, edit-all drag", () => {
  it("shows stress + duration on the board (week + card)", () => {
    cy.get(".weekcol").first().should("contain", "stress");
    cy.get(".wcard").first().should("contain", "stress").and("contain", "min");
  });

  it("editor: no Démarrer button; has rest input + duration + stress", () => {
    cy.openWorkout("Séance A");
    cy.contains("Démarrer la séance").should("not.exist");
    cy.get('input[data-k="rest"]').should("exist");
    cy.contains("#app .mut", "stress");
    cy.contains("#app .mut", "min");
  });

  it("sets a per-exercise rest time that persists", () => {
    cy.openWorkout("Séance A");
    cy.get('input[data-k="rest"]').first().clear().type("90");
    cy.reload();
    cy.openWorkout("Séance A");
    cy.get('input[data-k="rest"]').first().should("have.value", "90");
  });

  it("toggles AMRAP reps on a set", () => {
    cy.openWorkout("Séance A");
    cy.get(".ambtn").first().click();
    cy.get(".amon").should("have.value", "AMRAP");
    cy.get(".ambtn.on").should("exist");
    cy.get(".ambtn").first().click(); // back to a number
    cy.get(".amon").should("not.exist");
  });

  it("supports the distance×weight (carry) metric", () => {
    cy.tab("Données");
    cy.get(".grid3").first().find("select").eq(1).select("carry");
    cy.tab("Programme");
    cy.openWorkout("Séance A");
    cy.contains(".lab", "MÈTRES");
  });

  it("allows reordering exercises in Tout éditer (grips present)", () => {
    cy.contains("button", "Tout éditer").click();
    cy.get('.editcol [data-drag="ex"]').should("exist");
    cy.get(".editcol .grip").should("exist");
  });

  it("updates the editor stress/duration live when reps change", () => {
    cy.openWorkout("Séance A");
    cy.get(".planmeta").first().should("contain", "stress").invoke("text").then((before) => {
      cy.get('input[data-f="reps"]').first().clear().type("12");
      cy.get(".planmeta").first().invoke("text").should("not.equal", before); // stress recomputed in place
    });
  });

  it("shows a per-exercise Stress Index that is load-independent (RPE-driven)", () => {
    cy.openWorkout("Séance A");
    cy.get(".exstress").first().should("contain", "stress").invoke("text").then((before) => {
      cy.get('input[data-f="load"]').first().clear().type("999"); // load change → stress unchanged
      cy.get(".exstress").first().should("have.text", before);
      cy.get('input[data-f="rpe"]').first().clear().type("10"); // RPE change → stress changes
      cy.get(".exstress").first().invoke("text").should("not.equal", before);
    });
  });
});

describe("Sessions, history, phone Back, done-state, joker history", () => {
  it("shows a history placeholder before any session is logged", () => {
    cy.tab("Stats");
    cy.contains("h2", "Séances récentes"); // heading always present
    cy.contains("Ton historique de séances"); // empty-state placeholder
  });

  // A finished run is stored as a separate session and must NOT mutate the saved plan.
  it("stores a session on finish and leaves the plan's planned load untouched", () => {
    cy.openWorkout("Séance A");
    cy.get('input[data-f="load"]').first().invoke("val").then((planned) => {
      cy.get(".crumb a").first().click(); // back to board
      cy.contains(".wcard", "Séance A").find(".runbtn").click();
      cy.get(".chk").first().click(); // log the first set
      cy.contains("Terminer & enregistrer").click();
      cy.contains(".wcard", "Séance A").should("contain", "série"); // card shows a completed-session line
      cy.openWorkout("Séance A");
      cy.get('input[data-f="load"]').first().should("have.value", planned); // plan unchanged
    });
  });

  it("set-done state adds the .done class during a run", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.get(".setline").first().find(".chk").click();
    cy.get(".setline.done").should("exist");
  });

  it("lists the finished session in Stats and shows its logged sets", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.get(".chk").first().click();
    cy.contains("Terminer & enregistrer").click();
    cy.get(".wcard").should("exist");
    cy.tab("Stats");
    cy.contains("h2", "Séances récentes");
    cy.contains(".card", "Séance A").click(); // open the session detail
    cy.contains("Série 1");
    cy.contains("button", "Supprimer cette séance");
  });

  it("phone Back returns to the board from a run", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains("#app h1", "Séance A");
    cy.go("back");
    cy.contains("button", "Tout éditer").should("exist"); // back on the board
    cy.get(".wcard").should("exist");
  });

  it("phone Back returns to the board from the editor", () => {
    cy.openWorkout("Séance A");
    cy.contains("#app h1", "Séance A");
    cy.go("back");
    cy.contains("button", "Tout éditer").should("exist");
  });

  // A joker slot surfaces what was done for that muscle last time, drawn from session history.
  it("shows joker-slot history after a logged session", () => {
    cy.openWorkout("Séance A");
    cy.contains("button", "Exercice").click();
    cy.get("#m_s").type("Biceps");
    cy.get(".mlist button").contains("Biceps").click(); // add a 💪 Biceps joker
    cy.get(".crumb a").first().click(); // board
    // run 1 — fill the joker with a new exercise + a load, log it, finish
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "💪 Biceps").contains("button", "choisir").click();
    cy.get("#m_new").click(); // ＋ Nouvel exercice (Biceps)
    cy.get("#m_i").type("Curl test");
    cy.get("#m_o").click();
    cy.contains(".card", "Curl test").find('input[data-f="aLoad"]').first().type("20");
    cy.contains(".card", "Curl test").find(".chk").first().click();
    cy.contains("Terminer & enregistrer").click();
    cy.get(".wcard").should("exist");
    // run 2 — the joker now shows a "dernière fois" history line
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "💪 Biceps").find(".lasttime").should("exist");
  });
});

describe("Phone Back layers, session delete, rest timer, notifications", () => {
  // helper: run Séance A, log one set, save → creates one session
  const logOneSession = () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.get(".chk").first().click();
    cy.contains("Terminer & enregistrer").click();
    cy.get(".wcard").should("exist");
  };

  it("phone Back closes an open modal without leaving the editor", () => {
    cy.openWorkout("Séance A");
    cy.contains("button", "Exercice").click();
    cy.get(".scrim").should("be.visible"); // chooser modal is open
    cy.go("back");
    cy.get(".scrim").should("not.exist"); // modal closed…
    cy.contains("#app h1", "Séance A"); // …and we're still in the editor
  });

  it("phone Back closes an open pop-over menu", () => {
    cy.openWorkout("Séance A");
    cy.get("#app .iconbtn").click(); // workout ⋯ menu
    cy.get(".popmenu").should("be.visible");
    cy.go("back");
    cy.get(".popmenu").should("not.exist");
    cy.contains("#app h1", "Séance A"); // still in the editor, not the board
  });

  it("phone Back leaves a session detail back to the Stats list", () => {
    logOneSession();
    cy.tab("Stats");
    cy.contains(".card", "Séance A").click(); // open session detail
    cy.contains("Série 1");
    cy.go("back");
    cy.contains("h2", "Séances récentes"); // back on the history list
  });

  it("deletes a stored session (with undo offered)", () => {
    logOneSession();
    cy.tab("Stats");
    cy.contains("h2", "Séances récentes");
    cy.contains(".card", "Séance A").click();
    cy.contains("button", "Supprimer cette séance").click();
    cy.get("#snack").should("have.class", "show"); // undo snackbar
    cy.contains("h2", "Séances récentes"); // heading stays…
    cy.contains("Ton historique de séances"); // …now showing the empty-state placeholder
    cy.contains(".card", "Séance A").should("not.exist"); // the session itself is gone
  });

  it("rest timer is deadline-based: counts down and auto-ends", () => {
    cy.clock();
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.get(".setline").first().find(".chk").click(); // auto-starts the rest timer
    cy.get("#rest").should("have.class", "show");
    cy.get("#restTime").invoke("text").then((t0) => {
      cy.tick(10000); // 10 s later
      cy.get("#restTime").invoke("text").should("not.equal", t0); // it counted down
    });
    cy.tick(120000); // run past the deadline + the auto-hide delay
    cy.get("#rest").should("not.have.class", "show"); // timer ended and hid itself
  });

  it("rest-end notification toggle turns on when permission is granted", () => {
    cy.tab("Données");
    cy.window().then((win) => {
      win.Notification = function () {};
      win.Notification.permission = "granted";
      win.Notification.requestPermission = () => Promise.resolve("granted");
    });
    cy.get('input[type="checkbox"]').check();
    cy.get('input[type="checkbox"]').should("be.checked"); // persisted in settings + re-rendered
  });
});

describe("Upgrades: load suggestion, muscle volume, planned-vs-actual, warm-up, theme", () => {
  it("suggests a working load from RPE history on load-less sets", () => {
    // give Rowing (planned load is empty) an e1RM by logging it once
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "Rowing").find('input[data-f="aLoad"]').first().type("60");
    cy.contains(".card", "Rowing").find(".chk").first().click();
    cy.contains("Terminer & enregistrer").click();
    cy.get(".wcard").should("exist");
    // re-run → the RPE-only Rowing sets now show a tappable load suggestion
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "Rowing").find(".suggbtn").first().should("exist").click();
    cy.contains(".card", "Rowing").find('input[data-f="aLoad"]').first().should("not.have.value", "");
  });

  it("shows weekly sets-per-muscle after logging", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.get(".chk").first().click(); // log a squat set (→ Quadriceps)
    cy.contains("Terminer & enregistrer").click();
    cy.tab("Stats");
    cy.contains("h2", "Séries par muscle");
  });

  it("records planned vs actual in the session detail", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "Rowing").find('input[data-f="aLoad"]').first().type("60"); // actual ≠ plan (empty)
    cy.contains(".card", "Rowing").find(".chk").first().click();
    cy.contains("Terminer & enregistrer").click();
    cy.tab("Stats");
    cy.contains(".card", "Séance A").click();
    cy.contains("cible"); // target shown next to the logged set
  });

  it("shows a warm-up ramp for a loaded exercise in the run", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "Squat").find(".warmup").should("exist"); // squat is loaded (125 kg)
  });

  it("colour-codes exercise cards by muscle in the editor", () => {
    cy.openWorkout("Séance A");
    cy.get('.card[style*="border-left"]').should("exist");
  });

  it("shows an onboarding hint before the first session", () => {
    cy.get(".hint").should("exist"); // fresh board, no sessions yet
  });

  it("toggles a light theme from Données", () => {
    cy.get("body").should("not.have.class", "light");
    cy.tab("Données");
    cy.contains("label", "Thème").next("select").select("light");
    cy.get("body").should("have.class", "light");
  });
});

describe("Back-off calculator, block comparator, session notes", () => {
  it("adds back-off sets from the calculator during a run", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains(".card", "Squat").find(".setline").its("length").then((n) => {
      cy.contains(".card", "Squat").contains("button", "back-off").click();
      cy.get(".modal").should("contain", "Back-off");
      cy.get(".modal").contains("button", "Ajouter").click();
      cy.contains(".card", "Squat").find(".setline").should("have.length", n + 3); // 3 back-off sets appended
    });
  });

  it("shows planned Stress Index per block in Stats", () => {
    cy.tab("Stats");
    cy.contains("h2", "Charge planifiée par bloc");
    cy.get(".blockbars .bb").should("exist");
  });

  it("captures a session note in the run and keeps it in history", () => {
    cy.contains(".wcard", "Séance A").find(".runbtn").click();
    cy.contains("button", "Note").click();
    cy.get(".modal #m_i").type("jambes fatiguées");
    cy.get(".modal #m_o").click();
    cy.get(".notebox").should("contain", "jambes fatiguées"); // shown in the run
    cy.get(".chk").first().click();
    cy.contains("Terminer & enregistrer").click();
    cy.tab("Stats");
    cy.contains(".card", "Séance A").click();
    cy.get(".notebox").should("contain", "jambes fatiguées"); // persisted to the session
  });
});
