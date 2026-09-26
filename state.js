import { defaultData } from "./default-data.js";

export const DATA_VERSION = 6;

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
    // Versão 6: substitui integralmente a lista antiga de atividades.
    // Não preserva atividades antigas salvas no localStorage.
    state.dataStore.activities = [...defaultData.activities];

    const materials = [...defaultData.materials];
    state.dataStore.materials.forEach(item => {
      if (!materials.includes(item)) materials.push(item);
    });
    state.dataStore.materials = materials;
  }

  if (!state.dataStore.activityDetails) state.dataStore.activityDetails = {};
  return state.dataStore;
}
