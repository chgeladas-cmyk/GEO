// Usuários iniciais do GEO. Senha inicial: ADMIN=270889, SUPERVISOR/TECNICO=1234.
// Após o primeiro acesso, cada usuário deve trocar a própria senha em "Usuários".
window.GEO_DEFAULT_USERS = [
    {
        id: "usr_admin",
        username: "admin",
        name: "Administrador",
        profile: "ADMIN",
        active: true,
        permissions: ["atividades","materiais","ordens","relatorios","usuarios","configuracoes"],
        passwordHash: "4e8400615009fcddc7f646c80170b24a475b3b85dfeb04cb27654b458d44c4fe",
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
        createdAt: "2026-09-26T00:00:00.000Z",
        updatedAt: "2026-09-26T00:00:00.000Z"
    }
];
