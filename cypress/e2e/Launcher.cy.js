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
    cy.get("#password").type(credentials.password);
    cy.get("#password").type("{enter}");
  });
}

function setNfeData(data) {
  // Preenche a Data da Nfe
  cy.get("#-from").clear({ force: true });
  cy.get("#-from").type(data.date, { force: true });

  // Preenche o Número do Documento
  cy.get("#document-number").clear({ force: true });
  cy.get("#document-number").type(data.code, { force: true });

  const value = formatTotalValue(data.vlTotal);

  // Preenche o valor da Nfe
  cy.get("#value").clear({ force: true });
  cy.get("#value").type(value, { force: true });
}

function logNfeDataError(data) {
  if (isEmpty(data.code)) {
    throw new Error(`"Número da NFe não encontrado no PDF / formValue.js`);
  }

  if (isEmpty(data.date)) {
    throw new Error(`"Data não encontrada no PDF / formValue.js`);
  }

  if (isEmpty(data.vlTotal)) {
    throw new Error(`"Valor Total não encontrado no PDF / formValue.js`);
  }
}

describe("Launcher", () => {
  it("Set Diárias", () => {
    const fileName = formValue.fileName;
    const priority = formValue.priority;
    const description = formValue.description;
    const type = formValue.type;
    const uploadFile = formValue.uploadFile;
    let vlTotal = formValue.vlTotal;
    let nrNFe = formValue.nrNFe;
    let date = formValue.date;

    // Acessa o Mantis
    cy.visit("https://mantis-br.nttdata-solutions.com/app/#/login");

    setCredential();

    // Acessa o menu de lançamentos
    cy.get("span.ng-star-inserted > .mat-mdc-menu-trigger").click();
    cy.get("#mat-menu-panel-3 > .mat-mdc-menu-content > :nth-child(3) > span.ng-star-inserted > .mat-mdc-menu-item").click();
    cy.get(":nth-child(5) > span.ng-star-inserted > .mat-mdc-menu-item").click();
    cy.get("#mat-menu-panel-19 > .mat-mdc-menu-content > :nth-child(1) > span.ng-star-inserted > .mat-mdc-menu-item").click();
    cy.get(".ng-tns-c104-27 > .ng-star-inserted > .mat-mdc-menu-item > .mdc-list-item__primary-text > .menu-leaf").click();

    cy.wait(1000);

    // Escolhe a prioridade Média
    cy.get("mat-select#priority-select").click({ force: true });
    cy.get("#priority-select-panel .mat-mdc-option").contains(priority).click();

    // Adiciona a Descrição da Diária
    cy.get("textarea#description-textarea").clear({ force: true });
    cy.get("textarea#description-textarea").type(description, { force: true });

    // Preenche o tipo de despesa
    cy.get("mat-select#expenseType-select").click({ force: true });
    cy.get("#expenseType-select-panel .mat-mdc-option").contains(type).click();

    if (uploadFile) {
      cy.task("readPDF", { fileName }).then((data) => {
        const dataNFe = {
          code: nrNFe || data.code || " ",
          date: date || data.date || " ",
          vlTotal: vlTotal || data.vlTotal || " ",
        };

        logNfeDataError(dataNFe);
        setNfeData(dataNFe);

        // faz upload do arquivo PDF
        cy.get('input[type="file"]').selectFile("cypress/pdfs/" + fileName, { force: true });
      });
    } else {
      const dataNFe = {
        code: nrNFe || " ",
        date: date || " ",
        vlTotal: vlTotal || " ",
      };

      logNfeDataError(dataNFe);
      setNfeData(dataNFe);
    }
  });

  false &&
    it("Open MyActis", () => {
      cy.visit("https://mantis-br.nttdata-solutions.com/app/#/app/9044355e-1c7e-428c-a03d-3c2d4cf3ed86");

      setCredential();

      cy.wait(4000);

      cy.window().then((win) => {
        win.removerClasses = function (_class) {
          const elementos = win.document.querySelectorAll("." + _class);
          elementos.forEach((el) => el.classList.remove(_class));
        };

        win.removerDisableds = function () {
          const elementos = win.document.querySelectorAll(`[disabled="true"]`);
          elementos.forEach((el) => el.removeAttribute(`disabled`));
        };

        // Executa as funções no contexto da página
        win.removerClasses("disabled-node");
        win.removerDisableds();
      });
    });
});
