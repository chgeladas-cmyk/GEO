// Controlador da tela Supervisor / Book O.S. Consome os serviços; não contém regra de negócio.
import { initAuthUI } from "./auth-guard.js";
import * as S from "./supervisorService.js";
import { STATUS_POSTE, STATUS_OS, LIMITES, toNum, totalMaterial, valorTotalMateriais, validarOS } from "./supervisorValidationService.js";
import { fmtDataHora, fmtNum, fmtBRL, EVIDENCIA_AUSENTE } from "./bookService.js";
import { gerarBookExcel, gerarBookPDF } from "./bookExportService.js";

const toast = (m) => { const x = document.getElementById("toast"); if (!x) return; x.innerText = m; x.className = "show"; setTimeout(() => { x.className = ""; }, 3000); };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const SEL_KEY = "geo_book_sel_v1";

let user = null, selId = null;

const atual = () => S.obterOS(selId);
function agirSeguro(fn) {
    try { fn(); } catch (e) { alert(e.message || String(e)); }
    render();
}

function capturarGPS() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) return reject(new Error("GPS não suportado pelo navegador."));
        toast("Buscando localização...");
        navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, precisao: p.coords.accuracy }),
            (e) => reject(new Error(e.code === 1 ? "Permissão de GPS negada." : "Não foi possível obter o GPS.")),
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
    });
}

function inp(attrs, val, extra = "") { return `<input ${attrs} value="${esc(val)}" ${extra}>`; }

function renderResumo(os, v) {
    const r = v.rota, it = r.itens;
    const semCoord = it.filter((p) => !p.coordOk).length;
    const baixa = it.filter((p) => Number.isFinite(toNum(p.precisao)) && toNum(p.precisao) > LIMITES.gpsAlertaM).length;
    const foraSeq = it.filter((p, i) => Number(p.seq) !== i + 1).length;
    const card = (t, val) => `<div class="bg-slate-50 border rounded p-2"><div class="text-[10px] uppercase text-slate-500 font-bold">${t}</div><div class="font-bold text-slate-800">${val}</div></div>`;
    const ini = it[0], fim = it[it.length - 1];
    const todos = v.obrigatorios.map((a) => `<li class="text-red-700">⛔ ${esc(a)}</li>`).concat(v.alertas.map((a) => `<li class="text-amber-700">⚠️ ${esc(a)}</li>`));
    return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Resumo operacional</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      ${card("Postes", it.length)}${card("Distância", fmtNum(r.total) + " m")}${card("GPS médio", r.gpsMedio === null ? "—" : fmtNum(r.gpsMedio, 1) + " m")}${card("Pendências", v.pendencias)}
      ${card("Materiais", os.materiais.length + " itens")}${card("Valor", fmtBRL(valorTotalMateriais(os.materiais)))}${card("Status", esc(os.decisao.status))}${card("Supervisor", esc(os.decisao.supervisor || "—"))}
      ${card("Início da rota", ini ? esc(ini.nome || "#" + ini.seq) : "—")}${card("Fim da rota", fim ? esc(fim.nome || "#" + fim.seq) : "—")}
      ${card("Sem coordenada", semCoord)}${card("Baixa precisão / fora de sequência", baixa + " / " + foraSeq)}
    </div>
    ${todos.length ? `<ul class="mt-3 text-sm space-y-1">${todos.join("")}</ul>` : `<p class="mt-3 text-sm text-green-700">✅ Nenhuma inconsistência encontrada.</p>`}
    ${v.pendencias ? `<p class="mt-2 text-xs font-bold text-red-700">O.S. possui pendências e não pode ser aprovada sem justificativa.</p>` : ""}</div>`;
}

function renderIdent(os, D) {
    const f = (rot, path, type = "text") => `<div><label class="block text-xs font-semibold text-gray-600">${rot}</label>${inp(`data-f="ident.${path}" type="${type}"`, os.ident[path], D)}</div>`;
    return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Identificação da O.S.</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      ${f("EPO / Empresa", "epo")}${f("Razão social", "razao")}${f("Contrato", "contrato")}
      ${f("O.S.", "os")}${f("Task / TOA", "task")}${f("Tipo de serviço", "tipoServico")}
      ${f("Ticket Claro", "ticketClaro")}${f("Ticket externo", "ticketExterno")}${f("Data da demanda", "dataDemanda", "date")}
      ${f("Data de conclusão", "dataConclusao", "date")}${f("Equipe", "equipe")}${f("Técnicos", "tecnicos")}
    </div><div class="mt-3"><label class="block text-xs font-semibold text-gray-600">Endereço</label>${inp(`data-f="ident.endereco"`, os.ident.endereco, D)}</div></div>
    <div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Descrição da atividade</h2>
      <textarea data-f="descricao" rows="5" ${D}>${esc(os.descricao)}</textarea></div>`;
}

