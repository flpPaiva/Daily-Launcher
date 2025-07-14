# 🚀 Daily-Launcher

O **Daily-Launcher** é uma ferramenta que automatiza o processo de lançamento de diárias no sistema [**Mantis**](https://mantis-br.nttdata-solutions.com/app/#/login), usando arquivos PDF de notas fiscais.

## 📋 Pré-requisitos

- Node.js **v20.9.0** instalado  

Você pode verificar sua versão com:
```bash
node -v
```

> ℹ️ **Nota:** Este launcher foi criado baseado na exportação (impressão) de NFe do site [Nota Paraná](https://notaparana.pr.gov.br/nfprweb/Extrato). No entanto, seu leitor de PDF é agnóstico e pode ser ajustado para outros formatos. Para isso, basta alterar os parâmetros da task `readPDF` no arquivo `cypress.config.js`.

## 📦 Instalação

Clone o repositório e instale as dependências:

```bash
npm install
```

## 🔐 Configuração

Antes de executar o app, você precisa preencher o arquivo de credenciais com seu usuário e senha do Mantis:

```json
// fixture/credentials.json
{
  "user": "seu_usuario",
  "password": "sua_senha"
}
```

## 📁 Organização dos Arquivos

Coloque os arquivos das notas fiscais na pasta `NFes/`.  
É **recomendado** que os arquivos sejam nomeados numericamente para facilitar o processo em lote:

```
NFes/
├── 1.pdf
├── 2.pdf
├── 3.pdf
...
```

> 🛠️ Caso seus arquivos ainda não estejam nomeados numericamente, há uma task em Node.js que faz isso automaticamente.  
> Para executá-la, basta rodar o comando abaixo no terminal:
>
> ```bash
> node renamer.js
> ```

## ▶️ Execução

Para iniciar o app, execute:

```bash
npm run cypress:open
```

Ou pressione `F5` diretamente no **Visual Studio Code**.

Na interface do Cypress:

1. Escolha a opção **"E2E Testing"**
2. Em seguida, clique em **"Start E2E Testing in Chrome"**
3. Quando os testes forem carregados, selecione o arquivo **Launcher.cy.js**

## 📝 Lançamento da Nota

1. Abra o arquivo `formValue.js`
2. Atribua à variável `fileName` o nome do arquivo que deseja lançar (ex: `"1.pdf"`)
3. Salve o arquivo

O script irá automaticamente:

- Ler o arquivo PDF
- Extrair os dados necessários
- Preencher os campos no Mantis

Depois, **verifique as informações** e, se estiver tudo correto, clique em **Salvar** no Mantis.

Repita o processo com os próximos arquivos.

> ⚠️ **Notas Fiscais fora do padrão Nota Paraná ou em outros formatos:**
>   
> Caso sua Nota Fiscal **não tenha sido exportada do site Nota Paraná**, ou esteja em um formato diferente como `.png` ou `.jpg`, você pode utilizar o **modo manual**:  
>
> Basta preencher manualmente as variáveis no arquivo `formValue.js`:
> ```js
> const nrNFe = "Número da nota.";
> const date = "Data no formato DD/MM/AAAA.";
> const vlTotal = "Valor total.";
> ```
