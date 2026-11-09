const Backup=(()=>{
 const APP='JUARA MART Digital Records',FORMAT=1;
 const migrate=o=>o; // future: convert older backupFormatVersion files here
 async function build(){const data={};for(const s of DB.STORES)data[s]=await DB.all(s);
  return{app:APP,backupFormatVersion:FORMAT,databaseVersion:DB.VERSION,exportedAt:new Date().toISOString(),data}}
 function validate(o){
  if(!o||o.app!==APP)return['This is not a JUARA MART backup file.'];
  if(!Number.isInteger(o.backupFormatVersion)||o.backupFormatVersion>FORMAT)return['This backup is from a newer app version. Update the app first.'];
  if(!o.data||typeof o.data!=='object')return['The backup has no data.'];
  const e=[];for(const s of DB.STORES)if(o.data[s]!==undefined&&!Array.isArray(o.data[s]))e.push(`"${s}" is damaged.`);
  if(e.length)return e;
  const bad=(v)=>!Number.isInteger(v)||v<0;
  (o.data.dailySales||[]).forEach((r,i)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||bad(r.totalCents)||bad(r.qrCents))e.push(`Sales record ${i+1} is invalid.`)});
  (o.data.poPayments||[]).forEach((r,i)=>{if(bad(r.amountCents))e.push(`PO payment ${i+1} is invalid.`)});
  return e}
 async function save(){
  const o=await build(),name=`juara-mart-backup-${Calc.todayISO()}.json`;
  const f=new File([JSON.stringify(o,null,1)],name,{type:'application/json'});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:name})}catch(e){if(e.name==='AbortError')return false;throw e}}
  else{const a=document.createElement('a');a.href=URL.createObjectURL(f);a.download=name;document.body.appendChild(a);a.click();a.remove()}
  await DB.put('settings',{key:'lastBackup',value:new Date().toISOString()});return true}
 async function restore(file){
  let o;try{o=migrate(JSON.parse(await file.text()))}catch{throw new Error('This file could not be read as a backup.')}
  const e=validate(o);if(e.length)throw new Error('Backup rejected: '+e.slice(0,3).join(' '));
  const c=s=>(o.data[s]||[]).length;
  if(!confirm(`Replace ALL current records with this backup?\n\nSales days: ${c('dailySales')}\nPOs: ${c('purchaseOrders')}\nPO payments: ${c('poPayments')}\nSaved: ${o.exportedAt}`))return false;
  if(confirm('Save a safety backup of your CURRENT data first? (Recommended)\nOK = save now, Cancel = skip'))if(!(await save()))return false;
  await DB.replaceAll(o.data);return true}
 async function status(){
  const r=await DB.get('settings','lastBackup');
  if(!r)return{warn:true,text:'No backup yet. Save one before entering real records.'};
  const d=Math.floor((Date.now()-new Date(r.value))/864e5);
  return{warn:d>7,text:d===0?'Last backup: today.':`Last backup: ${d} day${d>1?'s':''} ago.`+(d>7?' Please save a new one.':'')}}
 return{save,restore,status}
})();
