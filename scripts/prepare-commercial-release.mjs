/** Isolate commercial changes on the exact published commit; never deploy the dirty workspace. */
import { readFile, writeFile, mkdir, cp, readdir, stat } from "node:fs/promises";
import { join, dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";

const root=process.cwd(); const base="4d50b35577fcf5f2ee506b8697e9729a9ba70093";
const directory=resolve(root,".vercel/commercial-release-2026-10-19"); const app=join(directory,"app");
await mkdir(app,{recursive:true});
const archive=join(directory,"published-base.tar");
execFileSync("git",["archive","--format=tar",`--output=${archive}`,base],{cwd:root,windowsHide:true});
execFileSync("tar",["-xf",archive,"-C",app],{cwd:root,windowsHide:true});
const directories=["src/lib/billing","src/lib/legal","src/lib/privacy","src/components/privacy","src/app/api/resend","src/app/api/cron/commercial",
  "src/app/[locale]/(marketing)/offre-bienvenue","src/app/[locale]/(marketing)/retractation","src/app/[locale]/(app)/admin/commercial",
  "prisma/migrations/20261009190000_welcome_offer_enrollment","prisma/migrations/20261011100000_commercial_records","prisma/migrations/20261011200000_restrict_server_only_tables"];
const files=["package.json","pnpm-lock.yaml","postcss.config.mjs","next.config.ts","prisma/schema.prisma","vercel.json","vitest.config.mts",
  "src/lib/company.ts","src/lib/stripe.ts","src/lib/auth.ts","src/lib/beta/program.ts","src/lib/actions/billing.ts","src/lib/actions/billing.test.ts",
  "src/lib/actions/withdrawal.ts","src/lib/actions/commercial-admin.ts","src/lib/actions/admin-users.ts","src/lib/actions/beta-testers.ts",
  "src/lib/scan/quota-config.ts","src/lib/scan/monthly-quota.ts","src/lib/scan/credit-wallet.ts",
  "src/lib/growth/client.ts","src/lib/growth/events.ts","src/app/api/growth-events/route.ts","src/app/api/stripe/webhook/route.ts","src/app/api/stripe/webhook/route.test.ts",
  "src/app/[locale]/layout.tsx","src/app/[locale]/privacy/page.tsx","src/app/[locale]/(app)/account/[section]/page.tsx",
  "src/components/account/plan-card.tsx","src/components/account/checkout-confirmation.tsx","src/components/account/withdrawal-form.tsx","src/components/account/scan-credit-summary.tsx",
  "src/components/legal-page.tsx","src/components/marketing/pricing-plans.tsx","src/components/marketing/marketing-contact-page.tsx","src/components/marketing/marketing-document-page.tsx",
  "src/components/marketing/marketing-home.tsx","src/components/marketing/marketing-info-page.tsx","src/components/marketing/marketing-footer.tsx",
  "public/downloads/formulaire-retractation-kalivoa-fr.txt","public/downloads/formulaire-retractation-kalivoa-en.txt"];
async function walk(path){const out=[];for(const entry of await readdir(join(root,path),{withFileTypes:true})){const p=path+"/"+entry.name;if(entry.isDirectory())out.push(...await walk(p));else out.push(p);}return out;}
for(const path of directories)files.push(...await walk(path));
const modified=[]; const conflicts=[];
for(const path of [...new Set(files)]){
  const target=join(app,path);await mkdir(dirname(target),{recursive:true});
  let original;
  try{original=execFileSync("git",["show",`HEAD:${path}`],{cwd:root,stdio:["ignore","pipe","ignore"]});}catch{}
  if(original?.length===0) original=undefined;
  const current=await readFile(join(root,path));
  if(original){
    if(original.equals(current))continue;
    try{await stat(target);}catch{conflicts.push({path,reason:"Tracked file absent from published base"});continue;}
    const tmp=join(directory,"merge-base"), incoming=join(directory,"merge-incoming");
    await writeFile(tmp,original.toString().replaceAll("\r\n","\n"));await writeFile(incoming,current.toString().replaceAll("\r\n","\n"));
    await writeFile(target,(await readFile(target,"utf8")).replaceAll("\r\n","\n"));
    try{const merged=execFileSync("git",["merge-file","--stdout",target,tmp,incoming],{cwd:root,stdio:["ignore","pipe","pipe"],maxBuffer:8*1024*1024});await writeFile(target,merged);}
    catch{conflicts.push({path,reason:"Three-way merge needs review"});continue;}
  }else await writeFile(target,current);
  modified.push(path);
}
if(conflicts.length){console.log(JSON.stringify({base,conflicts}));process.exit(1);}
// Keep unrelated public-profile controls and the existing database column.
const schemaPath=join(app,"prisma/schema.prisma");let schema=await readFile(schemaPath,"utf8");
if(!schema.includes("publicProfileSuspended"))schema=schema.replace("  publicXHandle    String?","  publicXHandle    String?\n  publicProfileSuspended Boolean @default(false)");
await writeFile(schemaPath,schema);
const accountPath=join(app,"src/app/[locale]/(app)/account/[section]/page.tsx");let account=await readFile(accountPath,"utf8");
if(!account.includes('import { PublicTipsterProfileControls }'))account=account.replace('import { PublicBankrollOrder }','import { PublicTipsterProfileControls } from "@/components/account/public-tipster-profile-controls";\nimport { PublicBankrollOrder }');
account=account.replace('publicXHandle: true } }),','publicXHandle: true, publicProfileSuspended: true } }),');
if(!account.includes('<PublicTipsterProfileControls '))account=account.replace('        <PublicBankrollOrder bankrolls={publicBankrolls} />','        <PublicTipsterProfileControls hasProfile={Boolean(dbUser?.publicDisplayName && dbUser.publicHandle)} suspended={dbUser?.publicProfileSuspended ?? false} />\n        <PublicBankrollOrder bankrolls={publicBankrolls} />');
await writeFile(accountPath,account);
const translationPaths=["scanCredits.lockedInitial","scanCredits.paidBonusCondition","subscriptionStatus.periodEnd","account.plan","marketing.pricing","marketing.faq.items.pricing.answer","marketing.meta.pricing","marketing.pages.pricing","pricingPlans","welcomeOffer"];
for(const locale of ["fr","en"]){
  const path=`messages/${locale}.json`;const baseContent=JSON.parse(await readFile(join(app,path),"utf8"));const current=JSON.parse(await readFile(join(root,path),"utf8"));
  for(const key of translationPaths){const parts=key.split(".");let from=current,to=baseContent;for(const part of parts.slice(0,-1)){from=from[part];to=to[part]??={};}to[parts.at(-1)]=from[parts.at(-1)];}
  await writeFile(join(app,path),JSON.stringify(baseContent,null,2)+"\n");modified.push(path);
}
await mkdir(join(app,".vercel"),{recursive:true});await cp(join(root,".vercel/project.json"),join(app,".vercel/project.json"));
await writeFile(join(app,".vercelignore"),"node_modules/\n.next/\n.vercel/\n.git/\n.env*\n**/*.test.ts\n**/*.test.tsx\n");
const hashes=[];for(const path of [...new Set(modified)].sort())hashes.push({path,sha256:createHash("sha256").update(await readFile(join(app,path))).digest("hex")});
const report={date:"2026-10-19",publishedBaseCommit:base,workspaceHead:execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim(),commercialFiles:hashes,
  unrelatedPublicProfileChangesExcluded:true,unrelatedScanChangesExcluded:true,translationsFiltered:true,productionDeploymentPerformed:false};
await writeFile(join(directory,"source-manifest.json"),JSON.stringify(report,null,2));
await writeFile(join(root,"docs/audit-commercial/commercial-release-source-2026-10-19.json"),JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({prepared:true,base,commercialFiles:hashes.length,conflicts:0}));
