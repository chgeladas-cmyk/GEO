// Usuários iniciais do GEO. A senha inicial do ADMIN é 270889.
// Após o primeiro acesso, o ADMIN deve trocar a senha em "Usuários".
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
    }
];
