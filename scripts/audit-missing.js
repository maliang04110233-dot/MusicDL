const fs = require('fs');
const path = require('path');
const root = 'C:/Users/59443/WorkBuddy/2026-06-06-19-21-10/music-downloader_backup_20260623';
const searchDirs = ['src/main','src/api','src/shared','src/utils'];
const files = [];
function walk(d){for(const e of fs.readdirSync(d)){const p=path.join(d,e);if(e.endsWith('.js'))files.push(p);else if(fs.statSync(p).isDirectory())walk(p);}}
for(const sd of searchDirs) if(fs.existsSync(sd)) walk(sd);

const re = /require\(['\"]([^'\"]+)['\"]\)/g;
const re2 = /import .+ from ['\"]([^'\"]+)['\"]/g;
let missing = [];
for(const f of files){
  const c = fs.readFileSync(f,'utf8');
  const base = path.dirname(f);
  const rel = path.relative(root,f);
  let m; while((m=re.exec(c))){const r=m[1];if(r[0]=='.'){try{require.resolve(r,{paths:[base]});}catch(e){missing.push('require('+r+') in '+rel);}}}
  let m2; while((m2=re2.exec(c))){const r=m2[1];if(r[0]=='.'){try{require.resolve(r,{paths:[base]});}catch(e){missing.push('import '+r+' in '+rel);}}}
}
if(missing.length) missing.sort().forEach(x=>console.log('  MISS:',x));
else console.log('  All requires resolve OK');
