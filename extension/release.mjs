import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import './build.mjs';
const root = new URL('./dist/', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
if (manifest.externally_connectable.matches.some(value => value.includes('localhost'))) throw new Error('Development package cannot be published');
const names = ['manifest.json','background.js','popup.js','storage.js','policy.js','popup.html','popup.css','theme.css','kalivoa-icon.svg',...Object.values(manifest.icons),'assets/inter-latin.woff2','assets/jetbrains-mono-latin.woff2','assets/OFL-Inter.txt','assets/OFL-JetBrainsMono.txt'];
// Standard ZIP, stored entries: no external dependency and a reproducible archive.
const crc32 = data => {
  let crc = 0xffffffff;
  for (const byte of data) { crc ^= byte; for (let bit=0; bit<8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
};
const local = [], central = []; let offset = 0;
for (const name of names.sort()) {
  const data = await readFile(new URL(name, root)); const filename = Buffer.from(name); const crc = crc32(data);
  const header = Buffer.alloc(30); header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20,4); header.writeUInt16LE(33,12); header.writeUInt32LE(crc,14); header.writeUInt32LE(data.length,18); header.writeUInt32LE(data.length,22); header.writeUInt16LE(filename.length,26);
  const entry = Buffer.alloc(46); entry.writeUInt32LE(0x02014b50); entry.writeUInt16LE(20,4); entry.writeUInt16LE(20,6); entry.writeUInt16LE(33,14); entry.writeUInt32LE(crc,16); entry.writeUInt32LE(data.length,20); entry.writeUInt32LE(data.length,24); entry.writeUInt16LE(filename.length,28); entry.writeUInt32LE(offset,42);
  local.push(header,filename,data); central.push(entry,filename); offset += header.length+filename.length+data.length;
}
const directory = Buffer.concat(central); const end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50); end.writeUInt16LE(names.length,8); end.writeUInt16LE(names.length,10); end.writeUInt32LE(directory.length,12); end.writeUInt32LE(offset,16);
const zip = Buffer.concat([...local,directory,end]);
const output = new URL('../public/downloads/',import.meta.url); await mkdir(output,{recursive:true});
const filename = `kalivoa-extension-${manifest.version}.zip`;
await writeFile(new URL(filename,output),zip);
await writeFile(new URL(`${filename}.sha256`,output),`${createHash('sha256').update(zip).digest('hex')}  ${filename}\n`);
console.log(`${filename}: ${zip.length} bytes, ${names.length} production files`);
