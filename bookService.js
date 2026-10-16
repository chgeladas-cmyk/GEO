// Monta os dados do Book a partir do registro da O.S. Sem DOM, sem armazenamento.
import { validarOS, valorTotalMateriais, totalMaterial, toNum } from "./supervisorValidationService.js";

export const EVIDENCIA_AUSENTE = "Evidência ainda não cadastrada.";

export function fmtData(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ""));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso ?? "");
}
export function fmtDataHora(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const p = (n) => String(n).padStart(2, "0");
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
export const fmtNum = (n, casas = 2) => Number.isFinite(n) ? n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) : "";
export const fmtBRL = (n) => Number.isFinite(n) ? n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "";

export function montarBook(os) {
    const v = validarOS(os);
    const postes = v.rota.itens.map((p) => ({
        seq: Number(p.seq) || p.ordem + 1, nome: p.nome || "", tipo: p.tipo || "",
        lat: toNum(p.lat), lon: toNum(p.lon), precisao: toNum(p.precisao),
        distAnterior: p.distAnterior, obs: p.obs || "", status: p.status || "PENDENTE",
        evidencia: p.evidencia ? String(p.evidencia.descricao || "Evidência registrada") : EVIDENCIA_AUSENTE,
        conferidoPor: p.conferidoPor || "", conferidoEm: p.conferidoEm ? fmtData(p.conferidoEm) : ""
    }));
    const materiais = (os.materiais || []).map((m) => ({
        codigo: m.codigo || "", descricao: m.descricao || "", un: m.un || "",
        qtd: toNum(m.qtd), preco: toNum(m.preco), total: totalMaterial(m)
    }));
    const d = os.decisao || {};
    return {
        ident: { ...os.ident }, descricao: os.descricao || "",
        resumo: {
            postes: postes.length, distanciaTotal: v.rota.total, gpsMedio: v.rota.gpsMedio,
            pendencias: v.pendencias, materiais: materiais.length, valorMateriais: valorTotalMateriais(os.materiais || []),
            status: d.status || "EM CONFERÊNCIA", supervisor: d.supervisor || ""
        },
        postes, materiais, validacao: { obrigatorios: v.obrigatorios, alertas: v.alertas },
        decisao: { status: d.status || "EM CONFERÊNCIA", pendencias: d.pendencias || "", justificativa: d.justificativa || "",
                   supervisor: d.supervisor || "", re: d.re || "", data: d.data || "", validacao: d.validacao || "" },
        rotaInfo: { inicio: postes[0] || null, fim: postes[postes.length - 1] || null }
    };
}

export function nomeArquivoBook(os, ext) {
    const base = String(os.ident?.os || os.id || "OS").replace(/[^\w\-]+/g, "_");
    return `Book_OS_${base}.${ext}`;
}
