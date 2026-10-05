import { $, esc, toast } from "./dom.js";
import { state, selectedTable } from "./state.js";
import { TYPES, COLORS } from "./constants.js";
import { field } from "./model.js";
import { uid, clone } from "./utils.js";
import { validate } from "./validation.js";
import { mutate, commit } from "./history.js";
// Formulários leem valores da tela e submetem alterações ao histórico.
function openField(id = null) {
  const currentTable = selectedTable();
  if (!currentTable) return;
  if (!id && currentTable.fields.length >= 100) {
    toast("Limite de 100 campos por tabela.");
    return;
  }
  state.editing = id;
  const fieldData =
    currentTable.fields.find((candidate) => candidate.id === id) ||
    field("", "uuid");
  $("#field-title").textContent = id ? "Editar campo" : "Novo campo";
  $("#field-name").value = fieldData.name;
  $("#field-type").innerHTML = TYPES.map(
    (type) => `<option>${type}</option>`,
  ).join("");
  $("#field-type").value = fieldData.type;
  $("#field-pk").checked = fieldData.pk;
  $("#field-unique").checked = fieldData.unique;
  $("#field-required").checked = fieldData.required;
  let optionsHtml = '<option value="">Sem referência</option>';
  for (const target of state.model.tables)
    for (const targetField of target.fields)
      if (
        (targetField.unique ||
          (targetField.pk &&
            target.fields.filter((candidate) => candidate.pk).length === 1)) &&
        !(target.id === currentTable.id && targetField.id === id)
      ) {
        const value = JSON.stringify({
          table: target.id,
          field: targetField.id,
        });
        optionsHtml += `<option value="${esc(value)}">${esc(target.name + "." + targetField.name + " · " + targetField.type)}</option>`;
      }
  $("#field-ref").innerHTML = optionsHtml;
  $("#field-ref").value = fieldData.ref ? JSON.stringify(fieldData.ref) : "";
  $("#field-error").textContent = "";
  $("#field-dialog").showModal();
  $("#field-name").focus();
}
function deleteField(id) {
  const currentTable = selectedTable(),
    fieldData = currentTable.fields.find((candidate) => candidate.id === id);
  if (
    !confirm(
      "Excluir " +
        fieldData.name +
        "? As referências a este campo também serão removidas.",
    )
  )
    return;
  mutate((diagram) => {
    diagram.tables.find(
      (candidate) => candidate.id === currentTable.id,
    ).fields = diagram.tables
      .find((candidate) => candidate.id === currentTable.id)
      .fields.filter((candidate) => candidate.id !== id);
    for (const table of diagram.tables)
      for (const candidate of table.fields)
        if (
          candidate.ref?.table === currentTable.id &&
          candidate.ref.field === id
        )
          candidate.ref = null;
  });
}
function deleteTable(id) {
  if (!confirm("Excluir esta tabela e suas relações? Você pode desfazer."))
    return;
  mutate((diagram) => {
    diagram.tables = diagram.tables.filter(
      (currentTable) => currentTable.id !== id,
    );
    for (const currentTable of diagram.tables)
      for (const fieldData of currentTable.fields)
        if (fieldData.ref?.table === id) fieldData.ref = null;
  });
}
export function bindDialogs() {
  $("#field-pk").onchange = () => {
    if ($("#field-pk").checked) $("#field-required").checked = true;
  };
  $("#field-ref").onchange = () => {
    if ($("#field-ref").value) {
      const ref = JSON.parse($("#field-ref").value);
      $("#field-type").value = state.model.tables
        .find((currentTable) => currentTable.id === ref.table)
        .fields.find((fieldData) => fieldData.id === ref.field).type;
    }
  };
  $("#field-form").onsubmit = handleFieldSubmit;
  $("#add").onclick = () => {
    if (state.model.tables.length >= 100) {
      toast("Limite de 100 tabelas.");
      return;
    }
    $("#table-name").value = "";
    $("#table-error").textContent = "";
    $("#table-dialog").showModal();
    $("#table-name").focus();
  };
  $("#table-form").onsubmit = handleTableSubmit;
}
export { openField, deleteField, deleteTable };
// Monta uma versão candidata do campo e só aceita um modelo válido.
function handleFieldSubmit(event) {
  event.preventDefault();
  const next = clone(state.model),
    currentTable = next.tables.find(
      (candidate) => candidate.id === state.selected,
    ),
    name = $("#field-name").value.trim();
  if (
    currentTable.fields.some((f) => f.name === name && f.id !== state.editing)
  ) {
    $("#field-error").textContent = "Já existe um campo com esse nome.";
    return;
  }
  const fieldData = {
    id: state.editing || uid(),
    name,
    type: $("#field-type").value,
    pk: $("#field-pk").checked,
    unique: $("#field-unique").checked,
    required: $("#field-pk").checked || $("#field-required").checked,
    ref: $("#field-ref").value ? JSON.parse($("#field-ref").value) : null,
  };
  if (state.editing)
    currentTable.fields[
      currentTable.fields.findIndex(
        (candidate) => candidate.id === state.editing,
      )
    ] = fieldData;
  else currentTable.fields.push(fieldData);
  try {
    validate(next);
  } catch (err) {
    $("#field-error").textContent = err.message;
    return;
  }
  if (commit(next)) $("#field-dialog").close();
}
// Recebe o submit: lê o formulário, cria os dados e confirma a alteração.
function handleTableSubmit(event) {
  // Formulários normalmente navegam/recarregam a página. Aqui fazemos tudo por JS.
  event.preventDefault();

  // $ encontra o input; value lê seu conteúdo; trim remove espaços nas pontas.
  const name = $("#table-name").value.trim();

  // some responde true se pelo menos uma tabela já tiver esse nome.
  const nameAlreadyExists = state.model.tables.some(
    (table) => table.name === name,
  );
  if (nameAlreadyExists) {
    $("#table-error").textContent = "Esse nome já está em uso.";
    return; // Para a função; nada foi adicionado ainda.
  }

  const bounds = $("#viewport").getBoundingClientRect();
  const currentTable = {
    id: uid(),
    name,
    // Converte o centro da tela em uma posição do diagrama, considerando o zoom.
    x: (bounds.width / 2 - state.view.x) / state.view.z - 127,
    y: (bounds.height / 2 - state.view.y) / state.view.z - 60,
    // O resto da divisão permite reutilizar as cores da paleta em sequência.
    color: COLORS[state.model.tables.length % COLORS.length],
    fields: [field("id", "uuid", true)],
  };

  state.selected = currentTable.id;
  // A função recebida por mutate altera uma cópia do modelo, não o original.
  const accepted = mutate((diagram) => diagram.tables.push(currentTable));
  if (accepted) $("#table-dialog").close();
}
