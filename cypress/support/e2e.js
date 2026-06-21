// Global setup: start every test from a clean, freshly-seeded local state.
// (No cloud config in localStorage => the app stays offline/local; the service
//  worker is skipped because the app detects window.Cypress.)

beforeEach(() => {
  cy.clearLocalStorage();
  cy.visit("/");
  // wait for the seeded board to render before each test
  cy.get("#app .weekcol", { timeout: 12000 }).should("exist");
});

// ---- reusable helpers ----------------------------------------------------

// Open a workout's single-séance editor from the board by its visible name.
Cypress.Commands.add("openWorkout", (name) =>
  cy.contains(".wcard", name).find(".wcard-body").click()
);

// The program "⋯" menu (first icon button on the board header).
Cypress.Commands.add("progMenu", () => {
  cy.get("#app .iconbtn").first().click();
  return cy.get(".popmenu").should("be.visible");
});

// The workout "⋯" menu (only icon button inside the single editor header).
Cypress.Commands.add("workoutMenu", () => {
  cy.get("#app .iconbtn").click();
  return cy.get(".popmenu").should("be.visible");
});

// Fill the in-app prompt modal and confirm.
Cypress.Commands.add("promptType", (text) => {
  cy.get(".modal #m_i").clear().type(text);
  cy.get(".modal #m_o").click();
});

// Confirm the in-app confirm modal (OK / Supprimer / Restaurer …).
Cypress.Commands.add("confirmOk", () => cy.get(".modal #m_o").click());

// Go to a bottom-nav tab by label.
Cypress.Commands.add("tab", (label) =>
  cy.get("#nav button").contains(label).click()
);
