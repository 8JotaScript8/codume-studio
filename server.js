// Servidor estático de desenvolvimento. Não é o backend do aplicativo.
// Escuta somente no próprio computador e só serve arquivos públicos conhecidos.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, extname } from "node:path";
const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 8000);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
};
createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) {
      response.writeHead(405);
      response.end();
      return;
    }
    const path = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const relative = path === "/" ? "index.html" : path.slice(1);
    if (
      !/^(index\.html|(?:js|css)\/[a-z-]+\.(?:js|css)|docs\/preview\.png)$/.test(
        relative,
      )
    ) {
      response.writeHead(404);
      response.end("Não encontrado");
      return;
    }
    const data = await readFile(resolve(root, relative));
    response.writeHead(200, {
      "Content-Type": types[extname(relative)],
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    });
    response.end(request.method === "HEAD" ? undefined : data);
  } catch {
    response.writeHead(404);
    response.end("Não encontrado");
  }
}).listen(port, "127.0.0.1", () =>
  console.log(`Codume Studio: http://127.0.0.1:${port}`),
);
