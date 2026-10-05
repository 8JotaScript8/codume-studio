import { $, esc, toast } from "./dom.js";
import { state, selectedTable } from "./state.js";
import { clone } from "./utils.js";
import { render, renderList, renderInspector } from "./renderer.js";
import { drawEdges } from "./relationships.js";
import { zoom, transform } from "./viewport.js";
import { openField } from "./dialogs.js";
import { recordSnapshot } from "./history.js";
// Um arraste possui muitos movimentos, mas cria somente uma entrada no histórico.
export function bindCanvas() {
  $("#viewport").onpointerdown = (event) => {
    if (event.button !== 0) return;
    const h = event.target.closest("[data-drag]"),
      card = event.target.closest(".table-card");
    if (card) {
      state.selected = card.dataset.id;
      renderList();
      renderInspector();
      document
        .querySelectorAll(".table-card")
        .forEach((c) =>
          c.classList.toggle("selected", c.dataset.id === state.selected),
        );
    } else {
      state.selected = null;
      renderList();
      renderInspector();
      document
        .querySelectorAll(".table-card")
        .forEach((c) => c.classList.remove("selected"));
    }
    if (h) {
      const currentTable = selectedTable();
      state.drag = {
        kind: "table",
        id: currentTable.id,
        x: event.clientX,
        y: event.clientY,
        tx: currentTable.x,
        ty: currentTable.y,
        before: clone(state.model),
      };
    } else if (!card)
      state.drag = {
        kind: "pan",
        x: event.clientX,
        y: event.clientY,
        tx: state.view.x,
        ty: state.view.y,
      };
    if (state.drag) $("#viewport").setPointerCapture(event.pointerId);
  };
  $("#viewport").onpointermove = (event) => {
    if (!state.drag) return;
    const dx = event.clientX - state.drag.x,
      dy = event.clientY - state.drag.y;
    if (state.drag.kind === "pan") {
      state.view.x = state.drag.tx + dx;
      state.view.y = state.drag.ty + dy;
      transform();
    } else {
      const currentTable = state.model.tables.find(
        (candidate) => candidate.id === state.drag.id,
      );
      currentTable.x = Math.max(
        -10000,
        Math.min(10000, state.drag.tx + dx / state.view.z),
      );
      currentTable.y = Math.max(
        -10000,
        Math.min(10000, state.drag.ty + dy / state.view.z),
      );
      const card = [...document.querySelectorAll(".table-card")].find(
        (c) => c.dataset.id === currentTable.id,
      );
      card.style.left = currentTable.x + "px";
      card.style.top = currentTable.y + "px";
      drawEdges();
    }
  };
  function endDrag() {
    if (state.drag?.kind === "table") {
      const currentTable = state.model.tables.find(
        (candidate) => candidate.id === state.drag.id,
      );
      if (currentTable.x !== state.drag.tx || currentTable.y !== state.drag.ty)
        recordSnapshot(state.drag.before);
    }
    state.drag = null;
  }
  $("#viewport").onpointerup = endDrag;
  $("#viewport").onpointercancel = endDrag;
  $("#viewport").addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const bounds = $("#viewport").getBoundingClientRect();
      zoom(
        Math.exp(-event.deltaY * 0.0015),
        event.clientX - bounds.left,
        event.clientY - bounds.top,
      );
    },
    {
      passive: false,
    },
  );
  $("#cards").ondblclick = (event) => {
    const c = event.target.closest(".table-card"),
      fieldData = event.target.closest("[data-field]");
    if (c && fieldData) {
      state.selected = c.dataset.id;
      openField(fieldData.dataset.field);
    }
  };
  $("#entity-list").onclick = (event) => {
    const b = event.target.closest("[data-table]");
    if (b) {
      state.selected = b.dataset.table;
      render();
      const currentTable = selectedTable(),
        bounds = $("#viewport").getBoundingClientRect();
      state.view.x = bounds.width / 2 - (currentTable.x + 127) * state.view.z;
      state.view.y = bounds.height / 2 - (currentTable.y + 100) * state.view.z;
      transform();
    }
  };
}
