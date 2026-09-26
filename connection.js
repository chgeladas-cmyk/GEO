const toast = (msg) => window.GEO?.showToast?.(msg);

function applyStatus(el, online) {
    if (online) {
        el.textContent = "🟢 Online";
        el.className = "font-semibold text-green-600";
    } else {
        el.textContent = "🔴 Offline";
        el.className = "font-semibold text-red-600";
    }
}

export function setupConnectionIndicator() {
    const el = document.getElementById("conn-status");
    if (!el) return;

    applyStatus(el, navigator.onLine);

    window.addEventListener("online", () => {
        applyStatus(el, true);
        toast("🟢 Conexão restabelecida.");
    });

    window.addEventListener("offline", () => {
        applyStatus(el, false);
        toast("🔴 Você está offline. GPS e sincronização não vão funcionar até voltar a conexão.");
    });
}
