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

function setNfeData(data) {
  if (!isEmpty(data.date)) {
    // Preenche a Data da Nfe
    cy.get("#-from").clear({ force: true });
    cy.get("#-from").type(data.date, { force: true });
  } else {
    throw new Error(`"Data não encontrada no PDF / formValue.js`);
  }

  if (!isEmpty(data.code)) {
    // Preenche o Número do Documento
    cy.get("#document-number").clear({ force: true });
    cy.get("#document-number").type(data.code, { force: true });
  } else {
    throw new Error(`"Número da NFe não encontrado no PDF / formValue.js`);
  }

  if (!isEmpty(data.vlTotal)) {
    const value = formatTotalValue(data.vlTotal);

    // Preenche o valor da Nfe
    cy.get("#value").clear({ force: true });
    cy.get("#value").type(value, { force: true });
  } else {
    throw new Error(`"Valor Total não encontrado no PDF / formValue.js`);
  }
}

describe("Launcher", () => {
  it("Set Diárias", () => {
    const { fileName, priority, description, type } = formValue;
    let { vlTotal, nrNFe, date } = formValue;

    // Acessa o Mantis
    cy.visit("https://mantis-br.nttdata-solutions.com/app/#/login");

    setCredential();

    // Acessa o menu de lançamentos
    cy.get(`span:contains("Mantis")`).last().click();
    cy.get(`span:contains("Documento")`).last().click();
    cy.get(`span:contains("Financeiro")`).last().click();
    cy.get(`span:contains("Solicitação")`).last().click();
    cy.get(`span:contains("Reembolso de Diária")`).last().click();

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

    if (isEmpty(fileName)) {
      setNfeData({
        code: nrNFe || " ",
        date: date || " ",
        vlTotal: vlTotal || " ",
      });
    } else {
      cy.task("readPDF", { fileName }).then((data) => {
        setNfeData({
          code: nrNFe || data.code || " ",
          date: date || data.date || " ",
          vlTotal: vlTotal || data.vlTotal || " ",
        });

        // faz upload do arquivo PDF
        cy.get('input[type="file"]').selectFile("cypress/NFes/" + fileName, { force: true });
      });
    }
  });
});
