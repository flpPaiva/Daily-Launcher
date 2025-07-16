const { defineConfig } = require("cypress");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");

module.exports = defineConfig({
  projectId: "jrg962",
  e2e: {
    setupNodeEvents(on, config) {
      on("task", {
        readPDF({ fileName }) {
          const filePath = path.join(__dirname, "cypress/NFes", fileName);

          if (!filePath.includes(".pdf")) {
            return {};
          }

          try {
            const dataBuffer = fs.readFileSync(filePath);

            return pdf(dataBuffer).then((data) => {
              const code = data.text.match(/Número:\s*(.*)/)?.[1].split(" ")[0];
              const vlTotal = data.text.match(/Valor pago R\$:\s*(.*)/)?.[1];
              const date = data.text.match(/Emissão:\s*(.*)/)?.[1].split(" ")[0];

              return { code, vlTotal, date };
            });
          } catch (error) {
            throw new Error(`Arquivo não encontrado: ${filePath}`);
          }
        },
      });
    },
    viewportWidth: 1200,
    viewportHeight: 800,
    chromeWebSecurity: false,
  },
});
