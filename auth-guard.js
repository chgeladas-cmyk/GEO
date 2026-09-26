import { requireAuth, getCurrentUser, logout, hasPermission } from "./authLocalService.js";

export function initAuthUI({ permission = null } = {}) {
    const user = requireAuth({ permission });
    if (!user) return null;

    const name = document.getElementById("auth-user-name");
    if (name) name.textContent = `${user.name || user.username} · ${user.profile}`;

    const adminLink = document.getElementById("auth-users-link");
    if (adminLink) adminLink.classList.toggle("hidden", !hasPermission("usuarios"));

    document.querySelectorAll("[data-permission]").forEach(el => {
        el.classList.toggle("hidden", !hasPermission(el.dataset.permission));
    });

    document.querySelectorAll("[data-action='logout']").forEach(btn => {
        btn.addEventListener("click", () => {
            logout();
            location.replace("./login.html");
        });
    });

    return getCurrentUser();
}
