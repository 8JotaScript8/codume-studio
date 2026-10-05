import { state } from "./state.js";
import { clone } from "./utils.js";
import { validate } from "./validation.js";
let onChange = () => {};
let onError = () => {};
// Recebemos funções: quem monta a aplicação decide como salvar e renderizar.
export function configureHistory(callbacks) {
  onChange = callbacks.onChange;
  onError = callbacks.onError;
}
export function recordSnapshot(before) {
  state.undo.push(clone(before));
  if (state.undo.length > 60) state.undo.shift();
  state.redo = [];
  onChange();
}
export function commit(next) {
  try {
    validate(next);
  } catch (error) {
    onError(error.message);
    return false;
  }
  const before = state.model;
  state.model = next;
  recordSnapshot(before);
  return true;
}
// Altera uma cópia para que a validação não estrague o modelo atual.
export function mutate(change) {
  const next = clone(state.model);
  change(next);
  return commit(next);
}
export function undoChange() {
  if (!state.undo.length) return;
  state.redo.push(clone(state.model));
  state.model = state.undo.pop();
  onChange();
}
export function redoChange() {
  if (!state.redo.length) return;
  state.undo.push(clone(state.model));
  state.model = state.redo.pop();
  onChange();
}
