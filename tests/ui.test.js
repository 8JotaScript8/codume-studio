// O teste inicia seu próprio servidor e não precisa de um aplicativo já aberto.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
const port = process.env.TEST_PORT || "8137";
const server = spawn(process.execPath, ["server.js"], {
  cwd: root,
  env: { ...process.env, PORT: port },
  stdio: ["ignore", "pipe", "pipe"],
});
const temp = await mkdtemp(join(tmpdir(), "codume-test-"));
let browser;
try {
  await Promise.race([
    once(server.stdout, "data"),
    once(server, "exit").then(() => {
      throw Error("Servidor de teste encerrou antes de iniciar.");
    }),
    new Promise((_, reject) => {
      const timer = setTimeout(
        () => reject(Error("Timeout do servidor")),
        10000,
      );
      timer.unref();
    }),
  ]);
  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.CHROMIUM_EXECUTABLE }
      : {}),
    args: ["--no-sandbox", "--disable-gpu", "--no-zygote"],
  });
  const page = await browser.newPage({
      viewport: { width: 1512, height: 982 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.goto("http://127.0.0.1:" + port);
  await page.waitForSelector(".table-card");
  const model = () =>
    page.evaluate(async () => {
      const { state } = await import("/js/state.js");
      return JSON.parse(JSON.stringify(state.model));
    });
  assert.equal(await page.locator(".table-card").count(), 6);
  await page.locator("#add").click();
  await page.locator("#table-name").fill("projects");
  await page.locator("#table-form .primary").click();
  await page.locator("#add-field").click();
  await page.locator("#field-name").fill("owner_id");
  const target = (
    await page.locator("#field-ref option").allTextContents()
  ).find((s) => s.startsWith("users.id"));
  await page.locator("#field-ref").selectOption({ label: target });
  await page.locator("#field-required").check();
  await page.locator("#field-form .primary").click();
  assert.equal(
    (await model()).tables.find((t) => t.name === "projects").fields.length,
    2,
  );
  // Eventos delegados precisam continuar funcionando após reconstrução do inspetor.
  await page.locator("#rename").fill("jobs");
  await page.locator("#rename").press("Tab");
  assert((await model()).tables.some((t) => t.name === "jobs"));
  await page.locator("#inspector [data-edit]").first().click();
  await page.locator("#field-name").fill("job_id");
  await page.locator("#field-form .primary").click();
  assert.equal(
    (await model()).tables.find((t) => t.name === "jobs").fields[0].name,
    "job_id",
  );
  await page.locator("#sql").click();
  assert(
    (await page.locator("#sqltext").inputValue()).includes(
      'ALTER TABLE "jobs" ADD FOREIGN KEY ("owner_id")',
    ),
  );
  await page.locator("#sql-dialog [data-close]").click();
  await page.locator("#undo").click();
  assert.equal(
    (await model()).tables.find((t) => t.name === "jobs").fields[0].name,
    "id",
  );
  await page.locator("#redo").click();
  await page.reload();
  await page.waitForSelector(".table-card");
  assert.equal(
    (await model()).tables.find((t) => t.name === "jobs").fields[0].name,
    "job_id",
  );
  await page.locator("#fit").click();
  const before = (await model()).tables[0];
  const box = await page.locator(".table-head").first().boundingBox();
  await page.mouse.move(box.x + 70, box.y + 15);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 45, { steps: 5 });
  await page.mouse.up();
  assert.notEqual((await model()).tables[0].x, before.x);
  await page.locator("#undo").click();
  assert.equal((await model()).tables[0].x, before.x);
  const pending = page.waitForEvent("download");
  await page.locator("#export").click();
  const download = await pending;
  const backup = join(temp, "backup.json");
  await download.saveAs(backup);
  await page.locator("#new").click();
  assert.equal(await page.locator(".table-card").count(), 0);
  await page.locator("#file").setInputFiles(backup);
  await page.waitForSelector(".table-card");
  assert.equal(await page.locator(".table-card").count(), 7);
  await page.locator("#file").setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1,"name":"x","tables":[{}]}'),
  });
  await page.waitForFunction(() =>
    document.querySelector("#toast").textContent.includes("recusada"),
  );
  assert.equal(await page.locator(".table-card").count(), 7);
  await page.locator(".entity-item").filter({ hasText: "users" }).click();
  await page.locator("#delete-table").click();
  assert.equal(await page.locator(".table-card").count(), 6);
  await page.locator("#undo").click();
  assert.equal(await page.locator(".table-card").count(), 7);
  await page.locator("#sample").click();
  await page.locator("#fit").click();
  await page.waitForFunction(
    () => getComputedStyle(document.querySelector("#toast")).display === "none",
  );
  await page.screenshot({ path: join(root, "docs/preview.png") });
  assert.deepEqual(errors, []);
  console.log(
    "PASS: interface modular, edição, FKs, histórico, arraste, persistência, importação/exportação e exclusões.",
  );
} finally {
  await browser?.close();
  server.kill();
  await rm(temp, { recursive: true, force: true });
}
