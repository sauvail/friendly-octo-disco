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
