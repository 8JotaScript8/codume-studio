import { $, esc, toast } from "./dom.js";
import { state, selectedTable } from "./state.js";
import { sample } from "./model.js";
import { validate, validName } from "./validation.js";
import { mutate, commit, undoChange, redoChange } from "./history.js";
import { sql } from "./sql-exporter.js";
import { filename, download } from "./files.js";
import { render, renderList } from "./renderer.js";
import { fit, zoom } from "./viewport.js";
import { openField, deleteField, deleteTable } from "./dialogs.js";
// Conecta os botões às operações. Nenhum listener é criado por render().
export function bindEvents() {
  $("#export").onclick = () => {
    download(
      JSON.stringify(state.model, null, 2),
      filename("json"),
      "application/json",
    );
    toast("JSON exportado. Guarde seu backup.");
  };
  $("#sql").onclick = () => {
    try {
      $("#sqltext").value = sql(state.model);
      $("#sql-dialog").showModal();
    } catch (event) {
      toast(event.message);
    }
  };
  $("#download-sql").onclick = () =>
    download($("#sqltext").value, filename("sql"), "text/plain");
  $("#import").onclick = () => $("#file").click();
  $("#file").onchange = async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 2000000) throw Error("O arquivo deve ter até 2 MB.");
      const next = JSON.parse(await file.text());
      validate(next);
      if (
        confirm(
          "Importar este diagrama e substituir o atual? Você pode desfazer.",
        )
      ) {
        if (commit(next)) {
          state.selected = null;
          render();
          fit();
          toast("Diagrama importado.");
        }
      }
    } catch (err) {
      toast("Importação recusada: " + err.message);
    }
  };
  $("#project").onchange = (event) => {
    const name = event.target.value.trim();
    if (!name) {
      event.target.value = state.model.name;
      return;
    }
    mutate((diagram) => (diagram.name = name));
  };
  $("#search").oninput = renderList;
  $("#new").onclick = () => {
    if (
      confirm(
        "Começar um diagrama vazio? Exporte JSON se quiser guardar o atual.",
      )
    ) {
      commit({
        version: 1,
        name: "Meu diagrama",
        tables: [],
      });
      fit();
    }
  };
  $("#sample").onclick = () => {
    if (
      confirm("Substituir o diagrama pelo exemplo Codume? Você pode desfazer.")
    ) {
      commit(sample());
      fit();
    }
  };
  $("#undo").onclick = undoChange;
  $("#redo").onclick = redoChange;
  $("#plus").onclick = () => zoom(1.2);
  $("#minus").onclick = () => zoom(1 / 1.2);
  $("#fit").onclick = fit;
  $("#help").onclick = () => $("#help-dialog").showModal();
  document
    .querySelectorAll("[data-close]")
    .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
  document.addEventListener("keydown", (event) => {
    if (
      event.target.matches("input,textarea,select") ||
      document.querySelector("dialog[open]")
    )
      return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      (event.shiftKey ? $("#redo") : $("#undo")).click();
    }
  });

  // Delegação: o painel muda de conteúdo, mas seus eventos continuam no contêiner.
  $("#inspector").addEventListener("change", (event) => {
    if (event.target.id !== "rename") return;
    const table = selectedTable();
    if (!table) return;
    const name = event.target.value.trim();
    if (
      !validName(name) ||
      state.model.tables.some(
        (item) => item.id !== table.id && item.name === name,
      )
    ) {
      toast("Use um nome válido e único: letras minúsculas, números e _.");
      event.target.value = table.name;
      return;
    }
    mutate(
      (next) => (next.tables.find((item) => item.id === table.id).name = name),
    );
  });
  $("#inspector").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    const table = selectedTable();
    if (!button || !table) return;
    if (button.id === "deselect") {
      state.selected = null;
      render();
    } else if (button.id === "add-field") {
      openField();
    } else if (button.id === "delete-table") {
      deleteTable(table.id);
    } else if (button.dataset.color) {
      mutate(
        (next) =>
          (next.tables.find((item) => item.id === table.id).color =
            button.dataset.color),
      );
    } else if (button.dataset.edit) {
      openField(button.dataset.edit);
    } else if (button.dataset.delete) {
      deleteField(button.dataset.delete);
    }
  });
}
