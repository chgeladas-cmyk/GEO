// Usuários iniciais do GEO. Nenhuma senha de fábrica fica registrada aqui:
// SUPERVISOR/TECNICO usam o acesso universal (senha 1234, ver "shared" abaixo);
// ADMIN não tem senha nenhuma até ser configurado no próprio aparelho (ver login.html:
// "Definir senha do Administrador"). Depois do primeiro acesso, cada perfil troca a
// própria senha em "Usuários".
window.GEO_DEFAULT_USERS = [
    {
        id: "usr_admin",
        username: "admin",
        name: "Administrador",
        profile: "ADMIN",
        active: true,
        permissions: ["atividades","materiais","ordens","relatorios","usuarios","configuracoes"],
        // Sem hash — login fica bloqueado até alguém definir a senha pela primeira vez
        // neste aparelho (setupAdminPassword em authLocalService.js).
        passwordHash: "",
        needsPasswordReset: true,
        createdAt: "2026-09-26T00:00:00.000Z",
        updatedAt: "2026-09-26T00:00:00.000Z"
    },
    {
        id: "usr_supervisor",
        username: "supervisor",
        name: "Supervisor",
        profile: "SUPERVISOR",
        active: true,
        permissions: ["atividades","materiais","ordens","relatorios"],
        passwordHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        createdAt: "2026-09-26T00:00:00.000Z",
        updatedAt: "2026-09-26T00:00:00.000Z"
    },
    {
        id: "usr_tecnico",
        username: "tecnico",
        name: "Técnico",
        profile: "TECNICO",
        active: true,
        permissions: ["atividades","materiais"],
        passwordHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4",
        // Conta universal de primeiro acesso: ao logar com ela, o app pede
        // para o técnico criar seu próprio usuário local (ver "shared" em authLocalService.js).
        shared: true,
        createdAt: "2026-09-26T00:00:00.000Z",
        updatedAt: "2026-09-26T00:00:00.000Z"
    }
];
