// Controle da O.S. do Supervisor: persistência (localStorage), auditoria, permissões e decisão.
import { getCurrentUser } from "./authLocalService.js";
import { getDraft, getDataStore } from "./storage.js";
import { validarOS, avaliarDecisao, STATUS_OS_TRAVADOS, STATUS_POSTE, STATUS_OS } from "./supervisorValidationService.js";

const KEY_OS = "geo_book_os_v1";
const KEY_CFG = "geo_book_cfg_v1";
const PERFIS_DECISAO = ["SUPERVISOR", "ADMIN"];

function ler(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
    catch (e) { console.warn("[GEO] Falha ao ler", key, e); return fallback; }
}
function gravar(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error("[GEO] Falha ao gravar", key, e); return false; }
}

const usuario = () => getCurrentUser();
const nomeUsuario = (u) => (u ? (u.name || u.username) : "desconhecido");
const agora = () => new Date().toISOString();
export const podeDecidir = (u = usuario()) => Boolean(u && PERFIS_DECISAO.includes(String(u.profile).toUpperCase()));
export const osTravada = (os) => STATUS_OS_TRAVADOS.includes(os.decisao?.status);

export function getConfig() { return { segregacao: false, ...ler(KEY_CFG, {}) }; }
export function setSegregacao(ativa) {
    const u = usuario();
    if (!u || String(u.profile).toUpperCase() !== "ADMIN") throw new Error("Somente administrador altera a segregação de funções.");
    return gravar(KEY_CFG, { ...getConfig(), segregacao: Boolean(ativa) });
}

export function listarOS() { const l = ler(KEY_OS, []); return Array.isArray(l) ? l : []; }
export function obterOS(id) { return listarOS().find((o) => o.id === id) || null; }

function salvarLista(lista) {
    if (!gravar(KEY_OS, lista)) throw new Error("Não foi possível gravar no armazenamento do aparelho.");
}
function registrar(os, acao, de, para, obs = "") {
    const u = usuario();
    os.auditoria.push({ em: agora(), por: nomeUsuario(u), porId: u?.id || "", acao, de: de ?? "", para: para ?? "", obs });
}

// Lê o RDO em edição (rascunho do app principal). Não altera nada.
export function lerRdoAtual() {
    const d = getDraft();
    if (!d || !d.fields) return null;
    const f = d.fields, det = (getDataStore() || {}).activityDetails || {};
    const atividades = (d.checkedActivities || []).map((nome) => ({ nome, detalhe: det[nome] || "" }));
    const materiais = (d.checkedMaterials || []).map(({ name, qty }) => {
        const m = /^\s*(\d{4,})\s*-\s*(.*)$/.exec(name || "");
        return { codigo: m ? m[1] : "", descricao: m ? m[2].trim() : String(name || ""), un: "", qtd: qty ?? "", preco: "" };
    });
    const endereco = [f["field-endereco"], f["field-bairro"], f["field-cidade-uf"]].map((s) => String(s || "").trim()).filter(Boolean).join(" - ");
    return {
        rdo: f["field-id"] || "", data: f["current-date"] || "", equipe: f["field-equipe"] || "", tecnicos: f["field-tecnicos"] || "",
        task: f["field-task"] || "", endereco, atividades, materiais
    };
}

export function criarOS({ doRdo = false } = {}) {
    const u = usuario();
    if (!u) throw new Error("Sessão expirada.");
    const lista = listarOS();
    const ultima = lista[lista.length - 1]?.ident || {};
    const rdo = doRdo ? lerRdoAtual() : null;
    if (doRdo && !rdo) throw new Error("Não há RDO em edição para importar. Preencha o RDO na tela principal primeiro.");
    const os = {
        id: "os_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        criadoEm: agora(), criadoPor: u.id, criadoPorNome: nomeUsuario(u), atualizadoEm: agora(), atualizadoPor: nomeUsuario(u),
        origemRdo: rdo ? { rdo: rdo.rdo, importadoEm: agora() } : null,
        ident: {
            epo: ultima.epo || "", razao: ultima.razao || "", contrato: ultima.contrato || "",
            os: "", task: rdo?.task || "", tipoServico: "", ticketClaro: "", ticketExterno: "", dataDemanda: "",
            dataConclusao: rdo?.data || "", endereco: rdo?.endereco || "", equipe: rdo?.equipe || "", tecnicos: rdo?.tecnicos || ""
        },
        descricao: rdo ? rdo.atividades.map((a) => `• ${a.nome}${a.detalhe ? ": " + a.detalhe : ""}`).join("\n") : "",
        postes: [], materiais: rdo ? rdo.materiais : [], evidencias: [],
        decisao: { status: "EM CONFERÊNCIA", pendencias: "", justificativa: "", supervisor: "", re: "", data: "", validacao: "" },
        auditoria: []
    };
    registrar(os, "CRIADA", "", "EM CONFERÊNCIA", rdo ? `Importada do RDO nº ${rdo.rdo}` : "O.S. em branco");
    lista.push(os);
    salvarLista(lista);
    return os;
}

