'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const {storedPassword}=require('../engine/rfb.cjs');
const [file,rawPort]=process.argv.slice(2),port=Number(rawPort);
if(!file||!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid configuration');
const password=crypto.randomBytes(6).toString('base64');
fs.writeFileSync(file,JSON.stringify({port,password,registryPassword:storedPassword(password).toString('hex')}),{flag:'wx',mode:0o600});
