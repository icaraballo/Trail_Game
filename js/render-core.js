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
  const RARITY={easy:{c:'#4a8a2a',bg:'#eaf4ea',l:'Fácil'},medium:{c:'#4a90d9',bg:'#e8f0fb',l:'Medio'},hard:{c:'#c07a10',bg:'#fdf0e0',l:'Difícil'},legendary:{c:'#8b2252',bg:'#f8e8f2',l:'Legendario'},joke:{c:'#b8860b',bg:'#fffbea',l:'😄 Secreto'}};
  const rb=a=>{const r=RARITY[a.rarity]||{c:'#888',bg:'#eee',l:''};return`<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:${r.bg};color:${r.c}">${r.l}</span>`;};
  const totalUnlocked=Object.keys(globalAchs).length;
  // Tab filtering
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
  const chip=(label,field,val)=>`<button onclick="G._achF.${field}='${val}';render()" style="font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid ${f[field]===val?'#c07a10':'#ddd'};background:${f[field]===val?'#fdf0e0':'#fff'};color:${f[field]===val?'#c07a10':'#888'};cursor:pointer;font-weight:${f[field]===val?'700':'400'}">${label}</button>`;
  const tabBtn=(label,val)=>{const active=f.tab===val;return`<button onclick="G._achF.tab='${val}';render()" style="flex:1;padding:10px 8px;border:none;border-bottom:${active?'2px solid #c07a10':'2px solid transparent'};background:transparent;color:${active?'#c07a10':'#888'};font-size:13px;font-weight:${active?'700':'400'};cursor:pointer">${label}</button>`;};
  el.innerHTML=`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <button class="secondary" onclick="G.screen=G._achPrev||'modeSelect';if(G._achPrevTab)G.activeTab=G._achPrevTab;render()" style="font-size:13px;padding:6px 12px">← Volver</button>
      <div>
        <h2 style="margin:0;font-size:20px">🏅 Logros</h2>
        <div style="font-size:12px;color:#888">${totalUnlocked} de ${ACHIEVEMENTS.length} conseguidos</div>
      </div>
    </div>
    <div style="display:flex;gap:0;border-bottom:2px solid #e8e6e0;margin-bottom:12px">
      ${tabBtn('Todos','all')}${tabBtn('Carrera','normal')}${tabBtn('Exprés','expres')}${tabBtn('Canicross','cn')}
    </div>
    <div style="background:#fff;border:1px solid #e8e6e0;border-radius:10px;padding:12px 14px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Rareza</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">
        ${chip('Todos','rarity','all')}${chip('Fácil','rarity','easy')}${chip('Medio','rarity','medium')}${chip('Difícil','rarity','hard')}${chip('Legendario','rarity','legendary')}${chip('😄 Secreto','rarity','joke')}
      </div>
      <div style="font-size:11px;font-weight:700;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Estado</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${chip('Todos','status','all')}${chip('Conseguidos','status','unlocked')}${chip('Pendientes','status','pending')}
      </div>
    </div>
    <div style="font-size:12px;color:#aaa;margin-bottom:8px">${list.length} logro${list.length!==1?'s':''} encontrado${list.length!==1?'s':''}</div>
    <div class="card" style="padding:0">
      ${list.length===0?`<div style="padding:24px;text-align:center;color:#aaa;font-size:13px">Sin logros con estos filtros</div>`:
      list.map((ach,i)=>{
        const meta=globalAchs[ach.id];
        const unlocked=!!meta;
        const isJoke=ach.rarity==='joke';
        const isHardDiff=unlocked&&(meta.difficulty==='dificil'||meta.difficulty==='hardcore');
        const modeIcon=f.tab==='all'?(ach.mode==='cn'?'🐕 ':ach.mode==='expres'?'⚡ ':'🏃 '):'';
        const borderStyle=isHardDiff?'border:2px solid #c07a10;border-radius:6px;':'';
        return`<div style="padding:10px 14px;${i<list.length-1?'border-bottom:1px solid #f0ede8;':''}display:flex;align-items:flex-start;gap:10px;${!unlocked?'opacity:0.55':''}${borderStyle}">
          <span style="font-size:18px;margin-top:1px">${unlocked?'🏆':'🔒'}</span>
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
              <span style="font-size:13px;font-weight:600;color:#1a1a1a">${modeIcon}${unlocked||!isJoke?esc(ach.label):'???'}</span>
              ${rb(ach)}
              ${ach.excl?`<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:#f0e8f8;color:#6b3fa0">Exclusivo</span>`:''}
            </div>
            <div style="font-size:12px;color:#888">${unlocked||!isJoke?esc(ach.desc):'???'}</div>
            ${meta?`<div style="font-size:12px;color:#888;margin-top:2px">Conseguido en ${MODE_LABELS[meta.difficulty]?modeLabelFull(meta.difficulty):meta.difficulty} · Año ${meta.year}</div>`:''}
          </div>
        </div>`;
      }).join('')}
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
};
function icono(k){return `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[k]||''}</svg>`;}
// Cifras del chasis: «€1.800», «−€50». Separador de miles a mano: toLocaleString('es-ES')
// no agrupa los números de cuatro cifras («1800»).
function fmtMiles(n){return String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g,'.');}
function fmtEur(n,signo){return (n<0?'−':signo&&n>0?'+':'')+'€'+fmtMiles(n);}
// Qué acento lleva el chasis (data-modo en <html>, lo lee el CSS de los tokens).
// Solo lee G: pintar no cambia la partida.
function chasisModo(){
  if(G.canicrossMode||G.gameMode==='canicross')return 'canicross';
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
}
function updateFinBar(){
  const bar=document.getElementById('fin-bar');
  if(!bar)return;
  const screens=['intro','workSetup','canicrossAntigua'];   // la mañana de carrera sí lleva la barra (el dinero importa)
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
function topBar(){const race=G.selectedRaces[G.currentRaceIdx];return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span style="font-size:12px;color:#999">${race?.name||''} · ${G.seg+1}/${curSegs().length}</span><span style="font-size:13px;font-weight:600">${fmt(G.time)}</span></div>`;}
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
  el.innerHTML=`
    <h1>Trail Game</h1>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:4px"><span style="font-size:11px;font-weight:700;color:#aaa;letter-spacing:.5px">v${GAME_BUILD} · <button class="enlace-priv" onclick="showPrivacy()">Privacidad</button></span>
      <button class="opinar-btn" onclick="abrirOpinion()"><svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.5 3.5V17.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z"/></svg>Opinar</button></div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
      <p class="sub" style="margin-bottom:0;flex:1">Partidas guardadas</p>
      <button onclick="G._achPrev='saveScreen';G.screen='achievements';render()" style="display:flex;align-items:center;gap:5px;padding:6px 12px;border:1px solid #ddd;border-radius:20px;background:#fff;font-size:12px;font-weight:600;color:#888;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='#f5f4f0'" onmouseleave="this.style.background='#fff'">🏅 Logros</button>
      <button onclick="showTutorial()" style="display:flex;align-items:center;gap:5px;padding:6px 12px;border:1px solid #ddd;border-radius:20px;background:#fff;font-size:12px;font-weight:600;color:#888;cursor:pointer;transition:background .15s" onmouseenter="this.style.background='#f5f4f0'" onmouseleave="this.style.background='#fff'">📖 Tutorial</button>
    </div>

    ${slots.map(({slot,data,info})=>{
      const lbl=slotLabel(data);
      // PUB-02 (v99): lo que no se puede abrir ya no se pinta como «vacía».
      if(info&&(info.kind==='future'||info.kind==='broken')) return `<div class="save-slot slot-locked">
        <div class="save-slot-name">Ranura ${slot+1} — no se puede abrir</div>
        <div class="save-slot-meta">${info.kind==='future'
          ?`La guardó la v${info.build} y esta página es la v${GAME_BUILD}. Recarga la página para abrirla.`
          :`Hay una partida, pero ${esc(info.why)}. Copia sus datos antes de borrarla.`}</div>
        <div class="save-btns">
          ${info.kind==='future'?`<button class="save-btn primary" onclick="location.reload()">Recargar</button>`:''}
          <button class="save-btn" onclick="exportRawSlot(${slot})">Copiar datos</button>
          <button class="save-btn danger" onclick="confirmDeleteSlot(${slot})">Borrar</button>
        </div>
      </div>`;
      if(!lbl) return `<div class="save-slot empty">
        <div class="flex-between-center">
          <div>
            <div class="save-slot-name" style="color:#aaa">Ranura ${slot+1} — vacía</div>
          </div>
          <button class="save-btn primary" onclick="startNewInSlot(${slot})">Nueva partida</button>
        </div>
      </div>`;
      return `<div class="save-slot">
        <div class="flex-between">
          <div class="save-slot-info">
            <div class="save-slot-name">${lbl.runName?`"${esc(lbl.runName)}"`:lbl.name}${lbl.ended?` <span style="font-size:11px;padding:1px 7px;border-radius:4px;background:#fef0f0;color:#7a1010;font-weight:600">📉 Carrera terminada</span>`:''}</div>
            <div class="save-slot-meta">${lbl.runName?esc(lbl.name)+' · ':''}Año ${lbl.year} · Global ${lbl.ranking} · ${lbl.spec} ${lbl.specRanking}</div>
            <div class="save-slot-meta" style="margin-top:2px">${lbl.mode}${lbl.phase?` · <span style="color:#534AB7;font-weight:500">${lbl.phase}</span>`:''}${lbl.totalKm?' · '+lbl.totalKm+'km':''} · ${lbl.date}</div>
            <div class="save-slot-meta" style="margin-top:2px">🏆 ${achNormal} · 🐕 ${achCn} · ⚡ ${achExpres}</div>
          </div>
        </div>
        <div class="save-btns">
          <button class="save-btn primary" onclick="loadSlot(${slot})">Cargar</button>
          <button class="save-btn" onclick="saveCurrentToSlot(${slot})">Sobreescribir</button>
          <button class="save-btn" onclick="exportSlotToClipboard(${slot})">Exportar</button>
          <button class="save-btn danger" onclick="confirmDeleteSlot(${slot})">Borrar</button>
        </div>
      </div>`;
    }).join('')}

    <div style="border-top:1px solid #e8e6e0;margin-top:16px;padding-top:16px">
      <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:8px">Importar partida</div>
      <div style="font-size:12px;color:#aaa;margin-bottom:8px">Pega aquí el texto exportado y elige en qué ranura guardarla</div>
      <div style="font-size:11px;color:#b8a88a;background:#fdf8f2;
  border:1px solid #e8dfc8;border-radius:6px;padding:8px 10px;
  margin-bottom:10px">
        💡 <strong>Consejo:</strong> las partidas viven solo en este
    navegador. Usa <strong>Exportar</strong> de vez en cuando y guarda el
    texto: si borras los datos del navegador o cambias de móvil, lo
    pegas aquí y sigues donde ibas.
      </div>
      <textarea class="import-area" id="import-txt" placeholder="Pega aquí el texto TRAIL_SAVE_V2::..."></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
        ${slots.map(({slot})=>`<button class="save-btn" onclick="doImport(${slot})">→ Ranura ${slot+1}</button>`).join('')}
      </div>
    </div>

    <button class="main" style="margin-top:20px" onclick="closeSaveScreen()">← Volver${G._prevScreen&&G._prevScreen!=='modeSelect'?' a la partida':''}</button>`;
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

