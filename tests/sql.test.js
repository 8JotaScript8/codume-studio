import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { sample } from "../js/model.js";
import { sql } from "../js/sql-exporter.js";
const database = new PGlite();
try {
  await database.exec(sql(sample()));
  const result = await database.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  assert.equal(result.rows.length, 6);
  // Tentar criar filho de pai inexistente precisa violar a FK.
  await assert.rejects(
    database.exec(
      "INSERT INTO developer_profiles (id,user_id,headline,available) VALUES ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','Developer',true)",
    ),
  );
  console.log(
    "PASS: DDL executado e FK efetivamente aplicada em PostgreSQL/PGlite.",
  );
} finally {
  await database.close();
}
