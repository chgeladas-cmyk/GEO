// Usuários iniciais do GEO. A senha inicial do ADMIN é 1234.
// Após o primeiro acesso, o ADMIN deve trocar a senha em "Usuários".
window.GEO_DEFAULT_USERS = [
    {
        id: "usr_admin",
        username: "admin",
        name: "Administrador",
        profile: "ADMIN",
        active: true,
        permissions: ["atividades","materiais","ordens","relatorios","usuarios","configuracoes"],
        passwordHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        createdAt: "2026-09-26T00:00:00.000Z",
        updatedAt: "2026-09-26T00:00:00.000Z"
    }
];
