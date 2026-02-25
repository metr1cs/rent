import { spawn } from "node:child_process";

const apiBase = process.env.API_BASE_URL || "http://localhost:8090";
const webBase = process.env.WEB_BASE_URL || "http://localhost:4173";
const timeoutMs = 60_000;

function startProcess(name, args) {
  const child = spawn("npm", args, {
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  const log = [];
  child.stdout.on("data", (chunk) => log.push(chunk.toString()));
  child.stderr.on("data", (chunk) => log.push(chunk.toString()));

  return { name, child, log };
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
  const api = startProcess("api", ["run", "start", "-w", "apps/api"]);
  const web = startProcess("web", ["run", "start", "-w", "apps/web"]);

  try {
    await waitForServices();
    await runSmoke();
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
