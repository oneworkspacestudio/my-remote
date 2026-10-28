'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.dirname(require.resolve('meshcentral/package.json'));
const file=path.join(root,'meshcentral.js');let source=fs.readFileSync(file,'utf8');
const before='meshserver = CreateMeshCentralServer(config, args);';
const after=before+'\n            module.exports.workspaceInstance = meshserver; // My Remote integration hook';
if(!source.includes(after)){
 if(source.split(before).length!==2)throw Error('Pinned MeshCentral integration point changed');
 source=source.replace(before,after);fs.writeFileSync(file,source);
}
const standalone='if (obj.args.launch) {';
const hosted='if (obj.args.launch || module.parent) { // My Remote owns process lifetime in a Windows job';
if(!source.includes(hosted)){if(source.split(standalone).length!==2)throw Error('Pinned process lifecycle hook changed');source=source.replace(standalone,hosted);fs.writeFileSync(file,source);}
// Two explicit integration hooks: instance access and externally supervised lifetime.
const out=path.join(__dirname,'../web/public/engine');fs.mkdirSync(out,{recursive:true});
for(const name of ['common-0.0.1.js','agent-redir-ws-0.1.1.js','agent-desktop-0.0.2.js'])
 fs.copyFileSync(path.join(root,'public/scripts',name),path.join(out,name));
fs.mkdirSync(path.join(__dirname,'../docs/upstream'),{recursive:true});
fs.copyFileSync(path.join(root,'LICENSE'),path.join(__dirname,'../docs/upstream/MeshCentral-LICENSE.txt'));
console.log('Prepared pinned MeshCentral 1.3.1; protocol files copied unchanged.');
