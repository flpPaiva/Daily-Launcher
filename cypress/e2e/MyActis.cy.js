const formValue = require("../../formValue.js");
const { isEmpty, formatTotalValue } = require("../tools/tools.js");

function setCredential() {
  // Inserir usuário e senha
  // e Submete o formulário
  cy.fixture("credentials").then((credentials) => {
    if (isEmpty(credentials.user)) {
      throw new Error("Usuário não encontrado no arquivo de credentials.json");
    }

    if (isEmpty(credentials.password)) {
      throw new Error("Senha não encontrada no arquivo de credentials.json");
    }

    cy.get("#username").type(credentials.user);
    cy.get("#password").type(credentials.password, { log: false });
    cy.get("#password").type("{enter}");
  });
}

describe("Lançamento MyActis", () => {
  it("Visitar MyActis", () => {
    cy.visit("https://mantis-br.nttdata-solutions.com/app/#/login");

    setCredential();

    cy.get(`span:contains("Mantis")`).last().click();
    cy.get(`span:contains("Documento")`).last().click();
    cy.get(`span:contains("Gestão de Recursos")`).last().click();
    cy.get(`span:contains("Apontamento de Atividades")`).last().click();

    // Remover todas as classes disabled-node
    cy.get(".disabled-node").then(($elements) => {
      $elements.each((index, element) => {
        cy.wrap(element).invoke("removeClass", "disabled-node");
      });
    });

    // Remover o atributo disabled de todos os botões
    cy.get('button[disabled="true"]').then(($buttons) => {
      $buttons.each((index, button) => {
        cy.wrap(button).invoke("removeAttr", "disabled");
      });
    });
  });
});
