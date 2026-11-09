// All money is whole sen (integer). RM 366.90 = 36690. Used by every screen.
const Calc={
 toCents(s){const t=String(s).trim().replace(/,/g,'');if(!/^\d+(\.\d{1,2})?$/.test(t))return null;const[a,b='']=t.split('.');return +a*100+ +(b+'0').slice(0,2)},
 rm(c){const n=c<0?'-':'',a=Math.abs(c);return n+'RM '+Math.floor(a/100).toLocaleString('en-MY')+'.'+String(a%100).padStart(2,'0')},
 cashSales:(total,qr)=>total-qr,
 // Cash On Hand = Total Sales - QR Payment - Cash-Paid PO (selected date only)
 cashOnHand:(total,qr,cashPo)=>total-qr-cashPo,
 todayISO:()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kuala_Lumpur'}).format(new Date()),
 longDate(){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Kuala_Lumpur',weekday:'long',day:'numeric',month:'long',year:'numeric'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.weekday}, ${p.day} ${p.month} ${p.year}`}
};