function renderModeSelect(){
  const el=$main();
  const modeColors={
    facil:    {bg:'#f2faf0', border:'#8cc88c', tick:'#2d7a2d',  iconBg:'#e0f2e0'},
    medio:    {bg:'#fef9ec', border:'#e8c97a', tick:'#c07a10',  iconBg:'#fef3d0'},
    dificil:  {bg:'#fff0ee', border:'#e8a0a0', tick:'#c0392b',  iconBg:'#fde0de'},
    hardcore: {bg:'#eeece8', border:'#aaaaaa', tick:'#555555',  iconBg:'#e4e2dc'},
  };
  const modes=[
    {id:'facil',    icon:'🟢', label:'Fácil',    desc:'Rivales accesibles · sin penalizaciones duras · para descubrir el juego'},
    {id:'medio',    icon:'🟡', label:'Medio',    desc:'Lesiones frecuentes · economía ajustada · el modo base actual'},
    {id:'dificil',  icon:'🔴', label:'Difícil',  desc:'Errores tienen consecuencias · sponsors exigentes · élite inalcanzable'},
    {id:'hardcore', icon:'💀', label:'Hardcore', desc:'Material importa · fractura = temporada perdida · sin red de seguridad'},
  ];
  const otherModes=[
    {id:'expres',        icon:'⚡',  label:'Carrera Exprés',  desc:'3 temporadas · sin jornada laboral · ganancias ×1.5', available:true,  lockable:false},
    {id:'infinite_prog', icon:'📈',  label:'Modo infinito',   desc:'Dificultad progresiva · sin techo · próximamente',   available:false, lockable:false},
    {id:'coach',         icon:'📋',  label:'Entrenador',      desc:'Lleva un atleta ajeno · honorarios + bonus',          available:true,  lockable:true},
    {id:'club',          icon:'🏕️', label:'Club',            desc:'Gestiona un club · plantilla · presupuesto',          available:true,  lockable:true},
    {id:'canicross',     icon:'🐕',  label:'Canicross',       desc:'Corres con tu perro · vínculo · ⚠ en obras: sus partidas no pasarán a la versión nueva', available:true, lockable:false},
  ];
  // Leer desbloqueos del localStorage
  let unlocked={coach:false,club:false};
  try{Object.assign(unlocked,JSON.parse(LS.get('unlocked')||'{}'));}catch(e){}

  const sel=G.gameMode||'medio';
  el.innerHTML=`
    <h1>Monte Perdido Trail</h1>
    <p class="sub">Elige tu modo de juego</p>

    <div class="carrera-group" style="${modeColors[sel]?`border-color:${modeColors[sel].border};`:''}">
      <div class="carrera-group-header" onclick="toggleModeGroup()" style="${modeColors[sel]?`background:${modeColors[sel].bg};`:''}">
        <div style="width:36px;height:36px;border-radius:8px;background:${modeColors[sel]?modeColors[sel].iconBg:'#EAF3DE'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">🏃</div>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:600;color:var(--color-text-primary)">Modo carrera</div>
          <div style="font-size:12px;color:var(--color-text-secondary)">${modeColors[sel]?`<span style="font-weight:600;color:${modeColors[sel].tick}">${modes.find(m=>m.id===sel)?.label||''}</span> · `:''}Gestión completa · 4 niveles de dificultad</div>
        </div>
        <span id="modegroup-arrow" style="font-size:12px;color:${modeColors[sel]?modeColors[sel].tick:'var(--color-text-tertiary)'};transition:transform .2s;display:inline-block">▶</span>
      </div>
      <div class="carrera-group-content" id="modegroup-content">
        ${modes.map(m=>{
          const isSel=sel===m.id;
          const mc=modeColors[m.id]||{};
          const cardStyle=isSel?`background:${mc.bg};border:1.5px solid ${mc.border};`:'';
          const iconStyle=isSel?`background:${mc.iconBg};border:0.5px solid ${mc.border};`:'background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);';
          return `
          <div class="diff-card" style="${cardStyle}" onclick="selectMode('${m.id}')">
            <div style="width:30px;height:30px;border-radius:6px;${iconStyle}display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${m.icon}</div>
            <div style="flex:1">
              <div style="font-size:13px;font-weight:${isSel?'600':'400'};color:var(--color-text-primary)">${m.label}</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">${m.desc}</div>
            </div>
            ${isSel?`<span style="font-size:14px;font-weight:700;color:${mc.tick}">✓</span>`:''}
          </div>`;}).join('')}
      </div>
    </div>

    <div style="font-size:12px;font-weight:500;color:var(--color-text-tertiary);letter-spacing:.6px;text-transform:uppercase;margin-bottom:8px;margin-top:16px">Otros modos</div>
    <div class="carrera-group" style="margin-top:0">
      ${otherModes.map(m=>{
        // Próximamente
        if(!m.available){
          return `<div class="carrera-group-header" style="opacity:0.42;cursor:default">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--color-background-secondary);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${m.icon}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500;color:var(--color-text-primary)">${m.label}</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">${m.desc}</div>
            </div>
            <span style="font-size:12px;color:var(--color-text-tertiary)">Próx.</span>
          </div>`;
        }
        // Lockable y bloqueado
        if(m.lockable&&!unlocked[m.id]){
          return `<div class="carrera-group-header" style="opacity:0.55;cursor:default">
            <div style="width:36px;height:36px;border-radius:8px;background:var(--color-background-secondary);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${m.icon}</div>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:500;color:var(--color-text-primary)">${m.label} 🔒</div>
              <div style="font-size:12px;color:var(--color-text-secondary)">Sigue el arco narrativo en modo carrera para desbloquear</div>
            </div>
          </div>`;
        }
        // Lockable y desbloqueado — dos botones
        if(m.lockable&&unlocked[m.id]){
          return `<div style="padding:12px 14px;border-bottom:1px solid var(--color-border-tertiary)">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="width:36px;height:36px;border-radius:8px;background:#EEEDFE;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${m.icon}</div>
              <div style="flex:1">
                <div style="font-size:14px;font-weight:600;color:#3C3489">${m.label} <span style="font-size:11px;background:#EEEDFE;color:#534AB7;padding:1px 6px;border-radius:4px;font-weight:500">Desbloqueado</span></div>
                <div style="font-size:12px;color:var(--color-text-secondary)">${m.desc}</div>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <button class="main" style="margin-top:0;font-size:13px;padding:9px 8px;border-color:#534AB7;color:#3C3489" onclick="selectAndConfirm('${m.id}','continuar')">Continuar historia</button>
              <button class="main" style="margin-top:0;font-size:13px;padding:9px 8px" onclick="selectAndConfirm('${m.id}','nuevo')">Nuevo desde cero</button>
            </div>
          </div>`;
        }
        // Normal (expres)
        const isSel=sel===m.id;
        return `<div class="carrera-group-header" onclick="selectMode('${m.id}')" style="${isSel?'background:#fef9ec;border-bottom:1px solid #e8e6e0':''}">
          <div style="width:36px;height:36px;border-radius:8px;background:${isSel?'#fef9ec':'var(--color-background-secondary)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${m.icon}</div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:${isSel?'600':'500'};color:${isSel?'#c07a10':'var(--color-text-primary)'}">${m.label}</div>
            <div style="font-size:12px;color:var(--color-text-secondary)">${m.desc}</div>
          </div>
          <span style="font-size:12px;color:#c07a10;font-weight:600">${isSel?'✓':''}</span>
        </div>`;
      }).join('')}
    </div>

    <button class="secondary" style="margin-top:12px;width:100%;text-align:center" onclick="G.screen='achievements';render()">🏅 Ver todos los logros</button>
    <button class="main" style="margin-top:16px" onclick="confirmMode()">Continuar →</button>
    <button class="main" style="margin-top:6px;opacity:0.6" onclick="G.screen='saveScreen';render()">← Volver a partidas guardadas</button>`;
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
  el.innerHTML=`
    <h1>Trail Game</h1>
    <p class="sub">Crea tu corredor y empieza tu carrera deportiva</p>
    <div style="display:inline-block;font-size:11px;font-weight:700;color:#aaa;letter-spacing:.5px;margin-bottom:8px">v${GAME_BUILD}</div>
    ${G.gameMode==='expres'?`<div class="warn" style="margin-bottom:14px">⚡ <strong>Carrera Exprés</strong> — 3 temporadas · sin gestión de jornada · ganancias de entrenamiento ×1.5</div>`:''}
    <label class="field-label">Nombre de la partida</label>
    <input id="runname" type="text" placeholder="Ej: Temporada del reto, Sin trabajo año 1..." value="${esc(G.runName||'')}" maxlength="30" style="margin-bottom:14px"/>
    <label class="field-label">Tu nombre</label>
    <input id="rname" type="text" placeholder="Nombre del corredor" value="${esc(r.name)}" maxlength="22"/>
    <label class="field-label">Edad inicial</label>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">
      ${[18,22,25,28,30,35].map(a=>`<div onclick="G.runner.age=${a};G.runner.stats=applyAgeToStats({...SPEC_STATS[G.runner.specialty]},${a});render()" style="padding:7px 14px;border-radius:8px;border:1px solid ${(r.age||25)===a?'#1a1a1a':'#ddd'};background:${(r.age||25)===a?'#f0ede8':'#fff'};cursor:pointer;font-size:14px;font-weight:${(r.age||25)===a?'600':'400'}">${a}</div>`).join('')}
    </div>
    <label class="field-label">Especialidad</label>
    <div class="grid2" style="margin-bottom:20px">
      ${[['fondista','Fondista','Fondo y llano rápido'],['montanero','Montañero','Subidas y altitud'],['tecnico','Técnico','Descensos difíciles'],['todoterreno','Todoterreno','Equilibrado en todo']].map(([id,l,d])=>`
        <div class="spec ${r.specialty===id?'sel':''}" onclick="selSpec('${id}')">
          <div class="spec-label">${l}</div>
          <div class="spec-desc">${d}</div>
        </div>`).join('')}
    </div>
    <div class="card" style="margin-bottom:18px">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px">
        <div class="sec-title-sm" style="margin-bottom:0">Stats iniciales</div>
        ${(r.age||25)!==25?`<div style="font-size:11px;color:#888">vs. base edad 25</div>`:''}
      </div>
      ${(()=>{
        const _adj=applyAgeToStats(SPEC_STATS[r.specialty],r.age||25);
        const _base=SPEC_STATS[r.specialty];
        return Object.entries(_adj).map(([k,v])=>{
          const d=v-_base[k];
          const dHtml=d>0?`<span style="color:#4a8a2a;font-size:11px;font-weight:700;margin-left:3px">+${d}</span>`:d<0?`<span style="color:#c0392b;font-size:11px;font-weight:700;margin-left:3px">${d}</span>`:'';
          return `<div class="bar-row"><span class="bar-label">${k.charAt(0).toUpperCase()+k.slice(1)}${dHtml}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${v}%;background:${v>=62?'#4a8a2a':v>=45?'#4a90d9':'#c07a10'}"></div></div><span class="bar-pct">${v}</span></div>`;
        }).join('');
      })()}
    </div>
    ${G.gameMode==='canicross'?`<div class="note" style="margin-bottom:12px">🐕 <strong>Modo Canicross</strong> — A continuación crearás tu perro y eliges raza.</div>`:''}
    <button class="main" onclick="${G.gameMode==='canicross'?'doStartCanicross':'doStart'}()">Empezar →</button>`;
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
      <div style="font-size:13px;color:#888;margin-bottom:10px">Cada temporada repites este ciclo:</div>
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
    <div style="margin-top:12px;padding:8px 12px;background:#fffbf0;border-left:3px solid #c07a10;border-radius:4px;font-size:13px;color:#8a5a00">
      💡 <strong>Tip:</strong> Nunca vayas a tope todo el rato — el cuerpo necesita recuperarse.
    </div>`
  },
  {
    icon:'🏃',
    title:'En carrera',
    text:`En cada tramo eliges un ritmo. Ir fuerte gasta <strong>Energía</strong> y <strong>Piernas</strong> más rápido. Usa los <strong>avituallamientos</strong> para recuperar.
    <div style="margin-top:12px;padding:8px 12px;background:#fff5f5;border-left:3px solid #c0392b;border-radius:4px;font-size:13px;color:#8a0000">
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
    <div style="margin-top:10px;padding:8px 12px;background:#fffbf0;border-left:3px solid #c07a10;border-radius:4px;font-size:13px;color:#8a5a00">
      💡 Los stats que quita una lesión se recuperan poco a poco. Con <strong>fisioterapeuta</strong>, las bajas son más cortas y la recuperación más rápida.
    </div>`
  },
  {
    icon:'⭐',
    title:'La pestaña Reputación',
    text:`<div style="text-align:left;line-height:1.9">
      <div style="font-size:13px;color:#888;margin-bottom:10px">Tu presencia en redes te abre puertas:</div>
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
      <div style="font-size:13px;color:#888;margin-bottom:10px">
        Cada trimestre tienes horas limitadas. Las que dedicas a entrenar no puedes dedicarlas a las redes — y viceversa.
      </div>
      <div>🏃 <strong>Atleta puro</strong> — entrena a tope, vive de resultados y sponsors deportivos</div>
      <div>📱 <strong>Atleta mediático</strong> — menos entreno, más presencia, mejores contratos comerciales</div>
      <div>⚖️ <strong>Equilibrado</strong> — tú decides cada trimestre según cómo va la temporada</div>
      <div style="margin-top:10px;font-size:12px;color:#aaa">No hay una estrategia correcta. Depende de tus objetivos del año.</div>
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
      <div style="font-size:14px;color:#555;line-height:1.65">${c.text}</div>
    </div>
    <div style="display:flex;justify-content:center;gap:7px;margin-bottom:20px">
      ${TUTORIAL_CARDS.map((_,i)=>`<div style="width:7px;height:7px;border-radius:50%;background:${i===_tutPage?'#1a1a1a':'#ddd'};transition:background .2s"></div>`).join('')}
    </div>
    <div class="grid-2">
      <button class="main" style="margin-top:0;${_tutPage===0?'visibility:hidden':''}" onclick="tutNav(-1)">← Anterior</button>
      ${isLast
        ?`<button class="main" style="margin-top:0;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="closeTutorial()">¡Empezar! →</button>`
        :`<button class="main" style="margin-top:0" onclick="tutNav(1)">Siguiente →</button>`
      }
    </div>
    <div style="text-align:center;margin-top:12px">
      <span style="font-size:12px;color:#bbb">${_tutPage+1} / ${n}</span>
    </div>`;
}
