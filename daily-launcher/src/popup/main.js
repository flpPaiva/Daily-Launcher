import { showScreen, initNavigation } from "./navigation.js";
import { initLauncher, resetLauncher } from "./launcher.js";
import { initReportScreen } from "./report.js";
import { initRenamer } from "./renamer.js";
import { initMantisActions } from "./mantis.js";

initNavigation({ onBackToHome: resetLauncher });
initLauncher();
initReportScreen({ showScreen });
initRenamer({ onRenamed: resetLauncher });
initMantisActions();
