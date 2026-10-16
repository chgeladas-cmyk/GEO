// Validações do Book / Conclusão da O.S. Funções puras: sem DOM, sem localStorage.
export const LIMITES = Object.freeze({ gpsAlertaM: 20, distanciaAnormalM: 150 });
export const STATUS_POSTE = Object.freeze(["PENDENTE", "CONFERIDO", "APROVADO", "REVISAR", "REPROVADO"]);
export const STATUS_OS = Object.freeze(["EM CONFERÊNCIA", "APROVADA", "APROVADA COM PENDÊNCIA", "REPROVADA", "DEVOLVIDA PARA CAMPO"]);
export const STATUS_OS_TRAVADOS = Object.freeze(["APROVADA", "APROVADA COM PENDÊNCIA", "REPROVADA"]);
export const POSTE_STATUS_PENDENTES = Object.freeze(["PENDENTE", "REVISAR", "REPROVADO"]);

// Aceita número ou texto em formato brasileiro ("1.234,56") ou simples ("1234.56").
export function toNum(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : NaN;
    const s = String(v ?? "").trim().replace(/\s/g, "");
    if (!s) return NaN;
    return s.includes(",") ? Number(s.replace(/\./g, "").replace(",", ".")) : Number(s);
}

export function coordValida(lat, lon) {
    const a = toNum(lat), b = toNum(lon);
    return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 && !(a === 0 && b === 0);
}

export function haversineM(lat1, lon1, lat2, lon2) {
    const R = 6371008.8, rad = Math.PI / 180;
    const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
}

// Distância de cada poste ao anterior, na ordem da rota (ordem do array).
export function calcularRota(postes) {
    let total = 0, somaGps = 0, nGps = 0, prev = null;
    const itens = postes.map((p, i) => {
        const ok = coordValida(p.lat, p.lon);
        let dist = null;
        if (ok && prev) { dist = haversineM(prev.lat, prev.lon, toNum(p.lat), toNum(p.lon)); total += dist; }
        if (ok) prev = { lat: toNum(p.lat), lon: toNum(p.lon) };
        const prec = toNum(p.precisao);
        if (Number.isFinite(prec)) { somaGps += prec; nGps++; }
        return { ...p, ordem: i, coordOk: ok, distAnterior: dist };
    });
    return { itens, total, gpsMedio: nGps ? somaGps / nGps : null };
}

export function totalMaterial(m) {
    const q = toNum(m.qtd), p = toNum(m.preco);
    return Number.isFinite(q) && Number.isFinite(p) ? Number((q * p).toFixed(6)) : null;
}

export function valorTotalMateriais(materiais) {
    return Number(materiais.reduce((s, m) => s + (totalMaterial(m) ?? 0), 0).toFixed(6));
}

const nomePoste = (p, i) => (String(p.nome || "").trim() || `#${i + 1}`);
const vazio = (v) => !String(v ?? "").trim();

// Retorna { obrigatorios, alertas, pendencias, rota }.
// obrigatorios: bloqueiam qualquer aprovação. alertas: exigem justificativa.
export function validarOS(os) {
    const obrigatorios = [], alertas = [];
    const id = os.ident || {}, postes = os.postes || [], materiais = os.materiais || [];
    const rota = calcularRota(postes);

    if (vazio(id.os)) obrigatorios.push("O.S. não identificada (número da O.S. em branco).");
    if (vazio(id.equipe) && vazio(id.tecnicos)) obrigatorios.push("Equipe/responsável não identificado.");
    if (vazio(id.dataConclusao)) obrigatorios.push("Data de conclusão não informada.");
    if (postes.length === 0) obrigatorios.push("Nenhuma rota registrada: não há postes na O.S.");

    rota.itens.forEach((p, i) => {
        const n = nomePoste(p, i);
        if (!p.coordOk) obrigatorios.push(`Poste ${n} sem coordenada válida.`);
        if (Number(p.seq) !== i + 1) obrigatorios.push(`Quebra na sequência da rota: poste ${n} está com Seq. ${p.seq || "(vazio)"} na posição ${i + 1}.`);
    });

    materiais.forEach((m, i) => {
        const n = String(m.codigo || m.descricao || `item ${i + 1}`).trim();
        const q = toNum(m.qtd), pr = toNum(m.preco);
        if (!vazio(m.qtd) && (!Number.isFinite(q) || q < 0)) obrigatorios.push(`Material ${n}: quantidade inválida.`);
        if (!vazio(m.preco) && (!Number.isFinite(pr) || pr < 0)) obrigatorios.push(`Material ${n}: preço inválido.`);
        if (vazio(m.qtd)) alertas.push(`Material ${n} sem quantidade.`);
        if (vazio(m.preco)) alertas.push(`Material ${n} sem preço.`);
    });

    rota.itens.forEach((p, i) => {
        const n = nomePoste(p, i), prec = toNum(p.precisao);
        if (!Number.isFinite(prec)) alertas.push(`Poste ${n} sem precisão GPS informada.`);
        else if (prec > LIMITES.gpsAlertaM) alertas.push(`Poste ${n} possui precisão GPS de ${prec.toFixed(0)} m.`);
        if (vazio(p.obs)) alertas.push(`Poste ${n} está sem observação.`);
        if (p.distAnterior !== null && p.distAnterior > LIMITES.distanciaAnormalM)
            alertas.push(`Poste ${n}: distância anormal de ${p.distAnterior.toFixed(1)} m ao ponto anterior.`);
        if (POSTE_STATUS_PENDENTES.includes(p.status || "PENDENTE")) alertas.push(`Poste ${n} com status ${p.status || "PENDENTE"} (pendência aberta).`);
    });

    if (vazio(os.descricao)) alertas.push("Descrição da atividade em branco.");

    return { obrigatorios, alertas, pendencias: obrigatorios.length + alertas.length, rota };
}

// Regras de aprovação/decisão. Não verifica perfil nem segregação (isso é do supervisorService).
export function avaliarDecisao(novoStatus, validacao, justificativa) {
    const just = String(justificativa ?? "").trim();
    if (!STATUS_OS.includes(novoStatus)) return { ok: false, erro: "Status de O.S. inválido." };
    if (novoStatus === "APROVADA" || novoStatus === "APROVADA COM PENDÊNCIA") {
        if (validacao.obrigatorios.length)
            return { ok: false, erro: "O.S. possui pendências e não pode ser aprovada sem justificativa. Itens obrigatórios não atendidos:\n• " + validacao.obrigatorios.join("\n• ") };
        if (validacao.alertas.length && just.length < 5)
            return { ok: false, erro: `O.S. possui pendências e não pode ser aprovada sem justificativa (${validacao.alertas.length} alerta(s) abertos). Preencha a justificativa.` };
    }
    if ((novoStatus === "REPROVADA" || novoStatus === "DEVOLVIDA PARA CAMPO") && just.length < 5)
        return { ok: false, erro: "Informe a justificativa da reprovação/devolução." };
    return { ok: true };
}
