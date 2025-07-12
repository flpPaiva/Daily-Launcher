describe('Launcher', () => {
  
  it.only('Set Diarias', () => {
    const fileName = '1.pdf';

    cy.task('readPDF', { fileName }).then(data => {
      // Acessa o Mantis
      cy.visit('https://mantis-br.nttdata-solutions.com/app/#/login');

      // Inserir usuário e senha
      // e Submete o formulário 
      cy.fixture('credentials').then(credentials => {
        cy.get('#username').type(credentials.user);
        cy.get('#password').type(credentials.password);
        cy.get('#password').type('{enter}');
      })

      // Acessa o menu de lançamentos
      cy.get('span.ng-star-inserted > .mat-mdc-menu-trigger').click();
      cy.get('#mat-menu-panel-3 > .mat-mdc-menu-content > :nth-child(3) > span.ng-star-inserted > .mat-mdc-menu-item').click();
      cy.get(':nth-child(5) > span.ng-star-inserted > .mat-mdc-menu-item').click();
      cy.get('#mat-menu-panel-19 > .mat-mdc-menu-content > :nth-child(1) > span.ng-star-inserted > .mat-mdc-menu-item').click();
      cy.get('.ng-tns-c104-27 > .ng-star-inserted > .mat-mdc-menu-item > .mdc-list-item__primary-text > .menu-leaf').click();

      cy.wait(1000);

      // Escolhe a prioridade Média
      cy.get('mat-select#priority-select').click({ force: true });
      cy.get('#priority-select-panel .mat-mdc-option').contains('Média').click();

      // Adiciona a Descrição da Diária
      cy.get('textarea#description-textarea').clear({ force: true });
      cy.get('textarea#description-textarea').type('Refeição', { force: true });

      // Preenche a Data da Nfe
      cy.get('#-from').clear({ force: true });
      cy.get('#-from').type(data.date, { force: true });

      // Preenche o Número do Documento
      cy.get('#document-number').clear({ force: true });
      cy.get('#document-number').type(data.code, { force: true });

      // Preenche o tipo de despesa
      cy.get('mat-select#expenseType-select').click({ force: true });
      cy.get('#expenseType-select-panel .mat-mdc-option').contains('Meal').click();
      
      const value = data.vlTotal.replace(/\./g, '').replace(',', '.');

      // Preenche o valor da Nfe
      cy.get('#value').clear({ force: true });
      cy.get('#value').type(value, { force: true });

      // faz upload do arquivo PDF
      cy.get('input[type="file"]').selectFile('cypress/pdfs/' + fileName, { force: true });
    });
  });
});
