const Backup=(()=>{
 const APP='JUARA MART Digital Records',FORMAT=1,MAXN=1e12,METHODS=['Cash','QR/Bank Transfer','Other'];
 const migrate=o=>o; // future: convert older backupFormatVersion files here
 const isObj=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
 const money=v=>Number.isSafeInteger(v)&&v>=0&&v<=MAXN;
 const isDate=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const[y,m,d]=s.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d));return y>=2000&&t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d};
 const isTs=s=>typeof s==='string'&&!isNaN(Date.parse(s));
 async function build(){const data={};for(const s of DB.STORES)data[s]=await DB.all(s);
  return{app:APP,backupFormatVersion:FORMAT,databaseVersion:DB.VERSION,exportedAt:new Date().toISOString(),data}}
 // Checks everything BEFORE any data is replaced. Returns a list of problems (empty = valid).
 function validate(o){
  if(!isObj(o)||o.app!==APP)return['This is not a JUARA MART backup file.'];
  if(!Number.isInteger(o.backupFormatVersion)||o.backupFormatVersion<1)return['The backup version is missing or invalid.'];
  if(o.backupFormatVersion>FORMAT)return['This backup is from a newer app version. Update the app first.'];
  if(!Number.isInteger(o.databaseVersion)||o.databaseVersion<1)return['The database version is missing or invalid.'];
  if(o.databaseVersion>DB.VERSION)return['This backup uses a newer database. Update the app first.'];
  if(!isTs(o.exportedAt))return['The backup date is missing or invalid.'];
  if(!isObj(o.data))return['The backup has no data.'];
  const e=[],d=o.data;
  Object.keys(d).forEach(k=>{if(!DB.STORES.includes(k))e.push(`Unknown section "${k}".`)});
  DB.STORES.forEach(s=>{if(d[s]!==undefined&&!Array.isArray(d[s]))e.push(`Section "${s}" is damaged.`)});
  if(e.length)return e;
  const each=(name,list,key,fn)=>{const ids=new Set();(list||[]).forEach((r,i)=>{const w=`${name} #${i+1}`;
   if(!isObj(r)){e.push(`${w} is not a valid record.`);return}
   if(ids.has(r[key]))e.push(`${w} has a duplicate ${key} "${r[key]}".`);ids.add(r[key]);fn(r,w)});return ids};
  const generic=(r,w)=>Object.keys(r).forEach(k=>{
   if(/Cents$/.test(k)&&!money(r[k]))e.push(`${w}: "${k}" is not a valid amount.`);
   if(/Date$/.test(k)&&!isDate(r[k]))e.push(`${w}: "${k}" is not a valid date.`)});
  each('Sales record',d.dailySales,'date',(r,w)=>{
   if(!isDate(r.date))e.push(`${w}: invalid date.`);
   if(!money(r.totalCents))e.push(`${w}: Total Sales is not a valid amount.`);
   if(!money(r.qrCents))e.push(`${w}: QR Payment is not a valid amount.`);
   else if(money(r.totalCents)&&r.qrCents>r.totalCents)e.push(`${w}: QR Payment is more than Total Sales.`);
   if(r.notes!==undefined&&(typeof r.notes!=='string'||r.notes.length>1000))e.push(`${w}: notes are invalid.`);
   ['createdAt','updatedAt'].forEach(k=>{if(r[k]!==undefined&&!isTs(r[k]))e.push(`${w}: "${k}" is invalid.`)})});
  const poIds=each('PO',d.purchaseOrders,'id',(r,w)=>{
   if(!Number.isSafeInteger(r.id)||r.id<1)e.push(`${w}: invalid id.`);generic(r,w)});
  each('PO payment',d.poPayments,'id',(r,w)=>{
   if(!Number.isSafeInteger(r.id)||r.id<1)e.push(`${w}: invalid id.`);
   if(!money(r.amountCents))e.push(`${w}: amount is not valid.`);
   if(!isDate(r.paymentDate))e.push(`${w}: payment date is not valid.`);
   if(!METHODS.includes(r.method))e.push(`${w}: payment method is not valid.`);
   if(r.poId!==undefined&&!poIds.has(r.poId))e.push(`${w}: refers to a PO (${r.poId}) that is not in the backup.`)});
  each('Setting',d.settings,'key',(r,w)=>{
   if(typeof r.key!=='string'||!r.key)e.push(`${w}: invalid key.`);
   else if(!('value' in r))e.push(`${w}: missing value.`);
   else if(r.key==='lastBackup'&&!isTs(r.value))e.push(`${w}: invalid backup date.`)});
  return e}
 async function save(){
  const o=await build(),name=`juara-mart-backup-${Calc.todayISO()}.json`;
  const f=new File([JSON.stringify(o,null,1)],name,{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:name})}catch(e){if(e.name==='AbortError')return false;throw e}}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;document.body.appendChild(a);a.click();a.remove()}
  await DB.put('settings',{key:'lastBackup',value:new Date().toISOString()});return true}
 async function restore(file){
  if(file.size>100*1048576)throw new Error('This file is too large to be a backup.');
  let o;try{o=migrate(JSON.parse(await file.text()))}catch{throw new Error('This file could not be read as a backup.')}
  const e=validate(o);
  if(e.length)throw new Error(`Backup rejected. Nothing was changed. ${e.length} problem${e.length>1?'s':''}: `+e.slice(0,5).join(' ')+(e.length>5?' …':''));
  const c=s=>(o.data[s]||[]).length;
  if(!confirm(`Replace ALL current records with this backup?\n\nSales days: ${c('dailySales')}\nPOs: ${c('purchaseOrders')}\nPO payments: ${c('poPayments')}\nSaved: ${o.exportedAt}`))return false;
  if(confirm('Save a safety backup of your CURRENT data first? (Recommended)\nOK = save now, Cancel = skip'))if(!(await save()))return false;
  await DB.replaceAll(o.data);
  for(const s of DB.STORES)if((await DB.all(s)).length!==c(s))throw new Error(`Restore check failed for "${s}". Please restore your safety backup.`);
  return true}
 async function status(){
  const r=await DB.get('settings','lastBackup');
  if(!r)return{warn:true,text:'No backup yet. Save one before entering real records.'};
  const d=Math.floor((Date.now()-new Date(r.value))/864e5);
  return{warn:d>7,text:d===0?'Last backup: today.':`Last backup: ${d} day${d>1?'s':''} ago.`+(d>7?' Please save a new one.':'')}}
 return{save,restore,status,validate}
})();
