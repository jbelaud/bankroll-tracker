/** One operational email to Resend's simulator; no customer recipient or subscription. */
import { readFile, writeFile } from "node:fs/promises";
import { parseEnv } from "node:util";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const env=parseEnv(await readFile(".env.local","utf8"));const database=parseEnv(await readFile(".env","utf8"));
const target=new URL(database.DIRECT_URL);if(target.hostname!=="db.umyxyahkifdezohaotel.supabase.co"||target.pathname!=="/postgres")throw new Error("Unexpected production database");
const checks=JSON.parse(await readFile("docs/audit-commercial/commercial-public-http-2026-10-19.json","utf8"));if(!checks.passed||!checks.publicDomain)throw new Error("Published endpoints must pass first");
const {Client}=createRequire(import.meta.resolve("embedded-postgres"))("pg");
const sql=new Client({host:target.hostname,port:Number(target.port||5432),database:"postgres",user:decodeURIComponent(target.username),password:decodeURIComponent(target.password),ssl:{rejectUnauthorized:true,ca:await readFile(".vercel/production-backups/supabase-ca.crt","utf8")},connectionTimeoutMillis:10000});
const statePath=".vercel/commercial-release-2026-10-19/delivery-probe.json";let state;
try{state=JSON.parse(await readFile(statePath,"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;state={rowId:randomUUID(),createdAt:new Date().toISOString()};await writeFile(statePath,JSON.stringify(state),{mode:0o600});}
const subject="Kalivoa — vérification technique de livraison";const body="Vérification technique du raccordement de production. Destinataire simulateur Resend uniquement. Aucun abonnement ni paiement créé.";
const report={date:"2026-10-19",recipient:"delivered@resend.dev",customerRecipient:false,customerCharged:false,providerDeliveryVerified:false};
try{
 await sql.connect();
 await sql.query('INSERT INTO transactional_emails(id,"dedupeKey","userId",kind,recipient,subject,text,sender) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO NOTHING',[state.rowId,`operational-delivery-probe:${state.rowId}`,"__kalivoa_operational_probe__","TECHNICAL_DELIVERY_PROBE","delivered@resend.dev",subject,body,"Kalivoa <notifications@kalivoa.com>"]);
 if(!state.providerId){
  if(Date.now()-Date.parse(state.createdAt)>30*60*1000)throw new Error("Old operational probe requires review before any retry");
  const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,"content-type":"application/json","Idempotency-Key":`kalivoa-operational-probe/${state.rowId}`},body:JSON.stringify({from:"Kalivoa <notifications@kalivoa.com>",to:["delivered@resend.dev"],reply_to:"contact.kalivoa@gmail.com",subject,text:body,tags:[{name:"kalivoa_email_id",value:state.rowId}]}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error(`Email provider returned ${response.status}`);
  const data=await response.json();if(typeof data.id!=="string")throw new Error("Provider ID missing");
  state.providerId=data.id;await writeFile(statePath,JSON.stringify(state),{mode:0o600});
  await sql.query('UPDATE transactional_emails SET "providerId"=$2,status=\'SENT\',"sentAt"=now(),"firstAttemptAt"=now(),"attemptCount"=1 WHERE id=$1 AND status<>\'DELIVERED\'',[state.rowId,state.providerId]);
 }
 for(let attempt=0;attempt<20;attempt++){
  const row=(await sql.query('SELECT status,"providerId","deliveredAt" IS NOT NULL AS delivered FROM transactional_emails WHERE id=$1',[state.rowId])).rows[0];
  if(row.status==="DELIVERED"&&row.delivered&&row.providerId===state.providerId){report.providerDeliveryVerified=true;report.status=row.status;report.providerId=state.providerId;report.rowId=state.rowId;break;}
  if(row.status==="NEEDS_REVIEW")throw new Error("Provider delivery requires review");
  await new Promise((done)=>setTimeout(done,3000));
 }
 if(!report.providerDeliveryVerified)throw new Error("Delivery callback not confirmed within one minute");
}catch(error){report.errorType=error.code??error.name;process.exitCode=1;}
finally{await sql.end();await writeFile("docs/audit-commercial/production-email-delivery-2026-10-19.json",JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));}
