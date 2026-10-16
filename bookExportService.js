// Exportação do Book: Excel (preenche o modelo oficial sem perder formatação) e PDF (versão para impressão).
import { fmtData, fmtDataHora, fmtNum, fmtBRL, nomeArquivoBook, montarBook } from "./bookService.js";

export const MODELO_XLSX = "./BOOK_SUPERVISOR_CH_TELECOM.xlsx";
const ABA_XML = "xl/worksheets/sheet1.xml"; // aba "SAÍDA SUPERVISOR"
const LINHA_POSTE_1 = 18, MAX_POSTES = 25;       // linhas 18..42 do modelo
const LINHA_MATERIAL_1 = 47, MAX_MATERIAIS = 15; // linhas 47..61 do modelo

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Troca o conteúdo de uma célula já existente, mantendo o estilo (atributo s) do modelo.
function setCell(xml, ref, value) {
    const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>[\\s\\S]*?</c>)`);
    const m = re.exec(xml);
    if (!m) throw new Error(`O modelo Excel não tem a célula ${ref}. O modelo foi alterado?`);
    const s = /\ss="(\d+)"/.exec(m[1]);
    const sa = s ? ` s="${s[1]}"` : "";
    let cell;
    if (value === null || value === undefined || value === "") cell = `<c r="${ref}"${sa}/>`;
    else if (typeof value === "object" && value.f) cell = `<c r="${ref}"${sa}><f>${esc(value.f)}</f></c>`;
    else if (typeof value === "number") cell = Number.isFinite(value) ? `<c r="${ref}"${sa} t="n"><v>${value}</v></c>` : `<c r="${ref}"${sa}/>`;
    else cell = `<c r="${ref}"${sa} t="inlineStr"><is><t xml:space="preserve">${esc(value)}</t></is></c>`;
    return xml.replace(re, () => cell);
}

export function validarCapacidadeModelo(book) {
    const erros = [];
    if (book.postes.length > MAX_POSTES) erros.push(`O modelo comporta ${MAX_POSTES} postes e a O.S. tem ${book.postes.length}.`);
    if (book.materiais.length > MAX_MATERIAIS) erros.push(`O modelo comporta ${MAX_MATERIAIS} materiais e a O.S. tem ${book.materiais.length}.`);
    return erros;
}

// Preenche o modelo. JSZipLib é injetado (global JSZip no navegador). Retorna Uint8Array do .xlsx.
export async function preencherModelo(JSZipLib, modeloBuffer, book) {
    const erros = validarCapacidadeModelo(book);
    if (erros.length) throw new Error(erros.join(" ") + " Gere o Book em partes ou ajuste o modelo.");
    const zip = await JSZipLib.loadAsync(modeloBuffer, { createFolders: false });
    const arq = zip.file(ABA_XML);
    if (!arq) throw new Error("Aba 'SAÍDA SUPERVISOR' não encontrada no modelo.");
    let x = await arq.async("string");
    const id = book.ident, r = book.resumo, d = book.decisao;
    const set = (ref, v) => { x = setCell(x, ref, v); };

    set("B4", id.epo); set("F4", id.razao); set("J4", id.contrato);
    set("B5", id.os); set("F5", id.task); set("J5", id.tipoServico);
    set("B6", id.ticketClaro); set("F6", id.ticketExterno); set("J6", fmtData(id.dataDemanda));
    set("B7", fmtData(id.dataConclusao)); set("F7", id.endereco);
    set("A10", book.descricao);

    set("A14", r.postes); set("B14", Number(r.distanciaTotal.toFixed(2)));
    set("C14", r.gpsMedio === null ? "" : Number(r.gpsMedio.toFixed(1)));
    set("D14", r.pendencias); set("E14", r.materiais); set("F14", { f: "F62" });
    set("G14", r.status); set("H14", r.supervisor);

    for (let i = 0; i < MAX_POSTES; i++) {
        const row = LINHA_POSTE_1 + i, p = book.postes[i];
        // Linhas sem poste real ficam vazias (o modelo vem com SEQ e PENDENTE pré-preenchidos).
        set(`A${row}`, p ? p.seq : ""); set(`B${row}`, p ? p.nome : ""); set(`C${row}`, p ? p.tipo : "");
        set(`D${row}`, p ? p.lat : ""); set(`E${row}`, p ? p.lon : "");
        set(`F${row}`, p && Number.isFinite(p.precisao) ? p.precisao : "");
        set(`G${row}`, p && p.distAnterior !== null ? Number(p.distAnterior.toFixed(2)) : "");
        set(`H${row}`, p ? p.obs : ""); set(`I${row}`, p ? p.status : "");
        set(`J${row}`, p ? p.evidencia : ""); set(`K${row}`, p ? p.conferidoPor : ""); set(`L${row}`, p ? p.conferidoEm : "");
    }
    for (let i = 0; i < MAX_MATERIAIS; i++) {
        const row = LINHA_MATERIAL_1 + i, m = book.materiais[i];
        set(`A${row}`, m ? m.codigo : ""); set(`B${row}`, m ? m.descricao : ""); set(`C${row}`, m ? m.un : "");
        set(`D${row}`, m && Number.isFinite(m.qtd) ? m.qtd : ""); set(`E${row}`, m && Number.isFinite(m.preco) ? m.preco : "");
        // F (TOTAL) e F62 (VALOR TOTAL) são fórmulas do modelo: não são tocadas.
    }

    const alertas = book.validacao.alertas.length;
    set("B66", d.status);
    set("F66", [d.pendencias || (alertas ? `${alertas} alerta(s) em aberto` : "Nenhuma"), d.justificativa ? `Justificativa: ${d.justificativa}` : ""].filter(Boolean).join(" | "));
    set("J66", d.data ? fmtDataHora(d.data) : "");
    set("B67", d.supervisor); set("F67", d.re);
    set("J67", d.validacao || (d.data ? `Registrado no sistema por ${d.supervisor} em ${fmtDataHora(d.data)}` : ""));

    zip.file(ABA_XML, x, { createFolders: false });
    return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function baixar(blob, nome) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function gerarBookExcel(os) {
    if (typeof JSZip === "undefined") throw new Error("Biblioteca JSZip não carregada (verifique a conexão no primeiro uso).");
    const resp = await fetch(MODELO_XLSX);
    if (!resp.ok) throw new Error(`Modelo ${MODELO_XLSX} não encontrado (HTTP ${resp.status}).`);
    const bytes = await preencherModelo(JSZip, await resp.arrayBuffer(), montarBook(os));
    baixar(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), nomeArquivoBook(os, "xlsx"));
}

// ---------- PDF (impressão) ----------
const h = (s) => esc(s ?? "");
const num = (n, c) => (Number.isFinite(n) ? fmtNum(n, c) : "—");

export function htmlBook(book, { geradoPor = "", geradoEm = new Date().toISOString() } = {}) {
    const id = book.ident, r = book.resumo, d = book.decisao;
    const campo = (rot, v) => `<div class="c"><b>${rot}</b><span>${h(v) || "—"}</span></div>`;
    const alertas = book.validacao.obrigatorios.concat(book.validacao.alertas);
    const evid = book.postes.filter((p) => !p.evidencia.startsWith("Evidência ainda"));
    return `
