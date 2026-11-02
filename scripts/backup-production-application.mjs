/** Read-only public-schema backup, encrypted locally, then restored on loopback only. */
import { readFile, writeFile, mkdir, mkdtemp, rm, readdir } from "node:fs/promises";
import { join, resolve, sep, basename } from "node:path";
import { createRequire } from "node:module";
import { randomBytes, randomUUID, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { parseEnv } from "node:util";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { gzipSync, gunzipSync } from "node:zlib";
import EmbeddedPostgres from "embedded-postgres";

const root = process.cwd();
const project = "umyxyahkifdezohaotel";
const config = parseEnv(await readFile(join(root, ".env"), "utf8"));
const { Client } = createRequire(import.meta.resolve("embedded-postgres"))("pg");
const bin = "C:/Program Files/PostgreSQL/18/bin";
const backupRoot = resolve(root, ".vercel/production-backups");
await mkdir(backupRoot, { recursive: true });
const caPath = join(backupRoot, "supabase-ca.crt");
const ca = await readFile(caPath, "utf8");
const masterKeyPath = join(backupRoot, "master-key.json");
async function backupEncryptionKey() {
  try {
    const data = JSON.parse(await readFile(masterKeyPath,"utf8"));
    const key = Buffer.from(data.key,"base64");
    if(key.length!==32) throw Error("Invalid backup master key");
    return key;
  } catch(error) {
    if(error.code!=="ENOENT") throw error;
    const key=randomBytes(32);
    await writeFile(masterKeyPath,JSON.stringify({algorithm:"aes-256-gcm",key:key.toString("base64"),createdAt:new Date().toISOString()}),{mode:0o600,flag:"wx"});
    return key;
  }
}
const resume = process.argv.includes("--restore-latest");
const previous = resume ? (await Promise.all((await readdir(backupRoot, {withFileTypes:true})).filter((d)=>d.isDirectory()).map(async(d)=>{
  try { const path=join(backupRoot,d.name); const state=JSON.parse(await readFile(join(path,"report.json"),"utf8")); return {path,state}; } catch{return null;}
}))).filter((d)=>d?.state.encrypted).sort((a,b)=>b.state.finishedAt.localeCompare(a.state.finishedAt))[0] : null;
if (resume && !previous) throw new Error("Encrypted backup missing");
const runDir = previous?.path ?? await mkdtemp(join(backupRoot, new Date().toISOString().slice(0, 10) + "-"));
const rawPath = join(runDir, "public.dump");
const authRawPath = join(runDir, "auth-data.dump");
const supplementPath = join(runDir, "auth-storage.aes256gcm");
const encryptedPath = join(runDir, "public.dump.aes256gcm");
const keyPath = join(runDir, "recovery-key.json");
const quote = (name) => '"' + name.replaceAll('"', '""') + '"';
const report = { date: new Date().toISOString().slice(0, 10), project, scope: "public application schema, data, RLS and grants", authIncluded: false,
  storageObjectsIncluded: false, productionWrites: false, customerRowsPrinted: false, encrypted: false, restored: false, migrationsRehearsed: false };
let source; let local; let postgres; let stage = "connect"; let supplement;
const sourceUrls = [config.DIRECT_URL, config.DATABASE_URL].filter(Boolean).map((value) => new URL(value));
for (const url of sourceUrls) {
  const direct = url.hostname === `db.${project}.supabase.co` && url.pathname === "/postgres";
  const pooler = url.hostname.endsWith(".pooler.supabase.com") && decodeURIComponent(url.username) === `postgres.${project}` && url.pathname === "/postgres";
  if (!direct && !pooler) throw new Error("Unexpected production database target");
  if (pooler) url.port = "5432";
}
const pgEnv = (url) => ({ ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: url.pathname.slice(1),
  PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: "verify-full", PGSSLROOTCERT: caPath, PGCONNECT_TIMEOUT: "10", PGAPPNAME: "kalivoa-readonly-backup" });
const run = (executable, args, env, logName) => new Promise((done, reject) => {
  const child = spawn(executable, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"], env });
  let stderr = ""; let stdout = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("error", reject); child.on("exit", async (code) => {
    if (stderr) await writeFile(join(runDir, logName), stderr, { mode: 0o600 });
    if (code === 0) done(stdout); else reject(new Error(`Native tool failed at ${stage}; private diagnostic saved`));
  });
});
async function fingerprints(client, tables, schema = "public") {
  await client.query("SET TIME ZONE 'UTC'");
  const result = [];
  for (const { name } of tables) {
    // Preserve exact IEEE bits instead of version-dependent float-to-JSON formatting.
    const floats=(await client.query("SELECT attname,atttypid::regtype::text AS type FROM pg_attribute WHERE attrelid=$1::regclass AND attnum>0 AND NOT attisdropped AND atttypid IN('float8'::regtype,'float4'::regtype)",[schema+'.'+quote(name)])).rows;
    const literal=(value)=>"'"+value.replaceAll("'","''")+"'";
    const canonical=floats.length ? `(to_jsonb(t) - ARRAY[${floats.map((c)=>literal(c.attname)).join(',')}]::text[]) || jsonb_build_object(${floats.map((c)=>`${literal(c.attname)},encode(${c.type==='real'?'float4send':'float8send'}(t.${quote(c.attname)}),'hex')`).join(',')})` : 'to_jsonb(t)';
    const row = (await client.query(`SELECT count(*)::text AS rows, md5(coalesce(string_agg(md5((${canonical})::text), '' ORDER BY md5((${canonical})::text)), '')) AS digest FROM ${quote(schema)}.${quote(name)} t`)).rows[0];
    result.push({ name, ...row });
  }
  return result;
}
try {
  let before, tables, policies=[];
  if (previous) {
    Object.assign(report, previous.state);
    delete report.failureStage; delete report.failureType;
    const recovery=JSON.parse(await readFile(keyPath,"utf8"));
    const decipher=createDecipheriv("aes-256-gcm",Buffer.from(recovery.key,"base64"),Buffer.from(recovery.iv,"base64"));
    decipher.setAuthTag(Buffer.from(recovery.tag,"base64"));
    const raw=Buffer.concat([decipher.update(await readFile(encryptedPath)),decipher.final()]);
    if(createHash("sha256").update(raw).digest("hex")!==recovery.sha256) throw new Error("Backup checksum invalid");
    await writeFile(rawPath,raw,{mode:0o600});
    if (recovery.supplement) {
      const extra = createDecipheriv("aes-256-gcm", Buffer.from(recovery.key,"base64"), Buffer.from(recovery.supplement.iv,"base64"));
      extra.setAuthTag(Buffer.from(recovery.supplement.tag,"base64"));
      const bytes = Buffer.concat([extra.update(await readFile(supplementPath)), extra.final()]);
      if (createHash("sha256").update(bytes).digest("hex") !== recovery.supplement.sha256) throw Error("Supplement checksum invalid");
      supplement = JSON.parse(gunzipSync(bytes));
      await writeFile(authRawPath, Buffer.from(supplement.authDump, "base64"), {mode:0o600});
    }
    before=JSON.parse(await readFile(join(runDir,"fingerprints.json"),"utf8")); tables=before.map(({name})=>({name}));
  } else {
  let selected;
  for (const url of sourceUrls) {
    const candidate = new Client({ host: url.hostname, port: Number(url.port || 5432), database: "postgres", user: decodeURIComponent(url.username), password: decodeURIComponent(url.password),
      ssl: { rejectUnauthorized: true, ca }, connectionTimeoutMillis: 10_000, application_name: "kalivoa-readonly-backup" });
    try { await candidate.connect(); source = candidate; selected = url; break; }
    catch (error) {
      report.connectionAttempts ??= [];
      report.connectionAttempts.push({ host: url.hostname, code: error.code ?? error.name });
      await candidate.end().catch(() => {});
    }
  }
  if (!source) throw new Error("Verified production connection unavailable");
  await source.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
  await source.query("SET LOCAL statement_timeout = '120s'");
  const snapshot = (await source.query("SELECT pg_export_snapshot() AS id")).rows[0].id;
  tables = (await source.query("SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname")).rows;
  policies = (await source.query("SELECT DISTINCT r.rolname FROM pg_policy p CROSS JOIN LATERAL unnest(p.polroles) x JOIN pg_roles r ON r.oid=x WHERE p.polrelid IN(SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace)")).rows;
  stage = "dump";
  await run(join(bin, "pg_dump.exe"), ["--format=custom", "--schema=public", "--no-owner", "--no-password", "--lock-wait-timeout=10s", `--snapshot=${snapshot}`, `--file=${rawPath}`],
    { ...pgEnv(selected), PGOPTIONS: "-c default_transaction_read_only=on -c statement_timeout=120000" }, "dump-private.log");
  stage = "auth-storage-backup";
  const authTables = [{name:"users"}, {name:"identities"}];
  const authFingerprints = await fingerprints(source, authTables, "auth");
  const authColumns = {};
  for (const {name} of authTables) authColumns[name] = (await source.query("SELECT a.attname AS name, format_type(a.atttypid,a.atttypmod) AS type, a.attgenerated AS generated, pg_get_expr(d.adbin,d.adrelid) AS expression FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=$1::regclass AND a.attnum>0 AND NOT a.attisdropped ORDER BY a.attnum", [`auth.${name}`])).rows;
  await run(join(bin,"pg_dump.exe"), ["--format=custom", "--data-only", "--table=auth.users", "--table=auth.identities", "--no-owner", "--no-password", `--snapshot=${snapshot}`, `--file=${authRawPath}`], { ...pgEnv(selected), PGOPTIONS:"-c default_transaction_read_only=on -c statement_timeout=120000" }, "auth-dump-private.log");
  const objects = (await source.query("SELECT bucket_id,name,metadata FROM storage.objects ORDER BY bucket_id,name")).rows;
  if (objects.length > 500) throw Error("Storage backup object limit requires review");
  const supplementalConfig = {...config, ...parseEnv(await readFile(join(root,".env.local"),"utf8"))};
  const serviceKey = supplementalConfig.SUPABASE_SERVICE_ROLE_KEY;
  const storage = []; let totalBytes = 0;
  for (const object of objects) {
    if (!serviceKey || serviceKey === "[SENSITIVE]") throw Error("Storage backup credential missing");
    const url = `https://${project}.supabase.co/storage/v1/object/authenticated/${[object.bucket_id,...object.name.split("/")].map(encodeURIComponent).join("/")}`;
    const response = await fetch(url, {headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}, signal:AbortSignal.timeout(30000)});
    if (!response.ok) throw Error("Storage backup download failed");
    const bytes = Buffer.from(await response.arrayBuffer()); totalBytes += bytes.length;
    if (totalBytes > 30 * 1024 * 1024) throw Error("Storage backup size limit requires review");
    storage.push({...object, sha256:createHash("sha256").update(bytes).digest("hex"), content:bytes.toString("base64")});
  }
  const storageBuckets = (await source.query("SELECT id,name,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id")).rows;
  supplement = {format:"kalivoa-auth-storage-v1", capturedAt:new Date().toISOString(), authDump:(await readFile(authRawPath)).toString("base64"), authColumns, authFingerprints, storage, storageBuckets,
    recoveryNotes:"Restore auth users and identities into a compatible new Supabase project before the application dump. Active sessions and refresh tokens are intentionally excluded; users must sign in again."};
  before = await fingerprints(source, tables);
  await source.query("COMMIT"); await source.end(); source = null;
  const raw = await readFile(rawPath); const key = await backupEncryptionKey(); const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(raw), cipher.final()]);
  await writeFile(encryptedPath, encrypted, { mode: 0o600 });
  const extraBytes = gzipSync(Buffer.from(JSON.stringify(supplement)));
  const extraIv = randomBytes(12), extraCipher = createCipheriv("aes-256-gcm",key,extraIv);
  const extraEncrypted = Buffer.concat([extraCipher.update(extraBytes), extraCipher.final()]);
  await writeFile(supplementPath,extraEncrypted,{mode:0o600});
  const extraVerifier = createDecipheriv("aes-256-gcm",key,extraIv); extraVerifier.setAuthTag(extraCipher.getAuthTag());
  if (!Buffer.concat([extraVerifier.update(await readFile(supplementPath)),extraVerifier.final()]).equals(extraBytes)) throw Error("Supplement encryption round trip failed");
  await writeFile(keyPath, JSON.stringify({ algorithm: "aes-256-gcm", key: key.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), sha256: createHash("sha256").update(raw).digest("hex"),
    supplement:{file:"auth-storage.aes256gcm",iv:extraIv.toString("base64"),tag:extraCipher.getAuthTag().toString("base64"),sha256:createHash("sha256").update(extraBytes).digest("hex")} }), { mode: 0o600 });
  report.authIncluded = true; report.authTables = ["auth.users","auth.identities"]; report.authSessionsIncluded = false;
  report.storageObjectsIncluded = true; report.storageObjectCount = objects.length;
  report.supplementSha256 = createHash("sha256").update(extraEncrypted).digest("hex");
  const decipher = createDecipheriv("aes-256-gcm", key, iv); decipher.setAuthTag(cipher.getAuthTag());
  const recovered = Buffer.concat([decipher.update(await readFile(encryptedPath)), decipher.final()]);
  if (!raw.equals(recovered)) throw new Error("Encrypted round trip failed");
  report.encrypted = true; report.backupBytes = encrypted.length; report.archiveSha256 = createHash("sha256").update(encrypted).digest("hex");
  await writeFile(join(runDir, "fingerprints.json"), JSON.stringify(before), { mode: 0o600 });
  }
  stage = "local-restore";
  const listener = createServer(); await new Promise((done) => listener.listen(0, "127.0.0.1", done));
  const port = listener.address().port; await new Promise((done) => listener.close(done));
  const password = randomUUID();
  postgres = new EmbeddedPostgres({ databaseDir: join(runDir, "restore-cluster"), user: "restore_check", password, port, persistent: true, createPostgresUser: false,
    initdbFlags: ["--encoding=UTF8", "--locale=C"], postgresFlags: ["-c", "listen_addresses=127.0.0.1"], onLog() {}, onError() {} });
  await postgres.initialise(); await postgres.start(); await postgres.createDatabase("kalivoa_restore_check");
  local = postgres.getPgClient("kalivoa_restore_check", "127.0.0.1"); await local.connect();
  // The new local database has an empty template schema; the archive recreates it.
  await local.query("DROP SCHEMA public");
  for (const role of new Set(["anon", "authenticated", "service_role", "supabase_auth_admin", ...policies.map((p) => p.rolname)])) {
    if (!(await local.query("SELECT 1 FROM pg_roles WHERE rolname=$1", [role])).rowCount) await local.query(`CREATE ROLE ${quote(role)} NOLOGIN NOSUPERUSER NOBYPASSRLS`);
  }
  // Supabase service schemas stay on Supabase; only policy dependencies are stubbed locally.
  await local.query("CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS 'SELECT NULL::uuid'; CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS 'SELECT NULL::text'; CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS 'SELECT NULL::jsonb';");
  await run(join(bin, "pg_restore.exe"), ["--exit-on-error", "--single-transaction", "--no-owner", "--no-privileges", "--dbname=kalivoa_restore_check", rawPath],
    { ...process.env, PGHOST: "127.0.0.1", PGPORT: String(port), PGUSER: "restore_check", PGPASSWORD: password, PGSSLMODE: "disable" }, "restore-private.log");
  if (supplement) {
    for (const [name, columns] of Object.entries(supplement.authColumns)) {
      const definitions = columns.map((column) => `${quote(column.name)} ${column.type}${column.generated ? ` GENERATED ALWAYS AS (${column.expression}) STORED` : ""}`);
      await local.query(`CREATE TABLE auth.${quote(name)} (${definitions.join(",")})`);
    }
    await run(join(bin,"pg_restore.exe"),["--exit-on-error","--single-transaction","--no-owner","--no-privileges","--dbname=kalivoa_restore_check",authRawPath],
      {...process.env, PGHOST:"127.0.0.1", PGPORT:String(port), PGUSER:"restore_check",PGPASSWORD:password,PGSSLMODE:"disable"},"auth-restore-private.log");
    const restoredAuth = await fingerprints(local,[{name:"users"},{name:"identities"}],"auth");
    if (JSON.stringify(restoredAuth) !== JSON.stringify(supplement.authFingerprints)) throw Error("Restored authentication data differs");
    report.authDataRestoredLocally = true;
    report.authRowsVerified = restoredAuth.reduce((sum,t)=>sum+Number(t.rows),0);
    for (const object of supplement.storage) if(createHash("sha256").update(Buffer.from(object.content,"base64")).digest("hex")!==object.sha256) throw Error("Storage checksum mismatch");
    report.storageContentVerified = true;
  }
  const restored = await fingerprints(local, tables);
  await writeFile(join(runDir,"restored-fingerprints.json"),JSON.stringify(restored),{mode:0o600});
  report.differentTables = before.filter((t,i)=>t.rows!==restored[i].rows||t.digest!==restored[i].digest).map((t)=>t.name);
  if (report.differentTables.length) throw new Error("Restored table fingerprints differ");
  report.restored = true; report.tablesVerified = tables.length; report.rowsVerified = before.reduce((sum, t) => sum + Number(t.rows), 0);
  stage = "migration-rehearsal";
  const migrations = ["20261009190000_welcome_offer_enrollment", "20261011100000_commercial_records", "20261011200000_restrict_server_only_tables"];
  for (const migration of migrations) {
    const applied=await local.query('SELECT 1 FROM public._prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL',[migration]);
    if(applied.rowCount) continue;
    await local.query("BEGIN");
    try { await local.query(await readFile(join(root, "prisma/migrations", migration, "migration.sql"), "utf8")); await local.query("COMMIT"); }
    catch (error) { await local.query("ROLLBACK"); throw error; }
  }
  const privateTables = (await local.query("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN('billing_contracts','billing_invoices','withdrawal_requests','transactional_emails')")).rows;
  if (privateTables.length !== 4 || privateTables.some((t) => !t.relrowsecurity)) throw new Error("Private commercial tables missing RLS");
  const eligibility = (await local.query("SELECT count(*)::int AS missing FROM users u WHERE (plan IN('BETA_TESTER','BETA_PREMIUM') OR EXISTS(SELECT 1 FROM beta_invite_redemptions r WHERE r.\"userId\"=u.id)) AND NOT u.\"betaWelcomeEligible\"")).rows[0];
  if (eligibility.missing) throw new Error("Beta eligibility was lost");
  report.migrationsRehearsed = true; report.migrations = migrations; report.betaEligibilityPreserved = true;
  report.retentionDeletionEnabled = false;
} catch (error) {
  report.failureStage = stage; report.failureType = error.code ?? error.name;
  await writeFile(join(runDir, "failure-private.log"), String(error.stack), { mode: 0o600 });
  process.exitCode = 1;
} finally {
  if (source) await source.end().catch(() => {}); if (local) await local.end().catch(() => {});
  if (postgres) await postgres.stop().catch(() => {});
  const target = resolve(join(runDir, "restore-cluster"));
  if (!target.startsWith(backupRoot + sep) || basename(target) !== "restore-cluster") throw new Error("Unexpected local cleanup path");
  await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  // Keep only the encrypted backup, recovery material and private diagnostics.
  await rm(rawPath, { force: true });
  await rm(authRawPath, { force: true });
  report.finishedAt = new Date().toISOString();
  await writeFile(join(runDir, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(join(root, "docs/audit-commercial/production-backup-restore-2026-10-19.json"), JSON.stringify(report, null, 2) + "\n");
  if (report.restored && report.authDataRestoredLocally && !report.failureStage) await writeFile(join(backupRoot,"latest-verified.json"),JSON.stringify({directory:runDir,publicArchive:encryptedPath,supplementArchive:supplementPath,recoveryKey:keyPath,report},null,2),{mode:0o600});
  console.log(JSON.stringify(report));
}
// The embedded runtime may retain idle library handles after its cluster stops.
process.exit(process.exitCode ?? 0);
