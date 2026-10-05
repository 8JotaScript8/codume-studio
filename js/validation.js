// Recebe um modelo candidato. Lança um erro se alguma regra for violada.
import { TYPES } from "./constants.js";
function validName(n) {
  return typeof n === "string" && /^[a-z_][a-z0-9_]{0,49}$/.test(n);
}
// Duas etapas: primeiro estrutura/campos; depois referências entre tabelas.
function validate(diagram) {
  if (
    !diagram ||
    diagram.version !== 1 ||
    typeof diagram.name !== "string" ||
    diagram.name.length > 80 ||
    !Array.isArray(diagram.tables) ||
    diagram.tables.length > 100
  )
    throw Error(
      "Arquivo incompatível. Use um JSON exportado pelo Codume Studio (até 100 tabelas).",
    );
  // Sets permitem reconhecer IDs e nomes que já apareceram.
  let ids = new Set(),
    names = new Set();
  for (const currentTable of diagram.tables) {
    if (
      !currentTable ||
      typeof currentTable.id !== "string" ||
      ids.has(currentTable.id) ||
      !validName(currentTable.name) ||
      names.has(currentTable.name) ||
      !Number.isFinite(currentTable.x) ||
      !Number.isFinite(currentTable.y) ||
      Math.abs(currentTable.x) > 100000 ||
      Math.abs(currentTable.y) > 100000 ||
      !/^#[0-9a-f]{6}$/i.test(currentTable.color) ||
      !Array.isArray(currentTable.fields) ||
      currentTable.fields.length > 100
    )
      throw Error("Tabela inválida ou duplicada.");
    ids.add(currentTable.id);
    names.add(currentTable.name);
    let fids = new Set(),
      fnames = new Set();
    for (const fieldData of currentTable.fields) {
      if (
        !fieldData ||
        typeof fieldData.id !== "string" ||
        fids.has(fieldData.id) ||
        !validName(fieldData.name) ||
        fnames.has(fieldData.name) ||
        !TYPES.includes(fieldData.type) ||
        ["pk", "required", "unique"].some(
          (k) => typeof fieldData[k] !== "boolean",
        ) ||
        (fieldData.pk && !fieldData.required)
      )
        throw Error("Campo inválido ou duplicado em " + currentTable.name);
      fids.add(fieldData.id);
      fnames.add(fieldData.name);
    }
  }
  for (const currentTable of diagram.tables)
    for (const fieldData of currentTable.fields)
      if (fieldData.ref) {
        const target = diagram.tables.find(
            (candidate) => candidate.id === fieldData.ref.table,
          ),
          targetField = target?.fields.find(
            (candidate) => candidate.id === fieldData.ref.field,
          );
        if (
          !targetField ||
          (!targetField.unique &&
            !(
              targetField.pk &&
              target.fields.filter((candidate) => candidate.pk).length === 1
            )) ||
          targetField.type !== fieldData.type ||
          (target.id === currentTable.id && targetField.id === fieldData.id)
        )
          throw Error(
            "Referência inválida em " +
              currentTable.name +
              "." +
              fieldData.name +
              ". Verifique tipo e unicidade.",
          );
      }
  return true;
}
export { validName, validate };