function renderPostes(os, v, D) {
    const rows = v.rota.itens.map((p) => `<tr>
      <td>${inp(`data-p="${p.id}" data-k="seq" inputmode="numeric" style="width:48px"`, p.seq, D)}</td>
      <td>${inp(`data-p="${p.id}" data-k="nome" style="width:90px"`, p.nome, D)}</td>
      <td>${inp(`data-p="${p.id}" data-k="tipo" style="width:90px"`, p.tipo, D)}</td>
      <td>${inp(`data-p="${p.id}" data-k="lat" inputmode="decimal" style="width:105px"`, p.lat, D)}</td>
      <td>${inp(`data-p="${p.id}" data-k="lon" inputmode="decimal" style="width:105px"`, p.lon, D)}</td>
      <td>${inp(`data-p="${p.id}" data-k="precisao" inputmode="decimal" style="width:62px"`, p.precisao === "" ? "" : (Number.isFinite(toNum(p.precisao)) ? Number(toNum(p.precisao).toFixed(1)) : p.precisao), D)}</td>
      <td class="whitespace-nowrap">${p.distAnterior === null ? "—" : fmtNum(p.distAnterior)}</td>
      <td>${inp(`data-p="${p.id}" data-k="obs" style="width:160px"`, p.obs, D)}</td>
      <td><select data-p="${p.id}" data-k="status" style="width:110px" ${D}>${STATUS_POSTE.map((s) => `<option ${s === (p.status || "PENDENTE") ? "selected" : ""}>${s}</option>`).join("")}</select></td>
      <td class="text-[11px] text-slate-500" style="min-width:120px">${esc(p.evidencia ? (p.evidencia.descricao || "Evidência registrada") : EVIDENCIA_AUSENTE)}</td>
      <td class="text-[11px]">${esc(p.conferidoPor)}</td><td class="text-[11px] whitespace-nowrap">${p.conferidoEm ? fmtDataHora(p.conferidoEm).slice(0, 10) : ""}</td>
      <td class="whitespace-nowrap"><button data-act="gps-poste" data-id="${p.id}" class="text-blue-700 font-bold" ${D}>📍</button> <button data-act="del-poste" data-id="${p.id}" class="text-red-600 font-bold" ${D}>✕</button></td></tr>`).join("");
    return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Conferência de campo / rota</h2>
    <div class="overflow-x-auto"><table class="sup-table w-full"><thead><tr><th>Seq.</th><th>Poste</th><th>Tipo</th><th>Latitude</th><th>Longitude</th><th>Prec. GPS (m)</th><th>Dist. ant. (m)</th><th>Observação</th><th>Status</th><th>Evidência</th><th>Conferido por</th><th>Data</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="13" class="text-gray-500 p-2">Nenhum poste registrado. Este sistema não recebe postes do mapa: cadastre aqui com o GPS real ou manualmente.</td></tr>`}</tbody></table></div>
    <div class="flex flex-wrap gap-2 mt-3"><button data-act="add-poste-gps" class="bg-green-600 text-white px-3 py-2 rounded text-sm font-bold" ${D}>📍 Adicionar poste (capturar GPS)</button>
    <button data-act="add-poste" class="bg-green-50 text-green-700 border border-green-200 px-3 py-2 rounded text-sm font-bold" ${D}>➕ Adicionar poste manual</button></div></div>`;
}

