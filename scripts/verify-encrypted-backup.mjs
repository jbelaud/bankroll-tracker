/** Verify downloaded backup files in memory; never restores into a live database. */
import {readFile} from "node:fs/promises";
import {createHash,createDecipheriv} from "node:crypto";
import {gunzipSync} from "node:zlib";
const args=process.argv.slice(2);const option=(name)=>{const i=args.indexOf(name);if(i<0||!args[i+1])throw Error(`Missing ${name}`);return args[i+1];};
const manifest=JSON.parse(await readFile(option("--manifest"),"utf8"));
if(manifest.format!=="kalivoa-encrypted-backup-v1"||manifest.project!=="umyxyahkifdezohaotel"||manifest.archives.length!==2)throw Error("Unexpected backup format");
const master=JSON.parse(await readFile(option("--key"),"utf8"));const key=Buffer.from(master.key,"base64");
if(key.length!==32||createHash("sha256").update(key).digest("hex").slice(0,16)!==manifest.keyFingerprint)throw Error("Incorrect recovery key");
for(let i=0;i<2;i++){
 const file=manifest.archives[i],bytes=await readFile(option(i===0?"--public":"--supplement"));
 if(createHash("sha256").update(bytes).digest("hex")!==file.encryptedSha256)throw Error("Encrypted archive checksum differs");
 const decipher=createDecipheriv("aes-256-gcm",key,Buffer.from(file.iv,"base64"));decipher.setAuthTag(Buffer.from(file.tag,"base64"));
 const plain=Buffer.concat([decipher.update(bytes),decipher.final()]);
 if(createHash("sha256").update(plain).digest("hex")!==file.plaintextSha256)throw Error("Decrypted archive checksum differs");
 if(i===1){const extra=JSON.parse(gunzipSync(plain));if(extra.format!=="kalivoa-auth-storage-v1")throw Error("Unexpected supplement format");for(const object of extra.storage)if(createHash("sha256").update(Buffer.from(object.content,"base64")).digest("hex")!==object.sha256)throw Error("Storage content differs");}
}
console.log(JSON.stringify({verified:true,archives:2,customerDataPrinted:false,plaintextFilesWritten:false,productionWrites:false}));
