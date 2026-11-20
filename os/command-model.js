/* Deterministic, deliberately limited command interpreter. Never executes host commands. */
'use strict';
const CommandModel=(()=>{
 const aliases={CHDIR:'CD',MKDIR:'MD',RMDIR:'RD',RENAME:'REN',ERASE:'DEL','?':'HELP'};
 const docs=[
  ['HELP','HELP [command]','Find supported commands or read syntax. Try HELP COPY.','Both'],
  ['VER','VER','Identify the simulated operating-system environment.','Both'],
  ['DIR','DIR [path or pattern] [/B] [/S]','List folder contents. /B lists names; /S includes descendants. Try DIR C:\\LAB\\*.TXT.','Both'],
  ['CD','CD [path]','Show or change the current directory. CD .. goes up; CD \\ goes to the root. CHDIR is an alias.','Both'],
  ['MD','MD folder','Create a directory. MKDIR is the same command. Create parents first in DOS.','Both'],
  ['RD','RD folder','Remove an empty directory. RMDIR is an alias. This model does not support recursive deletion.','Both'],
  ['TYPE','TYPE file','Display a text file. It reads contents; DIR lists names.','Both'],
  ['ECHO','ECHO text [> file | >> file]','Display text. > writes/replaces a file; >> appends a new line. Existing text is lost with >.','Both'],
  ['COPY','COPY [/Y] source destination','Duplicate one file. Source stays in place. /Y explicitly permits overwriting an existing destination.','Both'],
  ['REN','REN oldname newname','Rename one file in its current folder. The new name is a name, not a different path.','Both'],
  ['MOVE','MOVE [/Y] source destination','Relocate one file. The source disappears when the move succeeds.','Both'],
  ['DEL','DEL file','Delete one named file. ERASE is an alias. No Recycle Bin; this lab offers Undo. Wildcard deletion is not modelled.','Both'],
  ['TREE','TREE [path] [/F]','Show folder structure. /F includes files.','Both'],
  ['FIND','FIND [/I] "text" file','Find lines containing text. /I ignores letter case.','Both'],
  ['ATTRIB','ATTRIB [+R | -R] file','Inspect, set or clear the read-only attribute. This flag is not an NTFS user permission.','Both'],
  ['VOL','VOL','Show the virtual volume label and file-system teaching profile.','Both'],
  ['CLS','CLS','Clear the visible terminal, keeping files and saved command history.','Both'],
  ['SYSTEMINFO','SYSTEMINFO','Inspect a fixed Windows XP Professional machine profile. Values are illustrative.','XP'],
  ['TASKLIST','TASKLIST','Inspect a fixed illustrative list of Windows processes. No real processes are read.','XP'],
  ['IPCONFIG','IPCONFIG','Inspect a simulated disconnected Windows network adapter. No packets are sent.','XP'],
  ['MEM','MEM','Inspect a fixed DOS conventional-memory example. Not a measurement of this computer.','DOS']
 ];
 const parent=p=>p==='C:\\'?null:p.slice(0,p.lastIndexOf('\\'))||'C:';
 const par=p=>{const x=parent(p);return x==='C:'?'C:\\':x;};
 const base=p=>p.slice(p.lastIndexOf('\\')+1);
 function initial(kind='xp'){
  const fs={};const dir=(p,locked=false)=>fs[p]={type:'dir',locked};const file=(p,text,ro=false,locked=false)=>fs[p]={type:'file',text,ro,locked};
  dir('C:\\',true);for(const n of ['TRAINING','TRAINING\\BRIEFS','SAMPLES','LAB','LAB\\TEMP','LAB\\ARCHIVE','BACKUP','LOGS','INBOX'])dir('C:\\'+n);
  const sys=kind==='dos'?'FDOS':'WINDOWS';dir('C:\\'+sys,true);file('C:\\'+sys+'\\SYSTEM.TXT','Simulated system files. Protected by the training model.\n',true,true);
  file('C:\\SAMPLES\\EXAMPLE.TXT','A worked example. Keep the source when making a copy.\n');
  file('C:\\TRAINING\\BRIEFS\\BRIEF.TXT','Northbridge handover: inspect the system, organise the files and keep a backup.\n');
  file('C:\\LAB\\REPORT.TXT','Northbridge operating-system report.\n');file('C:\\LAB\\DRAFT.TXT','Draft for demonstration.\n');
  file('C:\\LAB\\STATUS.TXT','Installed\n',true);file('C:\\LAB\\KEEP.TXT','Keep this original record.\n');file('C:\\LAB\\SCRATCH.TXT','Disposable note.\n');file('C:\\LAB\\TEMP\\OLD.TXT','Archive this older note.\n');
  file('C:\\LOGS\\BOOT.LOG','INFO: kernel loaded\nERROR: network cable disconnected\nINFO: local files available\n');file('C:\\INBOX\\HANDOVER.TXT','Northbridge handover\n');
  return {kind,cwd:'C:\\',fs,lines:[],events:[],last:'Ready. Type HELP for the supported command set.'};
 }
 function path(raw,cwd){
  if(!raw)return cwd;raw=raw.replace(/\//g,'\\');
  if(/^[a-z]:/i.test(raw)&&!/^c:\\/i.test(raw))throw Error('This model has one drive, C:. Use C:\\ for its root. Drive-relative forms such as C:LAB are not modelled.');
  let full=/^c:\\/i.test(raw)?raw:raw.startsWith('\\')?'C:'+raw:(cwd==='C:\\'?cwd:cwd+'\\')+raw;
  let parts=[];for(const part of full.slice(3).split('\\')){if(!part||part==='.')continue;if(part==='..'){parts.pop();continue;}if(/[<>:"|?*\x00-\x1f]/.test(part)||/[. ]$/.test(part)||part.length>60)throw Error('Use an ordinary file or folder name. Quote paths with spaces; wildcards are supported only by DIR.');parts.push(part.toUpperCase());}
  if(parts.length>12)throw Error('This practice supports up to 12 nested folders.');return 'C:\\'+parts.join('\\');
 }
 function tokens(raw){if((raw.match(/"/g)||[]).length%2)throw Error('A quote is missing. Put double quotes around the complete name, for example TYPE "C:\\MY NOTES\\NOTE.TXT".');return (raw.match(/"[^"]*"|[^\s]+/g)||[]).map(t=>t.startsWith('"')?t.slice(1,-1):t);}
 function children(s,p,deep=false){return Object.keys(s.fs).filter(k=>k!==p&&(deep?k.startsWith(p==='C:\\'?p:p+'\\'):par(k)===p)).sort();}
 function command(s,raw){
  const before=s.cwd;let event={raw,verb:'',ok:false,paths:[]},output='';
  const need=(p,type)=>{if(!s.fs[p])throw Error('Path not found: '+p+'. Use DIR to inspect the current folder or use an absolute path.');if(type&&s.fs[p].type!==type)throw Error(p+' is '+(s.fs[p].type==='dir'?'a directory, not a file.':'a file, not a directory.'));return s.fs[p];};
  const writable=p=>{if(s.fs[p]?.locked||(par(p)!=='C:\\'&&s.fs[par(p)]?.locked))throw Error('The training model protects system folders. Work in C:\\LAB, C:\\WORK or another practice folder.');if(s.fs[p]?.ro)throw Error('Access denied: read-only attribute on '+p+'. Inspect it with ATTRIB; use ATTRIB -R only if the intended change is appropriate.');};
  const dest=p=>{need(par(p),'dir');writable(p);if(s.fs[p]?.type==='dir')throw Error('That path is a directory. Supply a file name.');if(!s.fs[p]&&Object.keys(s.fs).length>=200)throw Error('This virtual disk has reached the practice limit of 200 entries. Undo or reset this exercise.');};
  const arity=(args,min,max=min)=>{if(args.length<min||args.length>max)throw Error('Check the syntax with HELP '+event.verb+'. Quote paths that contain spaces.');};
  try{
   const tok=tokens(raw.trim());let cmd=(tok.shift()||'').toUpperCase();if(/^CD(?:\.\.|\\)/.test(cmd)){tok.unshift(cmd.slice(2));cmd='CD';}cmd=aliases[cmd]||cmd;event.verb=cmd;
   if(!cmd)return s;
   if(cmd==='HELP'||tok[0]==='/?'){
    const query=(cmd==='HELP'?tok[0]:cmd)?.toUpperCase(),name=aliases[query]||query,d=docs.find(d=>d[0]===name);
    output=query?(d?d[1]+'\n'+d[2]+'\nProfile: '+d[3]:'No help for that command. Use HELP for the supported list.'):docs.filter(d=>d[3]==='Both'||d[3]===(s.kind==='xp'?'XP':'DOS')).map(d=>d[0].padEnd(12)+d[2]).join('\n');event.ok=true;
   }else{
    if(/[|&<>]/.test(raw)&&cmd!=='ECHO')throw Error('Pipes, command chaining and redirection outside ECHO are not modelled. Run one command at a time.');
    const flags=tok.filter(t=>t.startsWith('/')).map(t=>t.toUpperCase()),args=tok.filter(t=>!t.startsWith('/'));
    const allowed={DIR:['/B','/S'],TREE:['/F'],COPY:['/Y'],MOVE:['/Y'],FIND:['/I']}[cmd]||[];
    if(cmd!=='ECHO'&&flags.some(f=>!allowed.includes(f)))throw Error('That switch is not modelled. Use HELP '+cmd+' for the supported syntax.');
    if(cmd==='VER'){arity(args,0);output=s.kind==='xp'?'Windows XP Professional (32-bit) — teaching profile, not a real OS.':'FreeDOS-compatible command environment — teaching profile, not a real DOS kernel.';}
    else if(cmd==='CLS'){arity(args,0);s.lines=[];output='';}
    else if(cmd==='VOL'){arity(args,0);output='Volume C: RIVERSIDE\nFile-system teaching profile: '+(s.kind==='xp'?'NTFS':'FAT16')+'\nThe command model stores names and contents; it does not implement on-disk NTFS or FAT structures.';}
    else if(cmd==='CD'){arity(args,0,1);const p=path(args[0],s.cwd);need(p,'dir');s.cwd=p;event.paths=[p];output=s.cwd;}
    else if(cmd==='DIR'||cmd==='TREE'){
     arity(args,0,1);let spec=args[0]||s.cwd,pattern=null;
     if(cmd==='DIR'&&/[?*]/.test(spec)){const pos=spec.lastIndexOf('\\');pattern=spec.slice(pos+1).toUpperCase();spec=pos<0?s.cwd:spec.slice(0,pos)||'\\';if(spec==='C:')spec='C:\\';}
     const p=path(spec,s.cwd);need(p);event.paths=[p];let list=s.fs[p].type==='file'?[p]:children(s,p,flags.includes('/S')||cmd==='TREE');
     if(pattern){const rx=new RegExp('^'+pattern.replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*').replace(/\?/g,'.')+'$');list=list.filter(k=>pattern==='*.*'||rx.test(base(k)));}
     if(cmd==='TREE'&&!flags.includes('/F'))list=list.filter(k=>s.fs[k].type==='dir');
     output=(flags.includes('/B')?'':(cmd==='TREE'?'Folder tree: ':'Directory of ')+p+'\n')+(list.map(k=>cmd==='TREE'?'  '.repeat(Math.max(0,k.split('\\').length-p.split('\\').length))+(s.fs[k].type==='dir'?'[+] ':'    ')+base(k):flags.includes('/B')?base(k):(flags.includes('/S')?k:base(k)).padEnd(23)+(s.fs[k].type==='dir'?'<DIR>':s.fs[k].ro?'FILE [R]':'FILE')).join('\n')||'(No matching entries)');
    }else if(cmd==='MD'){
     arity(args,1);const p=path(args[0],s.cwd);if(s.fs[p])throw Error('Already exists: '+p);let missing=[],x=p;while(!s.fs[x]){missing.unshift(x);x=par(x);}need(x,'dir');if(s.kind==='dos'&&missing.length>1)throw Error('Create the parent folder first in this DOS model, then create its child.');if(Object.keys(s.fs).length+missing.length>200)throw Error('Practice entry limit reached.');if(s.fs[x].locked&&x!=='C:\\')throw Error('The training model protects this system directory.');for(const m of missing)s.fs[m]={type:'dir',locked:false};event.paths=[p];output='Created directory '+p;
    }else if(cmd==='RD'){
     arity(args,1);const p=path(args[0],s.cwd);need(p,'dir');if(s.fs[p].locked)throw Error('This directory is protected by the training model.');if(s.cwd===p||s.cwd.startsWith(p+'\\'))throw Error('Cannot remove the current directory or its parent. CD \\ first.');if(children(s,p).length)throw Error('Directory not empty. Move or delete its contents first; RD removes an empty folder.');delete s.fs[p];event.paths=[p];output='Removed directory '+p;
    }else if(cmd==='TYPE'){arity(args,1);const p=path(args[0],s.cwd);output=need(p,'file').text;event.paths=[p];}
    else if(cmd==='ECHO'){
     const body=raw.replace(/^\s*echo\s*/i,''),m=body.match(/^(.*?)\s*(>>?)\s*("[^"]+"|[^\s<>]+)\s*$/);
     if(/[|&]/.test(body)||(m&&/[<>]/.test(m[1])))throw Error('Use one ECHO redirection at a time. Command chaining and pipes are not modelled.');
     if(!m){if(/[<>]/.test(body))throw Error('Use ECHO text > file, or ECHO text >> file. Quote file paths containing spaces.');output=body||'ECHO is on (simulated).';}
     else {const p=path(m[3].replace(/^"|"$/g,''),s.cwd);dest(p);const text=(m[2]==='>>'?(s.fs[p]?.text||''):'')+m[1].trimEnd()+'\n';if(text.length>8192)throw Error('Practice text-file limit is 8192 characters.');s.fs[p]={type:'file',text,ro:false,locked:false};event.paths=[p];event.append=m[2]==='>>';output=(event.append?'Appended to ':'Wrote / replaced ')+p;}
    }else if(['COPY','MOVE','REN'].includes(cmd)){
     arity(args,2);const source=path(args[0],s.cwd);const f=need(source,'file');let target;
     if(cmd==='REN'){if(/[\\/:]/.test(args[1]))throw Error('REN needs a new file name in the same folder. Use MOVE to change its location.');target=path(args[1],par(source));}else{target=path(args[1],s.cwd);if(s.fs[target]?.type==='dir')target=path(base(source),target);}
     if(target===source)throw Error('Source and destination are the same file.');dest(target);if(cmd!=='COPY')writable(source);
     if(s.fs[target]&&(cmd==='REN'||!flags.includes('/Y')))throw Error('Destination already exists. Choose another name'+(cmd==='REN'?'.':', or explicitly use /Y to overwrite it in this model.'));
     s.fs[target]={...f,locked:false};if(cmd!=='COPY')delete s.fs[source];event.paths=[source,target];output=(cmd==='COPY'?'Copied ':cmd==='REN'?'Renamed ':'Moved ')+source+' → '+target;
    }else if(cmd==='DEL'){
     arity(args,1);const p=path(args[0],s.cwd);need(p,'file');writable(p);delete s.fs[p];event.paths=[p];output='Deleted '+p+'. In this lab Undo restores it; a real DEL does not use the Recycle Bin.';
    }else if(cmd==='FIND'){
     arity(args,2);const p=path(args[1],s.cwd),f=need(p,'file');const match=f.text.split('\n').filter(line=>flags.includes('/I')?line.toLowerCase().includes(args[0].toLowerCase()):line.includes(args[0]));event.paths=[p];event.query=args[0];output='---------- '+p+'\n'+(match.join('\n')||'(No matching lines)');
    }else if(cmd==='ATTRIB'){
     const change=args[0]?.toUpperCase();arity(args,1,2);const set=['+R','-R'].includes(change);if(args.length===2&&!set)throw Error('Only +R and -R are modelled.');const p=path(args[set?1:0],s.cwd),f=need(p,'file');if(set){if(f.locked)throw Error('This system file is protected by the model.');f.ro=change==='+R';}event.paths=[p];event.attribute=set?change:null;output=(f.ro?'R':'-')+'  '+p+'\nR means read-only; this is an attribute, not a per-user access-control list.';
    }else if(['SYSTEMINFO','TASKLIST','IPCONFIG','MEM'].includes(cmd)){
     arity(args,0);if((cmd==='MEM')!==(s.kind==='dos'))throw Error(cmd+' is not provided by this '+(s.kind==='dos'?'DOS':'XP')+' teaching profile. Use '+(s.kind==='dos'?'MEM or VER.':'SYSTEMINFO, TASKLIST or IPCONFIG.'));
     output={SYSTEMINFO:'ILLUSTRATIVE MACHINE PROFILE\nHost: RIVERSIDE-XP\nOS: Windows XP Professional (32-bit)\nRAM: 512 MiB\nBoot: legacy BIOS\nNetwork: disconnected',TASKLIST:'ILLUSTRATIVE PROCESS SNAPSHOT\nImage name       PID\nexplorer.exe     1040\ncmd.exe          1124\nNo live processes are queried.',IPCONFIG:'ILLUSTRATIVE NETWORK SNAPSHOT\nEthernet adapter: Media disconnected\nNo current address shown. No packets sent.\nThis output does not establish a working network connection.',MEM:'ILLUSTRATIVE DOS MEMORY SNAPSHOT\nConventional total: 640 KiB\nUsed: 80 KiB\nFree: 560 KiB\nConventional memory is only one region; these figures do not describe all installed RAM.'}[cmd];
    }else throw Error('Command not modelled: '+cmd+'. Type HELP for this interpreter’s supported commands; use the reference drawer for examples.');
    event.ok=true;
   }
  }catch(err){output=err.message;event.ok=false;}
  s.last=output||'Screen cleared. Files and history kept.';if(event.verb!=='CLS'||!event.ok)s.lines.push(before+'>'+raw,output);s.lines=s.lines.slice(-120);s.events.push(event);return s;
 }
 function replay(kind,commands=[]){const s=initial(kind);for(const c of commands)command(s,c);return s;}
 return {docs,initial,path,replay,command,children,base};
})();
if(typeof module!=='undefined')module.exports=CommandModel;
