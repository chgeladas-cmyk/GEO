const STORAGE_USERS = "geo_auth_users_v1";
const STORAGE_SESSION = "geo_auth_session_v1";
const STORAGE_VERSION = "geo_auth_version_v1";
const VERSION = 2; // v2: corrige carregamento de usuarios.js (usuário admin não existia) e nova senha padrão

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
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
        const bytes = new TextEncoder().encode(value);
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
    }
    // SHA-256 puro em JavaScript para funcionar também quando o HTML é aberto
    // localmente (file://), onde crypto.subtle pode não estar disponível.
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
    const bytes=[];
    for(let i=0;i<value.length;i++){ const c=value.charCodeAt(i); if(c<128) bytes.push(c); else if(c<2048) bytes.push(192|(c>>6),128|(c&63)); else bytes.push(224|(c>>12),128|((c>>6)&63),128|(c&63)); }
    const bitLen=bytes.length*8; bytes.push(128); while((bytes.length%64)!==56) bytes.push(0);
    for(let i=7;i>=0;i--) bytes.push(Math.floor(bitLen/2**(i*8))&255);
    let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a,h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;
    for(let off=0;off<bytes.length;off+=64){
      const w=new Array(64); for(let i=0;i<16;i++){const j=off+i*4; w[i]=((bytes[j]<<24)|(bytes[j+1]<<16)|(bytes[j+2]<<8)|bytes[j+3])>>>0;}
      for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2]; const s0=(rotr(x,7)^rotr(x,18)^(x>>>3))>>>0; const s1=(rotr(y,17)^rotr(y,19)^(y>>>10))>>>0; w[i]=(w[i-16]+s0+w[i-7]+s1)>>>0;}
      let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
      for(let i=0;i<64;i++){const S1=(rotr(e,6)^rotr(e,11)^rotr(e,25))>>>0; const ch=((e&f)^(~e&g))>>>0; const t1=(h+S1+ch+K[i]+w[i])>>>0; const S0=(rotr(a,2)^rotr(a,13)^rotr(a,22))>>>0; const maj=((a&b)^(a&c)^(b&c))>>>0; const t2=(S0+maj)>>>0; h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
      h0=(h0+a)>>>0;h1=(h1+b)>>>0;h2=(h2+c)>>>0;h3=(h3+d)>>>0;h4=(h4+e)>>>0;h5=(h5+f)>>>0;h6=(h6+g)>>>0;h7=(h7+h)>>>0;
    }
    return [h0,h1,h2,h3,h4,h5,h6,h7].map(x=>x.toString(16).padStart(8,"0")).join("");
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
