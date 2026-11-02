/** Non-paying HTTP probes: valid/invalid signatures, private routes and public pricing. */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { parseEnv } from "node:util";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { createHmac, randomUUID } from "node:crypto";
import Stripe from "stripe";
const directory=resolve(".vercel/commercial-release-2026-10-19");await mkdir(directory,{recursive:true});
const deployed=JSON.parse(await readFile(join(directory,"deployment.json"),"utf8"));
const publicMode=process.argv.includes("--public");const origin=publicMode?"https://kalivoa.com":deployed.url;
if(!publicMode&&!/^https:\/\/bankroll-tracker-[a-z0-9]+-ets-belaud\.vercel\.app$/.test(origin))throw new Error("Unexpected verification origin");
const stripeState=JSON.parse(await readFile(".vercel/stripe-live/preparation.json","utf8"));
const resend=JSON.parse(await readFile(".vercel/resend-live-2026-10-19.json","utf8"));
const env=parseEnv(await readFile(".env.local","utf8"));
const cli=resolve(".vercel/vercel-cli-runtime/node_modules/vercel/dist/index.js");
async function request(path,{body,headers={}}={}){
 if(publicMode){const r=await fetch(origin+path,{method:body?"POST":"GET",body,headers,redirect:"manual",signal:AbortSignal.timeout(30000)});return {status:r.status,text:await r.text()};}
 const output=join(directory,"probe-response.txt"),input=join(directory,"probe-request.txt");
 const args=[cli,"curl",path,"--deployment",origin,"--scope","ets-belaud","--","--silent","--show-error","--max-time","30","--output",output,"--write-out","%{http_code}"];
 if(body){await writeFile(input,body);args.push("--request","POST","--data-binary","@"+input);}
 for(const[key,value]of Object.entries(headers))args.push("--header",`${key}: ${value}`);
 let stdout="";await new Promise((done,reject)=>{const child=spawn(process.execPath,args,{windowsHide:true,stdio:["ignore","pipe","pipe"]});child.stdout.on("data",(c)=>stdout+=c);child.stderr.on("data",()=>{});child.on("error",reject);child.on("exit",(code)=>code===0?done():reject(new Error("Authenticated deployment request failed")));});
 return {status:Number(stdout.trim().slice(-3)),text:await readFile(output,"utf8")};
}
const checks=[];async function check(name,path,expected,options,content){const response=await request(path,options);const passed=response.status===expected&&(!content||content(response.text));checks.push({name,path,status:response.status,passed});if(!passed)throw new Error(`HTTP verification failed: ${name}`);}
try{
 await check("pricing", "/fr/pricing",200,undefined,(text)=>["4,99","49,99","2,99","24,99"].every((amount)=>text.includes(amount)));
 await check("welcome-beta", "/fr/offre-bienvenue",200,undefined,(text)=>text.includes("bêta")&&text.includes("24,99"));
 await check("privacy", "/fr/privacy",200);
 await check("terms", "/fr/sales-terms",200);
 await check("private-subscription", "/fr/account/subscription",307);
 await check("cron-protected", "/api/cron/commercial",401);
 await check("stripe-invalid-signature", "/api/stripe/webhook",400,{body:"{}"});
 const stripeBody=JSON.stringify({id:`evt_kalivoa_configuration_probe_${randomUUID()}`,object:"event",type:"kalivoa.configuration_probe",created:Math.floor(Date.now()/1000),livemode:true,data:{object:{id:"configuration-only"}}});
 const stripeClient=new Stripe(env.STRIPE_LIVE_SECRET_KEY);const signature=stripeClient.webhooks.generateTestHeaderString({payload:stripeBody,secret:stripeState.webhookSecret});
 await check("stripe-signed-noop", "/api/stripe/webhook",200,{body:stripeBody,headers:{"content-type":"application/json","stripe-signature":signature}});
 await check("resend-invalid-signature", "/api/resend/webhook",400,{body:"{}"});
 const id=`msg_kalivoa_configuration_probe_${randomUUID()}`,timestamp=String(Math.floor(Date.now()/1000));
 const resendBody=JSON.stringify({type:"email.delivered",created_at:new Date().toISOString(),data:{email_id:`no-existing-email-${randomUUID()}`,from:"Kalivoa <notifications@kalivoa.com>",to:["delivered@resend.dev"],subject:"Configuration probe"}});
 const svix=createHmac("sha256",Buffer.from(resend.secret.slice(6),"base64")).update(`${id}.${timestamp}.${resendBody}`).digest("base64");
 await check("resend-signed-noop", "/api/resend/webhook",200,{body:resendBody,headers:{"content-type":"application/json","svix-id":id,"svix-timestamp":timestamp,"svix-signature":`v1,${svix}`}});
}finally{
 const report={date:"2026-10-19",origin,publicDomain:publicMode,checks,passed:checks.length===10&&checks.every((c)=>c.passed),productionPaymentsCreated:false,customerEmailsSent:false,signedProbesAreLocallyGenerated:true,providerDeliveryVerified:false};
 await writeFile(`docs/audit-commercial/commercial-${publicMode?"public":"staged"}-http-2026-10-19.json`,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
}
