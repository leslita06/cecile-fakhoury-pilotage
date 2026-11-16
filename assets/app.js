(function(){
'use strict';
var D=null, S={per:'12m',lieu:'all',art:'all',ach:'all',dev:'EUR',all:false};
var LIEUX=['Abidjan','Dakar','Paris','Foires'];
var COUL={Abidjan:'#111111',Dakar:'#8C6D46',Paris:'#9A9890',Foires:'#C9BFAE'};
var MOIS=['janv.','févr.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.'];
var charts={};
function $(id){return document.getElementById(id)}
function nf(x,d){return x.toLocaleString('fr-FR',{minimumFractionDigits:d||0,maximumFractionDigits:d||0}).replace(/\u202f/g,'\u00a0')}
function money(e,full){
  if(S.dev==='XOF'){var f=e*D.taux_fcfa;
    if(f>=1e9) return nf(f/1e9,2)+'\u00a0Md FCFA';
    if(f>=1e6) return nf(f/1e6,f>=1e8?0:1)+'\u00a0M FCFA';
    return nf(f/1e3,0)+'\u00a0k FCFA';}
  if(full) return nf(e)+'\u00a0€';
  if(e>=1e6) return nf(e/1e6,2)+'\u00a0M€';
  if(e>=1e4) return nf(e/1e3,0)+'\u00a0k€';
  return nf(e)+'\u00a0€';
}
function bigMoney(e){ // valeur + unité séparées pour les gros chiffres
  var s=money(e); var m=s.match(/^([\d\s\u00a0,]+)\u00a0(.*)$/); return m?m[1]+'<small>'+m[2]+'</small>':s;
}
function addM(ym,k){var y=+ym.slice(0,4),m=+ym.slice(5,7)-1+k;y+=Math.floor(m/12);m=((m%12)+12)%12;return y+'-'+String(m+1).padStart(2,'0')}
function range(per){
  if(per==='12m') return {a:'2025-11',b:'2026-10',pa:'2024-11',pb:'2025-10',lab:'sur les 12 derniers mois',cmp:'vs 12 mois précédents'};
  if(per==='2026') return {a:'2026-01',b:'2026-10',pa:'2025-01',pb:'2025-10',lab:'de janvier à octobre 2026',cmp:'vs janv.-oct. 2025'};
  if(per==='2025') return {a:'2025-01',b:'2025-12',pa:null,lab:'en 2025',cmp:''};
  return {a:'2025-01',b:'2026-10',pa:null,lab:'de janvier 2025 à octobre 2026',cmp:''};
}
function mlist(a,b){var o=[],m=a;while(m<=b){o.push(m);m=addM(m,1)}return o}
function mlab(ym,short){var m=MOIS[+ym.slice(5,7)-1];return short?m.replace('.','')+(ym.slice(5,7)==='01'?' '+ym.slice(2,4):''):m+' '+ym.slice(0,4)}
function dfr(iso){var d=new Date(iso+'T12:00:00');return d.getDate()+(d.getDate()===1?'er':'')+' '+MOIS[d.getMonth()].replace('.','')+' '+d.getFullYear()}
function sales(a,b,ign){ign=ign||{};
  return D.ventes.filter(function(v){return v.mois>=a&&v.mois<=b&&(ign.lieu||S.lieu==='all'||v.lieu===S.lieu)&&(ign.art||S.art==='all'||v.artiste===S.art)&&(S.ach==='all'||v.acheteur===S.ach)})}
function sum(a,f){return a.reduce(function(s,x){return s+f(x)},0)}
function delta(c,p,pct){
  if(p===null||p===undefined) return '';
  if(!p) return '';
  var d=(c-p)/p*100, cl=d>=0?'up':'down';
  return '<span class="'+cl+'">'+(d>=0?'+':'\u2212')+nf(Math.abs(d),0)+'\u00a0%</span> ';
}
function expoMatch(e,r){
  var inP=e.debut.slice(0,7)<=r.b&&e.fin.slice(0,7)>=r.a;
  if(S.per==='12m'||S.per==='2026') inP=inP||e.en_cours;
  return inP&&(S.lieu==='all'||e.lieu===S.lieu)&&(S.art==='all'||e.artistes.indexOf(S.art)>=0||e.artiste===S.art);
}

function render(){
  var r=range(S.per), cur=sales(r.a,r.b), prev=r.pa?sales(r.pa,r.pb):null;
  var ca=sum(cur,function(v){return v.prix}), n=cur.length, pm=n?ca/n:0;
  var cap=prev?sum(prev,function(v){return v.prix}):null, np=prev?prev.length:null, pmp=prev&&np?cap/np:null;
  var ex=D.expos.filter(function(e){return expoMatch(e,r)}), vis=sum(ex,function(e){return e.visiteurs});
  var art=S.art!=='all'?' pour '+S.art:'', lieu=S.lieu==='all'?'dans les trois espaces et en foire':(S.lieu==='Foires'?'en foire':'à '+S.lieu);
  // Phrase de synthèse
  var parL={};cur.forEach(function(v){parL[v.lieu]=(parL[v.lieu]||0)+v.prix});
  var top=Object.keys(parL).sort(function(a,b){return parL[b]-parL[a]})[0];
  var ph='<b>'+money(ca,true)+'</b> de ventes '+lieu+art+' '+r.lab+', pour <b>'+nf(n)+' œuvre'+(n>1?'s':'')+'</b>';
  if(prev&&cap) ph+=', soit '+((ca-cap)>=0?'<b>+':'<b>\u2212')+nf(Math.abs((ca-cap)/cap*100),0)+'\u00a0%</b> sur un an';
  ph+='.';
  if(S.lieu==='all'&&top&&ca) ph+=' '+(top==='Foires'?'Les foires pèsent':top+' pèse')+' '+nf(parL[top]/ca*100,0)+'\u00a0% du total.';
  if(!n) ph='Aucune vente ne correspond à ces filtres '+r.lab+'.';
  $('phrase').innerHTML=ph;
  // KPI
  var k=[
    {l:'Chiffre d’affaires',v:bigMoney(ca),d:prev?delta(ca,cap)+r.cmp:'Ventes conclues, hors taxes'},
    {l:'Œuvres vendues',v:nf(n),d:prev?delta(n,np)+r.cmp:'Toutes techniques'},
    {l:'Prix moyen',v:bigMoney(pm),d:prev?delta(pm,pmp)+r.cmp:'Par œuvre vendue'},
    {l:'Visiteurs des expositions',v:nf(vis),d:ex.length+' exposition'+(ex.length>1?'s':'')+', vernissages compris'},
    {l:'Abonnés Instagram<span class="tag">Réel</span>',v:nf(D.instagram_reel.abonnes/1000,0)+'<small>k</small>',d:'Relevé public du '+D.instagram_reel.releve}
  ];
  $('kpis').innerHTML=k.map(function(x){return '<div class="kpi"><p class="l">'+x.l+'</p><p class="v">'+x.v+'</p><p class="d">'+x.d+'</p></div>'}).join('');
  renderLieux(r); renderMois(r); renderArtistes(r); renderFoires(r); renderExpos(r); renderInsta(r);
}
function renderLieux(r){
  var c=sales(r.a,r.b,{lieu:1}), p=r.pa?sales(r.pa,r.pb,{lieu:1}):null, tot=sum(c,function(v){return v.prix})||1;
  var mx=Math.max.apply(null,LIEUX.map(function(l){return sum(c.filter(function(v){return v.lieu===l}),function(v){return v.prix})}))||1;
  $('lieux').innerHTML=LIEUX.map(function(l){
    var vs=c.filter(function(v){return v.lieu===l}), ca=sum(vs,function(v){return v.prix});
    var pc=p?sum(p.filter(function(v){return v.lieu===l}),function(v){return v.prix}):null;
    var dim=S.lieu!=='all'&&S.lieu!==l?' dim':'';
    return '<div class="lieu'+dim+'" data-lieu="'+l+'"><span class="n"><i style="background:'+COUL[l]+'"></i>'+(l==='Foires'?'En foire':l)+'</span><span class="m">'+money(ca)+'</span>'+
      '<span class="s"><span>'+nf(vs.length)+' œuvres · '+nf(ca/tot*100,0)+'\u00a0% du total</span><span>'+(p?delta(ca,pc)+'sur un an':'')+'</span></span>'+
      '<span class="bar"><span style="width:'+(ca/mx*100)+'%;background:'+COUL[l]+'"></span></span></div>';
  }).join('');
  Array.prototype.forEach.call(document.querySelectorAll('.lieu'),function(el){el.onclick=function(){S.lieu=S.lieu===el.dataset.lieu?'all':el.dataset.lieu;$('f-lieu').value=S.lieu;render()}});
}
function renderMois(r){
  var ms=mlist(r.a,r.b), c=sales(r.a,r.b,{lieu:1});
  var ds=LIEUX.filter(function(l){return S.lieu==='all'||S.lieu===l}).map(function(l){
    return {label:l==='Foires'?'En foire':l,backgroundColor:COUL[l],borderWidth:0,barPercentage:.72,categoryPercentage:.9,
      data:ms.map(function(m){return sum(c.filter(function(v){return v.lieu===l&&v.mois===m}),function(v){return v.prix})*(S.dev==='XOF'?D.taux_fcfa:1)})}});
  var cfg={type:'bar',data:{labels:ms.map(function(m){return mlab(m,true)}),datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},
      plugins:{legend:{position:'bottom',align:'start',labels:{boxWidth:9,boxHeight:9,usePointStyle:true,pointStyle:'circle',color:'#4A4945',font:{family:'Inter',size:12},padding:16}},
        tooltip:{backgroundColor:'#111',titleFont:{family:'Inter',size:12},bodyFont:{family:'Inter',size:12},padding:10,cornerRadius:0,
          callbacks:{label:function(x){return ' '+x.dataset.label+' : '+money(x.raw/(S.dev==='XOF'?D.taux_fcfa:1))}}}},
      scales:{x:{stacked:true,grid:{display:false},border:{color:'#111'},ticks:{color:'#8A8780',font:{family:'Inter',size:11},maxRotation:0,autoSkipPadding:8}},
        y:{stacked:true,grid:{color:'#ECE9E2'},border:{display:false},ticks:{color:'#8A8780',font:{family:'Inter',size:11},maxTicksLimit:5,
          callback:function(v){return S.dev==='XOF'?nf(v/1e6,0)+' M':nf(v/1e3,0)+' k'}}}}}};
  if(charts.m){charts.m.destroy()} charts.m=new Chart($('c-mois'),cfg);
}
function renderArtistes(r){
  var c=sales(r.a,r.b,{art:1}), p=r.pa?sales(r.pa,r.pb,{art:1}):null, by={};
  c.forEach(function(v){var o=by[v.artiste]=by[v.artiste]||{ca:0,n:0,med:v.medium};o.ca+=v.prix;o.n++});
  var list=Object.keys(by).sort(function(a,b){return by[b].ca-by[a].ca});
  var mx=list.length?by[list[0]].ca:1, tot=sum(list,function(a){return by[a].ca})||1;
  var show=S.all?list:list.slice(0,12);
  $('artistes').innerHTML=show.length?show.map(function(a,i){
    var pc=p?sum(p.filter(function(v){return v.artiste===a}),function(v){return v.prix}):null;
    return '<div class="art'+(S.art===a?' sel':'')+'" data-a="'+a.replace(/"/g,'&quot;')+'"><span class="r">'+String(i+1).padStart(2,'0')+'</span><span class="an">'+a+'</span><span class="am">'+money(by[a].ca)+'</span>'+
      '<span class="ad"><span>'+by[a].n+' œuvre'+(by[a].n>1?'s':'')+' · '+by[a].med+'</span><span>'+nf(by[a].ca/tot*100,1)+'\u00a0%'+(p&&pc?' · '+delta(by[a].ca,pc).replace(/<[^>]+>/g,''):'')+'</span></span>'+
      '<span class="ab"><span style="width:'+(by[a].ca/mx*100)+'%"></span></span></div>'}).join(''):'<p class="empty">Aucune vente sur cette sélection.</p>';
  $('more').style.display=list.length>12?'':'none';
  $('more').textContent=S.all?'Afficher les 12 premiers':'Voir les '+list.length+' artistes';
  Array.prototype.forEach.call(document.querySelectorAll('.art'),function(el){el.onclick=function(){S.art=S.art===el.dataset.a?'all':el.dataset.a;$('f-art').value=S.art;render();window.scrollTo({top:0,behavior:'smooth'})}});
}
function renderFoires(r){
  var f=D.foires.filter(function(x){return x.mois>=r.a&&x.mois<=r.b&&(S.lieu==='all'||S.lieu==='Foires')});
  var rows=f.map(function(x){
    var vs=D.ventes.filter(function(v){return v.foire===x.edition&&(S.art==='all'||v.artiste===S.art)&&(S.ach==='all'||v.acheteur===S.ach)});
    return {x:x,n:vs.length,ca:sum(vs,function(v){return v.prix})}});
  if(S.art!=='all') rows=rows.filter(function(o){return o.n>0||o.x.artistes.indexOf(S.art)>=0});
  var mx=Math.max.apply(null,rows.map(function(o){return o.ca}).concat([1]));
  var h='<thead><tr><th>Foire</th><th>Ventes</th><th>Œuvres</th><th>Coût du stand</th><th>Ventes / coût</th><th>Contacts</th><th>Nouveaux acheteurs</th></tr></thead><tbody>';
  if(!rows.length) h+='<tr><td colspan="7" class="empty">Aucune foire sur cette sélection.</td></tr>';
  rows.forEach(function(o){var x=o.x,full=S.art==='all'&&S.ach==='all';
    h+='<tr><td class="t">'+x.edition+'<small>'+x.ville+' · '+dfr(x.date)+'</small></td><td><span class="minibar"><span style="width:'+(o.ca/mx*100)+'%"></span></span>'+money(o.ca)+'</td><td>'+o.n+'</td><td>'+money(x.cout)+'</td><td>'+(full?nf(o.ca/x.cout,1)+'\u00a0×':'·')+'</td><td>'+(full?x.contacts:'·')+'</td><td>'+(full?x.nouveaux:'·')+'</td></tr>'});
  if(rows.length>1){var ca=sum(rows,function(o){return o.ca}),co=sum(rows,function(o){return o.x.cout}),full=S.art==='all'&&S.ach==='all';
    h+='<tr class="tot"><td>Total</td><td>'+money(ca)+'</td><td>'+sum(rows,function(o){return o.n})+'</td><td>'+money(co)+'</td><td>'+(full?nf(ca/co,1)+'\u00a0×':'·')+'</td><td>'+(full?sum(rows,function(o){return o.x.contacts}):'·')+'</td><td>'+(full?sum(rows,function(o){return o.x.nouveaux}):'·')+'</td></tr>'}
  $('t-foires').innerHTML=h+'</tbody>';
}
function renderExpos(r){
  var now=D.expos.filter(function(e){return e.en_cours})[0];
  if(now){$('expo-now').innerHTML='<div><p class="big">'+nf(now.visiteurs)+'</p></div><div><p class="t">'+now.titre+'</p><p class="s">'+now.artiste+' · '+now.lieu+' · en cours depuis le '+dfr(now.debut)+', jusqu’au '+dfr(now.fin)+'<br>visiteurs du 5 au 14 novembre, dont '+nf(now.vernissage)+' au vernissage · ventes comptées à l’arrêté de fin novembre</p></div>';$('expo-now').style.display=''}
  var ex=D.expos.filter(function(e){return expoMatch(e,r)}).sort(function(a,b){return b.debut<a.debut?-1:1});
  var mx=Math.max.apply(null,ex.map(function(e){return e.visiteurs}).concat([1]));
  var h='<thead><tr><th>Exposition</th><th>Visiteurs</th><th>Par jour d’ouverture</th><th>Vernissage</th><th>Groupes scolaires</th><th>Œuvres vendues</th><th>Ventes</th></tr></thead><tbody>';
  if(!ex.length) h+='<tr><td colspan="7" class="empty">Aucune exposition sur cette sélection.</td></tr>';
  ex.forEach(function(e){h+='<tr><td class="t">'+e.titre+(e.en_cours?'<span class="pill">En cours</span>':'')+'<small>'+e.artiste+' · '+e.lieu+' · '+dfr(e.debut)+' au '+dfr(e.fin)+'</small></td><td><span class="minibar"><span style="width:'+(e.visiteurs/mx*100)+'%"></span></span>'+nf(e.visiteurs)+'</td><td>'+nf((e.visiteurs-e.vernissage)/Math.max(e.jours,1),0)+'</td><td>'+nf(e.vernissage)+'</td><td>'+e.scolaires+'</td><td>'+(e.en_cours?'·':e.ventes)+'</td><td>'+(e.en_cours?'·':money(e.ca))+'</td></tr>'});
  $('t-expos').innerHTML=h+'</tbody>';
}
function renderInsta(r){
  var b=S.per==='12m'||S.per==='2026'?'2026-11':r.b;
  var a0=S.per==='12m'?addM(r.a,1):r.a;
  var ig=D.instagram.filter(function(x){return x.mois>=a0&&x.mois<=b});
  $('ig-ab').textContent=nf(D.instagram_reel.abonnes);$('ig-rel').textContent=D.instagram_reel.releve;
  var g=sum(ig,function(x){return x.gain}), po=sum(ig,function(x){return x.portee})/Math.max(ig.length,1), en=sum(ig,function(x){return x.engagement})/Math.max(ig.length,1);
  $('ig-mini').innerHTML='<div><p class="v">+'+nf(g)+'</p><p class="l">nouveaux abonnés '+r.lab+' <span class="tag">Exemple</span></p></div><div><p class="v">'+nf(po/1000,0)+'\u00a0k</p><p class="l">comptes touchés par mois, en moyenne <span class="tag">Exemple</span></p></div><div><p class="v">'+nf(en,1)+'\u00a0%</p><p class="l">taux d’engagement moyen <span class="tag">Exemple</span></p></div>';
  var cfg={type:'line',data:{labels:ig.map(function(x){return mlab(x.mois,true)}),datasets:[{data:ig.map(function(x){return x.abonnes}),borderColor:'#111',borderWidth:1.6,pointRadius:ig.map(function(x,i){return i===ig.length-1?4:0}),pointBackgroundColor:'#111',tension:.25,fill:{target:'origin'},backgroundColor:'rgba(17,17,17,.04)'}]},
    options:{responsive:true,maintainAspectRatio:false,animation:{duration:300},plugins:{legend:{display:false},tooltip:{backgroundColor:'#111',cornerRadius:0,padding:10,displayColors:false,callbacks:{label:function(x){return nf(x.raw)+' abonnés'+(x.dataIndex===ig.length-1?' (relevé réel)':' (exemple)')}}}},
      scales:{x:{grid:{display:false},border:{color:'#111'},ticks:{color:'#8A8780',font:{family:'Inter',size:11},maxRotation:0,autoSkipPadding:8}},y:{grid:{color:'#ECE9E2'},border:{display:false},ticks:{color:'#8A8780',font:{family:'Inter',size:11},maxTicksLimit:5,callback:function(v){return nf(v/1000,0)+' k'}}}}}};
  if(charts.i){charts.i.destroy()} charts.i=new Chart($('c-ig'),cfg);
  $('themes').innerHTML=D.themes.map(function(t){return '<div class="th"><p class="v">'+t.part+'\u00a0%</p><p class="n">'+t.theme+'</p><p class="e">des publications · engagement '+nf(t.engagement,1)+'\u00a0%</p></div>'}).join('');
}
function bind(){
  var arts={};D.ventes.forEach(function(v){arts[v.artiste]=1});
  Object.keys(arts).sort(function(a,b){return a.localeCompare(b,'fr')}).forEach(function(a){var o=document.createElement('option');o.value=o.textContent=a;$('f-art').appendChild(o)});
  $('f-per').onchange=function(){S.per=this.value;render()};
  $('f-lieu').onchange=function(){S.lieu=this.value;render()};
  $('f-art').onchange=function(){S.art=this.value;render()};
  $('f-ach').onchange=function(){S.ach=this.value;render()};
  $('more').onclick=function(){S.all=!S.all;renderArtistes(range(S.per))};
  Array.prototype.forEach.call(document.querySelectorAll('[data-dev]'),function(b){b.onclick=function(){S.dev=b.dataset.dev;Array.prototype.forEach.call(document.querySelectorAll('[data-dev]'),function(x){x.classList.toggle('on',x===b)});render()}});
  $('raz').onclick=function(){S={per:'12m',lieu:'all',art:'all',ach:'all',dev:S.dev,all:false};$('f-per').value='12m';$('f-lieu').value='all';$('f-art').value='all';$('f-ach').value='all';render()};
  $('arrete').textContent=D.arrete;
}
Chart.defaults.font.family='Inter';
fetch('data/donnees.json?v=20261116c').then(function(r){return r.json()}).then(function(j){D=j;bind();render()})
 .catch(function(){$('phrase').textContent='Les données n’ont pas pu être chargées. Recharger la page.'});
})();
