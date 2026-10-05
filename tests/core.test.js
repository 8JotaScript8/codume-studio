import test from "node:test";
import assert from "node:assert/strict";
import { sample } from "../js/model.js";
import { validate } from "../js/validation.js";
import { sql } from "../js/sql-exporter.js";
import { state } from "../js/state.js";
import {
  configureHistory,
  mutate,
  commit,
  undoChange,
  redoChange,
} from "../js/history.js";
import { loadModel, saveModel } from "../js/storage.js";
import { clone } from "../js/utils.js";

test("exemplo é válido e IDs permitem renomear sem quebrar FK", () => {
  const model = sample();
  model.tables[0].name = "accounts";
  assert.equal(validate(model), true);
  assert.match(sql(model), /REFERENCES "accounts"/);
});
test("FK incompatível, destino ausente e nomes duplicados são recusados", () => {
  for (const change of [
    (m) => (m.tables[1].fields[1].type = "text"),
    (m) => (m.tables[1].fields[1].ref.field = "inexistente"),
    (m) => (m.tables[1].name = m.tables[0].name),
  ]) {
    const model = sample();
    change(model);
    assert.throws(() => validate(model));
  }
});
test("membro de PK composta não é destino único por si só", () => {
  const model = sample();
  model.tables[0].fields[0].ref = {
    table: model.tables[4].id,
    field: model.tables[4].fields[0].id,
  };
  assert.throws(() => validate(model));
});
test("SQL contém chave composta e cria tabelas antes das FKs", () => {
  const output = sql(sample());
  assert.match(output, /PRIMARY KEY \("developer_id", "technology_id"\)/);
  assert(output.lastIndexOf("CREATE TABLE") < output.indexOf("ALTER TABLE"));
  assert.throws(() => sql({ version: 1, name: "vazio", tables: [] }));
});
test("falha na edição não muda modelo ou histórico; nova edição limpa refazer", () => {
  state.model = sample();
  state.undo = [];
  state.redo = [];
  let errors = 0,
    changes = 0;
  configureHistory({ onChange: () => changes++, onError: () => errors++ });
  const before = clone(state.model);
  const invalid = clone(before);
  invalid.tables[0].name = "INVALIDO";
  assert.equal(commit(invalid), false);
  assert.deepEqual(state.model, before);
  assert.equal(state.undo.length, 0);
  assert.equal(errors, 1);
  mutate((m) => (m.name = "primeira"));
  undoChange();
  assert.equal(state.model.name, before.name);
  redoChange();
  assert.equal(state.model.name, "primeira");
  undoChange();
  mutate((m) => (m.name = "outro caminho"));
  assert.equal(state.redo.length, 0);
  assert.equal(changes, 5);
});
test("histórico mantém no máximo 60 snapshots", () => {
  state.model = sample();
  state.undo = [];
  state.redo = [];
  configureHistory({ onChange: () => {}, onError: () => {} });
  for (let i = 0; i < 70; i++) mutate((m) => (m.name = "diagrama " + i));
  assert.equal(state.undo.length, 60);
});
test("persistência JSON preserva modelo e rejeita salvamento corrompido", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  assert.equal(loadModel(storage), null);
  const model = sample();
  saveModel(storage, model);
  assert.deepEqual(loadModel(storage), model);
  storage.setItem("codume-studio-v1", "{invalid");
  assert.throws(() => loadModel(storage));
});
