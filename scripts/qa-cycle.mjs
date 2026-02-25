import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import path from "node:path";

const apiBase = process.env.API_BASE_URL || "http://localhost:8090";
const webBase = process.env.WEB_BASE_URL || "http://localhost:4173";
const timeoutMs = 60_000;
const rootDir = process.cwd();
const laravelDir = path.join(rootDir, "apps/api-laravel");
const laravelSqlite = path.join(laravelDir, "database/database.sqlite");

function startProcess(name, command, args, options = {}) {
  const child = spawn(command, args, {
    env: { ...process.env, ...(options.env || {}) },
    cwd: options.cwd || rootDir,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const log = [];
  child.stdout.on("data", (chunk) => log.push(chunk.toString()));
  child.stderr.on("data", (chunk) => log.push(chunk.toString()));

  return { name, child, log };
}

async function runCommand(command, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...(options.env || {}) },
      cwd: options.cwd || rootDir,
      stdio: "inherit"
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function prepareLaravelSqliteDatabase() {
  await mkdir(path.dirname(laravelSqlite), { recursive: true });
  const handle = await open(laravelSqlite, "a");
  await handle.close();
  await runCommand(
    "php",
    ["artisan", "migrate:fresh", "--seed"],
    {
      cwd: laravelDir,
      env: {
        DB_CONNECTION: "sqlite",
        DB_DATABASE: laravelSqlite,
        ADMIN_PANEL_LOGIN: process.env.ADMIN_PANEL_LOGIN || "admin",
        ADMIN_PANEL_PASSWORD: process.env.ADMIN_PANEL_PASSWORD || "change_me_123"
      }
    }
  );
}

async function waitForServices() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const apiRes = await fetch(`${apiBase}/health`);
      const webRes = await fetch(`${webBase}/catalog`);
      if (apiRes.ok && webRes.ok) return;
    } catch {
      // Wait until services are reachable.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Services did not start in time");
}

async function runSmoke() {
  await new Promise((resolve, reject) => {
    const child = spawn(
      "npm",
      ["run", "smoke:all"],
      {
        env: { ...process.env, API_BASE_URL: apiBase, WEB_BASE_URL: webBase },
        stdio: "inherit"
      }
    );
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`smoke:all failed with code ${code}`));
    });
  });
}

async function runCriticalE2E() {
  await new Promise((resolve, reject) => {
    const child = spawn(
      "npm",
      ["run", "e2e:critical"],
      {
        env: { ...process.env, API_BASE_URL: apiBase, WEB_BASE_URL: webBase },
        stdio: "inherit"
      }
    );
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`e2e:critical failed with code ${code}`));
    });
  });
}

function stopProcess(proc) {
  if (proc.child.exitCode !== null) return;
  proc.child.kill("SIGTERM");
}

function printProcessLogs(proc) {
  const output = proc.log.join("").trim();
  if (!output) return;
  console.error(`\n[${proc.name}]`);
  console.error(output.slice(-4000));
}

async function main() {
  await prepareLaravelSqliteDatabase();

  const api = startProcess(
    "api",
    "php",
    ["artisan", "serve", "--host=127.0.0.1", "--port=8090"],
    {
      cwd: laravelDir,
      env: {
        DB_CONNECTION: "sqlite",
        DB_DATABASE: laravelSqlite,
        ADMIN_PANEL_LOGIN: process.env.ADMIN_PANEL_LOGIN || "admin",
        ADMIN_PANEL_PASSWORD: process.env.ADMIN_PANEL_PASSWORD || "change_me_123"
      }
    }
  );
  const web = startProcess("web", "npm", ["run", "preview", "-w", "apps/web", "--", "--host", "127.0.0.1", "--port", "4173"]);

  try {
    await waitForServices();
    await runSmoke();
    await runCriticalE2E();
    console.log("QA cycle passed");
  } catch (error) {
    printProcessLogs(api);
    printProcessLogs(web);
    console.error(`QA cycle failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    stopProcess(api);
    stopProcess(web);
  }
}

main();
