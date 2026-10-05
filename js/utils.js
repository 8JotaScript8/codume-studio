// Objetos do modelo só contêm valores serializáveis em JSON.
export const clone = (value) => JSON.parse(JSON.stringify(value));
export const uid = () =>
  globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : "x" + Date.now().toString(36) + Math.random().toString(36).slice(2);
