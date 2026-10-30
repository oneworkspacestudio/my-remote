'use strict';
const path=require('node:path');
// apphost.Service deliberately omits the interactive shell environment.
// Windows PowerShell needs PATHEXT to classify native EXEs as commands.
function commandEnvironment(env=process.env){
 const root=env.SystemRoot||env.WINDIR||'C:\\Windows';
 const result={...env};
 for(const key of Object.keys(result))if(/^(path|pathext)$/i.test(key))delete result[key];
 result.PATH=[path.win32.join(root,'System32'),path.win32.join(root,'System32','WindowsPowerShell','v1.0'),root].join(';');
 result.PATHEXT='.COM;.EXE;.BAT;.CMD';
 return result;
}
module.exports={commandEnvironment};
