// Função independente do navegador: modelo válido entra, texto SQL sai.
import { validate } from "./validation.js";
function sql(diagram) {
  validate(diagram);
  if (!diagram.tables.length) throw Error("Crie ao menos uma tabela.");
  for (const currentTable of diagram.tables)
    if (!currentTable.fields.length)
      throw Error("Adicione campos em " + currentTable.name + ".");
  const q = (s) => '"' + s.replace(/"/g, '""') + '"';
  let lines = [
    "-- Codume Studio | PostgreSQL",
    "-- Revise antes de executar. Não altera um banco existente automaticamente.",
    "BEGIN;",
    "",
  ];
  for (const currentTable of diagram.tables) {
    let fs = currentTable.fields.map(
      (fieldData) =>
        "  " +
        q(fieldData.name) +
        " " +
        fieldData.type +
        (fieldData.required ? " NOT NULL" : "") +
        (fieldData.unique ? " UNIQUE" : ""),
    );
    const pk = currentTable.fields.filter((fieldData) => fieldData.pk);
    if (pk.length)
      fs.push(
        "  PRIMARY KEY (" +
          pk.map((fieldData) => q(fieldData.name)).join(", ") +
          ")",
      );
    lines.push(
      "CREATE TABLE " + q(currentTable.name) + " (\n" + fs.join(",\n") + "\n);",
      "",
    );
  }
  for (const currentTable of diagram.tables)
    for (const fieldData of currentTable.fields)
      if (fieldData.ref) {
        const parent = diagram.tables.find(
            (candidate) => candidate.id === fieldData.ref.table,
          ),
          pf = parent.fields.find(
            (candidate) => candidate.id === fieldData.ref.field,
          );
        lines.push(
          "ALTER TABLE " +
            q(currentTable.name) +
            " ADD FOREIGN KEY (" +
            q(fieldData.name) +
            ") REFERENCES " +
            q(parent.name) +
            " (" +
            q(pf.name) +
            ") ON DELETE NO ACTION;",
        );
      }
  lines.push("", "COMMIT;");
  return lines.join("\n");
}
export { sql };
