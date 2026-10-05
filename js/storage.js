// localStorage é fornecido pelo chamador: assim podemos usar um armazenamento falso nos testes.
import { STORAGE } from "./constants.js";
import { validate } from "./validation.js";
export function loadModel(storage) {
  const raw = storage.getItem(STORAGE);
  if (raw === null) return null;
  const model = JSON.parse(raw);
  validate(model);
  return model;
}
export function saveModel(storage, model) {
  storage.setItem(STORAGE, JSON.stringify(model));
}
