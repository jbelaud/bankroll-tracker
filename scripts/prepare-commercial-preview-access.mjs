/** Short-lived access confined to the commercial recipe alias. Never prints secrets. */
import { readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
const path = ".vercel/commercial-preview/deployment.json";
const state = JSON.parse(readFileSync(path, "utf8"));
if (state.origin !== "https://kalivoa-commercial-recette-ets-belaud.vercel.app") throw new Error("Unexpected recipe alias");
const cli = ".vercel/vercel-cli-runtime/node_modules/vercel/dist/index.js";
const alias = "e20708a951a904e39753402cabae3cfa4b0936a945342055492131c2b19d979da8b6f41ac72f77450b7de4679f10b738882fa737c27a7ca5be0319cc4d914cd7";
if (!state.accessResponse) {
  let output = "";
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cli, "api", `/aliases/${alias}/protection-bypass?teamId=team_oWv492RSqLSIqjQl1Uq1IGDg`, "--method", "PATCH", "--input", "-"], { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    child.stdout.on("data", chunk => output += chunk);
    child.stderr.on("data", () => {});
    child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Access setup failed ${code}`)));
    child.stdin.end(JSON.stringify({ ttl: 82800 }));
  });
  state.accessResponse = JSON.parse(output);
  writeFileSync(path, JSON.stringify(state, null, 2), { mode: 0o600 });
}
console.log(JSON.stringify({ alias: state.origin, responseFields: Object.keys(state.accessResponse), temporary: true }));
