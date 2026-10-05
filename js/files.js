import { state } from "./state.js";
// URLs de Blob permitem baixar arquivos sem upload para um servidor.
function filename(ext) {
  return (
    (state.model.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60) || "diagrama") +
    "." +
    ext
  );
}
function download(text, name, type) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(
      new Blob([text], {
        type,
      }),
    );
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export { filename, download };
