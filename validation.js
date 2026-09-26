const toast = (msg) => window.GEO?.showToast?.(msg);

// Verifica se o RDO tem o mínimo de informação antes de exportar/compartilhar.
// Retorna true se pode prosseguir; se não, avisa o usuário e retorna false.
export function validarAntesDeExportar() {
    const enderecoEl = document.getElementById("field-endereco");
    const endereco = (enderecoEl?.value || "").trim();
    const atividadesMarcadas = document.querySelectorAll(".activity-checkbox:checked").length;

    if (atividadesMarcadas === 0) {
        toast("⚠️ Selecione ao menos uma atividade antes de gerar o RDO.");
        return false;
    }

    if (!endereco) {
        toast("⚠️ Preencha o endereço antes de gerar o RDO.");
        enderecoEl?.focus();
        return false;
    }

    return true;
}
