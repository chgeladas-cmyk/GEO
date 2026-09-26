import { state } from "./state.js";
import { getDraft, saveDraft, clearDraft, getTecnicosPadrao } from "./storage.js";
import { renderList } from "./ui.js";

const toast = (msg) => window.GEO?.showToast?.(msg);

const HEADER_FIELDS = [
    "field-id", "current-date", "field-equipe", "field-tecnicos",
    "field-task", "field-incident", "field-endereco", "field-bairro",
    "field-cidade-uf", "field-obs-materiais"
];

function collectDraft() {
    const draft = { fields: {}, checkedActivities: [], checkedMaterials: [], savedAt: new Date().toISOString() };

    HEADER_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) draft.fields[id] = el.value;
    });

    document.querySelectorAll(".activity-checkbox:checked").forEach(cb => {
        draft.checkedActivities.push(cb.dataset.name);
    });

    document.querySelectorAll(".material-checkbox:checked").forEach(cb => {
        const index = cb.id.split("-")[1];
        const qtyEl = document.getElementById(`qty-material-${index}`);
        draft.checkedMaterials.push({ name: cb.dataset.name, qty: qtyEl ? qtyEl.value : "" });
    });

    return draft;
}

export function saveDraftFromForm() {
    saveDraft(collectDraft());
}

export function restoreDraftToForm() {
    const draft = getDraft();
    if (!draft) return;

    HEADER_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && draft.fields && draft.fields[id] !== undefined && draft.fields[id] !== "") {
            el.value = draft.fields[id];
        }
    });

    (draft.checkedActivities || []).forEach(name => {
        const cb = document.querySelector(`.activity-checkbox[data-name="${CSS.escape(name)}"]`);
        if (!cb) return;
        cb.checked = true;
        const index = cb.id.split("-")[1];
        const wrap = document.getElementById(`detail-wrap-activity-${index}`);
        if (wrap) wrap.classList.remove("hidden");
    });

    (draft.checkedMaterials || []).forEach(({ name, qty }) => {
        const cb = document.querySelector(`.material-checkbox[data-name="${CSS.escape(name)}"]`);
        if (!cb) return;
        cb.checked = true;
        const index = cb.id.split("-")[1];
        const qtyEl = document.getElementById(`qty-material-${index}`);
        if (qtyEl && qty) qtyEl.value = qty;
    });

    if ((draft.checkedActivities?.length || draft.checkedMaterials?.length)) {
        toast("📝 Rascunho anterior restaurado.");
    }
}

export function setupDraftAutosave() {
    const area = document.getElementById("capture-area");
    if (!area) return;
    area.addEventListener("input", saveDraftFromForm);
    area.addEventListener("change", saveDraftFromForm);
}

export function startNewRdo() {
    if (!confirm("Iniciar um novo RDO? Os dados preenchidos agora serão apagados.")) return;

    clearDraft();

    const idEl = document.getElementById("field-id");
    if (idEl) idEl.value = "1";
    const dateEl = document.getElementById("current-date");
    if (dateEl) dateEl.value = new Date().toISOString().split("T")[0];
    const equipeEl = document.getElementById("field-equipe");
    if (equipeEl) equipeEl.value = "Equipe L";
    const tecEl = document.getElementById("field-tecnicos");
    if (tecEl) tecEl.value = getTecnicosPadrao();
    ["field-task", "field-incident", "field-endereco", "field-bairro", "field-cidade-uf", "field-obs-materiais"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });

    renderList("activity");
    renderList("material");

    toast("🆕 Novo RDO iniciado.");
}
