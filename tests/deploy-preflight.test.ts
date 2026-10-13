import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url).pathname;

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  return new Promise<{ code: number | null; output: string }>((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectRoot, env });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    child.on("error", reject);
    child.on("close", code => resolve({ code, output }));
  });
}

for (const failure of ["none", "preflight", "pocketbase"]) {
  test(`deployment gates application rollout on PocketBase preflight: ${failure}`, async () => {
    const directory = await mkdtemp(join(tmpdir(), "goldridr-deploy-test-"));
    try {
      const bin = join(directory, "bin");
      await mkdir(bin);
      await writeFile(join(directory, ".env"), "POCKETBASE_URL=http://pocketbase:8090\nNEXT_PUBLIC_VAPID_PUBLIC_KEY=test\nVAPID_PRIVATE_KEY=test\nVAPID_SUBJECT=test\n");
      for (const [file, image] of [[".deployed-image", "old-web"], [".deployed-pocketbase-image", "old-pb"], [".deployed-worker-image", "old-worker"]]) {
        await writeFile(join(directory, file), image);
      }
      for (const command of ["install", "chown", "chmod"]) {
        await writeFile(join(bin, command), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
      }
      await writeFile(join(bin, "docker"), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.TEST_CALLS, JSON.stringify({ args, image: process.env.IMAGE_NAME }) + '\\n');
if (args.includes('run') && process.env.TEST_FAILURE === 'preflight') process.exit(1);
if (args.includes('up') && args.at(-1) === 'pocketbase' && process.env.TEST_FAILURE === 'pocketbase') process.exit(1);
if (args.includes('ps')) console.log('web-container');
if (args[0] === 'inspect') console.log('healthy');
`, { mode: 0o755 });
      const callsFile = join(directory, "calls.jsonl");
      const result = await run("bash", ["scripts/deploy.sh"], {
        ...process.env,
        PATH: `${bin}:${process.env.PATH}`,
        DEPLOY_DIR: directory,
        IMAGE_NAME: "new-web",
        POCKETBASE_IMAGE: "new-pb",
        WORKER_IMAGE: "new-worker",
        TEST_CALLS: callsFile,
        TEST_FAILURE: failure,
      });
      const calls = (await readFile(callsFile, "utf8")).trim().split("\n").map(line => JSON.parse(line) as { args: string[]; image: string });
      const pbIndex = calls.findIndex(call => call.args.includes("up") && call.args.at(-1) === "pocketbase");
      const verifyIndex = calls.findIndex(call => call.args.includes("pocketbase:verify"));
      const rolloutIndex = calls.findIndex(call => call.args.includes("up") && call.args.includes("web") && call.image === "new-web");
      assert.ok(pbIndex >= 0);
      if (failure === "none") {
        assert.equal(result.code, 0, result.output);
        assert.ok(verifyIndex > pbIndex);
        assert.ok(rolloutIndex > verifyIndex);
        assert.equal(await readFile(join(directory, ".deployed-image"), "utf8"), "new-web\n");
      } else {
        assert.equal(result.code, 1, result.output);
        assert.equal(rolloutIndex, -1);
        assert.ok(calls.some(call => call.args.includes("up") && call.image === "old-web"));
        assert.equal(await readFile(join(directory, ".deployed-image"), "utf8"), "old-web");
        if (failure === "pocketbase") assert.equal(verifyIndex, -1);
        else assert.match(result.output, /PocketBase preflight failed/);
      }
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
}

for (const failure of ["authentication", "collection"]) {
  test(`PocketBase verification identifies ${failure} errors without exposing credentials`, async () => {
    const requests: string[] = [];
    const server = createServer((request, response) => {
      const path = request.url || "";
      requests.push(path);
      response.setHeader("Content-Type", "application/json");
      if (path.includes("auth-with-password")) {
        response.statusCode = failure === "authentication" ? 400 : 200;
        response.end(JSON.stringify(failure === "authentication"
          ? { message: "Failed to authenticate.", data: { password: "secret-test-password" } }
          : { token: "test-token", record: { id: "test-superuser" } }));
      } else if (path.includes("/notification_deliveries/")) {
        response.statusCode = 404;
        response.end(JSON.stringify({ message: "Missing collection context.", data: {} }));
      } else {
        response.end(JSON.stringify({ page: 1, perPage: 1, totalItems: 0, totalPages: 0, items: [] }));
      }
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    try {
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const result = await run(process.execPath, ["--import", "tsx", "scripts/pocketbase-verify.ts"], {
        ...process.env,
        POCKETBASE_URL: `http://127.0.0.1:${address.port}`,
        POCKETBASE_SUPERUSER_EMAIL: "superuser-test@example.invalid",
        POCKETBASE_SUPERUSER_PASSWORD: "secret-test-password",
      });
      assert.equal(result.code, 1);
      assert.doesNotMatch(result.output, /secret-test-password|superuser-test@example\.invalid/);
      if (failure === "authentication") {
        assert.match(result.output, /superuser authentication failed \(HTTP 400\)/);
        assert.equal(requests.length, 1);
      } else {
        assert.match(result.output, /collection "notification_deliveries" verification failed \(HTTP 404\)/);
        assert.ok(requests.every(path => !path.includes("/api/realtime")));
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  });
}
