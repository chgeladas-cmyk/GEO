const STORAGE_USERS = "geo_auth_users_v1";
const STORAGE_SESSION = "geo_auth_session_v1";
const STORAGE_VERSION = "geo_auth_version_v1";
const VERSION = 1;

const PROFILE_PERMISSIONS = Object.freeze({
    ADMIN: ["atividades","materiais","ordens","relatorios","usuarios","configuracoes"],
    SUPERVISOR: ["atividades","materiais","ordens","relatorios"],
    TECNICO: ["atividades","materiais"]
});

function normalizeUsername(value) {
    return String(value ?? "").trim().toLowerCase();
}

function normalizeUser(user) {
    return {
        id: String(user.id),
        username: normalizeUsername(user.username),
        name: String(user.name ?? "").trim(),
        profile: String(user.profile ?? "TECNICO").toUpperCase(),
        active: user.active !== false,
        permissions: Array.isArray(user.permissions) ? [...new Set(user.permissions)] : [],
        passwordHash: String(user.passwordHash ?? ""),
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString()
    };
}

function read(key, fallback = null) {
    try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getDefaultUsers() {
    return Array.isArray(window.GEO_DEFAULT_USERS) ? window.GEO_DEFAULT_USERS.map(normalizeUser) : [];
}

function ensureInitialized() {
    if (localStorage.getItem(STORAGE_VERSION) !== String(VERSION) || !Array.isArray(read(STORAGE_USERS))) {
        write(STORAGE_USERS, getDefaultUsers());
        localStorage.setItem(STORAGE_VERSION, String(VERSION));
    }
}

function getUsers() {
    ensureInitialized();
    return read(STORAGE_USERS, []).map(normalizeUser);
}

function saveUsers(users) {
    write(STORAGE_USERS, users.map(normalizeUser));
}

function getSession() {
    return read(STORAGE_SESSION, null);
}

function setSession(user) {
    write(STORAGE_SESSION, {
        userId: user.id,
        username: user.username,
        name: user.name,
        profile: user.profile,
        permissions: user.permissions,
        loginAt: new Date().toISOString()
    });
}

async function hashPassword(password) {
    const value = String(password ?? "");
    if (globalThis.crypto?.subtle) {
        const bytes = new TextEncoder().encode(value);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // Fallback determinístico para ambientes antigos sem Web Crypto.
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return `fallback-${(h >>> 0).toString(16)}`;
}

export async function authenticate(username, password) {
    ensureInitialized();
    const normalized = normalizeUsername(username);
    const users = getUsers();
    const user = users.find(u => u.username === normalized);
    if (!user || !user.active) return { ok: false, reason: "Usuário ou senha inválidos." };

    const passwordHash = await hashPassword(password);
    if (passwordHash !== user.passwordHash) return { ok: false, reason: "Usuário ou senha inválidos." };

    setSession(user);
    return { ok: true, user: getSession() };
}

export function logout() {
    localStorage.removeItem(STORAGE_SESSION);
}

export function getCurrentUser() {
    ensureInitialized();
    const session = getSession();
    if (!session) return null;
    const user = getUsers().find(u => u.id === session.userId && u.active);
    if (!user) {
        logout();
        return null;
    }
    return {
        id: user.id,
        username: user.username,
        name: user.name,
        profile: user.profile,
        permissions: user.permissions
    };
}

export function hasPermission(permission) {
    const user = getCurrentUser();
    return Boolean(user && (user.permissions.includes("*") || user.permissions.includes(permission)));
}

export function requireAuth({ permission = null, redirect = "./login.html" } = {}) {
    const user = getCurrentUser();
    if (!user) {
        location.replace(redirect);
        return null;
    }
    if (permission && !hasPermission(permission)) {
        alert("Você não possui permissão para acessar este módulo.");
        location.replace("./index.html");
        return null;
    }
    return user;
}

export function getProfilePermissions(profile) {
    return [...(PROFILE_PERMISSIONS[String(profile ?? "").toUpperCase()] || [])];
}

export async function createUser({ username, name, password, profile = "TECNICO", active = true, permissions = null }) {
    const current = getCurrentUser();
    if (!current || current.profile !== "ADMIN") throw new Error("Apenas ADMIN pode criar usuários.");

    const normalized = normalizeUsername(username);
    if (!normalized || String(password ?? "").length < 4) throw new Error("Usuário e senha são obrigatórios. A senha deve ter pelo menos 4 caracteres.");

    const users = getUsers();
    if (users.some(u => u.username === normalized)) throw new Error("Este usuário já existe.");

    const now = new Date().toISOString();
    const user = normalizeUser({
        id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        username: normalized,
        name,
        profile,
        active,
        permissions: permissions ?? getProfilePermissions(profile),
        passwordHash: await hashPassword(password),
        createdAt: now,
        updatedAt: now
    });
    users.push(user);
    saveUsers(users);
    return user;
}

export function updateUser(id, changes = {}) {
    const current = getCurrentUser();
    if (!current || current.profile !== "ADMIN") throw new Error("Apenas ADMIN pode alterar usuários.");

    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index < 0) throw new Error("Usuário não encontrado.");

    const old = users[index];
    const username = normalizeUsername(changes.username ?? old.username);
    if (!username) throw new Error("Usuário inválido.");
    if (users.some((u, i) => i !== index && u.username === username)) throw new Error("Este usuário já existe.");

    const next = normalizeUser({
        ...old,
        ...changes,
        username,
        profile: String(changes.profile ?? old.profile).toUpperCase(),
        permissions: Array.isArray(changes.permissions) ? [...new Set(changes.permissions)] : old.permissions,
        updatedAt: new Date().toISOString()
    });

    if (old.profile === "ADMIN" && next.profile !== "ADMIN") {
        const otherAdmins = users.filter((u, i) => i !== index && u.active && u.profile === "ADMIN");
        if (otherAdmins.length === 0) throw new Error("Não é permitido remover o último ADMIN.");
    }
    if (old.profile === "ADMIN" && old.active && next.active === false) {
        const otherAdmins = users.filter((u, i) => i !== index && u.active && u.profile === "ADMIN");
        if (otherAdmins.length === 0) throw new Error("Não é permitido bloquear o último ADMIN.");
    }

    users[index] = next;
    saveUsers(users);

    if (current.id === id) {
        if (!next.active) logout();
        else setSession(next);
    }
    return next;
}

export async function setUserPassword(id, password) {
    const current = getCurrentUser();
    if (!current || current.profile !== "ADMIN") throw new Error("Apenas ADMIN pode alterar senhas.");
    if (String(password ?? "").length < 4) throw new Error("A senha deve ter pelo menos 4 caracteres.");

    const users = getUsers();
    const index = users.findIndex(u => u.id === id);
    if (index < 0) throw new Error("Usuário não encontrado.");

    users[index].passwordHash = await hashPassword(password);
    users[index].updatedAt = new Date().toISOString();
    saveUsers(users);
    return true;
}

export { getUsers, hashPassword, PROFILE_PERMISSIONS };
