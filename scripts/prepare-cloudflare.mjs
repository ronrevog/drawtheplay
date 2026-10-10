import {copyFile,mkdir,readFile} from 'node:fs/promises';
const source=new URL('../../reference-analysis/',import.meta.url);
const destination=new URL('../dist/local-reference/',import.meta.url);
// Publish only the two renderer assets, never the installer or analysis folder.
const data=JSON.parse(await readFile(new URL('fps-decoded.json',source),'utf8'));
if(!data.animations?.length)throw Error('Player animation manifest is missing or invalid');
await mkdir(destination,{recursive:true});
for(const name of ['fps-decoded.json','fps-sprite-atlas.png'])await copyFile(new URL(name,source),new URL(name,destination));
console.log(`Prepared ${data.animations.length} player animation sequences for Cloudflare.`);
