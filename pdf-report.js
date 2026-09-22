
'use strict';
(function(){
const PW=595.28,PH=841.89,ML=40,MR=40,MT=40,MB=38,CW=PW-ML-MR;
const CP={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
function enc(s){const a=[];for(const ch of s){let c=ch.codePointAt(0);c=CP[ch]??(c<=255?c:63);a.push(c)}return new Uint8Array(a)}
function pe(s){return String(s??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,' ')}
function pdf(objects){let chunks=['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'],offs=[0],pos=enc(chunks[0]).length;objects.forEach((o,i)=>{offs[i+1]=pos;const s=`${i+1} 0 obj\n${o}\nendobj\n`;chunks.push(s);pos+=enc(s).length});const xr=pos;let x=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offs.length;i++)x+=String(offs[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xr}\n%%EOF`;chunks.push(x);const total=chunks.reduce((n,s)=>n+enc(s).length,0),out=new Uint8Array(total);let p=0;for(const s of chunks){const b=enc(s);out.set(b,p);p+=b.length}return new Blob([out],{type:'application/pdf'})}
function fmt(x){return x?new Date(x).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'–'}
function linesFor(s,width,size,bold=false){s=String(s??'').replace(/\s+/g,' ').trim();if(!s)return [''];const factor=bold?.55:.51,max=Math.max(4,Math.floor(width/(size*factor))),out=[];let line='';for(const w of s.split(' ')){const n=line?line+' '+w:w;if(n.length>max&&line){out.push(line);line=w}else line=n}if(line)out.push(line);return out}
function make(){
 let pages=[],ops=[],y=PH-MT;
 const t=(s,x,yy,size=9,b=false)=>ops.push(`BT /${b?'F2':'F1'} ${size} Tf ${x.toFixed(2)} ${yy.toFixed(2)} Td (${pe(s)}) Tj ET`);
 const ln=(x1,y1,x2,y2,w=.45)=>ops.push(`${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
 const box=(x,yy,w,h,gray=.94)=>ops.push(`${gray} g ${x.toFixed(2)} ${yy.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f 0 g`);
 const page=()=>{if(ops.length)pages.push(ops.join('\n'));ops=[];y=PH-MT};
 const need=h=>{if(y-h<MB)page()};
 const para=(s,size=9,b=false,x=ML,width=CW,gap=3)=>{const ls=size*1.25;for(const l of linesFor(s,width,size,b)){need(ls);t(l,x,y,size,b);y-=ls}y-=gap};
 const heading=(s,size=14)=>{need(size*1.8);t(s,ML,y,size,true);y-=size*1.45};
 const rule=()=>{ln(ML,y,PW-MR,y);y-=6};
 return {t,ln,box,page,need,para,heading,rule,get y(){return y},set y(v){y=v},finish(){if(ops.length||!pages.length)pages.push(ops.join('\n'));return pages}};
}
window.saveReportPdf=async function(){
 const s=session();if(!s)return;
 const all=scoped(),st=stats(),items=all.filter(i=>{const e=entry(i.id);return finalMissing(i,e)>0||e.status==='absent'||e.defect});
 const remaining=all.filter(i=>!items.includes(i));
 const d=make();
 d.heading(s.cancelled?'Abgebrochener Check':s.finished?'Abschlussbericht':'Berichtsentwurf',19);
 d.para(checkLabel(s),11,true);
 d.para(`Beginn: ${fmt(s.started)}    ${s.cancelled?'Abgebrochen':s.finished?'Abschluss':'Stand'}: ${fmt(s.cancelled||s.finished||new Date().toISOString())}`,8.5);
 d.para(`Name: ${s.name}${s.secondName?'    Weitere Person: '+s.secondName:''}`,8.5);
 d.para(`${st.done} / ${st.total} geprüft · ${st.total-st.done} ungeprüft`,8.5);
 function tableSection(title,list){
   d.heading(title,13);
   const cols=[0,270,315,385,515].map(v=>ML+v);
   const header=()=>{
     d.need(24); d.box(ML,d.y-17,CW,19,.92);
     d.t('Material',cols[0]+4,d.y-13,8,true);d.t('Soll',cols[1]+4,d.y-13,8,true);
     d.t('Status',cols[2]+4,d.y-13,8,true);d.t('Fehlbestand',cols[3]+4,d.y-13,8,true);
     d.y-=19; d.ln(ML,d.y,PW-MR,d.y);
   };
   header();
   if(!list.length){d.para('Keine Einträge.',9,false,ML+4,CW-8);return}
   let last='';
   for(const i of list){
     const e=entry(i.id),fm=finalMissing(i,e);
     const amount=fm===null?'offen':(e.status===null&&!e.used&&!e.refilled?'?':fm);
     if(last!==i.group.id){
       last=i.group.id; d.need(22); d.box(ML,d.y-16,CW,18,.96);
       d.t(groupLabel(i.group),ML+4,d.y-12,7.8,true);d.y-=18;d.ln(ML,d.y,PW-MR,d.y);
     }
     const name=i.ingredient?`${i.ingredient} ${i.strength} (${i.brand})`:i.name;
     const status=e.defect?'Mangel':e.status==='absent'?'Fehlt':e.status===null?'Ungeprüft':'OK';
     const nl=linesFor(name,266,8.2),rowH=Math.max(21,nl.length*10+7);
     d.need(rowH+6);
     nl.forEach((l,k)=>d.t(l,cols[0]+4,d.y-12-k*10,8.2,k===0));
     d.t(String(i.qty??'?'),cols[1]+4,d.y-12,8.2);
     d.t(status,cols[2]+4,d.y-12,8.2);
     d.t(String(amount),cols[3]+4,d.y-12,8.2,status==='Mangel'||status==='Fehlt');
     d.y-=rowH;
     const notes=[
       e.defect?'Mangel':'',
       e.checkNote?'Bemerkung bei Dienstbeginn: '+e.checkNote:'',
       e.useNote?'Bemerkung während des Dienstes: '+e.useNote:''
     ].filter(Boolean).join(' · ');
     if(notes){
       const nls=linesFor('Bemerkung: '+notes,CW-16,7.5),nh=nls.length*9+7;
       d.need(nh);nls.forEach((l,k)=>d.t(l,ML+8,d.y-9-k*9,7.5,k===0));d.y-=nh;
     }
     d.ln(ML,d.y,PW-MR,d.y);d.y-=3;
   }
 }
 tableSection('Fehlbestand / Mängel',items);
 tableSection('Weitere Positionen',remaining);
 if(st.total-st.done){
   d.need(28);d.box(ML,d.y-20,CW,22,.95);d.t(`${st.total-st.done} Position(en) noch ungeprüft.`,ML+7,d.y-14,8.5,true);d.y-=28;
 }
 if(s.generalNote){
   d.heading('Allgemeine Bemerkung',12);d.para(s.generalNote,8.5,false,ML,CW);
 }
 d.heading('Unterschrift',12);
 d.para(`${s.name}${s.secondName?' · '+s.secondName:''}`,8.5);
 d.para(s.signedAt?'Unterzeichnet am '+fmt(s.signedAt):'Noch nicht unterschrieben.',7.8);
 d.need(90);
 const sx=ML,sy=d.y-62,sw=235,sh=65;
 for(const stroke of (s.strokes||[])){for(let k=1;k<stroke.length;k++){const a=stroke[k-1],b=stroke[k];d.ln(sx+a[0]*sw,sy+(1-a[1])*sh,sx+b[0]*sw,sy+(1-b[1])*sh,1.05)}}
 d.ln(sx,sy-3,sx+sw,sy-3,.45);d.y=sy-15;
 d.para(`Check-ID: ${s.id}`,6.8);

 const pages=d.finish(),objs=[
   '<< /Type /Catalog /Pages 2 0 R >>',
   `<< /Type /Pages /Kids [${pages.map((_,i)=>`${5+i*2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
   '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
 ];
 pages.forEach((content,i)=>{const stream=6+i*2;objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${stream} 0 R >>`);objs.push(`<< /Length ${enc(content).length} >>\nstream\n${content}\nendstream`)});
 const blob=pdf(objs),name=safeFileName(checkLabel(s))+'-Bericht-'+new Date(s.started).toISOString().slice(0,10)+'.pdf',file=new File([blob],name,{type:'application/pdf'});
 const apple=/Mac|iPhone|iPad|iPod/.test(navigator.platform)||navigator.userAgent.includes('Mac OS X');
 if(apple&&navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){try{await navigator.share({files:[file],title:checkLabel(s)+' Bericht'});return}catch(err){if(err?.name==='AbortError')return}}
 const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),30000);
};
})();
