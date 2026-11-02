/** Build production configuration without moving kalivoa.com. */
import { readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
const directory=resolve(".vercel/commercial-release-2026-10-19"),app=join(directory,"app");
const project=JSON.parse(await readFile(join(app,".vercel/project.json"),"utf8"));
if(project.projectId!=="prj_wkVqicBmeir1HTkYlXcSt4Nj1QKi"||project.orgId!=="team_oWv492RSqLSIqjQl1Uq1IGDg")throw new Error("Wrong deployment project");
const manifest=JSON.parse(await readFile(join(directory,"source-manifest.json"),"utf8"));
for(const file of manifest.commercialFiles)if(createHash("sha256").update(await readFile(join(app,file.path))).digest("hex")!==file.sha256)throw new Error(`Reviewed file changed: ${file.path}`);
if(!process.argv.includes("--apply")){console.log(JSON.stringify({proposalOnly:true,target:"production",assignDomains:false,base:manifest.publishedBaseCommit}));process.exit(0);}
const cli=resolve(".vercel/vercel-cli-runtime/node_modules/vercel/dist/index.js");let stdout="";
await new Promise((done,reject)=>{const child=spawn(process.execPath,[cli,"deploy","--prod","--skip-domain","--yes","--no-wait","--scope","ets-belaud","--meta",`commercialBaseCommit=${manifest.publishedBaseCommit}`],{cwd:app,windowsHide:true,env:{...process.env,DEBUG:"",VERCEL_DEBUG:""},stdio:["ignore","pipe","pipe"]});child.stdout.on("data",(chunk)=>stdout+=chunk);child.stderr.on("data",(chunk)=>process.stderr.write(chunk));child.on("error",reject);child.on("exit",(code)=>code===0?done():reject(new Error(`Stage deployment failed (${code})`)));});
const url=stdout.match(/https:\/\/[a-z0-9-]+\.vercel\.app\b/)?.[0];if(!url)throw new Error("Staged deployment URL missing");
await writeFile(join(directory,"deployment.json"),JSON.stringify({url,target:"production",domainsAssigned:false,base:manifest.publishedBaseCommit,createdAt:new Date().toISOString()},null,2));
console.log(JSON.stringify({url,target:"production",domainsAssigned:false,customerCharged:false}));