// Aplica uma alteração à O.S. e grava. Bloqueia O.S. já decidida (exceto reabertura via decidir()).
export function atualizarOS(id, mutador, { auditoria } = {}) {
    const u = usuario();
    if (!u) throw new Error("Sessão expirada.");
    const lista = listarOS(), os = lista.find((o) => o.id === id);
    if (!os) throw new Error("O.S. não encontrada.");
    if (osTravada(os)) throw new Error(`O.S. ${os.decisao.status}: reabra para "EM CONFERÊNCIA" para editar.`);
    mutador(os);
    os.atualizadoEm = agora(); os.atualizadoPor = nomeUsuario(u);
    if (auditoria) registrar(os, auditoria.acao, auditoria.de, auditoria.para, auditoria.obs);
    salvarLista(lista);
    return os;
}

export function excluirOS(id) {
    if (!podeDecidir()) throw new Error("Somente Supervisor/Administrador exclui O.S.");
    const lista = listarOS(), os = lista.find((o) => o.id === id);
    if (!os) return false;
    if (osTravada(os)) throw new Error("O.S. decidida não pode ser excluída. Reabra primeiro.");
    salvarLista(lista.filter((o) => o.id !== id));
    return true;
}

export function novoPoste(seq) {
    return { id: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), seq, nome: "", tipo: "", lat: "", lon: "", precisao: "",
             obs: "", status: "PENDENTE", evidencia: null, conferidoPor: "", conferidoEm: "" };
}
export function adicionarPoste(id, dados = {}) {
    return atualizarOS(id, (os) => { os.postes.push({ ...novoPoste(os.postes.length + 1), ...dados }); },
        { auditoria: { acao: "POSTE ADICIONADO", de: "", para: dados.nome || "", obs: "" } });
}
export function removerPoste(id, posteId) {
    return atualizarOS(id, (os) => { os.postes = os.postes.filter((p) => p.id !== posteId); os.postes.forEach((p, i) => { p.seq = i + 1; }); }, // renumera: a sequência acompanha a ordem da rota
        { auditoria: { acao: "POSTE REMOVIDO", de: posteId, para: "", obs: "" } });
}
export function atualizarPoste(id, posteId, campos) {
    return atualizarOS(id, (os) => {
        const p = os.postes.find((x) => x.id === posteId); if (p) Object.assign(p, campos);
    });
}
export function definirStatusPoste(id, posteId, status) {
    if (!STATUS_POSTE.includes(status)) throw new Error("Status de poste inválido.");
    if (!podeDecidir()) throw new Error("Somente Supervisor/Administrador confere postes.");
    const u = usuario();
    return atualizarOS(id, (os) => {
        const p = os.postes.find((x) => x.id === posteId); if (!p) return;
        const anterior = p.status; p.status = status;
        p.conferidoPor = status === "PENDENTE" ? "" : nomeUsuario(u);
        p.conferidoEm = status === "PENDENTE" ? "" : agora();
        registrar(os, "POSTE " + (p.nome || p.seq), anterior, status);
    });
}

export function adicionarMaterial(id, dados = {}) {
    return atualizarOS(id, (os) => { os.materiais.push({ codigo: "", descricao: "", un: "", qtd: "", preco: "", ...dados }); });
}
export function atualizarMaterial(id, idx, campos) {
    return atualizarOS(id, (os) => { if (os.materiais[idx]) Object.assign(os.materiais[idx], campos); });
}
export function removerMaterial(id, idx) {
    return atualizarOS(id, (os) => { os.materiais.splice(idx, 1); });
}

// Decisão do Supervisor. Faz todas as checagens de perfil, segregação e regras de aprovação.
export function decidir(id, novoStatus, { justificativa = "", pendencias = "", re = "", validacao = "" } = {}) {
    const u = usuario();
    if (!podeDecidir(u)) throw new Error("Somente Supervisor ou Administrador pode decidir a O.S.");
    if (!STATUS_OS.includes(novoStatus)) throw new Error("Status de O.S. inválido.");
    const lista = listarOS(), os = lista.find((o) => o.id === id);
    if (!os) throw new Error("O.S. não encontrada.");
    const anterior = os.decisao.status;
    const aprovando = novoStatus === "APROVADA" || novoStatus === "APROVADA COM PENDÊNCIA";
    if (aprovando && getConfig().segregacao && os.criadoPor === u.id)
        throw new Error("Segregação de funções: quem registrou a O.S. não pode aprová-la.");
    const v = validarOS(os);
    if (novoStatus !== "EM CONFERÊNCIA") {
        const r = avaliarDecisao(novoStatus, v, justificativa);
        if (!r.ok) throw new Error(r.erro);
    }
    os.decisao = {
        status: novoStatus, pendencias: String(pendencias || "").trim(), justificativa: String(justificativa || "").trim(),
        supervisor: novoStatus === "EM CONFERÊNCIA" ? "" : nomeUsuario(u), re: String(re || "").trim(),
        data: novoStatus === "EM CONFERÊNCIA" ? "" : agora(), validacao: String(validacao || "").trim()
    };
    os.atualizadoEm = agora(); os.atualizadoPor = nomeUsuario(u);
    registrar(os, "STATUS DA O.S.", anterior, novoStatus,
        [justificativa, v.pendencias ? `${v.pendencias} pendência(s) no ato` : ""].filter(Boolean).join(" | "));
    salvarLista(lista);
    return os;
}
