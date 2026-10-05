import { $, esc, toast } from "./dom.js";
import { state, selectedTable } from "./state.js";
import { COLORS } from "./constants.js";
import { drawEdges } from "./relationships.js";
import { transform } from "./viewport.js";
// Apenas apresenta dados. Os eventos do inspetor são registrados uma vez em events.js.
function render() {
  if (!selectedTable()) state.selected = null;
  $("#project").value = state.model.name;
  $("#count").textContent = "(" + state.model.tables.length + ")";
  $("#undo").disabled = !state.undo.length;
  $("#redo").disabled = !state.redo.length;
  $("#stats").textContent =
    state.model.tables.length +
    " tabelas · " +
    state.model.tables.reduce(
      (n, currentTable) => n + currentTable.fields.length,
      0,
    ) +
    " campos · " +
    state.model.tables.reduce(
      (n, currentTable) =>
        n + currentTable.fields.filter((fieldData) => fieldData.ref).length,
      0,
    ) +
    " relações";
  $("#empty").hidden = !!state.model.tables.length;
  renderList();
  renderCards();
  renderInspector();
  transform();
}
function renderList() {
  let term = $("#search").value.toLowerCase();
  $("#entity-list").innerHTML = state.model.tables
    .filter((currentTable) => currentTable.name.includes(term))
    .map(
      (currentTable) =>
        `<button class="entity-item ${currentTable.id === state.selected ? "active" : ""}" data-table="${esc(currentTable.id)}"><i class="dot" style="background:${currentTable.color}"></i><b>${esc(currentTable.name)}</b><small>${currentTable.fields.length}</small></button>`,
    )
    .join("");
}
function renderCards() {
  $("#cards").innerHTML = state.model.tables
    .map(
      (currentTable) =>
        `<section class="table-card ${state.selected === currentTable.id ? "selected" : ""}" data-id="${esc(currentTable.id)}" style="left:${currentTable.x}px;top:${currentTable.y}px;--accent:${currentTable.color}"><div class="table-head" data-drag="${esc(currentTable.id)}"><span>▤ &nbsp;${esc(currentTable.name)}</span><small>${currentTable.fields.length}</small></div>${currentTable.fields.map((fieldData) => `<div class="table-field" data-field="${esc(fieldData.id)}"><span class="badges">${fieldData.pk ? "PK" : fieldData.ref ? "FK" : fieldData.unique ? "UQ" : "·"}</span><span class="fname">${esc(fieldData.name)}${fieldData.required ? ' <span title="Obrigatório">*</span>' : ""}</span><span class="ftype">${esc(fieldData.type)}${fieldData.pk && fieldData.ref ? " ↗" : ""}</span></div>`).join("")}${!currentTable.fields.length ? '<div class="table-field subtle">Selecione para adicionar campos</div>' : ""}</section>`,
    )
    .join("");
  drawEdges();
}
function renderInspector() {
  const currentTable = selectedTable();
  if (!currentTable) {
    $("#inspector").innerHTML =
      '<div class="no-selection"><div class="eyebrow">Inspetor</div><h2>Estruture sua próxima ideia.</h2><p class="hint">Selecione uma tabela para editar seus campos e criar conexões.</p><div class="note"><b>Comece pelo que importa.</b><br>Quem usa seu sistema? O que ele cria? Como as informações se conectam?</div><div class="divider"></div><p class="hint">O exemplo Codume tem uma chave composta na associação de tecnologias. Explore as referências para entender o N:N.</p></div>';
    return;
  }
  $("#inspector").innerHTML =
    `<div class="eyebrow">Propriedades da tabela <button id="deselect" class="mini" style="float:right" aria-label="Fechar inspetor">×</button></div><h2>${esc(currentTable.name)}</h2><label for="rename">Nome da tabela</label><input id="rename" value="${esc(currentTable.name)}" maxlength="50"><div class="palette">${COLORS.map((c) => `<button class="swatch ${c === currentTable.color ? "active" : ""}" style="background:${c}" data-color="${c}" aria-label="Cor ${c}"></button>`).join("")}</div><h3>CAMPOS <span class="subtle">/ ${currentTable.fields.length}</span></h3><div>${currentTable.fields.map((fieldData) => `<div class="field-item"><div class="details"><b>${esc(fieldData.name)} <span class="key">${fieldData.pk ? "PK" : ""} ${fieldData.unique ? "UQ" : ""}</span> <span class="fk">${fieldData.ref ? "FK" : ""}</span></b><small>${esc(fieldData.type)} · ${fieldData.required ? "obrigatório" : "opcional"}</small></div><button data-edit="${esc(fieldData.id)}" title="Editar ${esc(fieldData.name)}">✎</button><button data-delete="${esc(fieldData.id)}" title="Excluir ${esc(fieldData.name)}">×</button></div>`).join("")}</div><button id="add-field" class="full" style="margin-top:14px">+ Adicionar campo</button><div class="note">Para criar uma relação, edite o campo que guarda a chave estrangeira e escolha sua <b>referência</b>.</div><div class="divider"></div><button id="delete-table" class="danger full">Excluir tabela</button>`;
}
export { render, renderList, renderCards, renderInspector };
