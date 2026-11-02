/** Store production-only email configuration; never send email or open sales. */
import { readFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { resolve } from "node:path";
import { spawn } from "node:child_process";
const project=JSON.parse(await readFile(".vercel/project.json","utf8"));
if(project.projectId!=="prj_wkVqicBmeir1HTkYlXcSt4Nj1QKi"||project.orgId!=="team_oWv492RSqLSIqjQl1Uq1IGDg")throw new Error("Unexpected project");
const env=parseEnv(await readFile(".env.local","utf8"));
const hook=JSON.parse(await readFile(".vercel/resend-live-2026-10-19.json","utf8"));
if(hook.endpoint!=="https://kalivoa.com/api/resend/webhook"||!hook.secret?.startsWith("whsec_")||!env.RESEND_API_KEY?.startsWith("re_"))throw new Error("Email configuration missing");
const values={RESEND_API_KEY:env.RESEND_API_KEY,RESEND_WEBHOOK_SECRET:hook.secret,TRANSACTIONAL_EMAIL_FROM:"Kalivoa <notifications@kalivoa.com>",ACCOUNT_RETENTION_DELETION_ENABLED:"false"};
if(!process.argv.includes("--apply")){console.log(JSON.stringify({proposalOnly:true,target:"production",keys:Object.keys(values)}));process.exit(0);}
const cli=resolve(".vercel/vercel-cli-runtime/node_modules/vercel/dist/index.js");
for(const[key,value]of Object.entries(values)){
 const secret=/KEY|SECRET/.test(key);
 await new Promise((done,reject)=>{const child=spawn(process.execPath,[cli,"env","add",key,"production","--force","--type",secret?"secret":"plain","--scope","ets-belaud"],{windowsHide:true,stdio:["pipe","ignore","pipe"],timeout:120000});let stderr="";child.stderr.on("data",(chunk)=>stderr+=chunk);child.stdin.on("error",()=>{});child.stdin.end(value);child.on("error",reject);child.on("exit",(code)=>{for(const item of Object.values(values))stderr=stderr.replaceAll(item,"[redacted]");if(code===0)done();else reject(new Error(`Configuration failed for ${key}: ${stderr.slice(-250)}`));});});
 console.log(JSON.stringify({configured:key,target:"production",type:secret?"secret":"plain",customerEmailSent:false}));
}
