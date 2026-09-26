import { state } from "./state.js";
import { initStorage, saveData, getTecnicosPadrao, setTecnicosPadrao } from "./storage.js";
import { getGeolocalizacao } from "./geolocation.js";
import { setupActiveFieldTracking, toggleVoice } from "./voice.js";
import { renderList, addItem, removeItem, openMaisUsados, closeMaisUsados, filtrarModalMateriais } from "./ui.js";
import { takeScreenshot, closeScreenshot } from "./screenshot.js";
import { exportAndShareExcel } from "./excel.js";
import { copyToClipboard } from "./clipboard.js";
import { initAuthUI } from "./auth-guard.js";
import { claimPersonalAccount, setOwnPassword } from "./authLocalService.js";
import { setupConnectionIndicator } from "./connection.js";
import { restoreDraftToForm, setupDraftAutosave, startNewRdo } from "./draft.js";

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
        else if (action === "new-rdo") startNewRdo();
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

function setupClaimAccountPrompt(user) {
    const modal = document.getElementById("claim-account-modal");
    if (!modal) return;
    const isReset = user.needsPasswordReset;
    if (!user.shared && !isReset) return;

    modal.classList.remove("hidden");
    modal.classList.add("flex");

    const title = document.getElementById("claim-account-title");
    const desc = document.getElementById("claim-account-desc");
    const usernameField = document.getElementById("claim-username-field");
    const nameField = document.getElementById("claim-name-field");
    const usernameInput = document.getElementById("claim-username");
    const nameInput = document.getElementById("claim-name");
    const skipBtn = document.getElementById("claim-account-skip");

    if (isReset) {
        title.textContent = "Defina sua nova senha";
        desc.textContent = "Sua senha foi resetada pelo administrador. Defina uma senha nova para continuar.";
        usernameField.classList.add("hidden");
        nameField.classList.add("hidden");
        usernameInput.required = false;
        nameInput.required = false;
        skipBtn.classList.add("hidden");
    } else {
        title.textContent = "Criar meu usuário";
        desc.textContent = "Você entrou com o acesso padrão de técnico. Crie seu usuário pessoal agora — da próxima vez, entre com ele em vez do acesso padrão.";
        usernameField.classList.remove("hidden");
        nameField.classList.remove("hidden");
        usernameInput.required = true;
        nameInput.required = true;
        skipBtn.classList.remove("hidden");
    }

    const form = document.getElementById("claim-account-form");
    const error = document.getElementById("claim-account-error");
    skipBtn.onclick = () => {
        modal.classList.add("hidden");
        modal.classList.remove("flex");
    };
    form.onsubmit = async (event) => {
        event.preventDefault();
        error.classList.add("hidden");
        try {
            if (isReset) {
                await setOwnPassword(document.getElementById("claim-password").value);
            } else {
                await claimPersonalAccount({
                    username: usernameInput.value,
                    name: nameInput.value,
                    password: document.getElementById("claim-password").value
                });
            }
            location.reload();
        } catch (err) {
            error.textContent = err.message || "Não foi possível concluir.";
            error.classList.remove("hidden");
        }
    };
}

function init() {
    const user = initAuthUI({ permission: "atividades" });
    if (!user) return;
    setupClaimAccountPrompt(user);
    initStorage();
    setupConnectionIndicator();
    const tecInput = document.getElementById("field-tecnicos");
    if (tecInput) tecInput.value = getTecnicosPadrao();
    const dateInput = document.getElementById("current-date");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
    bindStaticEvents();
    renderList("activity");
    renderList("material");
    restoreDraftToForm();
    setupDraftAutosave();
    setupActiveFieldTracking();
}

init();

// Compatibilidade temporária para integrações externas existentes.
Object.assign(window, { getGeolocalizacao, toggleVoice, saveData, addItem, removeItem, openMaisUsados, closeMaisUsados, filtrarModalMateriais, takeScreenshot, closeScreenshot, exportAndShareExcel, copyToClipboard });
