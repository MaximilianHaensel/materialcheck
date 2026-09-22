
'use strict';
(function(){
const W=595.28,H=841.89,M=42,CONTENT=W-2*M;
const winMap={'€':128,'‚':130,'ƒ':131,'„':132,'…':133,'†':134,'‡':135,'ˆ':136,'‰':137,'Š':138,'‹':139,'Œ':140,'Ž':142,'‘':145,'’':146,'“':147,'”':148,'•':149,'–':150,'—':151,'˜':152,'™':153,'š':154,'›':155,'œ':156,'ž':158,'Ÿ':159};
function bytes(s){const a=[];for(const ch of s){let c=ch.codePointAt(0);if(winMap[ch]!=null)c=winMap[ch];else if(c>255)c=63;a.push(c)}return new Uint8Array(a)}
function escPdf(s){return String(s??'').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/\r?\n/g,' ')}
function wrap(s,max){s=String(s??'').trim();if(!s)return [''];const out=[];for(const para of s.split(/\n/)){let line='';for(const w of para.split(/\s+/)){const n=line?line+' '+w:w;if(n.length>max&&line){out.push(line);line=w}else line=n}out.push(line)}return out}
function buildPdf(objects){let parts=['%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'],offsets=[0],pos=bytes(parts[0]).length;for(let i=0;i<objects.length;i++){offsets[i+1]=pos;const p=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;parts.push(p);pos+=bytes(p).length}const xref=pos;let x=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;for(let i=1;i<offsets.length;i++)x+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;parts.push(x);let total=parts.reduce((n,p)=>n+bytes(p).length,0),all=new Uint8Array(total),o=0;for(const p of parts){const b=bytes(p);all.set(b,o);o+=b.length}return new Blob([all],{type:'application/pdf'})}
function makeDoc(){
 const pages=[];let ops=[],y=H-M;
 function text(t,x,y0,size=10,bold=false){ops.push(`BT /${bold?'F2':'F1'} ${size} Tf ${x.toFixed(2)} ${y0.toFixed(2)} Td (${escPdf(t)}) Tj ET`)}
 function line(x1,y1,x2,y2,w=.6){ops.push(`${w} w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`)}
 function newPage(){if(ops.length)pages.push(ops.join('\n'));ops=[];y=H-M}
 function need(h){if(y-h<M)newPage()}
 function paragraph(t,size=10,bold=false,indent=0){const ls=size*1.35, max=Math.max(18,Math.floor((CONTENT-indent)/(size*.52)));for(const l of wrap(t,max)){need(ls);text(l,M+indent,y,size,bold);y-=ls}y-=3}
 function heading(t,size=16){need(size*1.8);text(t,M,y,size,true);y-=size*1.45}
 function rule(){line(M,y,W-M,y,.5);y-=7}
 return {pages,ops:()=>ops,y:()=>y,setY:v=>y=v,text,line,newPage,need,paragraph,heading,rule,finish(){if(ops.length||!pages.length)pages.push(ops.join('\n'));return pages}}
}
function fmtPdfDate(x){return x?new Date(x).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'–'}
window.saveReportPdf=async function(){
 const s=session(); if(!s) return;
 const d=makeDoc(), all=scoped();
 const needed=all.filter(i=>{const e=entry(i.id);return finalMissing(i,e)>0||e.status==='absent'||e.defect});
 const remaining=all.filter(i=>!needed.includes(i));
 d.heading(s.cancelled?'Abgebrochener Check':s.finished?'Abschlussbericht':'Berichtsentwurf',20);
 d.paragraph(checkLabel(s),12,true);
 d.paragraph(`Beginn: ${fmtPdfDate(s.started)}    ${s.cancelled?'Abgebrochen':s.finished?'Abschluss':'Stand'}: ${fmtPdfDate(s.cancelled||s.finished||new Date().toISOString())}`,9);
 d.paragraph(`Name: ${s.name}${s.secondName?'    Weitere Person: '+s.secondName:''}`,9);
 d.paragraph(`${stats().done} / ${stats().total} geprüft · ${stats().total-stats().done} ungeprüft`,9);
 function section(title,items){
   d.heading(title,14);
   if(!items.length){d.paragraph('Keine Einträge.',9);return}
   let last='';
   for(const i of items){
     const e=entry(i.id);
     if(last!==i.group.id){last=i.group.id;d.need(26);d.paragraph(groupLabel(i.group),9,true);d.rule()}
     const fm=finalMissing(i,e), amount=fm===null?'offen':e.status===null&&!e.used&&!e.refilled?'?':fm;
     const status=e.status===null?'Ungeprüft':(e.defect?'Mangel':i.qty===null?'Erfasst':'OK');
     const label=i.ingredient?`${i.ingredient} ${i.strength} (${i.brand})`:i.name;
     d.need(32);
     d.paragraph(`${label}   | Soll: ${i.qty??'?'}   | ${status}   | Fehlbestand: ${amount}`,9,true);
     const notes=[e.defect?'Mangel':'',e.checkNote?'Bemerkung bei Dienstbeginn: '+e.checkNote:'',e.useNote?'Bemerkung während des Dienstes: '+e.useNote:''].filter(Boolean);
     if(notes.length)d.paragraph(notes.join(' · '),8,false,10);
     d.rule();
   }
 }
 section('Fehlbestand / Mängel',needed);
 if(s.generalNote){d.heading('Allgemeine Bemerkung',14);d.paragraph(s.generalNote,9)}
 section('Weitere Positionen',remaining);
 d.heading('Unterschrift',14);
 d.paragraph(`${s.name}${s.secondName?' · '+s.secondName:''}`,9);
 d.paragraph(s.signedAt?'Unterzeichnet am '+fmtPdfDate(s.signedAt):'Noch nicht unterschrieben.',8);
 d.need(95);
 const sigX=M,sigY=d.y()-65,sigW=230,sigH=70;
 d.line(sigX,sigY-3,sigX+sigW,sigY-3,.5);
 for(const stroke of (s.strokes||[])){if(stroke.length<2)continue;for(let k=1;k<stroke.length;k++){const a=stroke[k-1],b=stroke[k];d.line(sigX+a[0]*sigW,sigY+(1-a[1])*sigH,sigX+b[0]*sigW,sigY+(1-b[1])*sigH,1.2)}}
 d.setY(sigY-18);
 d.paragraph(`Check-ID: ${s.id}`,7);
 const pages=d.finish(), objs=[];
 objs.push('<< /Type /Catalog /Pages 2 0 R >>');
 const pageRefs=pages.map((_,i)=>`${5+i*2} 0 R`).join(' ');
 objs.push(`<< /Type /Pages /Kids [${pageRefs}] /Count ${pages.length} >>`);
 objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
 objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
 pages.forEach((content,i)=>{
   const pageObj=5+i*2,streamObj=6+i*2;
   objs.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${streamObj} 0 R >>`);
   const len=bytes(content).length;
   objs.push(`<< /Length ${len} >>\nstream\n${content}\nendstream`);
 });
 const blob=buildPdf(objs), name=safeFileName(checkLabel(s))+'-Bericht-'+new Date(s.started).toISOString().slice(0,10)+'.pdf';
 const file=new File([blob],name,{type:'application/pdf'});
 const apple=/Mac|iPhone|iPad|iPod/.test(navigator.platform)||navigator.userAgent.includes('Mac OS X');
 if(apple&&navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
   try{await navigator.share({files:[file],title:checkLabel(s)+' Bericht'});return}catch(err){if(err?.name==='AbortError')return}
 }
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
};
})();
