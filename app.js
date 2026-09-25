import { state } from "./state.js";
import { initStorage, saveData, getTecnicosPadrao, setTecnicosPadrao } from "./storage.js";
import { getGeolocalizacao } from "./geolocation.js";
import { setupActiveFieldTracking, toggleVoice } from "./voice.js";
import { renderList, addItem, removeItem, openMaisUsados, closeMaisUsados, filtrarModalMateriais } from "./ui.js";
import { takeScreenshot, closeScreenshot } from "./screenshot.js";
import { exportAndShareExcel } from "./excel.js";
import { copyToClipboard } from "./clipboard.js";

window.GEO = window.GEO || {};

export function showToast(msg) {
    const x = document.getElementById("toast");
    if (!x) return;
    x.innerText = msg;
    x.className = "show";
    setTimeout(() => { x.className = ""; }, 3000);
}
window.GEO.showToast = showToast;
window.GEO.state = state;

function bindStaticEvents() {
    document.addEventListener("click", (event) => {
        const target = event.target.closest("[data-action]");
        if (!target) return;
        const action = target.dataset.action;
        if (action === "copy") copyToClipboard();
        else if (action === "screenshot") takeScreenshot();
        else if (action === "excel") exportAndShareExcel();
        else if (action === "geolocation") getGeolocalizacao();
        else if (action === "voice") toggleVoice();
        else if (action === "add-item") addItem(target.dataset.type);
        else if (action === "remove-item") removeItem(target.dataset.type, Number(target.dataset.index));
        else if (action === "mais-usados-open") openMaisUsados();
        else if (action === "mais-usados-close") closeMaisUsados();
        else if (action === "screenshot-close") closeScreenshot();
        else if (action === "quick-material") {
            const mat = target.dataset.mat;
            // Delegate through the modal's exported UI behavior by clicking its matching action.
            // The actual helper is intentionally exposed through a DOM event in ui.js.
            target.dispatchEvent(new CustomEvent("geo:quick-material", { bubbles: true, detail: { mat } }));
        }
        else if (action === "check-material") {
            const cb = document.getElementById(target.dataset.target);
            if (cb) cb.checked = true;
        }
    });

    document.addEventListener("input", (event) => {
        if (event.target.id === "mais-usados-busca") filtrarModalMateriais();
    });

    document.getElementById("mais-usados-modal")?.addEventListener("click", function(e) {
        if (e.target === this) closeMaisUsados();
    });

    document.getElementById("field-tecnicos")?.addEventListener("input", (e) => {
        setTecnicosPadrao(e.target.value);
    });
}

function init() {
    initStorage();
    const tecInput = document.getElementById("field-tecnicos");
    if (tecInput) tecInput.value = getTecnicosPadrao();
    const dateInput = document.getElementById("current-date");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
    bindStaticEvents();
    renderList("activity");
    renderList("material");
    setupActiveFieldTracking();
}

init();

// Compatibilidade temporária para integrações externas existentes.
Object.assign(window, { getGeolocalizacao, toggleVoice, saveData, addItem, removeItem, openMaisUsados, closeMaisUsados, filtrarModalMateriais, takeScreenshot, closeScreenshot, exportAndShareExcel, copyToClipboard });
