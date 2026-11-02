/** Build public recovery metadata without ever uploading the decryption key. */
import {readFile,writeFile} from "node:fs/promises";
import {resolve,join,sep} from "node:path";
import {createHash} from "node:crypto";
const root=resolve(".vercel/production-backups");
const state=JSON.parse(await readFile(join(root,"latest-verified.json"),"utf8"));
if(!state.report.restored||!state.report.authDataRestoredLocally||!state.report.storageContentVerified||state.report.failureStage)throw Error("Backup is not verified");
const directory=resolve(state.directory);if(!directory.startsWith(root+sep))throw Error("Unexpected backup directory");
const recovery=JSON.parse(await readFile(state.recoveryKey,"utf8"));
const masterPath=join(root,"master-key.json");
let master;try{master=JSON.parse(await readFile(masterPath,"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;master={algorithm:recovery.algorithm,key:recovery.key,createdAt:new Date().toISOString()};await writeFile(masterPath,JSON.stringify(master,null,2)+"\n",{mode:0o600,flag:"wx"});}
if(master.key!==recovery.key)throw Error("Backup key differs from the retained master key");
const stamp=state.report.finishedAt.replace(/[-:]/g,"").replace(/\.\d+Z$/,"Z");
const prefix="kalivoa-"+stamp;
const envelope={format:"kalivoa-encrypted-backup-v1",createdAt:state.report.finishedAt,project:"umyxyahkifdezohaotel",keyFingerprint:createHash("sha256").update(Buffer.from(master.key,"base64")).digest("hex").slice(0,16),
 archives:[{localPath:state.publicArchive,fileName:prefix+"-public.dump.aes256gcm",iv:recovery.iv,tag:recovery.tag,plaintextSha256:recovery.sha256,encryptedSha256:state.report.archiveSha256},
 {localPath:state.supplementArchive,fileName:prefix+"-auth-storage.aes256gcm",iv:recovery.supplement.iv,tag:recovery.supplement.tag,plaintextSha256:recovery.supplement.sha256,encryptedSha256:state.report.supplementSha256}],
 report:state.report};
const cloud={...envelope,archives:envelope.archives.map(({localPath,...a})=>a)};
const manifestPath=join(directory,"cloud-manifest.json");await writeFile(manifestPath,JSON.stringify(cloud,null,2)+"\n");
await writeFile(join(root,"latest-upload.json"),JSON.stringify({folderId:"1rS6DobPq5i_s5mJyohLkfWgXg8KcPb8G",manifestPath,manifestName:prefix+"-manifest.json",archives:envelope.archives.map(({localPath,fileName,encryptedSha256})=>({localPath,fileName,sha256:encryptedSha256}))},null,2),{mode:0o600});
console.log(JSON.stringify({manifestPath,manifestName:prefix+"-manifest.json",archives:envelope.archives.map(({localPath,fileName,encryptedSha256})=>({localPath,fileName,sha256:encryptedSha256})),decryptionKeyExcluded:true}));