<h1>CH TELECOM — SAÍDA DO SUPERVISOR</h1><p class="sub">Relatório de conferência / conclusão de O.S.</p>
<h2>1. Identificação da O.S.</h2><div class="grid">
${campo("EPO / Empresa", id.epo)}${campo("Razão social", id.razao)}${campo("Contrato", id.contrato)}
${campo("O.S.", id.os)}${campo("Task / TOA", id.task)}${campo("Tipo de serviço", id.tipoServico)}
${campo("Ticket Claro", id.ticketClaro)}${campo("Ticket externo", id.ticketExterno)}${campo("Data da demanda", fmtData(id.dataDemanda))}
${campo("Data de conclusão", fmtData(id.dataConclusao))}${campo("Equipe", id.equipe)}${campo("Técnicos", id.tecnicos)}
</div>${campo("Endereço", id.endereco)}
<h2>2. Descrição da atividade</h2><pre>${h(book.descricao) || "—"}</pre>
<h2>3. Resumo operacional</h2><div class="grid">
${campo("Postes", r.postes)}${campo("Distância total", num(r.distanciaTotal) + " m")}${campo("GPS médio", r.gpsMedio === null ? "—" : num(r.gpsMedio, 1) + " m")}
${campo("Pendências", r.pendencias)}${campo("Materiais", r.materiais + " itens")}${campo("Valor dos materiais", fmtBRL(r.valorMateriais))}
${campo("Status", r.status)}${campo("Supervisor", r.supervisor)}
${campo("Início da rota", book.rotaInfo.inicio ? `${book.rotaInfo.inicio.nome || "#" + book.rotaInfo.inicio.seq}` : "—")}
</div>${campo("Fim da rota", book.rotaInfo.fim ? `${book.rotaInfo.fim.nome || "#" + book.rotaInfo.fim.seq}` : "—")}
${alertas.length ? `<div class="alerta"><b>Alertas / pendências (${alertas.length})</b><ul>${alertas.map((a) => `<li>${h(a)}</li>`).join("")}</ul></div>` : ""}
<h2>4. Conferência dos postes</h2>
<table><thead><tr><th>Seq.</th><th>Poste</th><th>Tipo</th><th>Latitude</th><th>Longitude</th><th>Prec. GPS (m)</th><th>Dist. ant. (m)</th><th>Observação</th><th>Status</th><th>Evidência</th><th>Conferido por</th><th>Data</th></tr></thead><tbody>
${book.postes.map((p) => `<tr><td>${p.seq}</td><td>${h(p.nome)}</td><td>${h(p.tipo)}</td><td>${Number.isFinite(p.lat) ? p.lat.toFixed(6) : "—"}</td><td>${Number.isFinite(p.lon) ? p.lon.toFixed(6) : "—"}</td><td>${num(p.precisao, 1)}</td><td>${p.distAnterior === null ? "—" : num(p.distAnterior)}</td><td>${h(p.obs)}</td><td>${h(p.status)}</td><td>${h(p.evidencia)}</td><td>${h(p.conferidoPor)}</td><td>${h(p.conferidoEm)}</td></tr>`).join("") || `<tr><td colspan="12">Nenhum poste registrado.</td></tr>`}
</tbody></table>
<h2>5. Materiais</h2>
<table><thead><tr><th>Código</th><th>Descrição</th><th>Un.</th><th>Qtd.</th><th>Preço unit.</th><th>Total</th></tr></thead><tbody>
${book.materiais.map((m) => `<tr><td>${h(m.codigo)}</td><td>${h(m.descricao)}</td><td>${h(m.un)}</td><td>${num(m.qtd, 2)}</td><td>${Number.isFinite(m.preco) ? fmtBRL(m.preco) : "—"}</td><td>${m.total === null ? "—" : fmtBRL(m.total)}</td></tr>`).join("") || `<tr><td colspan="6">Nenhum material registrado.</td></tr>`}
</tbody></table>
<h2>6. Valor total</h2><p class="total">${fmtBRL(r.valorMateriais)}</p>
<h2>7. Evidências</h2>${evid.length ? `<ul>${evid.map((p) => `<li>Poste ${h(p.nome || p.seq)}: ${h(p.evidencia)}</li>`).join("")}</ul>` : "<p>Evidência ainda não cadastrada.</p>"}
<h2>8. Decisão do Supervisor</h2><div class="grid">
${campo("Status da O.S.", d.status)}${campo("Pendências", d.pendencias)}${campo("Justificativa", d.justificativa)}
${campo("Supervisor", d.supervisor)}${campo("RE", d.re)}${campo("Data", d.data ? fmtDataHora(d.data) : "")}
</div>${campo("Assinatura / validação", d.validacao || (d.data ? `Registrado no sistema por ${d.supervisor}` : ""))}
<h2>9. Data e responsável</h2><p>Documento gerado em ${fmtDataHora(geradoEm)} por ${h(geradoPor) || "—"}.</p>`;
}

export function gerarBookPDF(os, geradoPor) {
    const alvo = document.getElementById("book-print");
    if (!alvo) throw new Error("Área de impressão do Book não encontrada.");
    alvo.innerHTML = htmlBook(montarBook(os), { geradoPor });
    const titulo = document.title;
    document.title = nomeArquivoBook(os, "pdf").replace(/\.pdf$/, "");
    const restaurar = () => { document.title = titulo; window.removeEventListener("afterprint", restaurar); };
    window.addEventListener("afterprint", restaurar);
    window.print(); // No diálogo, escolha "Salvar como PDF".
}
