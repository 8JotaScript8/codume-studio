// Um objeto compartilhado entre os módulos, sem variáveis soltas no window.
export const state = {
  model: null,
  selected: null,
  view: {
    x: 55,
    y: 110,
    z: 1,
  },
  undo: [],
  redo: [],
  editing: null,
  drag: null,
  saveFailed: false,
};
function selectedTable() {
  return state.model.tables.find(
    (currentTable) => currentTable.id === state.selected,
  );
}
export { selectedTable };
