// PONTO DE ENTRADA: começa a leitura por aqui. Não contém regras de FK ou SQL.
import { state } from "./state.js";
import { $, toast } from "./dom.js";
import { sample } from "./model.js";
import { configureHistory } from "./history.js";
import { loadModel, saveModel } from "./storage.js";
import { render } from "./renderer.js";
import { fit } from "./viewport.js";
import { bindDialogs } from "./dialogs.js";
import { bindCanvas } from "./interactions.js";
import { bindEvents } from "./events.js";

// Salvar é uma tentativa: o navegador pode bloquear ou ficar sem espaço.
function persist() {
  try {
    saveModel(localStorage, state.model);
    state.saveFailed = false;
    $("#status").textContent = "● Salvo neste navegador";
    $("#status").className = "saved";
  } catch (error) {
    state.saveFailed = true;
    $("#status").textContent = "Salvamento indisponível — exporte JSON";
    $("#status").className = "error";
  }
}
// Entregamos callbacks ao histórico, evitando uma dependência circular com a interface.
configureHistory({
  onChange() {
    persist();
    render();
  },
  onError: toast,
});
let loadError = false;
try {
  state.model = loadModel(localStorage) ?? sample();
} catch (error) {
  state.model = sample();
  loadError = true;
}
bindDialogs();
bindCanvas();
bindEvents();
render();
if (loadError) {
  $("#status").textContent = "Falha ao recuperar dados — exemplo temporário";
  toast(
    "Não foi possível recuperar o salvamento. Exemplo aberto; importe seu backup JSON.",
  );
} else {
  persist();
}
// Aguarda o navegador calcular as dimensões antes de enquadrar as tabelas.
requestAnimationFrame(fit);
