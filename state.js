import { defaultData } from "./default-data.js";

export const DATA_VERSION = 8;

function cloneDefaultData() {
  return structuredClone(defaultData);
}

export const state = {
  dataStore: cloneDefaultData(),
  activeField: null,
  voiceActive: false,
  recognition: null,
  initialized: false
};

if (!state.dataStore.activityDetails) state.dataStore.activityDetails = {};

export function hydrateDataStore(savedData) {
  if (!savedData || typeof savedData !== "object") return false;

  state.dataStore = {
    ...cloneDefaultData(),
    ...savedData,
    activities: Array.isArray(savedData.activities) ? [...savedData.activities] : [...defaultData.activities],
    materials: Array.isArray(savedData.materials) ? [...savedData.materials] : [...defaultData.materials],
    activityDetails: savedData.activityDetails && typeof savedData.activityDetails === "object"
      ? { ...savedData.activityDetails }
      : {}
  };
  return true;
}

export function migrateData(savedVersion, savedData) {
  hydrateDataStore(savedData);

  if (savedVersion < DATA_VERSION) {
    // Versão 8: substitui integralmente as listas de atividades e materiais.
    // As listas antigas salvas no aparelho não são preservadas.
    state.dataStore.activities = [...defaultData.activities];
    state.dataStore.materials = [...defaultData.materials];
  }

  if (!state.dataStore.activityDetails) state.dataStore.activityDetails = {};
  return state.dataStore;
}
