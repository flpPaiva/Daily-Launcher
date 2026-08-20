# Lançador de Diárias — Extensão Chrome

## Instalação

1. Abra o Chrome e acesse `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `daily-launcher/`

---

## Estrutura do projeto

```
daily-launcher/
├── manifest.json         # Configuração da extensão (MV3)
├── background.js         # Abre o popup como janela flutuante
├── popup.html            # Tela principal (home, lançador, relatório)
├── preview.html           # Janela de visualização do PDF
├── icon.png               # Ícone da extensão
├── pdf.min.mjs / pdf.worker.min.mjs   # PDF.js (vendor)
├── styles/
│   ├── theme.css          # Tokens de design (cores, espaçamento, tipografia) e componentes base
│   ├── popup.css          # Estilos específicos do popup
│   └── preview.css        # Estilos específicos da janela de preview
└── src/
    ├── popup/
    │   ├── main.js         # Ponto de entrada — inicializa os demais módulos
    │   ├── constants.js    # URLs externas e constantes do Mantis
    │   ├── state.js        # Estado do arquivo/NFe selecionado
    │   ├── navigation.js   # Troca de telas e abertura de links externos
    │   ├── pdf.js           # Extração de dados da NFe (Nº, data, valor)
    │   ├── launcher.js      # Upload, navegação entre arquivos, abertura do preview
    │   ├── report.js        # Histórico de lançamentos da sessão
    │   ├── renamer.js       # Renomeação da pasta de NFes em ordem numérica
    │   └── mantis.js        # Preenchimento e envio do formulário no Mantis
    └── preview/
        └── main.js          # Renderização e zoom/pan do PDF na janela de preview
```

Cada módulo de `src/popup/` expõe uma função `init*()` chamada por `main.js` — não há efeitos colaterais escondidos em imports.

---

## Como usar

### 1. Renomear arquivos da pasta de NFes (opcional)
Clique em **Renomear arquivos para ordem numérica**, selecione a pasta com os PDFs e confirme.
Os arquivos serão renomeados para `1.pdf`, `2.pdf`, `3.pdf`… por ordem de data.

### 2. Selecionar o PDF da NFe
Clique na área de upload ou arraste o PDF diretamente para ela.
Os dados são extraídos automaticamente: **Nº NFe, Data e Valor**.

### 3. Revisar os dados
Confira e edite os campos se necessário:
- **Nº NFe** — número do documento
- **Data** — data de emissão
- **Valor** — valor total
- **Tipo** — Meal / Mercado / Combustível
- **Prioridade** — Mínima / Baixa / Média / Alta / Urgente

### 4. Visualizar o PDF (opcional)
Clique em **Visualizar NFe** para abrir o PDF em uma janela ao lado.
- **Ctrl + Scroll** — zoom in/out
- **Clique e arraste** — mover o documento
- **Esc** — fechar a visualização

### 5. Lançar a diária
Abra o formulário de Reembolso de Diária no Mantis e clique em **Lançar Diária**.
A extensão preenche todos os campos e anexa o PDF automaticamente.
