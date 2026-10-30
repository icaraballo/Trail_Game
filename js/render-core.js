// ═══════════════════════════════════════════════════════════════════════════
//  RENDER · NÚCLEO — chasis compartido por los cinco modos
// ═══════════════════════════════════════════════════════════════════════════
// T53 (v92): render.js había llegado a 4.252 líneas y 143 declaraciones de nivel
// raíz, con once responsabilidades dentro. Era donde acababa el código de
// cualquier pantalla nueva por pura gravedad. Partido en tres por tema.
//
// Aquí vive lo que usan TODOS los modos:
//   · utilidades de formato y de pintado (fmt, esc, topBar, progBar, raceStats…)
//   · el chrome: barra de finanzas, pestañas, avisos, overlays y tutorial
//   · el router — render() y la tabla de rutas
//   · las pantallas comunes: logros, ranuras de guardado, selección de modo, intro
//
// Los tres ficheros comparten un único ámbito global, como todos los .js del
// proyecto: no hay módulos ni bundler, así que partir el fichero no cambia qué
// ve cada función. Lo único que importa es el orden de carga de index.html, y
// dentro de estos tres no hay ninguna sentencia de nivel raíz que dependa de
// otra (solo tres declaraciones, y las tres son literales).

function checkAndUnlockAchievements(){
  if(!G.unlockedAchievements)G.unlockedAchievements=[];
  if(!G.achievementMeta)G.achievementMeta={};
  const newUnlocks=[];
  const diff=G.gameMode==='canicross'?'canicross':(G.gameMode||'medio');
  ACHIEVEMENTS.forEach(ach=>{
    if(!G.unlockedAchievements.includes(ach.id)&&ach.check()){
      G.unlockedAchievements.push(ach.id);
      G.achievementMeta[ach.id]={difficulty:diff,year:G.year||G.cnSeason||1};
      newUnlocks.push(ach);
    }
  });
  if(newUnlocks.length>0){
    let globalAchs={};
    try{globalAchs=JSON.parse(LS.get('globalAchs')||'{}');}catch(e){}
    newUnlocks.forEach(ach=>{
      if(!globalAchs[ach.id])globalAchs[ach.id]={difficulty:diff,year:G.year||G.cnSeason||1};
      if(ach.rarity==='joke'){
        showToast(`😄 Logro: ${ach.label}`);
      } else {
        showToast(`🏆 Logro: ${ach.label}`);
      }
    });
    LS.set('globalAchs',JSON.stringify(globalAchs));
  }
  return newUnlocks;
}
function renderAchievements(){
  const el=$main();
  if(!G._achF)G._achF={mode:'all',rarity:'all',status:'all',tab:'all'};
  if(!G._achF.tab)G._achF.tab='all';
  const f=G._achF;
  let globalAchs={};
  try{globalAchs=JSON.parse(LS.get('globalAchs')||'{}');}catch(e){}
  // Paso 6 de la dirección visual (2026-10-30): tipo Lista (§ 2 Comunes): la rareza como escala
  // de grises (más rara, más oscura), no como colores; filtros como chips. Sin hex.
  const RARITY={easy:{l:'Fácil',st:'border:1px solid var(--line2);color:var(--ink2)'},medium:{l:'Medio',st:'background:var(--tier-regional);color:var(--ink)'},
    hard:{l:'Difícil',st:'background:var(--tier-nacional);color:var(--card)'},legendary:{l:'Legendario',st:'background:var(--tier-elite);color:var(--card)'},joke:{l:'😄 Secreto',st:'border:1px dashed var(--line2);color:var(--ink2)'}};
  const rb=a=>{const r=RARITY[a.rarity]||{l:'',st:''};return`<span class="pz-chip" style="${r.st};margin:0">${r.l}</span>`;};
  const totalUnlocked=Object.keys(globalAchs).length;
  let list=ACHIEVEMENTS.filter(a=>{
    if(f.tab==='normal'&&a.mode)return false;
    if(f.tab==='expres'&&a.mode!=='expres')return false;
    if(f.tab==='cn'&&a.mode!=='cn')return false;
    if(f.rarity!=='all'&&a.rarity!==f.rarity)return false;
    const isUnlocked=!!globalAchs[a.id];
    if(f.status==='unlocked'&&!isUnlocked)return false;
    if(f.status==='pending'&&isUnlocked)return false;
    return true;
  });
  const chip=(label,field,val)=>`<button class="pz-chip" onclick="G._achF.${field}='${val}';render()" style="cursor:pointer;margin:0;${f[field]===val?'background:var(--ink);color:var(--card);border:1px solid var(--ink)':'background:var(--card);border:1px solid var(--line2);color:var(--ink2)'}">${label}</button>`;
  const tabBtn=(label,val)=>{const active=f.tab===val;return`<button onclick="G._achF.tab='${val}';render()" style="flex:1;padding:10px 6px;border:none;border-bottom:2.5px solid ${active?'var(--acc)':'transparent'};background:transparent;color:${active?'var(--ink)':'var(--ink3)'};font:inherit;font-size:14px;font-weight:${active?'600':'500'};cursor:pointer">${label}</button>`;};
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div><div class="pz-titulo" style="margin:0">🏅 Logros</div><div class="pz-efectos"><span class="pz-num">${totalUnlocked}</span> de ${ACHIEVEMENTS.length} conseguidos</div></div>
      <button class="pz-btn sec" style="width:auto;padding:7px 12px;margin:0" onclick="G.screen=G._achPrev||'modeSelect';if(G._achPrevTab)G.activeTab=G._achPrevTab;render()">← Volver</button>
    </div>
    <div style="display:flex;border-bottom:1px solid var(--line);margin:12px 0">${tabBtn('Todos','all')}${tabBtn('Carrera','normal')}${tabBtn('Exprés','expres')}${tabBtn('Canicross','cn')}</div>
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:6px">Rareza</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">${chip('Todos','rarity','all')}${chip('Fácil','rarity','easy')}${chip('Medio','rarity','medium')}${chip('Difícil','rarity','hard')}${chip('Legendario','rarity','legendary')}${chip('😄 Secreto','rarity','joke')}</div>
      <div class="pz-label" style="margin-bottom:6px">Estado</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">${chip('Todos','status','all')}${chip('Conseguidos','status','unlocked')}${chip('Pendientes','status','pending')}</div>
    </div>
    <div class="pz-efectos" style="margin-bottom:8px">${list.length} logro${list.length!==1?'s':''} encontrado${list.length!==1?'s':''}</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${list.length===0?`<div class="pz-efectos" style="padding:20px;text-align:center">Sin logros con estos filtros</div>`:
      list.map(ach=>{
        const meta=globalAchs[ach.id];
        const unlocked=!!meta;
        const isJoke=ach.rarity==='joke';
        const isHardDiff=unlocked&&(meta.difficulty==='dificil'||meta.difficulty==='hardcore');
        const modeIcon=f.tab==='all'?(ach.mode==='cn'?'🐕 ':ach.mode==='expres'?'⚡ ':'🏃 '):'';
        return`<div class="pz-fila" style="align-items:flex-start;${!unlocked?'color:var(--ink3)':''}">
          <span style="font-size:18px;margin-top:1px;${unlocked?'':'opacity:.5'}">${unlocked?'🏆':'🔒'}</span>
          <span class="pz-fila-txt">
            <span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b>${modeIcon}${unlocked||!isJoke?esc(ach.label):'???'}</b>${rb(ach)}${ach.excl?'<span class="pz-chip" style="margin:0;border:1px solid var(--line2)">Exclusivo</span>':''}${isHardDiff?'<span class="pz-chip" style="margin:0;border:1.5px solid var(--acc)">En difícil</span>':''}</span>
            <div class="pz-efectos">${unlocked||!isJoke?esc(ach.desc):'???'}</div>
            ${meta?`<div class="pz-efectos">Conseguido en ${MODE_LABELS[meta.difficulty]?modeLabelFull(meta.difficulty):meta.difficulty} · año ${meta.year}</div>`:''}
          </span>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}
// H15-bis (v95): la barra pintaba siempre G.year y el calendario de Clásico. En
// Entrenador —suelto o en Carrera de Vida— y en Canicross ese año no avanza nunca,
// así que el contador se quedaba congelado toda la partida.
function seasonMonthLabel(){
  const M=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  if(coachViewActive()){
    const cr=(G.coachSelectedRaces||[])[G.coachRaceIdx||0];
    return 'A'+(G.coachSeason||1)+' · '+(cr?M[cr.month||1]:'—');
  }
  if(G.canicrossMode)return 'A'+(G.cnSeason||1)+' · '+M[cnMonth()];
  const curRace=G.selectedRaces&&G.selectedRaces[G.currentRaceIdx||0];
  return 'A'+G.year+' · '+(curRace?M[curRace.month||1]:(['','T1','T2','T3','T4'][G.currentQuarter||1]));
}
// ══════════════════════════════════════
//  CHASIS (v102 · dirección visual)
// ══════════════════════════════════════
// Vault: Diseño/TG-Direccion-Visual § 3-4. Iconos de línea del chasis (trazo 1,9,
// color heredado por currentColor, clase .ico de index.html). Solo trazados: ningún
// color aquí, para que la regla de hex de content.js no tenga nada que contar.
const ICONOS={
  temporada:'<path d="M3 19.5l5.5-9 3.5 5 2.5-3.5 6.5 7.5z"/><path d="M8.5 10.5l1.5-2.5 1.5 2.5"/>',
  calendario:'<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M9 3.5v4M15 3.5v4"/>',
  finanzas:'<rect x="3.5" y="6.5" width="17" height="12.5" rx="2"/><path d="M3.5 10h17M15.5 14.5h2"/>',
  corredor:'<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 3.8-6 7-6s6 2 7 6"/>',
  reputacion:'<path d="M12 3.8l2.5 5.1 5.6.8-4.1 4 1 5.6-5-2.7-5 2.7 1-5.6-4.1-4 5.6-.8z"/>',
  perro:'<circle cx="8" cy="8.5" r="1.7"/><circle cx="16" cy="8.5" r="1.7"/><circle cx="4.8" cy="12.8" r="1.5"/><circle cx="19.2" cy="12.8" r="1.5"/><path d="M12 12c-2.8 0-4.8 3-4.8 5.3 0 1.5 1.4 2 2.4 1.6.9-.4 1.5-.6 2.4-.6s1.5.2 2.4.6c1 .4 2.4-.1 2.4-1.6 0-2.3-2-5.3-4.8-5.3z"/>',
  equipo:'<path d="M7 9a5 5 0 0110 0v10a1 1 0 01-1 1H8a1 1 0 01-1-1z"/><path d="M10 4.5V3.5h4v1M7 13.5h10M10.5 13.5v3h3v-3"/>',
  entrenador:'<rect x="5" y="4.5" width="14" height="16" rx="2"/><path d="M9 3.5h6v2.5H9zM8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
  guardar:'<path d="M5.5 4h10.5l3 3v12a1 1 0 01-1 1H6.5a1 1 0 01-1-1z"/><path d="M8.5 4v4.5h6.5V4M8.5 20v-6h7v6"/>',
  aviso:'<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.3v.2"/>',
  candado:'<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  bombilla:'<path d="M9 18h6M10 21h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
};
// Piezas de pantalla del sistema (paso 6). El consejo sale abierto; «Entendido» lo pliega a
// «Ver consejo» y se recuerda por consejo en este navegador (preferencia de quien juega, no
// de la partida: no va en G).
function consejoCerrado(id){try{return LS.get('consejo_'+id)==='1';}catch(e){return false;}}
window.toggleConsejo=id=>{try{LS.set('consejo_'+id,consejoCerrado(id)?'0':'1');}catch(e){}render();};
function consejoHTML(id,negrita,resto){
  if(consejoCerrado(id))return `<div class="pz-consejo plegado" onclick="toggleConsejo('${id}')">${icono('bombilla')}Ver consejo</div>`;
  return `<div class="pz-consejo">${icono('bombilla')}<div><span class="pz-label" style="display:block;margin-bottom:2px">Consejo</span><b>${negrita}</b> ${resto||''}<br><button class="pz-consejo-ok" onclick="toggleConsejo('${id}')">Entendido</button></div></div>`;
}
// Nivel de carrera en escala de grises (§ 2 *Terreno*): local con borde, regional claro,
// nacional y élite oscuros. Más prestigio, más oscuro.
function nivelTag(tier,label){
  if(typeof tier==='number')tier=['local','local','regional','nacional','elite'][tier]||'elite';   // tiers 1-4 (sponsors)
  const st={local:'border:1px solid var(--line2);color:var(--ink2)',regional:'background:var(--tier-regional);color:var(--ink)',
    nacional:'background:var(--tier-nacional);color:var(--card)',elite:'background:var(--tier-elite);color:var(--card)'}[tier]||'border:1px solid var(--line2)';
  return `<span class="pz-chip" style="${st};margin:0">${label||TIER_LABEL_RACE[tier]||''}</span>`;
}
function motivoHTML(txt){return `<div class="pz-motivo">${icono('candado')}${txt}</div>`;}
function icono(k){return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[k]||''}</svg>`;}
// Cifras del chasis: «€1.800», «−€50». Separador de miles a mano: toLocaleString('es-ES')
// no agrupa los números de cuatro cifras («1800»).
function fmtMiles(n){return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function fmtEur(n,signo){return (n<0?'−':signo&&n>0?'+':'')+'€'+fmtMiles(n);}
// Qué acento lleva el chasis (data-modo en <html>, lo lee el CSS de los tokens).
// Solo lee G: pintar no cambia la partida.
function chasisModo(){
  if(G.canicrossMode||G.gameMode==='canicross')return 'canicross';
  // Backyard y Ultra comparten acento: serán el mismo modo cuando llegue la carcasa
  if(G.gameMode==='backyard'||G.gameMode==='ultra'||(typeof G.screen==='string'&&/^(by|ut)[A-Z]/.test(G.screen)))return 'backyard';
  if(G.carreraVida&&G.lifecyclePhase==='club')return 'club';
  if(typeof G.screen==='string'&&G.screen.startsWith('club')&&G.screen!=='clubSetup')return 'club';
  if(coachViewActive())return 'entrenador';
  if(G.gameMode==='expres')return 'expres';
  return 'clasico';
}
const DIFICULTADES={facil:['Fácil',1],medio:['Medio',2],dificil:['Difícil',3],hardcore:['Hardcore',4]};
function aplicarModoChasis(){
  const root=document.documentElement;
  if(!root)return;   // banco de pruebas: su document no tiene <html>
  const m=chasisModo();
  if(root.dataset.modo!==m)root.dataset.modo=m;
  // La noche del Backyard oscurece la pantalla redefiniendo los tokens (TG-Orden § Paso 5)
  const noche=(typeof byNocheAhora==='function'&&byNocheAhora())||(typeof ultraNocheAhora==='function'&&ultraNocheAhora())?'1':'';
  if((root.dataset.noche||'')!==noche){if(noche)root.dataset.noche=noche;else delete root.dataset.noche;}
}
function updateFinBar(){
  const bar=document.getElementById('fin-bar');
  if(!bar)return;
  // paso 6: en carrera la sustituye la cabecera de carrera (TG-Direccion-Visual § 4)
  const screens=['intro','workSetup','canicrossAntigua','modeSelect','saveScreen','segment','aid','midRaceEvent',
    'byMenu','byPre','byBell','byLoop','byCorral','byEnd','utPre','utBloque','utBolsa','utFin'];   // Backyard y Ultra no tienen dinero   // la mañana de carrera sí lleva la barra (el dinero importa)
  bar.style.display=screens.includes(G.screen)?'none':'block';
  aplicarModoChasis();
  // T103 (v88): el saldo se pintaba de Canicross y el neto/mes seguía saliendo de
  // monthlyNet(), que calcula sobre la economía de Clásico. En Canicross el único
  // gasto recurrente es la manutención del perro, cobrada cada 4 semanas.
  const net=G.canicrossMode?-(typeof cnMonthlyDogCost==='function'?cnMonthlyDogCost():0):monthlyNet();
  // T145 (v91): fb-debt sí se comprobaba y estos dos no, en la misma función.
  const mb=document.getElementById('fb-money');
  if(mb)mb.textContent=fmtEur(G.canicrossMode?(G.cnMoney||0):G.money);
  const nb=document.getElementById('fb-net');
  if(nb){
    nb.textContent=fmtEur(net,true)+'/mes';
    nb.className='fin-sub '+(net>0?'green':net<0?'red':'neutral');
  }
  // v102: etiqueta de dificultad, fija en la barra. Solo en las cuatro dificultades:
  // Exprés, Canicross y los modos sueltos de Entrenador y Club no tienen.
  const df=document.getElementById('fb-diff');
  if(df){
    const d=DIFICULTADES[G.gameMode];
    df.hidden=!d||G.canicrossMode;
    if(d&&df.dataset.d!==G.gameMode){
      df.dataset.d=G.gameMode;
      df.className='dif-tag dif-'+G.gameMode;
      df.title='Dificultad: '+d[0];
      df.innerHTML=`<span class="dif-bars" aria-hidden="true">${[1,2,3,4].map(i=>`<i${i<=d[1]?' class="on"':''}></i>`).join('')}</span><span class="dif-name">${d[0]}</span>`;
    }
  }
  // T29 (v86): la deuda a la vista en todo momento — señal pasiva, sin interrumpir.
  const dc=document.getElementById('fb-debt-cell');
  const dv=document.getElementById('fb-debt');
  if(dc&&dv){
    const debt=G.debt||0;
    dc.style.display=debt>0?'':'none';
    if(debt>0){
      dv.textContent=fmtEur(-debt);
      const cfg=modeCfg().bankruptcy||{soft:500,hard:null};
      dc.title=G.forcedFullTime
        ?(cfg.hard!=null?`Jornada completa forzosa hasta saldar. Si la deuda llega a €${cfg.hard} se acaba la carrera deportiva.`
                        :'Jornada completa forzosa hasta saldar la deuda.')
        :`Números rojos: −3 mental por temporada. A partir de €${cfg.soft} vuelves a jornada completa y se cancela el staff.`;
    }
  }
  document.getElementById('fb-year').textContent=seasonMonthLabel();   // H15-bis (v95)
  document.getElementById('fb-rank').textContent=G.ranking<900?'#'+G.ranking:'—';
  const sr=document.getElementById('fb-specrank');
  if(sr)sr.textContent=G.specRanking<900?'#'+G.specRanking:'—';
  // T06 (v82): aviso permanente si el guardado está fallando. Un toast se pisa
  // con los otros cinco que se encolan al terminar una carrera; esto se queda.
  const sv=document.getElementById('fb-save');
  const svc=document.getElementById('fb-save-cell');
  if(sv&&svc){
    const failed=!!G._saveFailed;
    // v102: icono de línea; el ⚠ de guardado fallido sigue aquí, en rojo
    const k=failed?'aviso':'guardar';
    if(sv.dataset.k!==k){sv.dataset.k=k;sv.innerHTML=icono(k);}
    svc.className='fin-save'+(failed?' red':'');
    svc.title=failed?'No se pudo guardar: el almacenamiento del navegador está lleno. Exporta la partida a texto para no perderla.'
                    :'Guardar partida';
    svc.setAttribute('aria-label',failed?'Sin guardar: '+svc.title:'Guardar partida');
  }
  // T10 (v82): durante la carrera la celda 💾 se oculta. Guardar ya estaba
  // bloqueado en saveCurrentToSlot(), pero el onclick cambiaba G.screen igual y
  // la pantalla de guardado solo vuelve a modeSelect: se perdía la carrera.
  if(svc)svc.style.display=RACE_SCREENS.includes(G.screen)?'none':'';
}

// ══════════════════════════════════════
//  HELPERS GENERALES
// ══════════════════════════════════════
function fmt(s){s=Math.round(s);const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return h>0?h+'h '+pad(m)+'m '+pad(ss)+'s':pad(m)+'m '+pad(ss)+'s';}
function pad(n){return String(n).padStart(2,'0');}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
// v102 (chasis): barras con tokens. Energía, hidratación y piernas en azul (Cuerpo);
// ámbar o rojo solo cuando bajan. El segundo parámetro (color) ya no se usa.
function rbar(v){const p=Math.max(0,Math.min(100,Math.round(v)));const c=p>50?'var(--cuerpo)':p>25?'var(--avi-bar)':'var(--neg)';return `<div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c}"></div></div>`;}
function srow(label,val){const p=Math.max(0,Math.min(100,Math.round(val)));const c=p>=70?'var(--pos)':p>=50?'var(--cuerpo)':p>=35?'var(--avi-bar)':'var(--neg)';return `<div class="bar-row"><span class="bar-label">${label}</span><div class="bar-track"><div class="bar-fill" style="width:${p}%;background:${c}"></div></div><span class="bar-pct">${Math.round(val)}</span></div>`;}
function raceStats(){const r=G.runner;return `<div class="card">${[['Energía',r.energy],['Hidratación',r.hydration],['Piernas',r.legs]].map(([l,v])=>`<div class="bar-row"><span class="bar-label" style="color:${v<25?'var(--neg)':'var(--ink2)'}">${l}${v<25?' ⚠':''}</span>${rbar(v)}<span class="bar-pct" style="color:${v<25?'var(--neg)':'var(--ink)'}">${Math.round(v)}%</span></div>`).join('')}</div>`;}
function progBar(){const segs=curSegs();const done=segs.slice(0,G.seg).reduce((a,s)=>a+s.km,0);const total=segs.reduce((a,s)=>a+s.km,0);const pct=total>0?Math.round(done/total*100):0;return `<div class="prog-wrap"><div class="prog-meta"><span>${done}km hechos</span><span>${total-done}km restantes</span></div><div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div></div>`;}
function topBar(){const race=G.selectedRaces[G.currentRaceIdx];return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:12px;color:var(--ink3)">${race?.name||''} · ${G.seg+1}/${curSegs().length}</span><span style="font-size:13px;font-weight:600">${fmt(G.time)}</span></div>`;}
// T102 (v88): sin optional chaining sobre statBonus, un sponsor o club sin ese
// campo lanzaba TypeError en una función que corre en cada tramo de carrera.
function getEffStat(k){let b=0;Object.values(G.sponsors||{}).forEach(sp=>{if(sp?.statBonus?.[k])b+=sp.statBonus[k];});if(G.club?.statBonus?.[k])b+=G.club.statBonus[k];if(G.spending?.suplementos&&k==='nutricion')b+=3;
  // T15 (v89): calentamiento y momentum mental se suman aquí, al vuelo. El
  // suelo de 10 replica el que aplicaba initRace() al hornearlos en el stat.
  b+=G.raceModifiers?.[k]||0;
  return Math.max(10,Math.min(100,(G.runner?.stats?.[k]||0)+b));}

function hbar(val,max,col){const p=Math.round(val/max*100);return `<div class="bar-track" style="height:8px"><div class="bar-fill" style="width:${p}%;background:${col}"></div></div>`;}
function updateTabNav(){
  const nav=document.getElementById('tab-nav');
  if(!nav)return;
  const show=SCREENS_WITH_TABS.includes(G.screen);
  nav.style.display=show?'block':'none';
  const isExpres=G.gameMode==='expres';
  const isCoach=coachViewActive();   // H15-bis (v95) · BUG-08: también el lado Entrenador del solapamiento
  const isCanicross=G.gameMode==='canicross';
  if(isExpres&&G.activeTab==='fame')G.activeTab='game';
  aplicarModoChasis();
  // v102: sin Finanzas en carrera (TG-Direccion-Visual § 4). Si ya estaba abierta al
  // entrar, se deja a la vista para no esconder la pestaña en la que estás.
  const enCarrera=RACE_SCREENS.includes(G.screen);
  // v102: [icono, etiqueta] por pestaña y modo. Iconos de línea en lugar de emojis.
  const TABS=isCanicross
    ?{game:['corredor','Corredor'],calendar:['calendario','Calendario'],finances:['finanzas','Finanzas'],runner:['perro','Perro'],fame:['equipo','Equipo']}
    :{game:['temporada','Temporada'],calendar:['calendario','Calendario'],finances:['finanzas','Finanzas'],
      runner:['corredor',isCoach?'Atleta':'Corredor'],fame:['reputacion','Reputación']};
  ['game','calendar','finances','runner','fame'].forEach(t=>{
    const btn=document.getElementById('tab-'+t);
    if(!btn)return;
    btn.className='tab-btn'+(G.activeTab===t?' active':'');
    const oculta=(t==='fame'&&isExpres&&!isCanicross)||(t==='finances'&&enCarrera&&G.activeTab!=='finances');
    btn.style.display=oculta?'none':'';
    const [ico,label]=TABS[t];
    const iconEl=btn.querySelector('.tab-icon');
    const labelEl=btn.querySelector('.tab-label');
    if(iconEl&&iconEl.dataset.k!==ico){iconEl.dataset.k=ico;iconEl.innerHTML=icono(ico);}
    if(labelEl&&labelEl.textContent!==label)labelEl.textContent=label;
  });
}

window.switchTab=t=>{
  G.activeTab=t;
  render();
};

// Modo desarrollador (?dev=1) — implementado en js/devmode.js, no aquí.
// renderDevPanel() y las funciones window.devXxx viven allí para no mezclar
// código de testing con el código real del juego.

// ══════════════════════════════════════
//  FEEDBACK VISUAL — TOAST
// ══════════════════════════════════════
// BUG-04 (v96): un solo aviso a la vez y cada uno pisaba al anterior. Varios logros
// desbloqueados juntos dejaban ver solo el último, y un aviso emitido justo después
// («✅ Decisiones aplicadas» tras «Sin fondos») escondía el que importaba. Ahora van en
// cola, 1,8 s cada uno; un texto igual al que se ve o al último encolado no se repite, y
// la cola no pasa de cuatro para no ir mostrando avisos de hace rato.
const TOAST_QUEUE=[];
// v102 (dirección visual): el aviso es siempre neutro oscuro (#toast-notif en index.html).
// Ya no recibe color: con 200 llamadas pasando su hex, el verde, el rojo y el ámbar
// salían en fondos, justo donde el sistema no los quiere.
function showToast(msg){
  const t=document.getElementById('toast-notif');
  if(!t)return;
  const last=TOAST_QUEUE.length?TOAST_QUEUE[TOAST_QUEUE.length-1]:t._cur;
  if(last&&last.msg===msg)return;
  if(TOAST_QUEUE.length>=4)TOAST_QUEUE.shift();
  TOAST_QUEUE.push({msg});
  if(!t._tmr)nextToast(t);
}
function nextToast(t){
  const it=TOAST_QUEUE.shift();
  if(!it){t._tmr=null;t._cur=null;t.classList.remove('show');return;}
  t._cur=it;
  t.textContent=it.msg;
  t.classList.remove('show');
  void t.offsetWidth; // reflow
  t.classList.add('show');
  t._tmr=setTimeout(()=>nextToast(t),1800);
}

// T63 (v90): el despachador de 73 rutas se reconstruía entero en CADA render.
// Ahora se monta en la primera llamada y se reutiliza.
//
// Perezoso a propósito, no una constante de módulo. Corrección de la nota que
// escribí en v90 y estaba mal: index.html carga coach.js, club.js y
// canicross.js ANTES que los render-*, así que una constante SÍ funcionaría hoy
// — lo que la delataba era el banco de pruebas, que los cargaba en otro orden
// (arreglado en T53). Pero atar la tabla al orden de carga es precisamente lo
// que no interesa: cualquier reordenación futura la dejaría llena de undefined
// en silencio, y el síntoma sería que media docena de pantallas dejan de
// existir. Perezosa es independiente del orden y ahorra exactamente lo mismo.
// T146 puede derivar DEV_ALL_SCREENS de aquí en vez de mantener 70 a mano.
let _SCREEN_ROUTES=null;
function screenRoutes(){
  if(_SCREEN_ROUTES)return _SCREEN_ROUTES;
  _SCREEN_ROUTES={
    intro:renderIntro,workSetup:renderWorkSetup,seasonStart:renderSeasonStart,
    modeSelect:renderModeSelect,saveScreen:renderSaveScreen,
    calendar:renderCalendar,sponsors:renderSponsors,training:renderTraining,
    preRace:renderPreRace,segment:renderSegment,aid:renderAid,
    betweenRace:renderBetweenRace,seasonBalance:renderSeasonBalance,
    midSeasonCalendar:renderMidSeasonCalendar,circuits:renderCircuits,
    betweenManage:renderBetweenManage,preRacePrep:renderPreRacePrep,
    clubSetup:renderClubSetup,
    midRaceEvent:renderMidRaceEvent,retirement:renderRetirement,
    startStrategy:renderStartStrategy,raceResult:renderRaceResult,
    expresSeasonStart:renderExpresSeasonStart,expresCalendar:renderExpresCalendar,
    expresSponsors:renderExpresSponsors,expresPrep:renderExpresPrep,
    expresPreRacePrep:renderExpresPreRacePrep,expresSeasonBalance:renderExpresSeasonBalance,
    coachSelect:renderCoachSelect,coachStyleSelect:renderCoachStyleSelect,coachHome:renderCoachHome,
    coachTraining:renderCoachTraining,coachCalendar:renderCoachCalendar,
    coachTrainingReaction:renderCoachTrainingReaction,
    coachRace:renderCoachRace,coachPostRace:renderCoachPostRace,coachSeasonEnd:renderCoachSeasonEnd,
    coachEvent:renderCoachEvent,coachPreRace:renderCoachPreRace,
    coachSponsors:renderCoachSponsors,coachHub:renderCoachHub,
    clubCreate:renderClubCreate,clubHub:renderClubHub,
    clubStaff:renderClubStaff,clubSponsors:renderClubSponsors,clubMonthly:renderClubMonthly,
    clubRivals:renderClubRivals,
    clubPlantilla:renderClubPlantilla,clubCalendar:renderClubCalendar,
    clubSimulate:renderClubSimulate,clubSeasonEnd:renderClubSeasonEnd,clubDissolved:renderClubDissolved,
    clubEvent:renderClubEvent,
    lifeAthleteOffer:renderLifeAthleteOffer,
    overlapHub:renderOverlapHub,
    lifeRetirement:renderLifeRetirement,
    coachIntro:renderCoachIntro,
    clubOffer:renderClubOffer,
    clubIntro:renderClubIntro,
    achievements:renderAchievements,
    debtCrisis:renderDebtCrisis,careerEnd:renderCareerEnd,   // T29 (v86)
  };
  // Patrón de carga de modos: las rutas que registra cada modo (canicross-render.js…)
  Object.values(MODE_ROUTES).forEach(r=>Object.assign(_SCREEN_ROUTES,r));
  return _SCREEN_ROUTES;
}

// T81 (v90): document.getElementById('main') aparecía en 89 sitios.
function $main(){return document.getElementById('main');}
// T129 (v92): siete botones hacían G=freshState() directamente desde el onclick.
// Si la partida nunca se guardó en una ranura (G._saveSlot null), ese clic la
// borraba entera sin preguntar y sin vuelta atrás. Cuando SÍ hay ranura activa
// el autoSave ya ha escrito, así que volver al menú no pierde nada y no se
// molesta al jugador. El confirm() nativo es provisional: T87 lo cambia por el
// modal propio, junto con los otros seis.
window.backToMainMenu=()=>{
  const enCurso=!['intro','modeSelect','saveScreen'].includes(G.screen)&&
    !!(G.runner?.name||G.coachAthlete||(G.dogs&&G.dogs.length)||(G.club&&G.club.id!=='none'));
  if(enCurso&&G._saveSlot==null&&
     !confirm('Esta partida no está guardada en ninguna ranura: si vuelves al menú se pierde. ¿Volver igualmente?'))return;
  G=freshState();render();
};
// T82 (v90): esconder la barra de pestañas era la misma pareja de líneas
// repetida. Nada más: la barra de finanzas se gestiona aparte, en updateFinBar.
function hideChrome(){const nav=document.getElementById('tab-nav');if(nav)nav.style.display='none';}

// ══════════════════════════════════════
//  RENDER PRINCIPAL
// ══════════════════════════════════════
// Fisher-Yates unbiased shuffle (replaces sort(()=>Math.random()-0.5))
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function render(){
  // Defensive timer cleanup — prevent orphaned intervals from previous screens
  if(G._xpTimerInterval){clearInterval(G._xpTimerInterval);G._xpTimerInterval=null;}
  if(typeof _coachRaceTimer!=='undefined'&&_coachRaceTimer&&G.screen!=='coachRace'){clearInterval(_coachRaceTimer);_coachRaceTimer=null;}
  updateFinBar();
  updateTabNav();
  // Refresca el panel dev si está abierto, para que sus datos (carrera en
  // curso, placeholders del editor de estado...) sigan en vivo sin importar
  // qué pantalla del juego se acabe de renderizar debajo.
  if(window.DEV_ON&&typeof renderDevOverlay==='function')renderDevOverlay(); // T70 (v90): devmode.js solo se carga con ?dev=1 · v98: DEV_ON lo pone index.html
  renderModeSwitcher();
  // Clear any pending Express timer if we've left the mid-race event screen
  if(G.screen!=='midRaceEvent')clearExpressTimer();
  const el=$main();
  if(!el)return;
  // T29 (v86): una partida terminada por quiebra se puede cargar, pero no
  // seguir jugando. Cualquier pantalla vuelve al resumen de fin de carrera.
  if(G.careerEnded&&G.screen!=='careerEnd'&&G.screen!=='saveScreen'&&G.screen!=='modeSelect'){
    G.screen='careerEnd';
  }
  // Canicross — tab routing propio. La pestaña «game» no se enruta aquí: el despachador
  // ya lleva canicrossHub a renderCnCorredorTab, y enrutarla pintaba el hub también en
  // canicrossSeasonBalance, así que «Cerrar temporada» no llegaba nunca al balance (BUG-05).
  if(G.gameMode==='canicross'&&SCREENS_WITH_TABS.includes(G.screen)){
    if(G.activeTab==='runner'){renderCnPerroTab();triggerFade(el);return;}
    if(G.activeTab==='fame'){renderCnEquipoTab();triggerFade(el);return;}
    if(G.activeTab==='calendar'){renderCnCalendarioTab();triggerFade(el);return;}
    if(G.activeTab==='finances'){renderCnFinanzasTab();triggerFade(el);return;}
  }
  // Si estamos en una pestaña auxiliar
  if(G.activeTab==='calendar'&&SCREENS_WITH_TABS.includes(G.screen)){
    if(coachViewActive()){renderCoachCalendar();triggerFade(el);return;}
    renderCalendarTab();triggerFade(el);return;
  }
  if(G.activeTab==='finances'&&SCREENS_WITH_TABS.includes(G.screen)){renderFinancesTab();triggerFade(el);return;}
  if(G.activeTab==='runner'&&SCREENS_WITH_TABS.includes(G.screen)){
    if(coachViewActive()){renderCoachAthleteTab();triggerFade(el);return;}
    renderRunnerTab();triggerFade(el);return;
  }
  if(G.activeTab==='fame'&&SCREENS_WITH_TABS.includes(G.screen)){
    if(coachViewActive()){renderCoachRepTab();triggerFade(el);return;}
    renderFameTab();triggerFade(el);return;
  }
  // Flujo normal del juego
  (screenRoutes()[G.screen]||renderIntro)();
  triggerFade(el);
}
function triggerFade(el){
  // Canicross (rediseño, paso 7 · § 8.2): la franja del compañero, arriba en sus pantallas
  if(G.canicrossMode&&typeof cnCompanionStrip==='function'){const h=cnCompanionStrip();if(h&&el.insertAdjacentHTML)el.insertAdjacentHTML('afterbegin',h);}
  el.classList.remove('fade-in');
  void el.offsetWidth;
  el.classList.add('fade-in');
}

// ── INTRO ──────────────────────────────
// ── MODE SELECT ────────────────────────
// ══════════════════════════════════════
//  SISTEMA DE GUARDADO
// ══════════════════════════════════════

// ── SAVE SCREEN ────────────────────────
function renderSaveScreen(){
  const el=$main();
  const slots=getAllSlots();
  // DS13 (v95): los logros globales son los mismos para las cinco ranuras y se
  // leían y recorrían una vez por ranura.
  let achNormal=0,achCn=0,achExpres=0;
  try{
    const ga=JSON.parse(LS.get('globalAchs')||'{}');
    Object.keys(ga).forEach(id=>{
      const a=ACHIEVEMENTS.find(x=>x.id===id);
      if(!a)return;
      if(a.mode==='cn')achCn++;
      else if(a.mode==='expres')achExpres++;
      else achNormal++;
    });
  }catch(e){}
  // Paso 6 de la dirección visual (2026-10-30): tipo Lista (§ 2 Comunes): las cinco ranuras como
  // filas y el importar como campo, con el consejo de exportar plegable. Sin hex.
  const B=(txt,click,prim)=>`<button class="pz-btn${prim?'':' sec'}" style="width:auto;padding:7px 12px;margin:0;font-size:14px" onclick="${click}">${txt}</button>`;
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:10px">
      <div class="pz-titulo" style="margin:0">Trail Game</div>
      <button class="opinar-btn" onclick="abrirOpinion()"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/></svg>Opinar</button>
    </div>
    <div class="pz-efectos" style="margin:2px 0 14px">v${GAME_BUILD} · <button class="enlace-priv" onclick="showPrivacy()">Privacidad</button></div>
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <span class="pz-label" style="flex:1">Partidas guardadas</span>
      ${B('🏅 Logros',"G._achPrev='saveScreen';G.screen='achievements';render()")}
      ${B('📖 Tutorial','showTutorial()')}
    </div>
    ${slots.map(({slot,data,info})=>{
      const lbl=slotLabel(data);
      // PUB-02 (v99): lo que no se puede abrir ya no se pinta como «vacía».
      if(info&&(info.kind==='future'||info.kind==='broken')) return `<div class="pz-tarjeta" style="border-style:dashed;border-color:var(--line2)">
        <b>Ranura ${slot+1} — no se puede abrir</b>
        <div class="pz-diag ojo">${info.kind==='future'
          ?`La guardó la v${info.build} y esta página es la v${GAME_BUILD}. Recarga la página para abrirla.`
          :`Hay una partida, pero ${esc(info.why)}. Copia sus datos antes de borrarla.`}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">
          ${info.kind==='future'?B('Recargar','location.reload()',true):''}${B('Copiar datos',`exportRawSlot(${slot})`)}${B('Borrar',`confirmDeleteSlot(${slot})`)}
        </div>
      </div>`;
      if(!lbl) return `<div class="pz-tarjeta" style="border-style:dashed;border-color:var(--line2);display:flex;align-items:center;justify-content:space-between;gap:8px">
        <span class="pz-efectos">Ranura ${slot+1} — vacía</span>${B('Nueva partida',`startNewInSlot(${slot})`,true)}
      </div>`;
      return `<div class="pz-tarjeta">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px"><b style="font-size:16px">${lbl.runName?`«${esc(lbl.runName)}»`:lbl.name}</b><span class="pz-efectos">Ranura ${slot+1}</span></div>
        ${lbl.ended?`<div class="pz-diag menos">📉 Carrera terminada</div>`:''}
        <div class="pz-efectos">${lbl.runName?esc(lbl.name)+' · ':''}Año ${lbl.year} · Global ${lbl.ranking} · ${lbl.spec} ${lbl.specRanking}</div>
        <div class="pz-efectos">${lbl.mode}${lbl.phase?' · '+lbl.phase:''}${lbl.totalKm?' · '+lbl.totalKm+' km':''} · ${lbl.date}</div>
        <div class="pz-efectos">🏆 ${achNormal} · 🐕 ${achCn} · ⚡ ${achExpres}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">
          ${B('Cargar',`loadSlot(${slot})`,true)}${B('Sobreescribir',`saveCurrentToSlot(${slot})`)}${B('Exportar',`exportSlotToClipboard(${slot})`)}${B('Borrar',`confirmDeleteSlot(${slot})`)}
        </div>
      </div>`;
    }).join('')}
    <div class="pz-label" style="margin:16px 0 6px">Importar partida</div>
    ${consejoHTML('exportar','Las partidas viven solo en este navegador.','Usa Exportar de vez en cuando y guarda el texto: si borras los datos del navegador o cambias de móvil, lo pegas aquí y sigues donde ibas.')}
    <p class="pz-efectos" style="margin-bottom:6px">Pega aquí el texto exportado y elige en qué ranura guardarla.</p>
    <textarea class="import-area" id="import-txt" placeholder="Pega aquí el texto TRAIL_SAVE_V2::..."></textarea>
    <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
      ${slots.map(({slot})=>B('→ Ranura '+(slot+1),`doImport(${slot})`)).join('')}
    </div>
    <button class="pz-btn sec" style="margin-top:20px" onclick="closeSaveScreen()">← Volver${G._prevScreen&&G._prevScreen!=='modeSelect'?' a la partida':''}</button>
  </div>`;
}

window.loadSlot=slot=>{
  try{
    const data=loadFromSlot(slot);
    if(!data||!data.state){alert('Ranura vacía o no se pudo leer.');return;}
    const savedBuild=data.state._build||0;
    Object.assign(G,freshState(),data.state);
    G._saveSlot=slot;
    if(G.carreraVida&&G.lifecyclePhase==='overlap'&&G.lifeAthlete){
      // v96: si se guardó en el lado corredor, «Seguir corriendo» vuelve a esa pantalla
      // y no al arranque de temporada (ver overlapRunnerScreen en render-temporada.js)
      const s=G.screen||'';
      if(!s.startsWith('coach')&&s!=='overlapHub')G.overlapRunnerScreen=s;
      G.screen='overlapHub';
    }
    render();
    if(G.screen==='canicrossAntigua')return;   // no se ha actualizado nada: lo explica la pantalla
    if(savedBuild>0&&savedBuild<GAME_BUILD){
      setTimeout(()=>showToast(`Partida de v${savedBuild} actualizada a v${GAME_BUILD} ✓`),300);
    } else if(savedBuild===0){
      setTimeout(()=>showToast('Partida antigua cargada — datos actualizados automáticamente ✓'),300);
    }
  }catch(err){
    console.error('[loadSlot] Error al cargar ranura',slot,err);
    alert('Error inesperado al cargar la partida. Prueba a importar desde texto.');
  }
};
// T10 (v82): entrar y salir de la pantalla de guardado sin perder dónde estabas.
window.openSaveScreen=()=>{
  if(RACE_SCREENS.includes(G.screen))return; // la celda ya está oculta; doble red
  if(G.screen!=='saveScreen')G._prevScreen=G.screen;
  G.screen='saveScreen';render();
};
window.closeSaveScreen=()=>{
  const back=G._prevScreen;
  G._prevScreen=null;
  G.screen=(back&&back!=='saveScreen')?back:'modeSelect';
  render();
};
window.saveCurrentToSlot=slot=>{
  if(RACE_SCREENS.includes(G.screen)){alert('No puedes guardar durante una carrera. Termina o abandona primero.');return;}
  if(G.screen==='modeSelect'||G.screen==='saveScreen'){alert('Inicia una partida primero.');return;}
  if(saveToSlot(slot)){
    alert(`✓ Partida guardada en ranura ${slot+1}.`);render();
  }else alert('Error al guardar.');
};
window.startNewInSlot=slot=>{
  Object.assign(G,freshState());
  G._saveSlot=slot;
  G.screen='modeSelect';
  render();
};
window.confirmDeleteSlot=slot=>{
  if(confirm(`¿Borrar la partida de la ranura ${slot+1}? Esta acción no se puede deshacer.`)){
    deleteSlot(slot);render();
  }
};
window.doImport=(slot)=>{
  const txt=document.getElementById('import-txt')?.value||'';
  if(!txt.trim()){alert('Pega primero el texto de la partida.');return;}
  // PUB-02 (v99): importar encima de una ranura ocupada la pisaba sin preguntar.
  if(LS.get(SAVE_KEY+slot)&&!confirm(`La ranura ${slot+1} ya tiene una partida. ¿Sustituirla por la importada?`))return;
  if(importFromText(txt,slot)){
    alert(`✓ Partida importada en ranura ${slot+1}.`);
    document.getElementById('import-txt').value='';
    render();
  } else if(importFromText.lastError==='Otra versión'){
    alert('Esta partida es de otra versión del juego. Recarga la página y vuelve a probar.');
  } else alert('Texto no válido. Asegúrate de copiar el texto completo.');
};

// Paso 6 de la dirección visual (2026-10-30): tipo Portada (TG-Direccion-Visual § 7, Menú).
// Silueta de montaña, la dificultad en un desplegable con su indicador de barras y los modos
// en orden: jugables → bloqueados con su motivo → próximamente. Sin hex: tokens y piezas.
function renderModeSelect(){
  const el=$main();
  const modes=[
    {id:'facil',    label:'Fácil',    desc:'Rivales accesibles · sin penalizaciones duras · para descubrir el juego'},
    {id:'medio',    label:'Medio',    desc:'Lesiones frecuentes · economía ajustada · el modo base actual'},
    {id:'dificil',  label:'Difícil',  desc:'Errores tienen consecuencias · sponsors exigentes · élite inalcanzable'},
    {id:'hardcore', label:'Hardcore', desc:'Material importa · fractura = temporada perdida · sin red de seguridad'},
  ];
  const otherModes=[
    {id:'expres',        icon:'⚡',  label:'Carrera Exprés',  desc:'3 temporadas · sin jornada laboral · ganancias ×1.5', available:true,  lockable:false},
    {id:'infinite_prog', icon:'📈',  label:'Modo infinito',   desc:'Dificultad progresiva · sin techo · próximamente',   available:false, lockable:false},
    {id:'coach',         icon:'📋',  label:'Entrenador',      desc:'Lleva un atleta ajeno · honorarios + bonus',          available:true,  lockable:true},
    {id:'club',          icon:'🏕️', label:'Club',            desc:'Gestiona un club · plantilla · presupuesto',          available:true,  lockable:true},
    {id:'canicross',     icon:'🐕',  label:'Canicross',       desc:'Corres con tu perro · el perro no tiene barra, tiene gestos', available:true, lockable:false},
    {id:'backyard',      icon:'🔔',  label:'Backyard',        desc:'Una vuelta cada hora en punto · gana el último en pie · reto suelto', available:true, lockable:false},
    {id:'ultra',         icon:'🏔',  label:'Ultra',           desc:'Una carrera de 105 km con noche y barreras · carrera suelta, en pruebas', available:true, lockable:false},
  ];
  // Leer desbloqueos del localStorage
  let unlocked={coach:false,club:false};
  try{Object.assign(unlocked,JSON.parse(LS.get('unlocked')||'{}'));}catch(e){}
  const sel=G.gameMode||'medio';
  const dif=DIFICULTADES[sel];
  const bars=n=>`<span class="dif-bars" aria-hidden="true">${[1,2,3,4].map(i=>`<i${i<=n?' class="on"':''}></i>`).join('')}</span>`;
  // Orden: jugables, bloqueados, próximamente
  const rank=m=>!m.available?2:(m.lockable&&!unlocked[m.id])?1:0;
  const otros=otherModes.slice().sort((a,b)=>rank(a)-rank(b));
  const icono2=t=>`<span style="width:36px;height:36px;border-radius:9px;background:var(--soft);display:flex;align-items:center;justify-content:center;font-size:17px;flex-shrink:0">${t}</span>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-franja" style="background:var(--fill-oscuro);padding-top:26px">
      <svg class="pz-franja-fondo" viewBox="0 0 300 90" preserveAspectRatio="none" style="height:75%;opacity:.35"><path d="M0 90 L0 62 L40 40 L70 55 L110 18 L150 50 L180 34 L220 60 L260 28 L300 52 L300 90Z" style="fill:var(--carrera)"/></svg>
      <div class="pz-franja-num" style="font-size:46px;position:relative">Trail Game</div>
      <div class="pz-franja-sub" style="position:relative">Elige cómo quieres correr</div>
    </div>

    <div class="pz-tarjeta" style="padding:0;overflow:hidden">
      <div class="pz-fila navega" onclick="toggleModeGroup()" style="padding:12px 14px">
        ${icono2('🏃')}
        <span class="pz-fila-txt"><b>Modo carrera</b><div class="pz-efectos">Gestión completa · 4 niveles de dificultad</div></span>
        ${dif?`<span class="dif-tag dif-${sel}">${bars(dif[1])}<span class="dif-name">${dif[0]}</span></span>`:''}
        <span id="modegroup-arrow" style="display:none"></span>
      </div>
      <div class="carrera-group-content" id="modegroup-content" style="background:var(--soft);padding:8px">
        ${modes.map(m=>{const d=DIFICULTADES[m.id];return`<button class="pz-opcion${sel===m.id?' sel':''}" onclick="selectMode('${m.id}')"><span class="dif-tag dif-${m.id}" style="float:right">${bars(d[1])}</span><b>${m.label}</b><div class="pz-efectos">${m.desc}</div></button>`;}).join('')}
      </div>
    </div>

    <div class="pz-label" style="margin:16px 0 8px">Otros modos</div>
    <div class="pz-tarjeta" style="padding:4px 14px">
      ${otros.map(m=>{
        if(!m.available)return `<div class="pz-fila" style="color:var(--ink3)">${icono2(m.icon)}<span class="pz-fila-txt"><b>${m.label}</b><div class="pz-efectos">${m.desc}</div></span><span class="pz-efectos">Próximamente</span></div>`;
        if(m.lockable&&!unlocked[m.id])return `<div class="pz-fila" style="color:var(--ink3)">${icono2(m.icon)}<span class="pz-fila-txt"><b>${m.label}</b><div class="pz-motivo"><svg class="ico" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>Sigue el arco narrativo en modo carrera para desbloquear</div></span></div>`;
        if(m.lockable&&unlocked[m.id])return `<div class="pz-fila" style="flex-wrap:wrap">${icono2(m.icon)}<span class="pz-fila-txt"><b>${m.label}</b> <span class="pz-chip mas">Desbloqueado</span><div class="pz-efectos">${m.desc}</div></span>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;width:100%">
            <button class="pz-btn sec" onclick="selectAndConfirm('${m.id}','continuar')">Continuar historia</button>
            <button class="pz-btn sec" onclick="selectAndConfirm('${m.id}','nuevo')">Nuevo desde cero</button></div></div>`;
        const isSel=sel===m.id;
        return `<button class="pz-opcion${isSel?' sel':''}" style="display:flex;align-items:center;gap:11px;margin:8px 0" onclick="selectMode('${m.id}')">${icono2(m.icon)}<span class="pz-fila-txt"><b>${m.label}</b><div class="pz-efectos">${m.desc}</div></span></button>`;
      }).join('')}
    </div>

    <button class="pz-btn sec" style="margin-top:12px" onclick="G.screen='achievements';render()">🏅 Ver todos los logros</button>
    <button class="pz-btn" style="margin-top:16px" onclick="confirmMode()">Continuar →</button>
    <button class="pz-btn sec" onclick="G.screen='saveScreen';render()">← Volver a partidas guardadas</button>
  </div>`;
}

window.toggleModeGroup=()=>{
  const c=document.getElementById('modegroup-content');
  const a=document.getElementById('modegroup-arrow');
  if(c){const open=c.classList.toggle('open');if(a)a.style.transform=open?'rotate(90deg)':'';}
};
window.selectMode=id=>{G.gameMode=id;render();};
window.selectAndConfirm=(id,path)=>{
  G.gameMode=id;
  if(path==='continuar'){
    if(id==='coach'){
      G.coachReputation=G.coachReputation||0;
      if((G.coachRoster||[]).some(s=>s&&s.coachAthlete)){G.screen='coachHub';render();return;}
      G._coachUnlockedHint=true;
      G.coachActiveIdx=0;if(!G.coachRoster)G.coachRoster=[];
      const sh=shuffle(COACH_ATHLETE_POOL);
      const bon=LIFE_ATHLETE_POOL.filter(a=>a.potential==='talento_oculto'||a.potential==='prometedor');
      let pl=sh.slice(0,3).map(a=>({...a,currentStats:{...a.baseStats}}));
      if(bon.length){const pk=bon[Math.floor(Math.random()*bon.length)];pl=[...pl,{...pk,currentStats:{...pk.baseStats},monthlyFee:200}];}
      G.coachPool=pl;G.screen='coachSelect';render();return;
    }
    if(id==='club'){
      if(G.clubModeData){G.screen='clubHub';render();return;}
      G._clubUnlockedHint=true;G.screen='clubCreate';render();return;
    }
  }
  if(path==='nuevo'){
    if(id==='coach'){
      G.coachReputation=5;G._coachUnlockedHint=true;
      G.coachActiveIdx=0;G.coachRoster=[];G.coachAthlete=null;
      const sh=shuffle(COACH_ATHLETE_POOL);
      const bon=LIFE_ATHLETE_POOL.filter(a=>a.potential==='talento_oculto'||a.potential==='prometedor');
      let pl=sh.slice(0,3).map(a=>({...a,currentStats:{...a.baseStats}}));
      if(bon.length){const pk=bon[Math.floor(Math.random()*bon.length)];pl=[...pl,{...pk,currentStats:{...pk.baseStats},monthlyFee:200}];}
      G.coachPool=pl;G.screen='coachSelect';render();return;
    }
    if(id==='club'){
      G.clubModeData=null;G._clubUnlockedHint=true;
      G.screen='clubCreate';render();return;
    }
  }
};
window.confirmMode=()=>{
  if(G.gameMode==='canicross'){G.screen='intro';render();return;}
  // El Backyard guarda su tirada en su propia clave, no en una ranura de partida (§ 18)
  if(G.gameMode==='backyard'){G._saveSlot=null;G.screen=byTiradaGuardada()?'byMenu':'byPre';render();return;}
  // La carrera ultra suelta tampoco usa ranura (hasta que exista la carcasa del modo)
  if(G.gameMode==='ultra'){G._saveSlot=null;G.screen='utPre';render();return;}
  if(G.gameMode==='club'){
    // Guiño narrativo si el modo está desbloqueado vía arco narrativo
    let unlocked={};try{unlocked=JSON.parse(LS.get('unlocked')||'{}');}catch(e){}
    if(unlocked.club&&!G.carreraVida){
      G._clubUnlockedHint=true; // flag para mostrar texto en clubCreate
    }
    if(G.clubModeData){G.screen='clubHub';render();return;}
    G.screen='clubCreate';render();return;
  }
  if(G.gameMode==='coach'){
    G.coachReputation=G.coachReputation||0;
    // Guiño narrativo si el modo está desbloqueado vía arco narrativo
    let unlocked={};try{unlocked=JSON.parse(LS.get('unlocked')||'{}');}catch(e){}
    if(unlocked.coach&&!G.carreraVida){
      G.coachReputation=Math.max(G.coachReputation,5);
      G._coachUnlockedHint=true; // flag para mostrar el texto en coachSelect
    }
    // If roster already has athletes, go to hub
    if((G.coachRoster||[]).some(s=>s&&s.coachAthlete)){
      G.screen='coachHub';render();return;
    }
    // First time — init pool and go to athlete selection for slot 0
    G.coachActiveIdx=0;
    if(!G.coachRoster)G.coachRoster=[];
    const shuffled=shuffle(COACH_ATHLETE_POOL);
    // Pool extra si viene del arco: un atleta de LIFE_ATHLETE_POOL con buen potencial
    let pool=shuffled.slice(0,3).map(a=>({...a,currentStats:{...a.baseStats}}));
    if(unlocked.coach&&!G.carreraVida){
      const bonus=LIFE_ATHLETE_POOL.filter(a=>a.potential==='talento_oculto'||a.potential==='prometedor');
      if(bonus.length){
        const pick=bonus[Math.floor(Math.random()*bonus.length)];
        pool=[...pool,{...pick,currentStats:{...pick.baseStats},monthlyFee:pick.monthlyFee||200}];
      }
    }
    G.coachPool=pool;
    G.screen='coachSelect';render();return;
  }
  // Modos de carrera normal — el arco narrativo corredor→entrenador→club está siempre activo
  if(['facil','medio','dificil','hardcore'].includes(G.gameMode)){
    G.carreraVida=true;
    G.lifecyclePhase=G.lifecyclePhase||'runner';
  }
  G.screen='intro';render();
};

function renderIntro(){
  // Preservar focus de inputs (#runname/#rname) tras re-render por cambio edad/especialidad
  const _prevFocusId=document.activeElement&&document.activeElement.id;
  const _prevSelStart=document.activeElement&&document.activeElement.selectionStart;
  const _prevSelEnd=document.activeElement&&document.activeElement.selectionEnd;
  // Persistir valores actuales del DOM en G antes de redibujar
  const _rn=document.getElementById('runname');if(_rn)G.runName=_rn.value;
  const _nm=document.getElementById('rname');if(_nm&&G.runner)G.runner.name=_nm.value;
  const el=$main();
  const r=G.runner;
  // Paso 6 de la dirección visual (2026-10-30): tipo Formulario (decisión + campos): campos de
  // texto, opciones en tarjeta y el resumen de stats con lo que cambia la edad. Sin hex.
  const _adj=applyAgeToStats(SPEC_STATS[r.specialty],r.age||25);
  const _base=SPEC_STATS[r.specialty];
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">Nueva partida · v${GAME_BUILD}</div>
    <div class="pz-titulo">Crea tu corredor</div>
    <p class="pz-sub">Y empieza tu carrera deportiva.</p>
    ${G.gameMode==='expres'?`<div class="pz-diag" style="margin-bottom:12px">⚡ <b>Carrera Exprés</b> — 3 temporadas · sin gestión de jornada · ganancias de entrenamiento ×1.5</div>`:''}
    ${G.gameMode==='canicross'?`<div class="pz-diag" style="margin-bottom:12px">🐕 <b>Modo Canicross</b> — A continuación crearás tu perro y eliges raza.</div>`:''}
    <label class="pz-label" for="runname" style="display:block;margin-bottom:6px">Nombre de la partida</label>
    <input id="runname" type="text" placeholder="Ej: Temporada del reto, Sin trabajo año 1..." value="${esc(G.runName||'')}" maxlength="30" style="margin-bottom:14px"/>
    <label class="pz-label" for="rname" style="display:block;margin-bottom:6px">Tu nombre</label>
    <input id="rname" type="text" placeholder="Nombre del corredor" value="${esc(r.name)}" maxlength="22"/>
    <div class="pz-label" style="margin-bottom:6px">Edad inicial</div>
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px;margin-bottom:18px">
      ${[18,22,25,28,30,35].map(a=>`<button class="pz-opcion sin-check${(r.age||25)===a?' sel':''}" style="padding:10px 0;margin:0;text-align:center" onclick="G.runner.age=${a};G.runner.stats=applyAgeToStats({...SPEC_STATS[G.runner.specialty]},${a});render()"><span class="pz-num" style="font-size:18px">${a}</span></button>`).join('')}
    </div>
    <div class="pz-label" style="margin-bottom:6px">Especialidad</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px">
      ${[['fondista','Fondista','Fondo y llano rápido'],['montanero','Montañero','Subidas y altitud'],['tecnico','Técnico','Descensos difíciles'],['todoterreno','Todoterreno','Equilibrado en todo']].map(([id,l,d])=>`<button class="pz-opcion${r.specialty===id?' sel':''}" style="margin:0" onclick="selSpec('${id}')"><b>${l}</b><div class="pz-efectos">${d}</div></button>`).join('')}
    </div>
    <div class="pz-tarjeta">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"><span class="pz-label">Stats iniciales</span>${(r.age||25)!==25?'<span class="pz-efectos">frente a la base de 25 años</span>':''}</div>
      ${Object.entries(_adj).map(([k,v])=>{const d=v-_base[k];
        return `<div class="bar-row"><span class="bar-label">${k.charAt(0).toUpperCase()+k.slice(1)}${d?` <span class="${d>0?'pz-mas':'pz-menos'}" style="font-size:12px">${d>0?'+':''}${d}</span>`:''}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${v}%;background:var(--cuerpo)"></div></div><span class="bar-pct">${v}</span></div>`;}).join('')}
    </div>
    <button class="pz-btn" onclick="${G.gameMode==='canicross'?'doStartCanicross':'doStart'}()">Empezar →</button>
  </div>`;
  setTimeout(()=>{
    const i=document.getElementById('rname');
    if(i)i.oninput=e=>G.runner.name=e.target.value;
    const rn=document.getElementById('runname');
    if(rn)rn.oninput=e=>G.runName=e.target.value;
    // Restaurar focus tras re-render
    if(_prevFocusId){
      const tgt=document.getElementById(_prevFocusId);
      if(tgt){
        tgt.focus();
        if(_prevSelStart!=null&&tgt.setSelectionRange){
          try{tgt.setSelectionRange(_prevSelStart,_prevSelEnd);}catch(e){}
        }
      }
    }
  },0);
}

// Pestaña lateral para saltar entre Corredor y Entrenador en caliente, sin
// pasar por overlapHub ni recargar la partida (ver Tareas/Instrucciones.md
// § Tanda — Transición Clásico → Entrenador → Club). El modo que no se está
// jugando no avanza nada por sí solo (el juego nunca simula en segundo plano,
// solo con acciones explícitas del jugador), así que "pausarlo" no requiere
// ninguna lógica extra — basta con no tocar sus pantallas.
function renderModeSwitcher(){
  const el=document.getElementById('mode-switch-tab');
  if(!el)return;
  const show=!!(G.carreraVida&&G.lifecyclePhase==='overlap'&&G.lifeAthlete);
  el.style.display=show?'block':'none';
  if(!show)return;
  // Alineado en vivo con el centro vertical del fin-bar (cuando está visible)
  // en vez de un offset fijo — así sigue encajando aunque cambie su alto.
  const bar=document.getElementById('fin-bar');
  const barVisible=bar&&bar.style.display!=='none'&&bar.offsetHeight>0;
  el.style.top=barVisible?(bar.getBoundingClientRect().top+bar.offsetHeight/2-23)+'px':'16px';
  const onCoachSide=G.screen.startsWith('coach');
  // v102: icono de línea y el acento del modo al que vas
  el.innerHTML=`<div class="msw-btn ${onCoachSide?'to-clasico':'to-entrenador'}" title="${onCoachSide?'Volver a Corredor':'Ir a Entrenador'}"><span class="msw-icon">${icono(onCoachSide?'corredor':'entrenador')}</span><span>${onCoachSide?'Corredor':'Entrenador'}</span></div>`;
}

// ══════════════════════════════════════
// ══════════════════════════════════════
window.showTip=(title,html)=>{
  document.getElementById('tip-title').textContent=title;
  document.getElementById('tip-body').innerHTML=html;
  document.getElementById('tip-overlay').style.display='flex';
};
window.closeTip=()=>{document.getElementById('tip-overlay').style.display='none';};

// PUB-07 (v99): el aviso de privacidad, el mismo texto que el apartado «Privacidad»
// del README. smoke.js comprueba que cada frase de PRIVACY_KEY_PHRASES está en los
// dos sitios: si cambias una, cambia la otra.
const PRIVACY_PARAGRAPHS=[
  'Trail Game no tiene servidor, ni cuentas, ni analítica, ni cookies.',
  'Tus partidas (5 ranuras) y tus logros se guardan solo en este navegador; si borras los datos del sitio, se borran.',
  '«Exportar partida» crea un texto que solo sale de tu móvil si tú lo compartes.',
  'Si mandas una opinión, va a un formulario de Google con la versión del juego, el modo y el momento de la partida. Tu nombre y tu contacto, solo si los escribes.',
  'GitHub, que aloja la página, y Google, si opinas, ven tu dirección IP, como cualquier web.',
];
const PRIVACY_KEY_PHRASES=[
  'no tiene servidor, ni cuentas, ni analítica, ni cookies',
  'se guardan solo en este navegador',
  'solo sale de tu móvil si tú lo compartes',
  'va a un formulario de Google',
  'ven tu dirección IP',
];
window.showPrivacy=()=>{
  showTip('Privacidad',PRIVACY_PARAGRAPHS.map(p=>`<p style="margin-bottom:8px">${p}</p>`).join('')+
    `<button class="main" style="margin-top:8px" onclick="closeTip()">Entendido</button>`);
};

// v101 · Opinar, como en La Colmena (v11.16) y Chromalchemy: una hoja con las preguntas
// del formulario de Google; al enviar, las respuestas van a su `formResponse` por detrás
// (no-cors: Google no contesta nada legible, solo se sabe si no hubo red) y no se sale
// del juego. Se abre desde la pantalla de partidas. Los `entry` salen del enlace
// prerrellenado: si se cambia una pregunta en Google, hay que cambiarla aquí. Lo escrito
// se conserva al cerrar sin enviar. La privacidad (tip-overlay, z 1200) va por encima.
const OPINION_FORM='https://docs.google.com/forms/d/e/1FAIpQLSevoPqHZ2UsKlI0DBl_Jm5ZlEEOXGHcD267H05p1wPLGQZ-gw/formResponse';
const OPINION_PREGUNTAS=[
  {entry:'entry.932365581', texto:'¿Qué te ha gustado?', largo:true},
  {entry:'entry.1764929900',texto:'¿Qué te ha confundido o te ha sobrado?', largo:true},
  {entry:'entry.332127336', texto:'¿Has encontrado algo raro o «roto»?', largo:true},
  {entry:'entry.1198938977',texto:'Cuéntame lo que quieras', ayuda:'Ideas, quejas, lo que se te ocurra', largo:true},
  {entry:'entry.1083438825',texto:'Tu nombre', ayuda:'Opcional, si quieres que te responda'},
  {entry:'entry.1276655054',texto:'Correo u otro contacto', ayuda:'Opcional'},
];
// Los tres que rellena el juego y no se ven (la sección final del formulario).
const OPINION_CAMPOS={version:'entry.1031068515',modo:'entry.1550420656',momento:'entry.1150654629'};
const OPINION_MAX={largo:2000,corto:100};
const OPINION_CLASICO=['facil','medio','dificil','hardcore'];
const OPINION_FASE={runner:'corredor',overlap:'solapamiento',coach:'entrenador',club:'club'};
const OPINION_MES=['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// El modo y el momento de un estado de partida (G o el de una ranura): «Clásico · Difícil»,
// «Temporada 3 · May · pantalla training».
function opinionModo(s){
  const m=s.gameMode;
  let txt=OPINION_CLASICO.includes(m)?'Clásico · '+modeLabelOf(m):modeLabelOf(m);
  if(s.carreraVida)txt+=' · Carrera de Vida ('+(OPINION_FASE[s.lifecyclePhase]||s.lifecyclePhase)+')';
  return txt;
}
function opinionMomento(s,pantalla){
  const coach=s.gameMode==='coach'||(s.carreraVida&&s.lifecyclePhase==='coach');
  const temp=s.gameMode==='canicross'?s.cnSeason:coach?s.coachSeason:s.year;
  const partes=['Temporada '+(temp||1)];
  const carrera=!coach&&s.gameMode!=='canicross'&&s.selectedRaces&&s.selectedRaces[s.currentRaceIdx||0];
  if(carrera&&carrera.month)partes.push(OPINION_MES[carrera.month]);
  if(s.careerEnded)partes.push('carrera terminada');
  if(pantalla)partes.push('pantalla '+pantalla);
  return partes.join(' · ');
}
// Lo que acompaña a la opinión. Si se ha entrado a partidas desde una partida (💾), esa;
// si no, la última que se guardó de las cinco ranuras; sin ninguna, «Sin partida».
function opinionDatos(){
  const d={version:'v'+GAME_BUILD};
  const enJuego=G._prevScreen&&G._prevScreen!=='modeSelect'&&G._prevScreen!=='saveScreen';
  if(enJuego){
    d.modo=opinionModo(G);
    d.momento='En juego'+(G._saveSlot!=null?' (ranura '+(G._saveSlot+1)+')':'')+' · '+opinionMomento(G,G._prevScreen);
    return d;
  }
  const ultima=getAllSlots().filter(x=>x.data).sort((a,b)=>(b.data.ts||0)-(a.data.ts||0))[0];
  if(!ultima){d.modo='Sin partida';d.momento='Inicio';return d;}
  const s=ultima.data.state;
  const fecha=new Date(ultima.data.ts).toLocaleDateString('es-ES',{day:'numeric',month:'short'});
  d.modo=opinionModo(s);
  d.momento='Última guardada (ranura '+(ultima.slot+1)+', '+fecha+') · '+opinionMomento(s,s.screen);
  return d;
}
// El cuerpo del envío: solo las preguntas con algo escrito, y los datos del juego. null si
// no hay nada escrito. pageHistory: con dos secciones, sin él Google no da la respuesta por
// terminada.
function opinionCuerpo(respuestas,datos){
  const escritas=Object.keys(respuestas).filter(k=>String(respuestas[k]||'').trim());
  if(!escritas.length)return null;
  const par=(k,v)=>encodeURIComponent(k)+'='+encodeURIComponent(v);
  const pares=escritas.map(k=>par(k,String(respuestas[k]).trim()));
  Object.keys(OPINION_CAMPOS).forEach(k=>{if(datos[k]!=null&&datos[k]!=='')pares.push(par(OPINION_CAMPOS[k],datos[k]));});
  pares.push(par('pageHistory','0,1'));
  return pares.join('&');
}
let opinionAbierta=false,opinionOrigen=null,opinionCierre=0;
window.abrirOpinion=()=>{
  clearTimeout(opinionCierre);
  opinionAbierta=true;
  opinionOrigen=document.activeElement;
  const caja=document.getElementById('opinion-preguntas');
  if(!caja.children.length){
    caja.innerHTML=OPINION_PREGUNTAS.map((p,i)=>{
      const ph=p.ayuda?` placeholder="${p.ayuda}"`:'';
      const campo=p.largo?`<textarea name="${p.entry}" rows="2" maxlength="${OPINION_MAX.largo}"${ph}></textarea>`
        :`<input name="${p.entry}" type="text" maxlength="${OPINION_MAX.corto}" autocomplete="${i===OPINION_PREGUNTAS.length-1?'email':'name'}"${ph}>`;
      return `<label>${p.texto}${campo}</label>`;
    }).join('');
  }
  document.getElementById('opinion-form').hidden=false;
  document.getElementById('opinion-gracias').hidden=true;
  document.getElementById('opinion-aviso').textContent='';
  const enviar=document.getElementById('opinion-enviar');
  enviar.disabled=false;enviar.textContent='Enviar';
  const h=document.getElementById('opinion'),velo=document.getElementById('opinion-fondo');
  h.hidden=false;velo.hidden=false;
  h.getBoundingClientRect();   // para que haya transición
  h.classList.add('abierta');velo.classList.add('abierta');
  caja.scrollTop=0;
  ajustarOpinion();
};
window.cerrarOpinion=()=>{
  if(!opinionAbierta)return;
  opinionAbierta=false;
  const h=document.getElementById('opinion'),velo=document.getElementById('opinion-fondo');
  if(document.activeElement&&h.contains(document.activeElement))document.activeElement.blur();
  ajustarOpinion();
  h.classList.remove('abierta');velo.classList.remove('abierta');
  opinionCierre=setTimeout(()=>{h.hidden=true;velo.hidden=true;},250);
  if(opinionOrigen&&document.contains(opinionOrigen)&&opinionOrigen.offsetParent)opinionOrigen.focus({preventScroll:true});
  opinionOrigen=null;
};
// Con el teclado del móvil abierto, la hoja se ajusta a lo que se ve para poder bajar
// hasta «Enviar» (CR-16 de La Colmena). Con la página ampliada no se toca.
function ajustarOpinion(){
  const h=document.getElementById('opinion'),vv=window.visualViewport;
  if(!h)return;
  const suelta=()=>{h.style.top='';h.style.bottom='';h.classList.remove('con-teclado');};
  if(!opinionAbierta||!vv||vv.scale>1.01){suelta();return;}
  const tapado=Math.round(window.innerHeight-vv.offsetTop-vv.height);
  if(tapado<1){suelta();return;}
  h.classList.add('con-teclado');
  h.style.bottom=tapado+'px';
  h.style.top=Math.round(vv.offsetTop+12)+'px';
  const f=document.activeElement;
  if(f&&h.contains(f)&&f.matches('textarea,input'))f.scrollIntoView({block:'nearest'});
}
if(window.visualViewport){
  window.visualViewport.addEventListener('resize',ajustarOpinion);
  window.visualViewport.addEventListener('scroll',ajustarOpinion);
}
window.enviarOpinion=async e=>{
  e.preventDefault();
  const form=document.getElementById('opinion-form'),boton=document.getElementById('opinion-enviar'),aviso=document.getElementById('opinion-aviso');
  const respuestas={};
  OPINION_PREGUNTAS.forEach(p=>{respuestas[p.entry]=form.elements[p.entry].value;});
  const cuerpo=opinionCuerpo(respuestas,opinionDatos());
  if(!cuerpo){aviso.textContent='Escribe algo en alguna pregunta antes de enviar.';return;}
  aviso.textContent='';
  boton.disabled=true;boton.textContent='Enviando…';
  try{
    await window.fetch(OPINION_FORM,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:cuerpo});
  }catch(err){
    boton.disabled=false;boton.textContent='Enviar';
    aviso.textContent='No se ha podido enviar: parece que no hay conexión. Lo escrito sigue aquí; inténtalo en un rato.';
    return;
  }
  form.reset();
  form.hidden=true;
  document.getElementById('opinion-gracias').hidden=false;
  document.getElementById('opinion-volver').focus({preventScroll:true});
};

const TUTORIAL_CARDS=[
  {
    icon:'🔄',
    title:'El bucle del año',
    text:`<div style="text-align:left;line-height:2">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:10px">Cada temporada repites este ciclo:</div>
      <div>📋 <strong>Planificar</strong> — elige carreras, sponsors y jornada laboral</div>
      <div>💪 <strong>Entrenar</strong> — un bloque antes de cada carrera</div>
      <div>🏃 <strong>Correr</strong> — da lo mejor en cada tramo</div>
      <div>📊 <strong>Balance</strong> — revisas cuentas y empiezas más fuerte</div>
    </div>`
  },
  {
    icon:'💪',
    title:'Entrenamiento y carga corporal',
    text:`Entrenar sube tus stats pero acumula <strong>Carga corporal</strong>. Por encima del 70% el rendimiento baja. Si llegas al 100% aparece una lesión. La carga se reduce parcialmente entre temporadas.
    <div style="margin-top:12px;padding:8px 12px;background:var(--avi-t);border-left:3px solid var(--avi-bar);border-radius:4px;font-size:13px;color:var(--ink)">
      💡 <strong>Tip:</strong> Nunca vayas a tope todo el rato — el cuerpo necesita recuperarse.
    </div>`
  },
  {
    icon:'🏃',
    title:'En carrera',
    text:`En cada tramo eliges un ritmo. Ir fuerte gasta <strong>Energía</strong> y <strong>Piernas</strong> más rápido. Usa los <strong>avituallamientos</strong> para recuperar.
    <div style="margin-top:12px;padding:8px 12px;background:var(--neg-t);border-left:3px solid var(--neg);border-radius:4px;font-size:13px;color:var(--ink)">
      ⚠️ Si Energía o Piernas llegan a <strong>0</strong> antes del final, el cuerpo decide por ti: el rendimiento cae en picado y los siguientes entrenos se resienten.
    </div>`
  },
  {
    icon:'💰',
    title:'Economía',
    text:'Tienes gastos fijos de <strong>€95/mes</strong>. El trabajo da ingresos pero recorta horas de entrenamiento. Los <strong>sponsors</strong> pagan si cumples sus objetivos — incumplirlos genera penalización económica y daña tu reputación.'
  },
  {
    icon:'🩹',
    title:'Lesiones',
    text:`La carga corporal alta aumenta el riesgo. Hay 3 tipos:
    <div style="text-align:left;margin-top:10px;line-height:2.1">
      <div>🟡 <strong>${INJURY_TYPES.tendinitis.label}</strong> — ${injuryBlockText('tendinitis')}</div>
      <div>🟠 <strong>${INJURY_TYPES.rotura.label}</strong> — ${injuryBlockText('rotura')}</div>
      <div>🔴 <strong>${INJURY_TYPES.fractura.label}</strong> — ${injuryBlockText('fractura')}</div>
    </div>
    <div style="margin-top:10px;padding:8px 12px;background:var(--avi-t);border-left:3px solid var(--avi-bar);border-radius:4px;font-size:13px;color:var(--ink)">
      💡 Los stats que quita una lesión se recuperan poco a poco. Con <strong>fisioterapeuta</strong>, las bajas son más cortas y la recuperación más rápida.
    </div>`
  },
  {
    icon:'⭐',
    title:'La pestaña Reputación',
    text:`<div style="text-align:left;line-height:1.9">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:10px">Tu presencia en redes te abre puertas:</div>
      <div>📱 Publica posts, da charlas o aparece en medios para ganar <strong>seguidores</strong></div>
      <div>🏆 Más seguidores = mejor salario de <strong>sponsors</strong> e invitaciones a carreras</div>
      <div>⏱ Cada acción cuesta <strong>horas</strong> que no dedicarás a entrenar — elige bien</div>
      <div>💸 Algunas acciones requieren <strong>sponsor activo</strong> para ejecutarse</div>
    </div>`
  },
  {
    icon:'⚖️',
    title:'Entrenamiento vs Reputación',
    text:`<div style="text-align:left;line-height:1.9">
      <div style="font-size:13px;color:var(--ink3);margin-bottom:10px">
        Cada trimestre tienes horas limitadas. Las que dedicas a entrenar no puedes dedicarlas a las redes — y viceversa.
      </div>
      <div>🏃 <strong>Atleta puro</strong> — entrena a tope, vive de resultados y sponsors deportivos</div>
      <div>📱 <strong>Atleta mediático</strong> — menos entreno, más presencia, mejores contratos comerciales</div>
      <div>⚖️ <strong>Equilibrado</strong> — tú decides cada trimestre según cómo va la temporada</div>
      <div style="margin-top:10px;font-size:12px;color:var(--ink3)">No hay una estrategia correcta. Depende de tus objetivos del año.</div>
    </div>`
  }
];
let _tutPage=0;
window.showTutorial=()=>{_tutPage=0;_renderTutCard();document.getElementById('tut-overlay').style.display='flex';};
window.closeTutorial=()=>{document.getElementById('tut-overlay').style.display='none';};
window.tutNav=dir=>{_tutPage=Math.max(0,Math.min(TUTORIAL_CARDS.length-1,_tutPage+dir));_renderTutCard();};
function _renderTutCard(){
  const c=TUTORIAL_CARDS[_tutPage];
  const n=TUTORIAL_CARDS.length;
  const isLast=_tutPage===n-1;
  document.getElementById('tut-content').innerHTML=`
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:44px;margin-bottom:10px">${c.icon}</div>
      <div style="font-size:17px;font-weight:700;margin-bottom:10px">${c.title}</div>
      <div style="font-size:14px;color:var(--ink2);line-height:1.65">${c.text}</div>
    </div>
    <div style="display:flex;justify-content:center;gap:7px;margin-bottom:20px">
      ${TUTORIAL_CARDS.map((_,i)=>`<div style="width:7px;height:7px;border-radius:50%;background:${i===_tutPage?'var(--ink)':'var(--line2)'};transition:background .2s"></div>`).join('')}
    </div>
    <div class="grid-2">
      <button class="main" style="margin-top:0;${_tutPage===0?'visibility:hidden':''}" onclick="tutNav(-1)">← Anterior</button>
      ${isLast
        ?`<button class="main" style="margin-top:0;background:var(--ink);color:var(--card);border-color:var(--ink)" onclick="closeTutorial()">¡Empezar! →</button>`
        :`<button class="main" style="margin-top:0" onclick="tutNav(1)">Siguiente →</button>`
      }
    </div>
    <div style="text-align:center;margin-top:12px">
      <span style="font-size:12px;color:var(--ink3)">${_tutPage+1} / ${n}</span>
    </div>`;
}
