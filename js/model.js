// Criação dos dados: não desenha elementos e não salva arquivos.
import { uid } from "./utils.js";
import { COLORS } from "./constants.js";
// Os valores após = são padrões usados quando um argumento é omitido.
// pk=true também força required=true: uma PK não pode ser nula.
export const field = (
  name,
  type = "uuid",
  pk = false,
  required = false,
  unique = false,
  ref = null,
) => ({
  id: uid(),
  name,
  type,
  pk,
  required: pk || required,
  unique,
  ref,
});
function sample() {
  const user = {
    id: uid(),
    name: "users",
    x: 40,
    y: 90,
    color: COLORS[0],
    fields: [
      field("id", "uuid", true),
      field("display_name", "varchar(255)", false, true),
      field("email", "varchar(255)", false, true, true),
      field("password_hash", "text", false, true),
    ],
  };
  const dev = {
    id: uid(),
    name: "developer_profiles",
    x: 430,
    y: 70,
    color: COLORS[1],
    fields: [
      field("id", "uuid", true),
      field("user_id", "uuid", false, true, true, {
        table: user.id,
        field: user.fields[0].id,
      }),
      field("headline", "varchar(255)", false, true),
      field("bio", "text"),
      field("available", "boolean", false, true),
    ],
  };
  const client = {
    id: uid(),
    name: "client_profiles",
    x: 40,
    y: 385,
    color: COLORS[4],
    fields: [
      field("id", "uuid", true),
      field("user_id", "uuid", false, true, true, {
        table: user.id,
        field: user.fields[0].id,
      }),
      field("client_type", "varchar(255)", false, true),
      field("company_name", "varchar(255)"),
    ],
  };
  const tech = {
    id: uid(),
    name: "technologies",
    x: 815,
    y: 375,
    color: COLORS[2],
    fields: [
      field("id", "uuid", true),
      field("name", "varchar(255)", false, true, true),
      field("active", "boolean", false, true),
    ],
  };
  const join = {
    id: uid(),
    name: "developer_technologies",
    x: 815,
    y: 70,
    color: COLORS[3],
    fields: [
      field("developer_id", "uuid", true, true, false, {
        table: dev.id,
        field: dev.fields[0].id,
      }),
      field("technology_id", "uuid", true, true, false, {
        table: tech.id,
        field: tech.fields[0].id,
      }),
    ],
  };
  const portfolio = {
    id: uid(),
    name: "portfolio_items",
    x: 430,
    y: 410,
    color: COLORS[1],
    fields: [
      field("id", "uuid", true),
      field("developer_id", "uuid", false, true, false, {
        table: dev.id,
        field: dev.fields[0].id,
      }),
      field("title", "varchar(255)", false, true),
      field("url", "text", false, true),
    ],
  };
  return {
    version: 1,
    name: "Codume · usuários e perfis",
    tables: [user, dev, client, tech, join, portfolio],
  };
}
export { sample };