function renderMateriais(os, D) {
    const rows = os.materiais.map((m, i) => { const t = totalMaterial(m); return `<tr>
      <td>${inp(`data-m="${i}" data-k="codigo" style="width:95px"`, m.codigo, D)}</td><td>${inp(`data-m="${i}" data-k="descricao" style="width:260px"`, m.descricao, D)}</td>
      <td>${inp(`data-m="${i}" data-k="un" style="width:50px"`, m.un, D)}</td><td>${inp(`data-m="${i}" data-k="qtd" inputmode="decimal" style="width:70px"`, m.qtd, D)}</td>
      <td>${inp(`data-m="${i}" data-k="preco" inputmode="decimal" style="width:90px"`, m.preco, D)}</td><td class="font-bold whitespace-nowrap">${t === null ? "—" : fmtBRL(t)}</td>
      <td><button data-act="del-mat" data-i="${i}" class="text-red-600 font-bold" ${D}>✕</button></td></tr>`; }).join("");
    return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider text-red-700">Material utilizado</h2>
    <div class="overflow-x-auto"><table class="mat-table w-full"><thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Qtd.</th><th>Preço unit.</th><th>Total</th><th></th></tr></thead>
    <tbody>${rows || `<tr><td colspan="7" class="text-gray-500 p-2">Nenhum material.</td></tr>`}</tbody></table></div>
    <div class="flex justify-between items-center mt-3"><button data-act="add-mat" class="bg-red-50 text-red-700 border border-red-200 px-3 py-2 rounded text-sm font-bold" ${D}>➕ Adicionar material</button>
    <div class="font-bold">VALOR TOTAL: ${fmtBRL(valorTotalMateriais(os.materiais))}</div></div>
    <p class="text-xs text-gray-400 mt-2">Total = quantidade × preço unitário (calculado). O RDO não traz preços: informe o preço unitário de cada item.</p></div>`;
}

function renderDecisao(os) {
    const d = os.decisao, pode = S.podeDecidir(user), cfg = S.getConfig();
    if (!pode) return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm">Decisão do Supervisor</h2><p class="text-sm text-gray-600">Status atual: <b>${esc(d.status)}</b>. Somente Supervisor/Administrador pode decidir a O.S.</p></div>`;
    return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Decisão do Supervisor</h2>
    <p class="text-sm mb-2">Status atual: <b>${esc(d.status)}</b>${d.supervisor ? ` — ${esc(d.supervisor)}, ${fmtDataHora(d.data)}` : ""}</p>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div><label class="block text-xs font-semibold text-gray-600">Novo status da O.S.</label><select id="dec-status">${STATUS_OS.map((s) => `<option ${s === d.status ? "selected" : ""}>${s}</option>`).join("")}</select></div>
      <div><label class="block text-xs font-semibold text-gray-600">Supervisor (usuário logado)</label><input value="${esc(user.name || user.username)}" disabled></div>
      <div><label class="block text-xs font-semibold text-gray-600">RE</label><input id="dec-re" value="${esc(d.re)}"></div>
      <div><label class="block text-xs font-semibold text-gray-600">Assinatura / validação</label><input id="dec-val" value="${esc(d.validacao)}"></div>
      <div><label class="block text-xs font-semibold text-gray-600">Pendências</label><input id="dec-pend" value="${esc(d.pendencias)}"></div>
      <div><label class="block text-xs font-semibold text-gray-600">Justificativa (obrigatória p/ aprovar com alertas, reprovar ou devolver)</label><input id="dec-just" value="${esc(d.justificativa)}"></div>
    </div>
    <button data-act="decidir" class="mt-3 bg-blue-700 text-white px-4 py-2 rounded font-bold">Aplicar decisão</button>
    ${user.profile === "ADMIN" ? `<label class="block mt-3 text-sm"><input type="checkbox" id="cfg-seg" style="width:auto" ${cfg.segregacao ? "checked" : ""}> Segregação de funções: quem registrou a O.S. não pode aprová-la</label>` : ""}</div>`;
}

function renderAuditoria(os) {
    const l = [...os.auditoria].reverse().map((a) => `<li>${fmtDataHora(a.em)} — <b>${esc(a.por)}</b>: ${esc(a.acao)}${a.de || a.para ? ` (${esc(a.de)} → ${esc(a.para)})` : ""}${a.obs ? ` — ${esc(a.obs)}` : ""}</li>`).join("");
    return `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Auditoria</h2>
    <p class="text-xs text-gray-500 mb-2">Criada por ${esc(os.criadoPorNome)} em ${fmtDataHora(os.criadoEm)} · última alteração por ${esc(os.atualizadoPor)} em ${fmtDataHora(os.atualizadoEm)}</p>
    <ul class="text-xs space-y-1">${l}</ul></div>`;
}

function render() {
    const lista = S.listarOS(), sel = document.getElementById("os-select"), root = document.getElementById("os-root");
    if (!lista.find((o) => o.id === selId)) selId = lista.length ? lista[lista.length - 1].id : null;
    sel.innerHTML = lista.length ? lista.map((o) => `<option value="${o.id}" ${o.id === selId ? "selected" : ""}>${esc(o.ident.os || "(sem nº)")} — ${esc(o.ident.task || "sem task")} — ${esc(o.decisao.status)}</option>`).join("") : `<option>Nenhuma O.S.</option>`;
    if (selId) try { localStorage.setItem(SEL_KEY, selId); } catch { /* sem armazenamento */ }
    const os = atual();
    if (!os) { root.innerHTML = `<div class="card text-gray-600 text-sm">Crie uma O.S. a partir do RDO atual (preenchido na tela Carimbo) ou em branco.</div>`; return; }
    const v = validarOS(os), travada = S.osTravada(os), D = travada ? "disabled" : "";
    root.innerHTML = (travada ? `<div class="card bg-amber-50 border border-amber-300 text-sm">🔒 O.S. <b>${esc(os.decisao.status)}</b>: campos bloqueados. Para editar, aplique a decisão "EM CONFERÊNCIA" (reabrir).</div>` : "")
        + renderResumo(os, v) + renderIdent(os, D) + renderPostes(os, v, D) + renderMateriais(os, D)
        + `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Evidências</h2><p class="text-sm text-gray-600">${EVIDENCIA_AUSENTE} O sistema atual não possui armazenamento de fotos; a estrutura (O.S., poste, atividade, data, responsável) está reservada no registro da O.S.</p></div>`
        + renderDecisao(os)
        + `<div class="card"><h2 class="font-bold border-b mb-3 pb-1 uppercase text-sm tracking-wider">Book</h2><div class="flex flex-wrap gap-2">
            <button data-act="xlsx" class="bg-blue-600 text-white px-4 py-2 rounded font-bold text-sm">GERAR BOOK EXCEL</button>
            <button data-act="pdf" class="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm">GERAR BOOK PDF</button></div>
            <p class="text-xs text-gray-400 mt-2">PDF: no diálogo de impressão escolha "Salvar como PDF".${os.decisao.status === "EM CONFERÊNCIA" || os.decisao.status === "DEVOLVIDA PARA CAMPO" ? " Esta O.S. ainda não está aprovada: o Book sai com o status atual." : ""}</p></div>`
        + renderAuditoria(os);
}

function setPath(obj, path, val) { const k = path.split("."); let o = obj; while (k.length > 1) o = o[k.shift()]; o[k[0]] = val; }

function bind() {
    document.getElementById("os-select").addEventListener("change", (e) => { selId = e.target.value; render(); });

    document.addEventListener("change", (e) => {
        const t = e.target;
        if (t.id === "cfg-seg") return agirSeguro(() => S.setSegregacao(t.checked));
        if (t.dataset.f) return agirSeguro(() => S.atualizarOS(selId, (os) => setPath(os, t.dataset.f, t.value)));
        if (t.dataset.p) {
            if (t.dataset.k === "status") return agirSeguro(() => S.definirStatusPoste(selId, t.dataset.p, t.value));
            const val = t.dataset.k === "seq" ? Number(t.value) : t.value;
            return agirSeguro(() => S.atualizarPoste(selId, t.dataset.p, { [t.dataset.k]: val }));
        }
        if (t.dataset.m !== undefined) return agirSeguro(() => S.atualizarMaterial(selId, Number(t.dataset.m), { [t.dataset.k]: t.value }));
    });

    document.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-act]"); if (!b) return;
        const a = b.dataset.act;
        if (a === "new-rdo") return agirSeguro(() => { selId = S.criarOS({ doRdo: true }).id; });
        if (a === "new-blank") return agirSeguro(() => { selId = S.criarOS().id; });
        if (a === "del-os") { if (atual() && confirm("Excluir esta O.S. deste aparelho?")) agirSeguro(() => S.excluirOS(selId)); return; }
        if (a === "add-poste") return agirSeguro(() => S.adicionarPoste(selId));
        if (a === "del-poste") { if (confirm("Remover este poste da O.S.?")) agirSeguro(() => S.removerPoste(selId, b.dataset.id)); return; }
        if (a === "add-mat") return agirSeguro(() => S.adicionarMaterial(selId));
        if (a === "del-mat") return agirSeguro(() => S.removerMaterial(selId, Number(b.dataset.i)));
        if (a === "add-poste-gps" || a === "gps-poste") {
            try {
                const g = await capturarGPS();
                if (a === "add-poste-gps") S.adicionarPoste(selId, g); else S.atualizarPoste(selId, b.dataset.id, g);
                toast(`GPS capturado (precisão ${g.precisao.toFixed(1)} m).`);
            } catch (err) { alert(err.message); }
            return render();
        }
        if (a === "decidir") {
            const val = (id) => document.getElementById(id).value;
            try {
                S.decidir(selId, val("dec-status"), { justificativa: val("dec-just"), pendencias: val("dec-pend"), re: val("dec-re"), validacao: val("dec-val") });
                toast("Decisão registrada.");
            } catch (err) { alert(err.message); return; } // em erro não redesenha: preserva o que o supervisor digitou
            return render();
        }
        if (a === "xlsx") { try { await gerarBookExcel(atual()); toast("Book Excel gerado."); } catch (err) { alert(err.message); } return; }
        if (a === "pdf") { try { gerarBookPDF(atual(), user.name || user.username); } catch (err) { alert(err.message); } }
    });
}

function init() {
    user = initAuthUI({ permission: "ordens" });
    if (!user) return;
    try { selId = localStorage.getItem(SEL_KEY); } catch { selId = null; }
    bind();
    render();
}
init();
