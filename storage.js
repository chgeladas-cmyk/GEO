import { state, migrateData, DATA_VERSION } from "./state.js";

const KEYS = Object.freeze({
  data: "carimbo_data_store",
  version: "carimbo_data_version",
  tecnicos: "tecnicos_padrao"
});

function readJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch (error) {
    console.warn(`[GEO] Falha ao ler ${key}:`, error);
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`[GEO] Falha ao gravar ${key}:`, error);
    return false;
  }
}

export function getDataStore() {
  return readJSON(KEYS.data, null);
}

export function saveData() {
  return writeJSON(KEYS.data, state.dataStore);
}

export function getPreference(key, fallback = "") {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch (error) {
    console.warn(`[GEO] Falha ao ler preferência ${key}:`, error);
    return fallback;
  }
}

export function setPreference(key, value) {
  try {
    localStorage.setItem(key, String(value ?? ""));
    return true;
  } catch (error) {
    console.error(`[GEO] Falha ao gravar preferência ${key}:`, error);
    return false;
  }
}

export function getTecnicosPadrao() {
  return getPreference(KEYS.tecnicos, "");
}

export function setTecnicosPadrao(value) {
  return setPreference(KEYS.tecnicos, value);
}

export function getDataVersion() {
  const value = Number.parseInt(getPreference(KEYS.version, "1"), 10);
  return Number.isFinite(value) ? value : 1;
}

export function setDataVersion(version) {
  return setPreference(KEYS.version, version);
}

export function initStorage() {
  const savedData = getDataStore();
  const savedVersion = getDataVersion();
  migrateData(savedVersion, savedData);
  setDataVersion(DATA_VERSION);
  if (!saveData()) {
    console.warn("[GEO] Os dados estão disponíveis apenas em memória nesta sessão.");
  }
}

export { KEYS };
