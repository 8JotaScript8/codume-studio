import { $, esc, toast } from "./dom.js";
import { state, selectedTable } from "./state.js";
// As linhas são derivadas das FKs; não existe uma segunda lista de relações.
function drawEdges() {
  let parts = [];
  for (const currentTable of state.model.tables)
    for (let i = 0; i < currentTable.fields.length; i++) {
      const fieldData = currentTable.fields[i];
      if (!fieldData.ref) continue;
      const p = state.model.tables.find(
          (candidate) => candidate.id === fieldData.ref.table,
        ),
        j = p.fields.findIndex(
          (candidate) => candidate.id === fieldData.ref.field,
        );
      const sameColumn = Math.abs(currentTable.x - p.x) < 270;
      const right = currentTable.x >= p.x;
      let x1 = p.x + (right ? 254 : 0),
        x2 = currentTable.x + (right ? 0 : 254),
        y1 = p.y + 64 + j * 33,
        y2 = currentTable.y + 64 + i * 33;
      let d;
      if (sameColumn) {
        x1 = p.x + 254;
        x2 = currentTable.x + 254;
        d = `M${x1},${y1} C${x1 + 90},${y1} ${x2 + 90},${y2} ${x2},${y2}`;
      } else {
        const bend = Math.max(55, Math.abs(x2 - x1) * 0.5);
        d = `M${x1},${y1} C${x1 + (right ? bend : -bend)},${y1} ${x2 + (right ? -bend : bend)},${y2} ${x2},${y2}`;
      }
      let one =
        fieldData.unique ||
        (fieldData.pk &&
          currentTable.fields.filter((candidate) => candidate.pk).length === 1);
      parts.push(
        `<path d="${d}"/><circle cx="${x1}" cy="${y1}" r="3" fill="#7e9974"/><circle cx="${x2}" cy="${y2}" r="3" fill="#7e9974"/><text x="${x1 + (right ? 10 : -10)}" y="${y1 - 9}" text-anchor="${right ? "start" : "end"}">${fieldData.required ? "1" : "0..1"}</text><text x="${x2 + (sameColumn ? 10 : right ? -10 : 10)}" y="${y2 - 9}" text-anchor="${sameColumn ? "start" : right ? "end" : "start"}">${one ? "0..1" : "0..N"}</text>`,
      );
    }
  $("#edges").innerHTML = parts.join("");
}
export { drawEdges };
