import { $, esc, toast } from "./dom.js";
import { state, selectedTable } from "./state.js";
// Coordenadas do modelo permanecem independentes do zoom da tela.
function transform() {
  $("#world").style.transform =
    `translate(${state.view.x}px,${state.view.y}px) scale(${state.view.z})`;
  $("#zoom").textContent = Math.round(state.view.z * 100) + "%";
}
function zoom(factor, cx, cy) {
  const bounds = $("#viewport").getBoundingClientRect();
  cx = cx ?? bounds.width / 2;
  cy = cy ?? bounds.height / 2;
  const z = Math.min(1.8, Math.max(0.2, state.view.z * factor));
  state.view.x = cx - ((cx - state.view.x) * z) / state.view.z;
  state.view.y = cy - ((cy - state.view.y) * z) / state.view.z;
  state.view.z = z;
  transform();
}
function fit() {
  if (!state.model.tables.length) {
    state.view = {
      x: 50,
      y: 100,
      z: 1,
    };
    transform();
    return;
  }
  const minx = Math.min(
      ...state.model.tables.map((currentTable) => currentTable.x),
    ),
    miny = Math.min(
      ...state.model.tables.map((currentTable) => currentTable.y),
    ),
    maxx = Math.max(
      ...state.model.tables.map((currentTable) => currentTable.x + 254),
    ),
    maxy = Math.max(
      ...state.model.tables.map(
        (currentTable) => currentTable.y + 50 + currentTable.fields.length * 33,
      ),
    );
  const bounds = $("#viewport").getBoundingClientRect();
  state.view.z = Math.max(
    0.2,
    Math.min(
      1.15,
      (bounds.width - 90) / (maxx - minx),
      (bounds.height - 170) / (maxy - miny),
    ),
  );
  state.view.x =
    (bounds.width - (maxx - minx) * state.view.z) / 2 - minx * state.view.z;
  state.view.y =
    90 +
    (bounds.height - 170 - (maxy - miny) * state.view.z) / 2 -
    miny * state.view.z;
  transform();
}
export { transform, zoom, fit };
