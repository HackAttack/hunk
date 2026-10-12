import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createTestPackageExtension,
  TEST_PACKAGE_EXTENSION_RESULT,
} from "../helpers/extensionPackageTestFixtures";

const root = mkdtempSync(join(tmpdir(), "hunk-compiled-extension-"));
const executable = join(root, process.platform === "win32" ? "loader.exe" : "loader");

beforeAll(() => {
  const build = Bun.spawnSync(
    [
      process.execPath,
      "build",
      "--compile",
      "--no-compile-autoload-bunfig",
      join(import.meta.dir, "fixtures", "compiled-extension-imports.ts"),
      "--outfile",
      executable,
    ],
    { stdout: "pipe", stderr: "pipe" },
  );
  if (build.exitCode !== 0) throw new Error(build.stderr.toString());

  createTestPackageExtension(root);
}, 30_000);

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

test("loads folder packages through the production loader in a compiled executable", () => {
  const entry = join(root, "index.ts");
  const proc = Bun.spawnSync([executable, entry], { stdout: "pipe", stderr: "pipe" });

  expect(proc.stderr.toString()).toBe("");
  expect(proc.exitCode).toBe(0);
  expect(JSON.parse(proc.stdout.toString())).toEqual({
    result: TEST_PACKAGE_EXTENSION_RESULT,
    reexported: "feature",
    hostReact: true,
  });
});

test("reports the asynchronous-hook limitation for CommonJS source require in a compiled executable", () => {
  const entry = join(root, "commonjs.ts");
  writeFileSync(entry, `export default require("fixture-pkg/commonjs");\n`);
  const proc = Bun.spawnSync([executable, entry], { stdout: "pipe", stderr: "pipe" });

  expect(proc.exitCode).not.toBe(0);
  expect(proc.stderr.toString()).toContain("require() async module");
});

test("keeps unexported subpaths blocked in a compiled executable", () => {
  const entry = join(root, "blocked.ts");
  writeFileSync(entry, `import value from "fixture-pkg/blocked"; export default value;\n`);
  const proc = Bun.spawnSync([executable, entry], { stdout: "pipe", stderr: "pipe" });

  expect(proc.exitCode).not.toBe(0);
  expect(proc.stderr.toString()).toContain("fixture-pkg");
});
