function updateEmotionalState(){
  const trust=G.coachTrust||60;
  const load=G.coachBodyLoad||0;
  const results=G.coachRaceResults||[];
  const log=G.coachDecisionLog||[];
  const prev=G.coachEmotionalState||'fresco';

  // Decisiones positivas en log
  const posDecisions=log.filter(d=>d.positive).length;
  const negDecisions=log.filter(d=>!d.positive).length;

  // Racha reciente (últimas 2 carreras)
  const recent=results.slice(-2);
  const recentBad=recent.filter(r=>r.dnf||r.pos>15).length;
  const recentGood=recent.filter(r=>!r.dnf&&r.pos<=5).length;

  let next=prev;

  if(prev==='quemado'){
    // Puede recuperarse si trust sube y hay decisiones positivas
    if(trust>=60&&posDecisions>=2)next='recuperado';
  } else if(prev==='recuperado'){
    if(recentGood>=1&&trust>=65)next='confiado';
    else if(load>85||negDecisions>posDecisions)next='dudoso';
  } else if(prev==='confiado'){
    if(recentBad>=2||trust<40)next='dudoso';
    else if(load>90)next='quemado';
  } else if(prev==='dudoso'){
    if(trust>=70&&recentGood>=1)next='confiado';
    else if(trust<30||load>85)next='quemado';
    else if(posDecisions>=3&&trust>=50)next='fresco';
  } else { // fresco
    if(recentGood>=1&&trust>=65)next='confiado';
    else if(recentBad>=2||trust<35)next='dudoso';
    else if(load>90)next='quemado';
  }

  if(next!==prev){
    G.coachEmotionalState=next;
    const es=EMOTIONAL_STATES[next];
    showToast(`${es.emoji} ${G.coachAthlete?.name?.split(' ')[0]||'Atleta'}: estado → ${es.label}`);
  }
}
// ── Estilos de entrenador (E10) ─────────────────────────────────────────────
function updateCoachTrait(){
  if(!G.coachDecisionLog)return;
  const log=G.coachDecisionLog;
  const hist=G.coachAthleteHistory||[];
  for(const t of TRAINER_TRAITS){
    try{if(t.condition(log,hist)){G.coachTrait=t.id;return;}}catch(e){}
  }
}
// type: string id único | label: texto legible | positive: bool
function logCoachDecision(type, label, positive){
  if(!G.coachDecisionLog)G.coachDecisionLog=[];
  // No duplicar el mismo tipo en la misma temporada
  const alreadyThisSeason=G.coachDecisionLog.some(d=>d.type===type&&d.season===G.coachSeason);
  if(alreadyThisSeason)return;
  G.coachDecisionLog.push({type,label,positive,season:G.coachSeason});
  // Mantener máximo 12 entradas totales (histórico multi-temporada)
  if(G.coachDecisionLog.length>12)G.coachDecisionLog.shift();
}
// ══════════════════════════════════════
//  MULTI-ATLETA — GESTIÓN DE SLOTS
// ══════════════════════════════════════
function coachSlotKeys(){
  return['coachAthlete','coachSeason','coachTrust','coachEarnings','coachSelectedRaces',
    'coachRaceIdx','coachRaceResults','coachBodyLoad','coachRaceData','coachRaceAnimIdx',
    'coachRaceAidPaused','coachLastTraining','coachNemesis','coachPendingEvent',
    'coachLastDialogue','coachDayCondition','coachRaceEventPending','coachEventLog',
    'coachGels','coachGelsUsed','coachRadioUsed','coachAidExtras','coachPreRaceBlock',
    'coachSeasonObjective','coachInjury','coachSponsors','coachSponsorPool',
    'coachRadioWindowOpen','coachTrainingSelected','coachPool','_coachSlotNotifs',
    'coachEmotionalState','coachDecisionLog','coachTrainerStyle','coachTrait'];
}

// T101 (v88): saveCoachSlot guardaba el MISMO objeto que G (coachAthlete,
// coachRaceResults, coachSponsors…), no un clon. Mutar el atleta activo mutaba
// también su entrada del roster y al revés: es la causa probable de cualquier
// "se me ha mezclado el progreso de dos atletas". Se clona en ambos sentidos.
// Los dos sitios que pintan el roster (coachSlotNotifCount y renderCoachHub) ya
// llaman a saveCoachSlot() antes de leer, así que la copia no queda obsoleta.
function cloneSlotValue(v){
  if(v==null||typeof v!=='object')return v;
  try{return structuredClone(v);}catch(e){return JSON.parse(JSON.stringify(v));}
}

function saveCoachSlot(){
  const idx=G.coachActiveIdx||0;
  if(!G.coachRoster)G.coachRoster=[];
  const slot={};
  coachSlotKeys().forEach(k=>{slot[k]=cloneSlotValue(G[k]);});
  G.coachRoster[idx]=slot;
}

function loadCoachSlot(idx){
  if(!G.coachRoster||!G.coachRoster[idx])return;
  const slot=G.coachRoster[idx];
  G.coachActiveIdx=idx;
  // T100 (v88): con `if(k in slot)` una clave ausente en el slot destino dejaba
  // en pie el valor del atleta que estabas mirando antes. Se parte del valor
  // limpio de freshState() en ese caso.
  const fresh=freshState();
  coachSlotKeys().forEach(k=>{G[k]=(k in slot)?cloneSlotValue(slot[k]):cloneSlotValue(fresh[k]);});
}

window.switchCoachSlot=idx=>{
  if(idx===(G.coachActiveIdx||0)){G.screen='coachHome';G.activeTab='game';render();return;}
  saveCoachSlot();
  loadCoachSlot(idx);
  G.screen='coachHome';G.activeTab='game';render();
};

function coachSlotUnlocked(idx){
  if(idx===0)return true;
  if(idx===1)return(G.coachReputation||0)>=40;
  if(idx===2)return(G.coachReputation||0)>=70;
  return false;
}

// T111 (v92): llamaba a saveCoachSlot() en cada invocación, y se la invoca una
// vez por slot dentro del map que pinta el roster — tres clonados profundos por
// render. NO se puede quitar del todo: el comentario de T101 (v88) explica que
// el roster guarda clones y se queda obsoleto si no se refresca antes de leer.
// Así que sube a las dos funciones que pintan, una sola vez cada una. Quitarlo
// de verdad exige que el roster deje de ser una caché de clones (T55/T58).
function coachSlotNotifCount(idx){
  const slot=G.coachRoster[idx];
  if(!slot||!slot.coachAthlete)return 0;
  let n=0;
  if((slot._coachSlotNotifs||[]).filter(x=>!x.read).length)n+=(slot._coachSlotNotifs||[]).filter(x=>!x.read).length;
  if(slot.coachPendingEvent&&!slot.coachPendingEvent.resolved)n++;
  return n;
}

function addCoachNotif(text,type='info'){
  if(!G._coachSlotNotifs)G._coachSlotNotifs=[];
  G._coachSlotNotifs.push({text,type,read:false,ts:Date.now()});
}

function markNotifsRead(){
  (G._coachSlotNotifs||[]).forEach(n=>n.read=true);
}
// Paso 6 de la dirección visual (2026-10-30): tipo Formulario: cada candidato en una opción
// con su ficha resumida; la personalidad como chip neutro (el color del dato ya no se usa).
function coachChip(t,title){return`<span class="pz-chip" style="margin:0;background:var(--soft)"${title?` title="${title}"`:''}>${t}</span>`;}
function renderCoachSelect(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';
  const pool=G.coachPool||[];
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">📋 Elige tu atleta</div>
    <p class="pz-sub">${G._coachUnlockedHint?'Tu nombre como corredor te abre puertas. Elige a quién quieres entrenar.':'Te presentan a tres corredores. Solo puedes entrenar a uno.'}</p>
    ${G._coachUnlockedHint?`<div class="pz-diag mas">Con tu historial como atleta, uno de los candidatos es de un nivel que normalmente no llegaría a ti tan pronto.</div>`:''}
    ${pool.map(a=>{
      const pl=PERSONALITY_LABEL[a.personality];
      return`<button class="pz-opcion sin-check" onclick="doCoachSelect('${a.id}')">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:24px">${a.flag}</span>
          <span class="pz-fila-txt"><b>${a.name}</b><div class="pz-efectos">${a.age} años${a.age>=33?' · en declive':a.age<23?' · en formación':''} · ${SPEC_LABEL[a.spec]||a.spec}</div></span>
          <span style="text-align:right"><div class="pz-efectos">Honorarios</div><span class="pz-num">€${a.monthlyFee}/mes</span></span>
        </div>
        <p style="margin:8px 0;font-style:italic;color:var(--ink2)">«${a.bio}»</p>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">${coachChip(pl.emoji+' '+pl.label)}<span class="pz-efectos">${pl.desc}</span></div>
        ${Object.entries(a.baseStats).map(([k,v])=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <span class="pz-efectos" style="width:78px">${k.charAt(0).toUpperCase()+k.slice(1)}</span>
          <div class="pz-barra" style="flex:1"><div class="pz-relleno" style="width:${v}%;background:var(--acc)"></div></div>
          <span class="pz-num" style="width:24px;text-align:right">${v}</span></div>`).join('')}
      </button>`;
    }).join('')}
    <button class="pz-btn sec" onclick="G.screen='modeSelect';render()">← Volver</button>
  </div>`;
}

window.doCoachSelect=id=>{
  const a=(G.coachPool||[]).find(x=>x.id===id);
  if(!a)return;
  G.coachAthlete={...a,currentStats:{...a.baseStats}};
  G.coachTrust=60;G.coachSeason=1;G.coachEarnings=0;
  G.coachSelectedRaces=[];G.coachRaceIdx=0;G.coachRaceResults=[];
  G.coachBodyLoad=0;G.coachLastTraining=null;G.coachRaceData=null;
  G.coachRaceAnimIdx=0;G.coachRaceAidPaused=false;
  G.coachNemesis=null;G.coachPendingEvent=null;G.coachLastDialogue=null;
  G.coachDayCondition=null;G.coachRaceEventPending=null;G.coachEventLog=[];
  G.coachGels=3;G.coachGelsUsed=0;G.coachRadioUsed={};G.coachAidExtras={};G.coachPreRaceBlock=null;
  G.coachSeasonObjective=null;G.coachInjury=null;G.coachSponsors=[];G.coachSponsorPool=null;G.coachRadioWindowOpen=false;
  G._coachSlotNotifs=[];
  // T100 (v88): aquí se reseteaban las 20 claves del atleta menos esta, que hacía
  // `G.coachDecisionLog=G.coachDecisionLog||[]` y por tanto heredaba el log del
  // atleta anterior: sus decisiones aparecían en el historial del recién fichado.
  G.coachEmotionalState='fresco';G.coachDecisionLog=[];
  generateCoachSeasonObjective();
  generateCoachSponsorPool();
  saveCoachSlot();
  if(!G.coachTrainerStyle){G.screen='coachStyleSelect';render();return;}
  G.screen='coachHub';G.activeTab='game';
  autoSave();render();
};

// Paso 6 de la dirección visual (2026-10-30): tipo Decisión; efectos en línea (+ verde, − rojo).
function renderCoachStyleSelect(){
  const el=$main();
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';
  const sel=G._pendingTrainerStyle||null;
  const ef=(v,txt,inv)=>{const k=inv?-v:v;return`<span class="${k>0?'pz-mas':k<0?'pz-menos':''}">${v>=0?'+':''}${v}${txt}</span>`;};   // inv: menos carga es bueno
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">🎯 ¿Cómo entrenas?</div>
    <p class="pz-sub">Tu estilo define cómo interactúas con el atleta. No se puede cambiar una vez elegido.</p>
    ${Object.entries(TRAINER_STYLES).map(([id,s])=>`<button class="pz-opcion${sel===id?' sel':''}" onclick="G._pendingTrainerStyle='${id}';render()">
      <b>${s.emoji} ${s.label}</b><div class="pz-efectos" style="margin-bottom:4px">${s.desc}</div>
      <div class="pz-efectos">${[ef(s.trustMod,' confianza/carrera'),ef(s.bodyLoadMod,' carga',true),ef(s.perfMod,' % rendimiento'),s.trainingBonus?`<span class="pz-mas">↑ ${s.trainingBonus}</span>`:'',s.trainingPenalty?`<span class="pz-menos">↓ ${s.trainingPenalty}</span>`:''].filter(Boolean).join(' · ')}</div>
    </button>`).join('')}
    <button class="pz-btn" style="margin-top:10px;${!sel?'opacity:0.4;pointer-events:none':''}" onclick="doConfirmTrainerStyle()">Confirmar estilo →</button>
    <button class="pz-btn sec" onclick="G._pendingTrainerStyle=null;G.screen='coachSelect';render()">← Volver</button>
  </div>`;
}

window.doConfirmTrainerStyle=()=>{
  if(!G._pendingTrainerStyle)return;
  G.coachTrainerStyle=G._pendingTrainerStyle;
  G._pendingTrainerStyle=null;
  showToast(`Estilo: ${TRAINER_STYLES[G.coachTrainerStyle].emoji} ${TRAINER_STYLES[G.coachTrainerStyle].label}`);
  G.screen='coachHub';G.activeTab='game';
  autoSave();render();
};


function renderCoachHome(){
  const el=$main();
  const a=G.coachAthlete;
  if(!a){G.screen='coachSelect';render();return;}
  const pl=PERSONALITY_LABEL[a.personality];
  const racesSelected=(G.coachSelectedRaces||[]).length>0;
  const allDone=racesSelected&&G.coachRaceIdx>=(G.coachSelectedRaces||[]).length;
  const nextRace=racesSelected?(G.coachSelectedRaces||[])[G.coachRaceIdx]:null;
  const trustColor=G.coachTrust>=60?'var(--pos)':G.coachTrust>=30?'var(--avi-bar)':'var(--neg)';
  const trustLabel=G.coachTrust>=80?'Excelente':G.coachTrust>=60?'Buena':G.coachTrust>=30?'Tensa':'Crítica';
  const results=G.coachRaceResults||[];
  markNotifsRead();

  // Build slot tabs
  saveCoachSlot(); // T111/T112 (v92): una vez antes de pintar, no una por slot
  const roster=G.coachRoster||[];
  const activeIdx=G.coachActiveIdx||0;
  const filledSlots=roster.filter(s=>s&&s.coachAthlete).length;
  const slot1Unlocked=coachSlotUnlocked(1);
  const slot2Unlocked=coachSlotUnlocked(2);
  const tabsHtml=`
    <div class="slot-tabs" style="margin-bottom:14px">
      ${roster.map((s,i)=>{
        if(!s||!s.coachAthlete)return'';
        const notifs=coachSlotNotifCount(i);
        const isActive=i===activeIdx;
        return`<button class="slot-tab ${isActive?'active':''}" onclick="switchCoachSlot(${i})">
          ${s.coachAthlete.flag} ${esc(s.coachAthlete.name.split(' ')[0])}
          ${notifs>0&&!isActive?`<span class="notif-dot"></span>`:''}
        </button>`;
      }).join('')}
      ${filledSlots<2&&slot1Unlocked?`<button class="slot-tab" onclick="addCoachSlot()" style="border-style:dashed;color:var(--acc)">+ Atleta</button>`:''}
      ${filledSlots===2&&slot2Unlocked?`<button class="slot-tab" onclick="addCoachSlot()" style="border-style:dashed;color:var(--acc)">+ Atleta</button>`:''}
    </div>`;

  // Paso 6 de la dirección visual (2026-10-30): tipo Hub de modo: el atleta como cabecera (con sus
  // slots), confianza como barra, lesión y objetivo como diagnósticos y el evento pendiente
  // resaltado en familia gente. Estilo, rasgo, personalidad y estado en chips neutros.
  const fila=(t,v,cl)=>`<div class="pz-fila"><span class="pz-fila-txt">${t}</span><span class="pz-fila-dato ${cl||''}">${v}</span></div>`;
  const st=G.coachTrainerStyle?TRAINER_STYLES[G.coachTrainerStyle]:null;
  const trait=G.coachTrait?TRAINER_TRAITS.find(t=>t.id===G.coachTrait):null;
  const es=EMOTIONAL_STATES[G.coachEmotionalState||'fresco'];
  const lesion=G.coachInjury&&G.coachInjury.racesLeft>0;
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='coachHub';render()">← Hub</button>
      <span class="pz-efectos">Rep. entrenador <b class="pz-num">${G.coachReputation||0}/100</b></span>
    </div>
    ${filledSlots>1?tabsHtml:''}
    <div class="pz-tarjeta" style="border-color:var(--acc);border-width:1.5px">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">${a.flag}</span>
        <span class="pz-fila-txt"><span class="pz-titulo" style="font-size:22px;margin:0">${esc(a.name)}</span><div class="pz-efectos">Temporada ${G.coachSeason} · ${SPEC_LABEL[a.spec]||a.spec}</div></span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${coachChip(pl.emoji+' '+pl.label)}${coachChip(es.emoji+' '+es.label,es.desc)}${st?coachChip(st.emoji+' '+st.label):''}${trait?coachChip(trait.emoji+' '+trait.label,trait.desc):''}</div>
      <div style="display:flex;justify-content:space-between;margin:12px 0 4px"><span class="pz-label">Confianza del atleta</span><span class="pz-num">${G.coachTrust}/100 · ${trustLabel}</span></div>
      <div class="pz-barra"><div class="pz-relleno" style="width:${G.coachTrust}%;background:${trustColor}"></div></div>
      ${G.coachTrust<30?`<div class="pz-diag menos" style="margin-top:6px"><b>Confianza crítica.</b> Si no mejoras los resultados, el atleta puede marcharse.</div>`:''}
    </div>
    ${G.coachPendingEvent?`<button class="pz-opcion sin-check fam-gente" style="border-color:var(--gente);border-width:1.5px" onclick="G.screen='coachEvent';render()">
      <span class="pz-etiqueta fam-gente">${G.coachPendingEvent.icon||'📋'} Quiere hablar contigo</span>
      <b style="display:block;margin-top:4px">${G.coachPendingEvent.title} →</b>
    </button>`:''}
    ${lesion?`<div class="pz-diag menos"><b>🩹 ${G.coachInjury.label}</b> · ${G.coachInjury.racesLeft} carrera${G.coachInjury.racesLeft!==1?'s':''} de baja. ${G.coachInjury.desc}</div>`:''}
    ${G.coachSeasonObjective?`<div class="pz-diag ${G.coachSeasonObjective.met?'mas':''}"><b>Objetivo de ${esc(a.name)}${G.coachSeasonObjective.met?' (cumplido)':''}:</b> ${G.coachSeasonObjective.label}. <i>${G.coachSeasonObjective.desc}</i></div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Temporada</div>
    <div class="pz-tarjeta">
      <div>${!racesSelected?'📅 Aún no has planificado el calendario de esta temporada.'
        :allDone?`✅ Temporada completa — ${results.filter(r=>!r.dnf).length} carreras finalizadas.`
        :`🏃 ${G.coachRaceIdx}/${(G.coachSelectedRaces||[]).length} carreras. Próxima: <b>${esc(nextRace?.name||'—')}</b>`}</div>
      ${G.coachBodyLoad>70?`<div class="pz-diag ojo" style="margin-top:6px">Carga corporal del atleta: ${Math.round(G.coachBodyLoad)} % — considera un bloque de recuperación.</div>`:''}
    </div>
    ${allDone?`<button class="pz-btn" onclick="G.screen='coachSeasonEnd';render()">Ver balance de temporada →</button>`
    :!racesSelected?`<button class="pz-btn" onclick="G.screen='coachCalendar';G.activeTab='calendar';render()">📅 Planificar carreras de la temporada</button>
      ${(G.coachSponsorPool||[]).length>0&&(G.coachSponsors||[]).length<2?`<button class="pz-btn sec" onclick="G.screen='coachSponsors';render()">🤝 Negociar sponsors del atleta (${(G.coachSponsorPool||[]).length} oferta${(G.coachSponsorPool||[]).length!==1?'s':''})</button>`:''}`
    :`<button class="pz-btn sec" onclick="G.screen='coachTraining';render()">💪 Proponer bloque de entrenamiento</button>
      ${lesion?`<div class="pz-diag ojo">${esc(a.name)} está lesionado — no puede correr ${G.coachInjury.racesLeft} carrera${G.coachInjury.racesLeft!==1?'s':''} más. Se saltará la próxima.</div>
        <button class="pz-btn pz-bloqueado" disabled>🏁 Carrera bloqueada por lesión</button>`
      :`<button class="pz-btn" onclick="doCoachStartRace()">🏁 Ir a la carrera — ${esc(nextRace?.name||'siguiente')}</button>`}`}
    ${G.coachNemesis&&G.coachNemesis.wins>=2?`<div class="pz-diag ojo" style="margin-top:8px">🎯 <b>${esc(G.coachNemesis.name)}</b> lleva ${G.coachNemesis.wins} carreras superando a ${esc(a.name)}. Está en la cabeza del atleta.</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Economía de la temporada</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${fila('Honorarios',`€${a.monthlyFee||250}/mes`)}
      ${fila('Acumulado',fmtEur(G.coachEarnings||0,true),'pz-mas')}
    </div>
    ${results.length>0?`<div class="pz-label" style="margin:14px 0 6px">Resultados esta temporada</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${results.map((r,i)=>fila(esc((G.coachSelectedRaces||[])[i]?.name||r.raceName||'Carrera '+(i+1)),r.dnf?'DNF':r.pos+'.º',r.dnf?'pz-menos':'')).join('')}
    </div>`:''}
  </div>`;
}

function renderCoachTraining(){
  const el=$main();
  const a=G.coachAthlete;
  const pl=PERSONALITY_LABEL[a.personality];
  const nextRace=(G.coachSelectedRaces||[])[G.coachRaceIdx];
  const nextQ=nextRace?.quarter||1;

  // Recommended block based on race profile
  function recommendBlock(race){
    if(!race)return null;
    const segs=race.segs||[];
    const climbKm=segs.filter(s=>s.type==='climb').reduce((s,x)=>s+x.km,0);
    const descKm=segs.filter(s=>s.type==='descent').reduce((s,x)=>s+x.km,0);
    const ratio=climbKm/Math.max(1,race.km);
    if(ratio>0.35)return'subida';
    if(descKm/race.km>0.3)return'tecnico';
    if(race.km>=40)return'volumen';
    return'velocidad';
  }
  const recKey=recommendBlock(nextRace);
  const recLabel={volumen:'Volumen alto',velocidad:'Trabajo de velocidad',tecnico:'Descenso técnico',subida:'Subida específica'}[recKey]||'';

  // Quarter races summary
  const qRaces=(G.coachSelectedRaces||[]).filter(r=>r.quarter===nextQ);
  const MONTH_NAMES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  // Paso 6 de la dirección visual (2026-10-30): tipo Decisión (como el Entreno de Clásico):
  // carreras del trimestre en filas con su nivel, perfil, consejo y bloques como pz-opcion con
  // efectos en línea; los avisos del contexto como diagnósticos.
  const warnings=(()=>{
      // Warn about reduced effectiveness based on context
      const ev=G.coachPendingEvent;
      const load=G.coachBodyLoad||0;
      const pers=a.personality;
      const warnings=[];
      if(ev){
        if(ev.id==='family_stress')warnings.push({type:'ojo',msg:`📞 ${esc(a.name)} tiene un problema familiar pendiente. Probablemente entrene con la cabeza en otro lado — efectividad reducida.`});
        if(ev.id==='overtraining_signal')warnings.push({type:'menos',msg:`😴 ${esc(a.name)} muestra señales de sobrecarga. Cualquier bloque intenso podría agravar la situación.`});
        if(ev.id==='doubt_crisis')warnings.push({type:'ojo',msg:`💭 ${esc(a.name)} está atravesando una crisis de confianza. Su rendimiento en entreno será impredecible.`});
        if(ev.id==='injury_scare')warnings.push({type:'ojo',msg:`🩹 Hay una molestia física activa. Bloques de volumen o velocidad aumentan el riesgo.`});
      }
      if(pers==='quemado'&&load>60)warnings.push({type:'ojo',msg:`Con la carga acumulada y el estado mental del atleta, existe riesgo real de que no aparezca al entrenamiento.`});
      if(pers==='motivado'&&(G.coachRaceResults||[]).slice(-1)[0]?.dnf)warnings.push({type:'ojo',msg:`Viene de un abandono. Puede entrenarse demasiado duro para compensar — vigila la carga.`});
      if(load>80)warnings.push({type:'menos',msg:`Carga corporal ${Math.round(load)} % — solo considera Recuperación activa o Descarga.`});
      return warnings.map(w=>`<div class="pz-diag ${w.type}">${w.msg}</div>`).join('');
  })();
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Proponer entrenamiento</div>
    <p class="pz-sub"><b>${esc(a.name)}</b> · T${G.coachSeason}</p>
    ${nextRace?`<div class="pz-label" style="margin:8px 0 6px">T${nextQ} — carreras del trimestre</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${qRaces.map(r=>{const isNext=r.id===nextRace.id;
        return`<div class="pz-fila"><span class="pz-fila-txt">${isNext?'<b>→ ':''}${esc(r.name)}${isNext?'</b>':''}<div class="pz-efectos">${MONTH_NAMES[(r.month||1)-1]} · ${r.type} · ${r.km} km · ${raceDesnivel(r)}${isNext?' · próxima':''}</div></span>${nivelTag(r.tier,TIER_LABEL_RACE[r.tier])}</div>`;}).join('')}
    </div>
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:6px">Perfil — ${esc(nextRace.name)}</div>
      <div id="coach-train-prof-wrap">${profSvg(nextRace,-1,'preview',0,'coach-train')}</div>
      <div id="coach-train-prof-info" data-sel="-1" style="min-height:16px">${profSegInfo(nextRace,null,'preview',0)}</div>
      ${profLeyenda(false)}
    </div>
    ${recLabel?consejoHTML('coach_rec_bloque',`Para este perfil se recomienda: ${recLabel}.`,''):''}`:''}
    <div class="pz-diag">${pl.emoji} <b>${pl.label}:</b> ${pl.desc}</div>
    ${warnings}
    <div class="pz-label" style="margin:14px 0 6px">Elige bloque</div>
    ${TRAINING_BLOCKS.map(b=>{
      const isRec=b.name===recLabel;
      const isSel=G.coachTrainingSelected===b.id;
      return`<button class="pz-opcion${isSel?' sel':''}" onclick="G.coachTrainingSelected='${b.id}';render()">
        <b>${b.name}</b>${isRec?' <span class="pz-chip" style="margin:0 0 0 4px;background:var(--acc-t)">Recomendado</span>':''}
        <div class="pz-efectos">${b.desc}</div>
        <div class="pz-efectos">${Object.entries(b.effects).filter(([,v])=>v!==0).map(([k,v])=>`<span class="${v>0?'pz-mas':'pz-menos'}">${v>0?'+':''}${v} ${k.charAt(0).toUpperCase()+k.slice(1)}</span>`).join(' · ')}</div>
      </button>`;
    }).join('')}
    ${G.coachTrainingSelected
      ?`<button class="pz-btn" style="margin-top:10px" onclick="doCoachTraining(G.coachTrainingSelected)">Confirmar — ${TRAINING_BLOCKS.find(b=>b.id===G.coachTrainingSelected)?.name||''} →</button>`
      :`<p class="pz-efectos" style="text-align:center;margin-top:8px">Toca un bloque para seleccionarlo</p>`}
    <button class="pz-btn sec" onclick="G.coachTrainingSelected=null;G.screen='coachHome';render()">← Volver sin entrenar</button>
  </div>`;

  // Attach profile tap handlers after render
  if(nextRace){
    setTimeout(()=>{
      const svg=document.getElementById('prof-svg-coach-train');   // T106 (v93)
      if(!svg)return;
      svg.querySelectorAll('rect[data-seg]').forEach(r=>{
        const h=()=>{
          const si=parseInt(r.dataset.seg);
          const info=document.getElementById('coach-train-prof-info');
          const wrap=document.getElementById('coach-train-prof-wrap');
          if(!info||!wrap)return;
          const cur=info.dataset.sel;
          const next=cur==si?-1:si;
          info.dataset.sel=next;
          info.innerHTML=profSegInfo(nextRace,next>=0?next:null,'preview',0);
          wrap.innerHTML=profSvg(nextRace,next>=0?next:-1,'preview',0,'coach-train');
          // re-attach
          renderCoachTraining._reattach&&renderCoachTraining._reattach();
        };
        r.addEventListener('click',h);r.addEventListener('touchend',e=>{e.preventDefault();h();});
      });
    },0);
  }
}

window.doCoachTraining=blockId=>{
  const a=G.coachAthlete;
  const block=TRAINING_BLOCKS.find(b=>b.id===blockId);
  if(!block)return;
  let actualBlockId=blockId,reactionMsg='',trustDelta=0,effMult=1.0;
  switch(a.personality){
    case'rebelde':
      if(Math.random()<0.30){
        actualBlockId=['volumen','velocidad'].find(b=>b!==blockId)||blockId;
        reactionMsg=`"Esto me lo sé de sobra, necesito algo más exigente." Cambia el plan sin avisarte.`;
        trustDelta=-1;effMult=1.1;
      } else {reactionMsg=`Acepta el plan con cierta reluctancia. Esta vez te hace caso.`;trustDelta=+1;}
      break;
    case'motivado':{
      const lr=(G.coachRaceResults||[]).slice(-1)[0];
      if(lr&&lr.pos<=5&&!lr.dnf){reactionMsg=`Viene eufórico del resultado y entrena con una intensidad brutal.`;effMult=1.25;trustDelta=+2;}
      else{reactionMsg=`Se esfuerza más de la cuenta. Llega al límite antes de terminar la sesión.`;effMult=0.85;trustDelta=+1;}
      break;}
    case'obediente':
      reactionMsg=`Ejecuta el plan exactamente como se lo has dado. Ni más, ni menos.`;effMult=1.0;trustDelta=+1;break;
    case'perfeccionista':
      if((G.coachTrust||0)>=75){
        reactionMsg=`Analiza cada detalle del plan y lo ejecuta con precisión milimétrica. Confía en tu criterio.`;
        effMult=1.3;trustDelta=+1;
      } else {
        reactionMsg=`Duda del plan, pide explicaciones constantes y lo ejecuta con reservas.`;
        effMult=0.85;trustDelta=0;
      }
      break;
    case'quemado':
      if(Math.random()<0.25){reactionMsg=`Hoy no aparece al entrenamiento. Necesita espacio, dice.`;effMult=0;trustDelta=-2;}
      else{reactionMsg=`Entrena, pero con la mente en otro lado. Rendimiento por debajo de lo esperado.`;effMult=0.65;trustDelta=+1;}
      break;
  }
  const usedBlock=TRAINING_BLOCKS.find(b=>b.id===actualBlockId)||block;
  if(effMult>0){
    Object.entries(usedBlock.effects).forEach(([k,v])=>{
      if(a.currentStats[k]!==undefined)
        a.currentStats[k]=Math.max(10,Math.min(100,a.currentStats[k]+Math.round(v*effMult)));
    });
  }
  const loadD={volumen:15,velocidad:12,tecnico:10,recuperacion:-10,taper:-15,cruzado:4};
  G.coachBodyLoad=Math.max(0,Math.min(100,(G.coachBodyLoad||0)+(loadD[actualBlockId]||8)));
  G.coachTrust=Math.max(0,Math.min(100,(G.coachTrust||60)+trustDelta));
  G.coachLastTraining={blockId:actualBlockId,blockName:usedBlock.name,effMult,reactionMsg,trustDelta};
  G.coachTrainingSelected=null;
  G.screen='coachTrainingReaction';render();
};

// Paso 6 de la dirección visual (2026-10-30): tipo Evento de familia gente: la reacción del atleta.
function renderCoachTrainingReaction(){
  const el=$main();
  const lt=G.coachLastTraining;
  const a=G.coachAthlete;
  if(!lt){G.screen='coachHome';render();return;}
  el.innerHTML=`<div class="pz">
    <span class="pz-etiqueta fam-gente">Reacción del atleta</span>
    <div class="pz-titulo">${esc(a.name)}</div>
    <p style="font-style:italic;line-height:1.6">«${lt.reactionMsg}»</p>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${lt.effMult>0
        ?`<div class="pz-fila"><span class="pz-fila-txt">Bloque</span><span class="pz-fila-dato">${lt.blockName}</span></div>
          <div class="pz-fila"><span class="pz-fila-txt">Efectividad</span><span class="pz-fila-dato">${Math.round(lt.effMult*100)} %</span></div>`
        :`<div class="pz-fila"><span class="pz-fila-txt pz-menos">No completó el entrenamiento. Sin mejora de stats.</span></div>`}
      <div class="pz-fila"><span class="pz-fila-txt">Confianza</span><span class="pz-fila-dato"><span class="${lt.trustDelta>=0?'pz-mas':'pz-menos'}">${lt.trustDelta>=0?'+':''}${lt.trustDelta}</span> → ${G.coachTrust}/100</span></div>
    </div>
    ${G.coachBodyLoad>70?`<div class="pz-diag ojo">Carga corporal: ${Math.round(G.coachBodyLoad)} %. Alto riesgo si se añade más volumen.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" onclick="G.screen='coachHome';render()">Continuar →</button>
  </div>`;
}

function renderCoachCalendar(){
  const el=$main();
  const a=G.coachAthlete;
  if(!a){G.screen='coachSelect';render();return;}
  const selIds=(G.coachSelectedRaces||[]).map(r=>r.id);
  const maxRaces=4;
  const available=RACES_DB.filter(r=>{
    if(G.coachSeason===1&&r.tier==='elite')return false;
    if(G.coachSeason<=1&&(r.reqRanking||999)<25)return false;
    return true;
  });
  // Paso 6 de la dirección visual (2026-10-30): tipo Lista (como el Calendario de Clásico).
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Calendario del atleta</div>
    <p class="pz-sub">${esc(a.name)} · Temporada ${G.coachSeason} · Máx. ${maxRaces} carreras</p>
    ${selIds.length>=maxRaces?`<div class="pz-diag mas">Calendario completo — ${maxRaces}/${maxRaces} seleccionadas.</div>`:''}
    ${QUARTERS.map(q=>{
      const qRaces=available.filter(r=>r.quarter===q.n);
      if(!qRaces.length)return'';
      return`<div class="pz-label" style="margin:14px 0 6px">${q.label} — ${q.months}</div>
        ${qRaces.map(r=>{
          const isSel=selIds.includes(r.id);
          const isFull=selIds.length>=maxRaces&&!isSel;
          return`<button class="pz-opcion${isSel?' sel':''}${isFull?' pz-bloqueado':''}" ${!isFull||isSel?`onclick="doCoachToggleRace('${r.id}')"`:''}>
            <span style="float:right">${nivelTag(r.tier,TIER_LABEL_RACE[r.tier])}</span><b>${r.name}</b>
            <div class="pz-efectos">${r.monthName} · ${r.type} · €${r.cost} inscripción · premio <span class="pz-num">€${r.prize}</span></div>
          </button>`;
        }).join('')}`;
    }).join('')}
    ${selIds.length>0
      ?`<button class="pz-btn" style="margin-top:10px" onclick="doCoachConfirmCalendar()">Confirmar (${selIds.length} carreras) →</button>`
      :`<p class="pz-efectos" style="text-align:center;margin-top:8px">Selecciona al menos 1 carrera para continuar.</p>`}
    <button class="pz-btn sec" onclick="G.screen='coachHome';G.activeTab='game';render()">← Volver</button>
  </div>`;
}
window.doCoachToggleRace=id=>{
  const race=RACES_DB.find(r=>r.id===id);if(!race)return;
  if(!G.coachSelectedRaces)G.coachSelectedRaces=[];
  const idx=G.coachSelectedRaces.findIndex(r=>r.id===id);
  if(idx>=0)G.coachSelectedRaces.splice(idx,1);
  else if(G.coachSelectedRaces.length<4)G.coachSelectedRaces.push(race);
  render();
};
window.doCoachConfirmCalendar=()=>{
  if(!(G.coachSelectedRaces||[]).length)return;
  G.coachSelectedRaces.sort((a,b)=>a.month-b.month);
  G.screen='coachHome';G.activeTab='game';render();
};

// v98 (CR-81): la condición del día se sorteaba al pintar la precarrera. Se sortea aquí, al
// empezar la carrera, justo antes de pintar: la misma tirada en el mismo orden.
function coachRollDayCondition(){
  const dc=COACH_DAY_CONDITIONS[Math.floor(Math.random()*COACH_DAY_CONDITIONS.length)];
  // Estado emocional modifica los mods del día de carrera
  const es=G.coachEmotionalState||'fresco';
  let modDc={...dc};
  if(es==='confiado'){modDc.energyMod=(modDc.energyMod||0)+4;modDc.legsMod=(modDc.legsMod||0)+3;modDc.text=modDc.text+' (Estado confiado: +ligero extra)';}
  else if(es==='quemado'){modDc.energyMod=(modDc.energyMod||0)-6;modDc.legsMod=(modDc.legsMod||0)-5;modDc.text='Se le ve apagado en el calentamiento. Llevas demasiadas semanas apretando.';}
  else if(es==='recuperado'){modDc.energyMod=(modDc.energyMod||0)+3;modDc.text=modDc.text+' (Recuperado: vuelve con ganas)';}
  else if(es==='dudoso'){modDc.energyMod=(modDc.energyMod||0)-2;modDc.text='Cara seria en el warming up. Algo le ronda la cabeza.';}
  return modDc;
}

window.doCoachStartRace=()=>{
  const race=(G.coachSelectedRaces||[])[G.coachRaceIdx];
  if(!race)return;
  G.coachGels=3;G.coachGelsUsed=0;
  G.coachRadioUsed={};G.coachAidExtras={};G.coachPreRaceBlock=null;
  if(!G.coachDayCondition)G.coachDayCondition=coachRollDayCondition();
  G.screen='coachPreRace';render();
};

function renderCoachPreRace(){
  const el=$main();
  const race=(G.coachSelectedRaces||[])[G.coachRaceIdx];
  if(!race){G.screen='coachHome';render();return;}
  const a=G.coachAthlete;
  const gels=G.coachGels||3;
  // CR-81: la sortea doCoachStartRace(); aquí solo se lee (sin ella, la neutra, como coachBuildRaceData)
  const dc=G.coachDayCondition||COACH_DAY_CONDITIONS[0];
  const MONTH_NAMES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  // Paso 6 de la dirección visual (2026-10-30): tipo Decisión (Briefing de Clásico): perfil,
  // condición del día, geles con stepper y ajuste como pz-opcion. El hijo del rival, familia gente.
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Precarrera</div>
    <p class="pz-sub">${esc(race.name)} · ${MONTH_NAMES[(race.month||1)-1]} · T${G.coachSeason}</p>
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:6px">Perfil de la carrera</div>
      <div id="coach-pre-prof-wrap">${profSvg(race,-1,'preview',0,'coach-pre')}</div>
      <div id="coach-pre-prof-info" data-sel="-1" style="min-height:16px">${profSegInfo(race,null,'preview',0)}</div>
      ${profLeyenda(true)}
    </div>
    ${(()=>{
      // Rival hijo en esta carrera
      const children=G.rivalChildren||[];
      if(!children.length)return '';
      const child=children[Math.floor(Math.random()*children.length)];
      return `<div class="pz-tarjeta"><span class="pz-etiqueta fam-gente">🎯 ${esc(child.name)} corre hoy</span>
        <div class="pz-efectos" style="margin-top:4px">Hijo de ${esc(child.parentName)} — te ganó ${child.parentWins} vece${child.parentWins!==1?'s':''} en tu época. Ahora corre él.</div></div>`;
    })()}
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:4px">Condición del día</div>
      <div>🌅 ${dc.text}</div>
    </div>
    <div class="pz-tarjeta">
      <div class="pz-label" style="margin-bottom:4px">Geles</div>
      <div class="pz-efectos" style="margin-bottom:8px">Cuántos geles lleva ${esc(a.name)} al bolsillo. Cada gel da +12 % energía en avituallamiento.</div>
      <div style="display:flex;align-items:center;gap:14px">
        <span class="pz-stepper"><button onclick="G.coachGels=Math.max(0,G.coachGels-1);render()" ${gels<=0?'disabled':''}>−</button><span class="pz-stepper-n">${gels}</span><button onclick="G.coachGels=Math.min(6,G.coachGels+1);render()" ${gels>=6?'disabled':''}>+</button></span>
        <span class="pz-efectos">Coste: <span class="pz-num">€${gels*2}</span></span>
      </div>
      ${race.km>=40?`<div class="pz-diag ${gels<4?'ojo':'mas'}" style="margin-top:6px">Para una ${race.km} km se recomiendan al menos 4 geles.</div>`:''}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Ajuste de último momento</div>
    ${[{id:'taper_race',label:'Descarga final',desc:'Sesión ligera hoy — el atleta llega más fresco',ef:'+5 % energía'},
       {id:'mental_talk',label:'Charla motivacional',desc:'10 minutos de activación mental',ef:'+8 confianza'},
       {id:'nothing',label:'Nada — está listo',desc:'Confías en el trabajo hecho'}
    ].map(opt=>{
      const isSel=(G.coachPreRaceBlock||'nothing')===opt.id;
      return`<button class="pz-opcion${isSel?' sel':''}" onclick="G.coachPreRaceBlock='${opt.id}';render()"><b>${opt.label}</b><div class="pz-efectos">${opt.desc}${opt.ef?` · <span class="pz-mas">${opt.ef}</span>`:''}</div></button>`;
    }).join('')}
    <button class="pz-btn" style="margin-top:12px" onclick="doCoachLaunchRace()">🏁 Salida — ${esc(race.name)} →</button>
    <button class="pz-btn sec" onclick="doCoachDelegateRace()">📡 Delegar — ${esc(a.name)} corre solo</button>
    <p class="pz-efectos" style="text-align:center;margin:4px 0 8px">Te avisaré cuando acabe con el resultado</p>
    <button class="pz-btn sec" onclick="G.coachDayCondition=null;G.screen='coachHome';render()">← Volver al hub</button>
  </div>`;

  // Attach profile touch handlers
  setTimeout(()=>{
    const svg=document.getElementById('prof-svg-coach-pre');   // T106 (v93)
    if(!svg)return;
    svg.querySelectorAll('rect[data-seg]').forEach(r=>{
      const h=()=>{
        const si=parseInt(r.dataset.seg);
        const info=document.getElementById('coach-pre-prof-info');
        const wrap=document.getElementById('coach-pre-prof-wrap');
        if(!info||!wrap)return;
        const cur=info.dataset.sel;const next=cur==si?-1:si;
        info.dataset.sel=next;
        info.innerHTML=profSegInfo(race,next>=0?next:null,'preview',0);
        wrap.innerHTML=profSvg(race,next>=0?next:-1,'preview',0,'coach-pre');
        setTimeout(()=>{const s2=document.getElementById('prof-svg-coach-pre');if(s2)s2.querySelectorAll('rect[data-seg]').forEach(r2=>{r2.addEventListener('click',h);r2.addEventListener('touchend',e=>{e.preventDefault();h();});});},0);
      };
      r.addEventListener('click',h);r.addEventListener('touchend',e=>{e.preventDefault();h();});
    });
  },0);
}

window.doCoachLaunchRace=()=>{
  const race=(G.coachSelectedRaces||[])[G.coachRaceIdx];
  if(!race)return;
  // Apply pre-race choices
  const preBlock=G.coachPreRaceBlock||'nothing';
  let energyBonus=0;
  if(preBlock==='taper_race'){energyBonus=5;G._taperUsedThisRace=true;logCoachDecision('taper_used','Aplicaste taper antes de la carrera objetivo',true);}
  if(preBlock==='mental_talk'){G.coachTrust=Math.min(100,(G.coachTrust||60)+8);logCoachDecision('mental_talk','Conversación de motivación pre-carrera',true);}
  G.coachRaceData=coachBuildRaceData(race,energyBonus);
  G.coachRaceAnimIdx=0;G.coachRaceAidPaused=false;G.coachRaceEventPending=null;
  G.coachGelsUsed=0;G.coachRadioUsed={};G.coachAidExtras={};
  G.screen='coachRace';render();
  startCoachRaceAnim();
};

function coachBuildRaceData(race, extraEnergyBonus=0){
  const a=G.coachAthlete;const st=a.currentStats;

  // Day condition already set in renderCoachPreRace
  const dc=G.coachDayCondition||COACH_DAY_CONDITIONS[0];

  let energy=Math.max(0,Math.min(110,100+(dc.energyMod||0)+extraEnergyBonus));
  let legs=Math.max(0,Math.min(110,100+(dc.legsMod||0)));
  let hydration=Math.max(0,Math.min(100,100+(dc.hydMod||0)));
  const overload=(G.coachBodyLoad||0)>70?0.06:0;
  energy-=overload*100;legs-=overload*80;
  // Aplicar perfMod del estilo del entrenador al tiempo base de carrera
  const stylePerfMod=G.coachTrainerStyle?((TRAINER_STYLES[G.coachTrainerStyle]?.perfMod||0)/100):0;
  const segs=[];let totalTime=0;let aidCount=0;

  // Pick one mid-race event to inject (Tanda 2)
  // DEV: fuerza un evento concreto por id, consumido una sola vez. Ver js/devmode.js.
  let midEvt;
  const forcedMid=window.devTake?.('coachMidEvent');
  if(forcedMid){
    midEvt=COACH_MID_RACE_EVENTS.find(e=>e.id===forcedMid)||COACH_MID_RACE_EVENTS[Math.floor(Math.random()*COACH_MID_RACE_EVENTS.length)];
  } else {
    midEvt=COACH_MID_RACE_EVENTS[Math.floor(Math.random()*COACH_MID_RACE_EVENTS.length)];
  }
  const midSegTarget=Math.floor(race.segs.length*0.45);

  for(let i=0;i<race.segs.length;i++){
    const s=race.segs[i];
    const ef=s.type==='climb'?1.4:s.type==='descent'?0.8:1.0;
    energy=Math.max(0,energy-6*s.km*ef);
    legs=Math.max(0,legs-4*s.km*ef);
    hydration=Math.max(0,hydration-3*s.km);
    let bt=s.base;
    if(s.type==='climb')   bt*=Math.max(0.76,1.0-(st.subida-50)*0.004);
    if(s.type==='descent') bt*=Math.max(0.76,1.0-(st.bajada-50)*0.004);
    if(s.type==='flat')    bt*=Math.max(0.76,1.0-(st.velocidad-50)*0.003);
    bt*=Math.max(0.80,1.0-(st.resistencia-50)*RESISTANCE_SCALE_PER_KM*s.km);
    if(energy<30)bt*=1.12;if(legs<25)bt*=1.15;
    bt*=(0.97+Math.random()*0.06);
    bt*=(1-stylePerfMod); // estilo del entrenador mejora/empeora el tiempo
    totalTime+=bt;
    if(s.aid)aidCount++;
    const np=COACH_NARRATIVES[s.type]||COACH_NARRATIVES.flat;
    // Inject mid-race event on target segment (not on aid station)
    const isMidEvt=i===midSegTarget&&!s.aid;
    segs.push({idx:i,name:s.name,type:s.type,km:s.km,
      isAid:!!s.aid,aidNum:s.aid?aidCount:null,
      isMidEvent:isMidEvt,midEvent:isMidEvt?midEvt:null,
      energy:Math.max(0,Math.round(energy)),legs:Math.max(0,Math.round(legs)),
      hydration:Math.max(0,Math.round(hydration)),
      narrative:np[Math.floor(Math.random()*np.length)],cumTime:totalTime});
  }
  const n=18+G.coachSeason*3;
  // Generate rival times with names for live classification
  const rivalNames=[
    'Oriol Puig','Laia Bonell','Xavi Gómez','Sara Mateu','Iker Zubiaurre','Claire Dubois',
    'Pau Ferrer','Marta Soler','Jordi Vidal','Ana Roca','Mikel Etxebarria','Elena Camps',
    'David Muñoz','Neus Planell','Tomàs Mas','Carla Vidal','Raúl Pérez','Sílvia Bové',
    'Marc Pou','Laura Gil',
  ];
  const rivals=[];
  for(let i=0;i<n;i++){
    const rt=totalTime*(0.84+Math.random()*0.32);
    rivals.push({name:rivalNames[i%rivalNames.length],time:rt});
  }
  rivals.sort((a,b)=>a.time-b.time);
  // Find athlete position among rivals
  let pos=1;
  for(const rv of rivals){if(rv.time<totalTime)pos++;}
  pos=Math.min(pos,n+1);
  // Attach nearest rivals to each aid segment for display
  segs.forEach(seg=>{
    if(seg.isAid){
      // Estimate position at this point proportionally
      const progress=seg.cumTime/totalTime;
      const estTime=totalTime*progress;
      const nearRivals=rivals.map(rv=>({name:rv.name,time:rv.time*progress}))
        .sort((a,b)=>a.time-b.time);
      const myRank=nearRivals.filter(r=>r.time<estTime).length+1;
      const above=nearRivals.filter(r=>r.time<estTime).slice(-2);   // de más adelantado a menos: el puesto se cuenta desde arriba al pintar
      const below=nearRivals.filter(r=>r.time>=estTime).slice(0,2);
      seg.aidRivals={myRank,above,below,myTime:estTime};
    }
  });
  return{race,segments:segs,totalTime,finalPos:pos,totalParticipants:n+1,rivals};
}
let _coachRaceTimer=null;
let _coachRadioPauseTimer=null;
let _coachRadioPauseVal=0;  // countdown 0–35 (×100ms = 3.5s)
function clearCoachRadioPause(){
  if(_coachRadioPauseTimer){clearInterval(_coachRadioPauseTimer);_coachRadioPauseTimer=null;}
  _coachRadioPauseVal=0;
}

function startRadioPause(onDone){
  clearCoachRadioPause();
  _coachRadioPauseVal=35; // 35 × 100ms = 3.5s
  G.coachRadioWindowOpen=true;
  // Update the countdown bar every 100ms
  _coachRadioPauseTimer=setInterval(()=>{
    _coachRadioPauseVal--;
    const bar=document.getElementById('coach-radio-bar');
    const secs=document.getElementById('coach-radio-secs');
    if(bar)bar.style.width=(_coachRadioPauseVal/35*100)+'%';
    if(secs)secs.textContent=Math.ceil(_coachRadioPauseVal/10);
    if(_coachRadioPauseVal<=0){
      clearCoachRadioPause();
      G.coachRadioWindowOpen=false;
      onDone();
    }
  },100);
}

function startCoachRaceAnim(){
  clearCoachRaceTimer();
  clearCoachRadioPause();
  G.coachRadioWindowOpen=false;
  _coachRaceTimer=setInterval(()=>{
    if(G.coachRaceAidPaused||G.coachRaceEventPending||G.coachRadioWindowOpen)return;
    const data=G.coachRaceData;
    if(!data){clearCoachRaceTimer();return;}
    if(G.coachRaceAnimIdx>=data.segments.length){clearCoachRaceTimer();render();return;}
    const seg=data.segments[G.coachRaceAnimIdx];
    G.coachRaceAnimIdx++;
    // Pause for mid-race event
    if(seg.isMidEvent&&seg.midEvent){
      G.coachRaceEventPending=seg.midEvent;clearCoachRaceTimer();render();return;
    }
    // Pause for aid station
    if(seg.isAid&&G.coachRaceAnimIdx<data.segments.length){
      G.coachRaceAidPaused=true;clearCoachRaceTimer();render();return;
    }
    render();
    // Open 3.5s radio window (not on last seg, not on aid)
    if(G.coachRaceAnimIdx<data.segments.length&&!seg.isAid){
      startRadioPause(()=>{render();});
    }
  },1500);
}
function clearCoachRaceTimer(){
  if(_coachRaceTimer){clearInterval(_coachRaceTimer);_coachRaceTimer=null;}
}

window.doCoachSkipRace=()=>{
  const data=G.coachRaceData;if(!data)return;
  clearCoachRaceTimer();
  clearCoachRadioPause();
  // Avanzar todos los segmentos de golpe
  G.coachRaceAnimIdx=data.segments.length;
  G.coachRaceAidPaused=false;
  G.coachRaceEventPending=null;
  G.coachRadioWindowOpen=false;
  render();
};

function renderCoachRace(){
  const el=$main();
  const data=G.coachRaceData;
  if(!data){G.screen='coachHome';render();return;}
  const race=data.race;
  const shown=data.segments.slice(0,G.coachRaceAnimIdx);
  const isDone=G.coachRaceAnimIdx>=data.segments.length&&!G.coachRaceAidPaused&&!G.coachRaceEventPending;
  const aidSeg=G.coachRaceAidPaused?data.segments[G.coachRaceAnimIdx-1]:null;
  const midEvt=G.coachRaceEventPending;
  // (había aquí un `currentSeg` que era exactamente `lastSeg`, calculado más
  //  abajo y ya usado por la plantilla. Borrado en v92 con la revisión de
  //  variables muertas: no era interfaz que faltase, era un resto duplicado.)
  const COL={climb:'var(--ter-subida-l)',descent:'var(--ter-bajada-l)',flat:'var(--ter-llano-l)'};
  const ICO={climb:'▲',descent:'▼',flat:'▶'};
  hideChrome();
  const fb=document.getElementById('fin-bar');if(fb)fb.style.display='none';
  const kmDone=shown.reduce((s,x)=>s+x.km,0);
  const pct=Math.round(G.coachRaceAnimIdx/data.segments.length*100);
  const rival=G.coachAthlete?.rivalName||'el rival';
  const aName=G.coachAthlete?.name||'el atleta';
  const dc=G.coachDayCondition;
  const gelsLeft=(G.coachGels||3)-(G.coachGelsUsed||0);
  const lastSeg=shown[shown.length-1];

  // Radio: show only when the 3.5s window is open
  const showRadio=G.coachRadioWindowOpen&&!G.coachRaceAidPaused&&!midEvt&&!isDone;
  const radioUsedHere=G.coachRadioUsed[G.coachRaceAnimIdx-1];
  const highTrust=G.coachTrust>=70;

  // Paso 6 de la dirección visual (2026-10-30): tipo En directo, con la cabecera de carrera de
  // Clásico; el tramo en curso con el acento, la radio como tarjeta con su cuenta atrás, el
  // avituallamiento con opciones y la llegada como franja según el puesto. Sin hex.
  const sec=t=>`<div class="pz-label" style="margin:12px 0 6px">${t}</div>`;
  const op=(onc,txt,extra)=>`<button class="pz-opcion sin-check" onclick="${onc}"${extra||''}>${txt}</button>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-cab-carrera">
      <div class="pz-cab-fila"><span class="pz-cab-nombre">${esc(race.name)} · ${race.type} · ${raceDesnivel(race)}</span><span class="pz-cab-dato">${Math.round(kmDone)}/${race.km} km</span></div>
      <div class="pz-barra" style="margin-top:6px"><div class="pz-relleno" style="width:${pct}%;background:var(--acc)"></div></div>
    </div>
    ${dc&&G.coachRaceAnimIdx<=1?`<div class="pz-diag">🌅 ${dc.text}</div>`:''}
    ${!isDone?`<div style="text-align:right;margin-bottom:8px"><button class="pz-btn sec" style="width:auto;padding:5px 12px;margin:0;font-size:13px" onclick="doCoachSkipRace()">⏭ Saltar al resultado</button></div>`:''}
    ${shown.length===0?`<p class="pz-efectos" style="text-align:center;padding:30px 0">⏳ Preparando salida...</p>`:''}
    <div id="coach-race-feed">
    ${shown.map((seg,i)=>{
      const isLast=i===shown.length-1;
      const usedRadio=G.coachRadioUsed[i];
      return`<div class="narrative-item ${seg.isAid?'aid-stop':''}" style="${isLast&&!isDone?'border:1.5px solid var(--acc)':''}">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px">
          <span style="font-size:12px;font-weight:600;color:${COL[seg.type]}">${ICO[seg.type]} ${esc(seg.name)}</span>
          ${seg.isAid?`<span style="font-size:12px;font-weight:600;color:var(--ter-avi)">Avituallamiento</span>`:''}
        </div>
        <div style="color:var(--ink2)">${seg.narrative}</div>
        ${usedRadio?`<div class="pz-efectos" style="margin-top:3px">📻 ${usedRadio}</div>`:''}
        ${isLast&&!isDone?`<div class="pz-efectos" style="margin-top:5px;display:flex;gap:12px">
          <span>⚡ ${seg.energy} %</span><span>🦵 ${seg.legs} %</span><span>💧 ${seg.hydration} %</span>${gelsLeft>0?`<span>🍬 ×${gelsLeft}</span>`:''}
        </div>`:''}
      </div>`;
    }).join('')}
    </div>

    ${showRadio&&!radioUsedHere?`<div class="pz-tarjeta" style="border-color:var(--acc);margin-top:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <b>📻 Radio</b><span class="pz-efectos">Se cierra solo en <span id="coach-radio-secs">${Math.ceil(_coachRadioPauseVal/10)}</span> s</span>
      </div>
      <div class="pz-barra" style="margin-bottom:10px"><div id="coach-radio-bar" class="pz-relleno" style="background:var(--acc);width:${(_coachRadioPauseVal/35*100).toFixed(0)}%;transition:width .1s linear"></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        ${COACH_RADIO_MESSAGES.map((m,mi)=>{
          const disabled=m.id==='attack'&&lastSeg?.energy<20;
          const canAlone=m.id==='silent'&&highTrust;
          return`<button class="pz-opcion sin-check${disabled?' pz-bloqueado':''}" style="margin:0;padding:8px 10px;${canAlone?'border-color:var(--pos)':''}" onclick="doCoachRadio(${mi})" ${disabled?'disabled':''}>
            <b style="font-size:13px">${m.label}</b><div class="pz-efectos" style="font-size:12px">${m.desc}</div>
          </button>`;
        }).join('')}
      </div>
    </div>`:''}
    ${showRadio&&radioUsedHere?`<div class="pz-diag" style="margin-top:8px">📻 ${radioUsedHere}</div>`:''}

    ${midEvt&&!isDone?`<div class="pz-tarjeta" style="border-color:var(--avi-bar);border-width:1.5px;margin-top:10px">
      <span class="pz-etiqueta acento">${midEvt.icon||'⚡'} En carrera</span>
      <div class="pz-titulo" style="font-size:22px">${esc(midEvt.title)}</div>
      <p style="font-style:italic;color:var(--ink2)">«${(midEvt.desc||'').replace(/\{\{name\}\}/g,esc(aName)).replace(/\{\{rival\}\}/g,esc(rival))}»</p>
      ${midEvt.choices.map((c,ci)=>op(`doCoachMidRaceEvent(${ci})`,`<b>${c.text}</b>`)).join('')}
    </div>`:''}

    ${aidSeg&&!midEvt?`<div class="pz-tarjeta" style="border-color:var(--ter-avi);margin-top:10px">
      <b>📍 Avituallamiento ${aidSeg.aidNum||''} — ¿Qué hace ${esc(aName)}?</b>
      <div class="pz-efectos" style="display:flex;gap:12px;margin:4px 0 8px"><span>⚡ ${aidSeg.energy} %</span><span>🦵 ${aidSeg.legs} %</span><span>💧 ${aidSeg.hydration} %</span><span>🍬 ×${gelsLeft}</span></div>
      ${aidSeg.energy<30||aidSeg.legs<25?`<div class="pz-diag menos">El atleta llega muy cargado. Continuar tiene riesgo real.</div>`:''}
      ${(G.coachNemesis&&G.coachNemesis.wins>=2)?`<div class="pz-diag ojo">🎯 ${esc(G.coachNemesis.name)} está por delante. Puede que estés a tiempo.</div>`:''}
      ${aidSeg.aidRivals?`${sec('Clasificación en este punto')}
        ${aidSeg.aidRivals.above.map((r,ri)=>`<div class="pz-fila" style="padding:4px 0"><span class="pz-fila-txt pz-efectos">${aidSeg.aidRivals.myRank-aidSeg.aidRivals.above.length+ri}.º ${esc(r.name)}</span><span class="pz-fila-dato pz-menos">−${fmt(aidSeg.aidRivals.myTime-r.time)}</span></div>`).join('')}
        <div class="pz-fila" style="padding:4px 8px;background:var(--acc-t);border-radius:6px"><span class="pz-fila-txt"><b>${aidSeg.aidRivals.myRank}.º ${esc(aName)}</b></span><span class="pz-fila-dato">← aquí</span></div>
        ${aidSeg.aidRivals.below.map(r=>`<div class="pz-fila" style="padding:4px 0"><span class="pz-fila-txt pz-efectos">${aidSeg.aidRivals.myRank+(aidSeg.aidRivals.below.indexOf(r)+1)}.º ${esc(r.name)}</span><span class="pz-fila-dato pz-mas">+${fmt(r.time-aidSeg.aidRivals.myTime)}</span></div>`).join('')}`:''}
      ${sec('Ritmo')}
      ${op(`doCoachAidAdvice('mantener')`,'<b>Continúa como vas</b>')}
      ${op(`doCoachAidAdvice('bajar')`,'<b>Baja el ritmo</b><div class="pz-efectos">Ahorra para el final</div>')}
      ${aidSeg.energy<30||aidSeg.legs<25?op(`doCoachAidAdvice('abandonar')`,'<b>Abandona</b><div class="pz-efectos">Conserva el cuerpo</div>',' style="border-color:var(--neg)"'):''}
      ${gelsLeft>0&&!G.coachAidExtras[aidSeg.aidNum||0]?`${sec('Nutrición')}${op(`doCoachGiveGel(${aidSeg.aidNum||0})`,`<b>🍬 Dar gel</b><div class="pz-efectos">${gelsLeft} disponibles · <span class="pz-mas">+12 % energía</span></div>`)}`:''}
      ${race.km>=35&&!G.coachAidExtras['socks_'+(aidSeg.aidNum||0)]?`${sec('Cuidado del pie')}${op(`doCoachSocksChange(${aidSeg.aidNum||0})`,'<b>🧦 Cambio de calcetines</b><div class="pz-efectos"><span class="pz-menos">+90 s</span> · <span class="pz-mas">previene pérdida de piernas en los km finales</span></div>')}`:''}
      ${sec('Información táctica')}
      ${op(`doCoachTacticInfo(${aidSeg.aidNum||0})`,'<b>📊 Decirle su posición</b><div class="pz-efectos">Y la diferencia con el siguiente</div>')}
    </div>`:''}

    ${isDone?`
      ${G.coachLastDialogue?`<div class="pz-tarjeta"><span class="pz-etiqueta fam-gente">${esc(aName)} · tras la carrera</span><p style="font-style:italic;margin:6px 0 0">${esc(G.coachLastDialogue)}</p></div>`:''}
      <div class="pz-franja ${data.finalPos<=3?'podio':'fuera'}">
        <div class="pz-franja-sub" style="margin:0 0 4px">${data.finalPos<=3?'🏆 Podio':data.finalPos<=10?'🎯 Top 10':'🏃 Llegada'}</div>
        <div class="pz-franja-num">${data.finalPos}.º</div>
        <div class="pz-franja-sub">de ${data.totalParticipants} · ${fmt(data.totalTime)}</div>
      </div>
      <button class="pz-btn" onclick="doCoachRaceFinish()">Registrar resultado →</button>`:''}
  </div>`;

  setTimeout(()=>{
    const feed=document.getElementById('coach-race-feed');
    if(feed){const items=feed.querySelectorAll('.narrative-item');if(items.length)items[items.length-1].scrollIntoView({behavior:'smooth',block:'nearest'});}
  },50);
}

window.doCoachAidAdvice=advice=>{
  const data=G.coachRaceData;
  const aidSeg=data.segments[G.coachRaceAnimIdx-1];
  let trustDelta=0;
  if(advice==='abandonar'){
    const rightCall=aidSeg.energy<30||aidSeg.legs<25;
    trustDelta=rightCall?+3:-5;
    G.coachRaceResults.push({pos:null,dnf:true,dnfReason:'abandono',prize:0,coachCut:0,raceName:data.race.name}); // T45 (v89): forma única
    G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+trustDelta));
    G.coachBodyLoad=Math.max(0,G.coachBodyLoad-8);
    G.coachRaceIdx++;
    showToast('DNF — el atleta abandona');
    clearCoachRaceTimer();clearCoachRadioPause();G.coachRadioWindowOpen=false;
    G.screen='coachHome';render();return;
  }
  if(advice==='mantener')trustDelta=aidSeg.energy>50?+1:-1;
  if(advice==='bajar')   trustDelta=aidSeg.energy<45?+2:0;
  G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+trustDelta));
  G.coachRaceAidPaused=false;
  startCoachRaceAnim();render();
};

window.doCoachRadio=msgIdx=>{
  const msg=COACH_RADIO_MESSAGES[msgIdx];if(!msg)return;
  const segIdx=G.coachRaceAnimIdx-1;
  G.coachRadioUsed[segIdx]=msg.label;
  // Close the radio window immediately and continue
  clearCoachRadioPause();
  G.coachRadioWindowOpen=false;
  // Apply effects to race data
  const data=G.coachRaceData;if(!data)return;
  if(msg.timeMod)data.totalTime+=msg.timeMod;
  if(msg.energyCost&&data.segments[segIdx])
    data.segments[segIdx].energy=Math.max(0,(data.segments[segIdx].energy||60)-msg.energyCost);
  if(msg.energySave&&data.segments[segIdx])
    data.segments[segIdx].energy=Math.min(100,(data.segments[segIdx].energy||60)+(msg.energySave||0));
  if(msg.trustBoost)G.coachTrust=Math.min(100,(G.coachTrust||60)+(msg.trustBoost||0));
  // Rebelde ignores sometimes
  if(G.coachAthlete?.personality==='rebelde'&&Math.random()<0.3){
    showToast(`${G.coachAthlete.name} ignora la indicación`);
    G.coachRadioUsed[segIdx]='(ignorado)';
  } else {
    showToast(msg.id==='silent'?'Sin radio':msg.label);
  }
  render();
};

window.doCoachGiveGel=aidNum=>{
  if((G.coachGelsUsed||0)>=(G.coachGels||3))return;
  G.coachGelsUsed=(G.coachGelsUsed||0)+1;
  if(!G.coachAidExtras)G.coachAidExtras={};
  G.coachAidExtras[aidNum]=true;
  // Boost energy in remaining segs
  const data=G.coachRaceData;if(!data)return;
  const aidSegIdx=G.coachRaceAnimIdx-1;
  for(let i=aidSegIdx;i<data.segments.length;i++){
    data.segments[i].energy=Math.min(100,(data.segments[i].energy||60)+12);
  }
  data.totalTime-=15; // small time benefit from better energy
  showToast('🍬 Gel dado — +12% energía');
  render();
};

window.doCoachSocksChange=aidNum=>{
  if(!G.coachAidExtras)G.coachAidExtras={};
  G.coachAidExtras['socks_'+aidNum]=true;
  const data=G.coachRaceData;if(!data)return;
  data.totalTime+=90; // costs 90s
  // Protect legs in last 40% of race
  const startIdx=Math.floor(data.segments.length*0.6);
  for(let i=startIdx;i<data.segments.length;i++){
    data.segments[i].legs=Math.min(100,(data.segments[i].legs||40)+8);
  }
  showToast('🧦 Calcetines cambiados (+90s pero km finales mejor)');
  render();
};

window.doCoachTacticInfo=aidNum=>{
  if(!G.coachAidExtras)G.coachAidExtras={};
  G.coachAidExtras['tactic_'+aidNum]=true;
  const data=G.coachRaceData;if(!data)return;
  const pos=data.finalPos;
  const gap=Math.floor(Math.random()*180+30);
  const highTrust=G.coachTrust>=70;
  let msg='';
  if(pos<=5){
    msg=`"Vas ${pos}º. El siguiente está a ${gap}s. Puedes alcanzarle."`;
    if(highTrust){data.totalTime-=20;G.coachTrust=Math.min(100,G.coachTrust+1);}
    else{data.totalTime-=8;}
  } else {
    msg=`"Llevas ${pos}º. El de delante está a ${gap}s. Gestiona y cierra posiciones."`;
    if(G.coachAthlete?.personality==='motivado'){
      G.coachTrust=Math.min(100,G.coachTrust+2);data.totalTime-=15;
    }
  }
  showToast('📊 Información dada');
  // store message to show in feed
  const seg=data.segments[G.coachRaceAnimIdx-1];
  if(seg)seg.tacticMsg=msg;
  render();
};

// v98 · La lesión del atleta, fuera de doCoachRaceFinish para que el modo dev la aplique
// igual que el juego: baja, stats, confianza, entrada en el log y aviso.
function applyCoachInjury(inj){
  G.coachInjury={...inj,racesLeft:inj.racesOut};
  // Apply stat penalties
  Object.entries(inj.statPenalty||{}).forEach(([k,v])=>{
    if(G.coachAthlete.currentStats[k]!==undefined)
      G.coachAthlete.currentStats[k]=Math.max(10,G.coachAthlete.currentStats[k]+v);
  });
  G.coachTrust=Math.max(0,G.coachTrust-4); // coach pushed too hard
  logCoachDecision('forced_injury','Forzaste al atleta hasta la lesión',false);
  showToast(`⚠️ ${inj.label} — ${inj.racesOut} carrera${inj.racesOut>1?'s':''} de baja`);
}

window.doCoachRaceFinish=()=>{
  const data=G.coachRaceData;if(!data)return;
  // Modo desarrollador — "modo dios": fuerza 1er puesto en cualquier carrera de Entrenador.
  // Ver js/devmode.js. No afecta a partidas normales (sin ?dev=1, devGod no existe).
  if(window.devGod?.('coach'))data.finalPos=1;
  const race=data.race;const pos=data.finalPos;
  const pct2=PRIZE_TABLE[pos-1]||0;
  const prize=pos<=8?Math.round(race.prize*pct2):0;
  const coachCut=Math.round(prize*0.20);
  const mFee=G.coachAthlete.monthlyFee||250;
  const trustD=pos<=3?+10:pos<=10?+5:pos<=20?+1:-3;
  const repG=pos<=3?8:pos<=10?3:pos<=20?1:0;

  // Generate post-race dialogue (E1: cruzado con trust)
  const pers=G.coachAthlete.personality;
  const dlgPool=COACH_POST_RACE_DIALOGUES[pers]||{};
  const cat=pos<=3?'great':pos<=10?'good':'bad';
  const trustNow=G.coachTrust||60;
  const trustKey=trustNow>=75?'highTrust':trustNow<=30?'lowTrust':null;
  const trustPool=trustKey&&dlgPool[trustKey]&&dlgPool[trustKey][cat];
  const basePool=dlgPool[cat]||dlgPool.bad||['"..."'];
  const pool=(trustPool&&trustPool.length&&Math.random()<0.6)?trustPool:basePool;
  G.coachLastDialogue=pool[Math.floor(Math.random()*pool.length)];

  // Nemesis tracking (Tanda 1) — rival who beats athlete most
  const rival=G.coachAthlete.rivalName||'un rival';
  if(pos>5){
    if(!G.coachNemesis)G.coachNemesis={name:rival,wins:1};
    else G.coachNemesis.wins=(G.coachNemesis.wins||0)+1;
  } else if(pos<=3&&G.coachNemesis&&(G.coachNemesis.wins||0)>=2){
    // CR-38 (v76): el marcador se salda — logro coach_beat_nemesis
    G._coachBeatNemesis=true;
    G.coachNemesis.wins=0;
  }

  G.coachRaceResults.push({pos,dnf:false,prize,coachCut,raceName:race.name,tier:race.tier||'local'});
  G.coachEarnings=(G.coachEarnings||0)+coachCut+mFee;
  // Sponsor income
  (G.coachSponsors||[]).forEach(sp=>{
    const monthly=Math.round((sp.salary||0)*(sp.coachCut||0.15)/12);
    G.coachEarnings=(G.coachEarnings||0)+monthly;
  });
  G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+trustD));
  // Aplicar modificador de confianza del estilo del entrenador
  if(G.coachTrainerStyle){
    const st=TRAINER_STYLES[G.coachTrainerStyle];
    G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+(st.trustMod||0)));
  }
  G.coachReputation=Math.min(100,(G.coachReputation||0)+repG);
  // DS01 (v95): esto era bodyLoadAfterRace(), que parte de G.bodyLoad —la carga
  // del CORREDOR de Clásico— y descuenta su fisio y su edad. Cada carrera
  // sobrescribía la carga del atleta con la del corredor (casi siempre 0) más la
  // de la carrera, y borraba lo acumulado entrenando. Ahora se acumula. Cambia el
  // balance de Entrenador: más carga alta y más riesgo por sobrecarga.
  G.coachBodyLoad=Math.max(0,Math.min(100,(G.coachBodyLoad||0)+raceLoadGain(race.km)));
  // Aplicar bodyLoadMod del estilo
  if(G.coachTrainerStyle){
    const st=TRAINER_STYLES[G.coachTrainerStyle];
    G.coachBodyLoad=Math.max(0,Math.min(100,G.coachBodyLoad+(st.bodyLoadMod||0)));
  }

  // Injury check based on bodyLoad
  if(!G.coachInjury){
    const load=G.coachBodyLoad;
    const candidates=COACH_INJURY_TYPES.filter(t=>load>=t.causeLoad);
    if(candidates.length&&Math.random()<(load-65)/100){
      const inj=candidates[Math.floor(Math.random()*candidates.length)];
      applyCoachInjury(inj);
    }
  } else {
    // Recover: each race ticks down
    G.coachInjury.racesLeft=Math.max(0,(G.coachInjury.racesLeft||1)-1);
    if(G.coachInjury.racesLeft===0)G.coachInjury=null;
  }

  G.coachRaceIdx++;G.coachRaceData=null;
  G.coachRaceEventPending=null;G.coachDayCondition=null;

  const isDnf=pos>=99;
  // Registrar decisión positiva si hubo podio
  if(pos<=3&&!isDnf)logCoachDecision('podio_logrado','El atleta consiguió podio',true);
  if(isDnf)logCoachDecision('dnf_carrera','El atleta abandonó una carrera',false);

  // Actualizar estado emocional tras carrera
  updateEmotionalState();
  updateCoachTrait();

  // Generate a between-race event for next coachHome visit (Tanda 1)
  generateCoachBetweenEvent();

  // Guardar datos de la carrera acabada para usarlos en postRace
  G._lastRaceResult={pos,isDnf:false,raceName:race.name,prize,coachCut,dialogue:G.coachLastDialogue};
  // CR-38 (v76): logros de Entrenador — antes no se comprobaban nunca en este modo
  checkAndUnlockAchievements();
  autoSave();
  G.screen='coachPostRace';render();
};

// ══════════════════════════════════════
//  POST-CARRERA UNIFICADA (E16)
// ══════════════════════════════════════
function renderCoachPostRace(){
  const el=$main();
  hideChrome();
  const a=G.coachAthlete;if(!a){G.screen='coachHome';render();return;}
  const r=G._lastRaceResult||{pos:0,raceName:'Carrera',prize:0,coachCut:0};
  // T45 (v89): esta pantalla asume clasificación. El camino de DNF va a
  // coachHome y no debería llegar aquí; la guarda evita pintar «#null».
  if(isDNF(r)){G.screen='coachHome';render();return;}
  const es=EMOTIONAL_STATES[G.coachEmotionalState||'fresco'];
  const isAllDone=(G.coachRaceIdx>=(G.coachSelectedRaces||[]).length);
  const nextRace=!isAllDone?(G.coachSelectedRaces||[])[G.coachRaceIdx]:null;

  // Reacción del atleta según estilo del entrenador
  const style=G.coachTrainerStyle?TRAINER_STYLES[G.coachTrainerStyle]:null;
  const styleReaction=style?(r.pos<=5?style.reactionGood:style.reactionBad):null;

  // Propuesta de bloque de entrenamiento para después
  const suggestedBlock=G.coachBodyLoad>70?'Recuperación activa — la carga está alta'
    :r.pos<=3?'Mantén el ritmo — estás en buena forma'
    :r.pos>15?'Bloque de resistencia — hay margen de mejora'
    :'Entrenamiento técnico — afina los puntos débiles';
  const taperWasUsed=G._taperUsedThisRace||false;
  G._taperUsedThisRace=false; // reset para próxima carrera

  // Paso 6 de la dirección visual (2026-10-30): tipo Momento: franja según el puesto, lo que dice
  // el atleta (familia gente), balance en filas y el siguiente paso como consejo.
  const fila=(t,v,cl)=>`<div class="pz-fila"><span class="pz-fila-txt">${t}</span><span class="pz-fila-dato ${cl||''}">${v}</span></div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-franja ${r.pos<=3?'podio':'fuera'}">
      <div class="pz-franja-sub" style="margin:0 0 4px">${r.pos===1?'🥇':r.pos<=3?'🏆':r.pos<=10?'🎯':'📋'} ${esc(r.raceName)}</div>
      <div class="pz-franja-num">${r.pos}.º</div>
      <div class="pz-franja-sub">${a.name} · Temporada ${G.coachSeason}</div>
    </div>
    ${G.coachLastDialogue?`<div class="pz-tarjeta">
      <span class="pz-etiqueta fam-gente">${a.name} dice</span>
      <p style="font-style:italic;margin:6px 0">${esc(G.coachLastDialogue)}</p>
      <div class="pz-efectos">${es.emoji} Estado: <b>${es.label}</b></div>
    </div>`:''}
    ${styleReaction?`<div class="pz-diag">Reacción a tu estilo ${TRAINER_STYLES[G.coachTrainerStyle].emoji}: <i>${esc(styleReaction)}</i></div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Balance de la carrera</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${fila('Posición',`<b>${r.pos}.º</b>`)}
      ${r.prize>0?fila('Premio',fmtEur(r.prize,true),'pz-mas'):''}
      ${r.coachCut>0?fila('Tu comisión (20 %)',fmtEur(r.coachCut,true),'pz-mas'):''}
      ${fila('Confianza del atleta',`${G.coachTrust}/100`,G.coachTrust<30?'pz-menos':'')}
      ${fila('Carga corporal',`${Math.round(G.coachBodyLoad)} %`,G.coachBodyLoad>70?'pz-menos':'')}
    </div>
    ${G.coachPendingEvent?`<div class="pz-tarjeta" style="border-color:var(--gente)"><span class="pz-etiqueta fam-gente">${G.coachPendingEvent.icon||'📋'} Pendiente</span><b style="display:block;margin-top:4px">${G.coachPendingEvent.title}</b><div class="pz-efectos">Hay algo pendiente de resolver</div></div>`:''}
    ${taperWasUsed?`<div class="pz-diag mas"><b>Descarga previa aplicada.</b> El taper de esta semana aportó +5 % de energía/piernas al inicio. ${r.pos<=5?'Los datos confirman que llegaste más fresco.':'Aunque el resultado no fue el esperado, el cuerpo estaba a punto.'}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Siguiente paso</div>
    <div class="pz-tarjeta">
      <div>💡 ${suggestedBlock}</div>
      ${nextRace?`<div class="pz-efectos" style="margin-top:4px">Próxima carrera: <b>${esc(nextRace.name)}</b></div>`:'<div class="pz-diag mas" style="margin-top:4px">Temporada completada — puedes ver el balance.</div>'}
    </div>
    ${isAllDone
      ?`<button class="pz-btn" onclick="G.screen='coachSeasonEnd';render()">Ver balance de temporada →</button>`
      :`<button class="pz-btn" onclick="G._lastRaceResult=null;G.screen='coachHome';render()">Continuar →</button>`}
  </div>`;
}

function renderCoachSeasonEnd(){
  const el=$main();
  hideChrome();
  const a=G.coachAthlete;
  const results=G.coachRaceResults||[];
  const wins=results.filter(r=>r.pos===1&&!r.dnf).length;
  const podiums=results.filter(r=>r.pos<=3&&!r.dnf).length;
  const dnfs=results.filter(r=>r.dnf).length;
  const totalCut=results.reduce((s,r)=>s+(r.coachCut||0),0);
  const mFees=(a.monthlyFee||250)*12;
  const sponsorIncome=(G.coachSponsors||[]).reduce((s,sp)=>s+Math.round((sp.salary||0)*(sp.coachCut||0.15)),0);
  const total=totalCut+mFees+sponsorIncome;
  const bestPos=results.filter(r=>!r.dnf).reduce((best,r)=>Math.min(best,r.pos),999);

  const obj=G.coachSeasonObjective;
  let objMet=false,objTrustDelta=0;
  if(obj){
    try{objMet=coachObjectiveMet(obj,results);}catch(e){objMet=false;}   // DS05 (v95)
    objTrustDelta=objMet?(obj.reward||8):(obj.penalty||-5);
    // v103: la confianza del objetivo se sumaba en cada redibujo de esta pantalla (cambiar de
    // pestaña y volver la volvía a aplicar). Ahora una sola vez: queda marcado en el objetivo,
    // que se guarda con la partida y se renueva con la temporada siguiente.
    if(!obj.trustApplied)G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+objTrustDelta));
    G.coachSeasonObjective={...obj,met:objMet,trustApplied:true};
  }

  const sponsorResults=(G.coachSponsors||[]).map(sp=>{
    let met=false;
    if(sp.objKey==='finish2')met=results.filter(r=>!r.dnf).length>=2;
    else if(sp.objKey==='finish3')met=results.filter(r=>!r.dnf).length>=3;
    else if(sp.objKey==='top15')met=results.some(r=>r.pos<=15&&!r.dnf);
    else if(sp.objKey==='top10')met=results.some(r=>r.pos<=10&&!r.dnf);
    else if(sp.objKey==='top5')met=results.some(r=>r.pos<=5&&!r.dnf);
    else if(sp.objKey==='podio')met=results.some(r=>r.pos<=3&&!r.dnf);
    return{...sp,met};
  });

  // H17 (v95): aquí se calculaba el aviso «🏕️ Modo Club disponible — N temporadas
  // completadas» del cierre de temporada. Solo informaba: en Entrenador suelto no hay
  // salto a Club (decidido el 2026-09-04 y confirmado el 2026-09-13) y el menú no lo
  // desbloquea. Se quitó.
  const trust=G.coachTrust||0;
  const log=G.coachDecisionLog||[];
  const posDecisions=log.filter(d=>d.positive).length;
  const negDecisions=log.filter(d=>!d.positive).length;
  const es=EMOTIONAL_STATES[G.coachEmotionalState||'fresco'];
  const thisSeasonLog=log.filter(d=>d.season===G.coachSeason);

  const isEnthusiastic=trust>=70&&posDecisions>=2&&negDecisions===0;
  const isBreakup=trust<40;

  const endingConfig=isEnthusiastic?{
    headerEmoji:'🏆',
    franja:'podio',
    titleText:'Temporada extraordinaria',
    subtitleText:`Una relación que crece. ${esc(a.name)} confía en ti completamente.`,
    athleteQuote:wins>=2
      ?`"Esto lo hemos construido juntos. No me imagino trabajando con otro entrenador."`
      :podiums>=1
      ?`"Cada decisión que tomaste este año tenía sentido. Gracias por creer en mí."`
      :`"No han sido los resultados que queríamos, pero el proceso ha sido de los mejores de mi carrera."`,
    narrativeFn:()=>{
      if(wins>=2)return`Temporada brillante. ${esc(a.name)} llegó al podio ${wins} veces y el trabajo conjunto se nota.`;
      if(wins===1)return`Una victoria y la confianza por las nubes. La progresión es real y el atleta lo sabe.`;
      if(podiums>=1)return`Sin victorias, pero la relación es el activo más valioso. Una base sólida para el año que viene.`;
      return`Los resultados no acompañaron, pero la confianza se ha construido. Eso vale más que cualquier posición.`;
    },
  }:isBreakup?{
    headerEmoji:negDecisions>=2?'💔':G.coachEmotionalState==='quemado'?'🩶':'😶',
    franja:'negativo',
    titleText:'Temporada que termina mal',
    subtitleText:`${esc(a.name)} no seguirá. Hay que analizar qué falló.`,
    athleteQuote:negDecisions>=2
      ?`"Hubo decisiones que no entendí. Necesito un entrenador que confíe en mí de otra manera."`
      :G.coachEmotionalState==='quemado'
      ?`"Estoy agotado. No físicamente — por dentro. Necesito empezar de cero con alguien."`
      :`"No hemos conectado este año. No es culpa de nadie, pero necesito un cambio."`,
    narrativeFn:()=>{
      if(negDecisions>=2)return`Las tensiones acumuladas fueron demasiado. ${esc(a.name)} recuerda decisiones que le pesaron.`;
      if(G.coachEmotionalState==='quemado')return`El desgaste emocional fue excesivo. La temporada terminó antes de terminar.`;
      if(dnfs>=2)return`Demasiados abandonos. La confianza se erosionó carrera a carrera.`;
      return`La confianza nunca llegó a construirse. Dos personas que no encontraron su ritmo juntos.`;
    },
  }:{
    headerEmoji:wins>=1?'🎯':podiums>=1?'📈':'📋',
    franja:'cierre',
    titleText:'Balance de temporada',
    subtitleText:`Temporada ${G.coachSeason} con ${esc(a.name)}`,
    athleteQuote:trust>=60
      ?`"Ha sido una temporada correcta. Creo que podemos hacer más el año que viene."`
      :`"No ha sido fácil. Seguimos, pero hay cosas que mejorar entre los dos."`,
    narrativeFn:()=>{
      if(wins>=1)return`Una victoria. La temporada tiene valor aunque no llegara a todo lo esperado.`;
      if(podiums>=1)return`Varios podios. La base es buena — queda margen para crecer.`;
      if(dnfs>=2)return`Demasiados abandonos. Hay que revisar la carga y el calendario.`;
      if(G.coachInjury)return`La lesión marcó la temporada. Lo que importa ahora es la recuperación completa.`;
      return`Una temporada discreta pero honesta. Hay base para construir algo mejor.`;
    },
  };

  // Paso 6 de la dirección visual (2026-10-30): primero el Momento (franja según cómo acaba la
  // relación, lo que dice el atleta y tu huella) y después el Resumen (objetivo, cifras,
  // economía, sponsors) y la decisión como opciones. Sin hex.
  const fila=(t,v,cl)=>`<div class="pz-fila"><span class="pz-fila-txt">${t}</span><span class="pz-fila-dato ${cl||''}">${v}</span></div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-franja ${endingConfig.franja}">
      <div class="pz-franja-sub" style="margin:0 0 4px">${endingConfig.headerEmoji} Temporada ${G.coachSeason}</div>
      <div class="pz-franja-num" style="font-size:34px">${endingConfig.titleText}</div>
      <div class="pz-franja-sub">${endingConfig.subtitleText}</div>
    </div>
    <div class="pz-tarjeta">
      <span class="pz-etiqueta fam-gente">${esc(a.name)} al final de temporada</span>
      <p style="font-style:italic;margin:6px 0">${endingConfig.athleteQuote}</p>
      <div class="pz-efectos">${es.emoji} Estado: <b>${es.label}</b></div>
    </div>
    <div class="pz-tarjeta">
      <p style="font-style:italic;margin:0 0 ${thisSeasonLog.length?'8px':'0'}">«${endingConfig.narrativeFn()}»</p>
      ${thisSeasonLog.length?`<div class="pz-label" style="margin-bottom:4px">Tu huella esta temporada</div>
        ${thisSeasonLog.map(d=>`<div class="pz-diag ${d.positive?'mas':'ojo'}">${esc(d.label)}</div>`).join('')}`:''}
    </div>
    ${obj?`<div class="pz-diag ${objMet?'mas':'menos'}"><b>Objetivo de ${esc(a.name)}${objMet?' cumplido':' no cumplido'}:</b> ${obj.label} · <span class="${objTrustDelta>=0?'pz-mas':'pz-menos'}">${objTrustDelta>=0?'+':''}${objTrustDelta} confianza</span>${obj.fromHistory?' <span class="pz-efectos">(basado en vuestro historial)</span>':''}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Resultados</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center">
      ${[['Carreras',results.filter(r=>!r.dnf).length],['Podios',podiums],['DNF',dnfs],['Mejor',bestPos<999?bestPos+'.º':'—']].map(([l,v])=>`<div class="pz-tarjeta" style="margin:0;padding:8px 4px"><div class="pz-efectos">${l}</div><div class="pz-num" style="font-size:20px">${v}</div></div>`).join('')}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Economía</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${fila('Honorarios (12 meses)',fmtEur(mFees,true),'pz-mas')}
      ${fila('Bonus podios (20 %)',fmtEur(totalCut,true),'pz-mas')}
      ${sponsorIncome>0?fila('Comisión sponsors',fmtEur(sponsorIncome,true),'pz-mas'):''}
      ${fila('<b>Total temporada</b>',`<b>${fmtEur(total,true)}</b>`,'pz-mas')}
      ${fila('Reputación entrenador',`${G.coachReputation}/100`)}
    </div>
    ${sponsorResults.length>0?`<div class="pz-label" style="margin:14px 0 6px">Sponsors</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${sponsorResults.map(sp=>fila(`${esc(sp.name)}<div class="pz-efectos">${sp.objective}</div>`,sp.met?'✓ Cumplido':'✗ No cumplido',sp.met?'pz-mas':'pz-menos')).join('')}
    </div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Decisión del atleta</div>
    ${isEnthusiastic?`<div class="pz-diag mas"><b>🤝 ${esc(a.name)} quiere renovar con más ambición.</b> Confía plenamente. Propone mejorar condiciones.</div>
      <button class="pz-btn" style="margin-top:8px" onclick="doCoachRenewEnthusiastic()">Renovar — condiciones mejoradas →</button>
      <button class="pz-btn sec" onclick="doCoachNewAthlete()">Buscar nuevo atleta en su lugar</button>`
    :isBreakup?`<div class="pz-diag menos"><b>🚪 ${esc(a.name)} no renueva.</b> ${negDecisions>=2?'Demasiadas decisiones que le perjudicaron.':G.coachEmotionalState==='quemado'?'Necesita un cambio de aire tras el desgaste.':'La confianza no llegó a construirse.'}</div>
      <button class="pz-btn" style="margin-top:8px" onclick="doCoachNewAthlete()">Buscar nuevo atleta →</button>`
    :`<div class="pz-diag"><b>📋 ${esc(a.name)} ${trust>=60?'quiere renovar':'está dispuesto a renovar'}.</b> Confianza: ${trust}/100 · ${trust>=60?'La relación funciona.':'No ha sido fácil, pero sigue.'}</div>
      <button class="pz-btn" style="margin-top:8px" onclick="doCoachNextSeason()">Renovar — Temporada ${G.coachSeason+1} →</button>
      <button class="pz-btn sec" onclick="doCoachNewAthlete()">Buscar nuevo atleta en su lugar</button>`}
    <button class="pz-btn sec" style="margin-top:14px" onclick="saveCoachSlot();G.screen='coachHub';render()">← Volver al hub</button>
    <button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}

// Renovación entusiasta: el atleta propone mejoras de condiciones
window.doCoachRenewEnthusiastic=()=>{
  const a=G.coachAthlete;
  // T114: +1..3 en vez de +2..5, y se marca para que doCoachNextSeason NO sume
  // además el bono de madurez. Antes se apilaban los dos: hasta +42 puntos.
  Object.keys(a.currentStats).forEach(k=>{
    a.currentStats[k]=Math.min(98,a.currentStats[k]+1+Math.floor(Math.random()*3));
  });
  G._skipMaturityThisSeason=true;
  a.monthlyFee=Math.round((a.monthlyFee||250)*1.10);
  showToast(`🤝 Renovación entusiasta — honorarios +10%`);
  doCoachNextSeason();
};

// T114 (v83): madurez y declive. Antes, cerrar temporada daba +0..2 en los seis
// stats pasara lo que pasara, y la renovación entusiasta apilaba otro +2..5
// encima: hasta +42 puntos sin entrenar. Ahora el progreso gratis es pequeño,
// depende de la edad y se apaga; a partir de 33 empieza el declive.
// El grueso del progreso debe venir de los bloques de entrenamiento.
function applyAthleteMaturity(a){
  if(!a||!a.currentStats)return;
  const keys=Object.keys(a.currentStats);
  const bump=(n,lo,hi)=>{
    shuffle([...keys]).slice(0,n).forEach(k=>{
      a.currentStats[k]=Math.min(98,a.currentStats[k]+lo+Math.floor(Math.random()*(hi-lo+1)));
    });
  };
  const age=a.age||24;
  if(age<23)       bump(2,1,2);          // joven: crece solo por competir
  else if(age<30)  bump(1,0,1);          // madurez: casi nada
  else if(age>=33){                      // declive: velocidad y bajada se van primero
    ['velocidad','bajada'].forEach(k=>{
      if(a.currentStats[k]!==undefined)
        a.currentStats[k]=Math.max(10,a.currentStats[k]-(1+Math.floor(Math.random()*2)));
    });
  }
}

window.doCoachNextSeason=()=>{
  // CR-38 (v76): capturar temporada perfecta antes de vaciar coachRaceResults — logro coach_perfect_season
  const _crr=G.coachRaceResults||[];
  if(_crr.length>=3&&_crr.every(r=>r.pos===1&&!r.dnf))G._coachPerfectSeason=true;
  if(!G.coachAthleteHistory)G.coachAthleteHistory=[];
  G.coachAthleteHistory.push({name:G.coachAthlete.name,season:G.coachSeason,
    wins:(G.coachRaceResults||[]).filter(r=>r.pos===1&&!r.dnf).length,
    podiums:(G.coachRaceResults||[]).filter(r=>r.pos<=3&&!r.dnf).length,
    bestPos:(G.coachRaceResults||[]).filter(r=>!r.dnf).reduce((b,r)=>Math.min(b,r.pos),999),
    trust:G.coachTrust,completed:true,emotionalState:G.coachEmotionalState});
  G.coachSeason++;G.coachSelectedRaces=[];G.coachRaceIdx=0;
  G.coachRaceResults=[];G.coachLastTraining=null;
  G.coachBodyLoad=Math.max(0,(G.coachBodyLoad||0)-20);
  G.coachPendingEvent=null;G.coachLastDialogue=null;
  G.coachRaceEventPending=null;G.coachEventLog=[];
  G.coachGels=3;G.coachGelsUsed=0;G.coachRadioUsed={};G.coachAidExtras={};G.coachPreRaceBlock=null;
  G.coachSeasonObjective=null;G.coachInjury=null;G.coachSponsors=[];G.coachSponsorPool=null;G.coachRadioWindowOpen=false;
  if(G.coachEmotionalState==='quemado')G.coachEmotionalState='dudoso';
  else if(G.coachEmotionalState==='confiado'||G.coachEmotionalState==='recuperado')G.coachEmotionalState='fresco';
  generateCoachSeasonObjective();
  generateCoachSponsorPool();
  const a=G.coachAthlete;
  a.age=(a.age||24)+1;                   // T114: antes la edad nunca subía
  if(!G._skipMaturityThisSeason)applyAthleteMaturity(a);
  G._skipMaturityThisSeason=false;
  checkAndUnlockAchievements(); // CR-38 (v76)
  G.screen='coachHome';G.activeTab='game';
  // v96 · Carrera de Vida: retiros de rivales, atleta extra y oferta de club se comprobaban solo
  // en doNextYear(), el cierre de Clásico, al que en fase Entrenador no se llega nunca.
  if(G.carreraVida&&G.lifecyclePhase==='coach'){
    checkRivalRetirements();
    checkLifeExtraAthlete();
    if(G.screen!=='lifeAthleteOffer')checkClubOffer();
  }
  saveCoachSlot();autoSave();render();
};

window.doCoachNewAthlete=()=>{
  if(!G.coachAthleteHistory)G.coachAthleteHistory=[];
  G.coachAthleteHistory.push({name:G.coachAthlete.name,season:G.coachSeason,
    wins:(G.coachRaceResults||[]).filter(r=>r.pos===1&&!r.dnf).length,
    trust:G.coachTrust,completed:false});
  // Clear current slot
  G.coachAthlete=null;G.coachSeason=1;G.coachRaceResults=[];
  G._coachSlotNotifs=[];
  const coached=(G.coachAthleteHistory||[]).map(h=>h.name);
  const avail=COACH_ATHLETE_POOL.filter(a=>!coached.includes(a.name));
  const src=shuffle((avail.length>=3?avail:COACH_ATHLETE_POOL));
  G.coachPool=src.slice(0,3).map(a=>({...a,currentStats:{...a.baseStats}}));
  saveCoachSlot(); // save empty slot back
  G.screen='coachSelect';render();
};
function renderCoachHub(){
  const el=$main();
  hideChrome();
  saveCoachSlot(); // T111/T112 (v92): una vez antes de pintar, no una por slot (DS12, v95: estaba dos veces)
  const roster=G.coachRoster||[];
  const rep=G.coachReputation||0;
  // E2: detectar desbloqueo de slot y celebrar
  const prevRep=G._prevCoachRep||0;
  if(prevRep<40&&rep>=40&&!G._slot1Celebrated){
    G._slot1Celebrated=true;
    setTimeout(()=>showToast('🎉 ¡Slot 2 desbloqueado! Ya puedes entrenar a un segundo atleta'),400);
  }
  if(prevRep<70&&rep>=70&&!G._slot2Celebrated){
    G._slot2Celebrated=true;
    setTimeout(()=>showToast('🌟 ¡Slot 3 desbloqueado! Agencia de tres atletas'),400);
  }
  G._prevCoachRep=rep;
  // Paso 6 de la dirección visual (2026-10-30): tipo Hub de modo (como el del Club): cabecera con
  // el acento, cifras, barra de reputación y los slots como opciones; bloqueados con motivo.
  const repTier=rep<20?{label:'Entrenador novato'}:rep<40?{label:'Entrenador regional'}:rep<60?{label:'Entrenador conocido'}:rep<80?{label:'Entrenador nacional'}:{label:'Entrenador élite 🌟'};
  const filledSlots=roster.filter(s=>s&&s.coachAthlete).length;

  // Build slot cards
  const slotCards=[0,1,2].map(idx=>{
    const slot=roster[idx];
    const unlocked=coachSlotUnlocked(idx);
    const notifs=coachSlotNotifCount(idx);
    const hasAthlete=slot&&slot.coachAthlete;

    if(!unlocked){
      const reqRep=idx===1?40:70;
      return`<div class="pz-opcion pz-bloqueado"><b>Slot ${idx+1}</b>${motivoHTML(`Reputación ${reqRep} (tienes ${rep})`)}</div>`;
    }
    if(!hasAthlete){
      return`<button class="pz-opcion sin-check" style="border-style:dashed" onclick="addCoachSlot(${idx})"><b>+ Añadir atleta al slot ${idx+1}</b><div class="pz-efectos">Presenta tres candidatos y elige uno</div></button>`;
    }
    const a=slot.coachAthlete;
    const trust=slot.coachTrust||60;
    const season=slot.coachSeason||1;
    const raceIdx=slot.coachRaceIdx||0;
    const totalRaces=(slot.coachSelectedRaces||[]).length;
    const allDone=totalRaces>0&&raceIdx>=totalRaces;
    const nextRace=totalRaces>0?(slot.coachSelectedRaces||[])[raceIdx]:null;
    const pendingEvent=slot.coachPendingEvent&&!slot.coachPendingEvent.resolved;
    const injury=slot.coachInjury&&slot.coachInjury.racesLeft>0;
    const unreadNotifs=(slot._coachSlotNotifs||[]).filter(x=>!x.read);
    const isActive=(G.coachActiveIdx||0)===idx;

    // Status text
    let statusText='';
    if(allDone)statusText='✅ Temporada completa — ver balance';
    else if(totalRaces===0)statusText='📅 Sin calendario — planificar';
    else if(injury)statusText=`🩹 Lesionado — ${slot.coachInjury.racesLeft} carrera${slot.coachInjury.racesLeft!==1?'s':''} de baja`;
    else if(nextRace)statusText=`🏁 Próxima: ${nextRace.name}`;
    else statusText='🏃 En entrenamiento';

    return`<button class="pz-opcion sin-check${isActive?' sel':''}" onclick="switchCoachSlot(${idx})">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:24px">${a.flag}</span>
        <span class="pz-fila-txt" style="min-width:0">
          <span style="display:flex;align-items:center;gap:6px"><b>${esc(a.name)}</b>${notifs>0?`<span class="notif-dot ${pendingEvent||unreadNotifs.some(n=>n.type==='urgent')?'urgent':''}"></span>`:''}${isActive?'<span class="pz-chip" style="margin:0;background:var(--acc-t)">Activo</span>':''}</span>
          <div class="pz-efectos">T${season} · ${SPEC_LABEL[a.spec]||a.spec} · confianza <span class="${trust<30?'pz-menos':''}">${trust}/100</span></div>
          <div style="margin-top:2px">${statusText}</div>
          ${unreadNotifs.length>0?`<div style="margin-top:6px">${unreadNotifs.slice(0,2).map(n=>`<div class="pz-diag">${n.text}</div>`).join('')}${unreadNotifs.length>2?`<div class="pz-efectos">+${unreadNotifs.length-2} más</div>`:''}</div>`:''}
        </span>
      </div>
    </button>`;
  }).join('');

  const hist=G.coachAthleteHistory||[];
  const totalWins=hist.reduce((s,h)=>s+(h.wins||0),0);
  const totalAthletes=hist.length+filledSlots;

  el.innerHTML=`<div class="pz">
    <div class="pz-tarjeta" style="border-color:var(--acc);border-width:1.5px">
      <div class="pz-label">📋 Centro de entrenamiento</div>
      <div class="pz-titulo" style="margin:2px 0 8px">${repTier.label}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);text-align:center;gap:6px">
        ${[['Reputación',`${rep}/100`],['Atletas',totalAthletes],['Victorias',totalWins]].map(([l,v])=>`<div><div class="pz-num" style="font-size:20px">${v}</div><div class="pz-efectos">${l}</div></div>`).join('')}
      </div>
      <div class="pz-barra" style="margin-top:10px"><div class="pz-relleno" style="width:${rep}%;background:var(--acc)"></div></div>
      ${rep<40?`<div class="pz-efectos" style="margin-top:4px;text-align:center">Reputación 40 para un 2.º atleta · 70 para un 3.º</div>`:''}
    </div>
    ${(G._slot1Celebrated&&rep>=40&&rep<70)||(G._slot2Celebrated&&rep>=70)?`<div class="pz-diag mas"><b>${rep>=70?'🌟 ¡Slot 3 desbloqueado!':'🎉 ¡Slot 2 desbloqueado!'}</b> ${rep>=70?'Puedes llevar hasta 3 atletas simultáneamente.':'Puedes añadir un segundo atleta a tu agencia.'}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Mis atletas</div>
    ${slotCards}
    ${hist.length>0?`<div class="pz-label" style="margin:14px 0 6px">Historial de atletas</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${hist.slice(-4).reverse().map(h=>`<div class="pz-fila"><span class="pz-fila-txt">${esc(h.name)}<div class="pz-efectos">T${h.season} · ${h.wins||0} victorias · confianza final ${h.trust}/100</div></span><span class="pz-chip ${h.completed?'mas':'menos'}" style="margin:0">${h.completed?'Renovó':'No renovó'}</span></div>`).join('')}
    </div>`:''}
    <button class="pz-btn sec" style="margin-top:12px" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}

// v96 · Primer hueco desbloqueado y vacío del roster, o -1. Guarda antes el slot activo: si
// no, el atleta que estás viendo podría no constar todavía en G.coachRoster.
function coachFreeSlotIdx(){
  saveCoachSlot();
  for(let i=0;i<3;i++){
    if(coachSlotUnlocked(i)&&!(G.coachRoster&&G.coachRoster[i]&&G.coachRoster[i].coachAthlete))return i;
  }
  return -1;
}
window.addCoachSlot=idx=>{
  // Determine which slot to fill: if idx given, use it; else find first empty unlocked slot
  let targetIdx=idx!==undefined?idx:-1;
  if(targetIdx===-1){
    for(let i=0;i<3;i++){
      if(coachSlotUnlocked(i)&&!(G.coachRoster&&G.coachRoster[i]&&G.coachRoster[i].coachAthlete)){
        targetIdx=i;break;
      }
    }
  }
  if(targetIdx===-1){showToast('No hay slots disponibles');return;}
  // Save current slot, switch to target, show select
  saveCoachSlot();
  G.coachActiveIdx=targetIdx;
  // Init empty state for this slot
  coachSlotKeys().forEach(k=>{
    const defaults={coachAthlete:null,coachSeason:1,coachTrust:60,coachEarnings:0,
      coachSelectedRaces:[],coachRaceIdx:0,coachRaceResults:[],coachBodyLoad:0,
      coachRaceData:null,coachRaceAnimIdx:0,coachRaceAidPaused:false,coachLastTraining:null,
      coachNemesis:null,coachPendingEvent:null,coachLastDialogue:null,coachDayCondition:null,
      coachRaceEventPending:null,coachEventLog:[],coachGels:3,coachGelsUsed:0,
      coachRadioUsed:{},coachAidExtras:{},coachPreRaceBlock:null,coachSeasonObjective:null,
      coachInjury:null,coachSponsors:[],coachSponsorPool:null,coachRadioWindowOpen:false,
      coachTrainingSelected:null,coachPool:null,_coachSlotNotifs:[],
      coachEmotionalState:'fresco',coachDecisionLog:[]};
    if(k in defaults)G[k]=defaults[k];
  });
  const coached=(G.coachAthleteHistory||[]).map(h=>h.name);
  // Also exclude athletes already in other slots
  const activeNames=(G.coachRoster||[]).filter((s,i)=>i!==targetIdx&&s&&s.coachAthlete).map(s=>s.coachAthlete.name);
  const avail=COACH_ATHLETE_POOL.filter(a=>!coached.includes(a.name)&&!activeNames.includes(a.name));
  const src=shuffle((avail.length>=3?avail:COACH_ATHLETE_POOL));
  G.coachPool=src.slice(0,3).map(a=>({...a,currentStats:{...a.baseStats}}));
  G.screen='coachSelect';render();
};

window.doCoachDelegateRace=()=>{
  const race=(G.coachSelectedRaces||[])[G.coachRaceIdx];
  if(!race)return;
  const a=G.coachAthlete;
  // Apply pre-race block
  let energyBonus=0,trustBonus=0;
  if(G.coachPreRaceBlock==='taper_race')energyBonus=5;
  if(G.coachPreRaceBlock==='mental_talk'){trustBonus=8;G.coachTrust=Math.min(100,G.coachTrust+trustBonus);}
  // Apply day condition
  const dc=G.coachDayCondition||{energyMod:0,legsMod:0};
  // Simulate race silently using existing logic
  const stats=a.currentStats||a.baseStats;
  const basePerf=(stats.resistencia||50)*0.35+(stats.subida||50)*0.25+(stats.bajada||50)*0.2+(stats.velocidad||50)*0.2;
  const condMod=(energyBonus/100)+(dc.energyMod/100)+(dc.legsMod/200);
  const loadPenalty=Math.max(0,(G.coachBodyLoad||0)-60)/200;
  const injPenalty=G.coachInjury&&G.coachInjury.racesLeft>0?0.15:0;
  const rng=(Math.random()*0.2)-0.1;
  const finalPerf=Math.max(10,Math.min(95,basePerf*(1+condMod-loadPenalty-injPenalty)+rng*10));
  const tier=race.tier||'local';
  const numRivals={local:20,regional:40,nacional:80,elite:120}[tier]||30;
  const pos=Math.max(1,Math.round((1-(finalPerf/100))*numRivals*0.8)+1+Math.floor(Math.random()*3));
  const prize=pos<=3?race.prize||0:0;
  const coachCut=Math.round(prize*0.2);
  const trustD=pos<=3?+6:pos<=10?+3:pos<=20?0:-3;
  const repG=pos<=3?4:pos<=10?2:0;
  // Post-race dialogue (E1: con variantes de trust)
  const pers=a.personality;
  const dlgPool=COACH_POST_RACE_DIALOGUES[pers]||{};
  const cat=pos<=3?'great':pos<=10?'good':'bad';
  const trustNow2=G.coachTrust||60;
  const tKey=trustNow2>=75?'highTrust':trustNow2<=30?'lowTrust':null;
  const tPool=tKey&&dlgPool[tKey]&&dlgPool[tKey][cat];
  const bPool=dlgPool[cat]||['"..."'];
  const pool=(tPool&&tPool.length&&Math.random()<0.6)?tPool:bPool;
  const dialogue=pool[Math.floor(Math.random()*pool.length)];
  // Store result
  G.coachRaceResults.push({pos,dnf:false,prize,coachCut,raceName:race.name,tier,delegated:true});
  G.coachEarnings=(G.coachEarnings||0)+coachCut+(a.monthlyFee||250);
  G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+trustD));
  G.coachReputation=Math.min(100,(G.coachReputation||0)+repG);
  G.coachBodyLoad=Math.min(100,(G.coachBodyLoad||0)+race.km*0.3);
  G.coachRaceIdx++;
  G.coachRaceData=null;G.coachDayCondition=null;G.coachPreRaceBlock=null;
  // Add notification
  const icon=pos<=3?'🏆':pos<=10?'🎯':'📋';
  addCoachNotif(`${icon} ${race.name} — ${pos<=3?'¡Podio! ':''}#${pos} · ${dialogue}`,'race_result');
  generateCoachBetweenEvent();
  saveCoachSlot();autoSave();
  showToast(`📡 ${esc(a.name)} ha terminado — #${pos}`);
  G.screen='coachHub';render();
};

// ══════════════════════════════════════
//  MODO CLUB — PANTALLAS
function renderCoachAthleteTab(){
  const el=$main();
  const a=G.coachAthlete;
  if(!a){el.innerHTML='<div class="hint" style="margin-top:20px">Sin atleta activo.</div>';return;}
  const pl=PERSONALITY_LABEL[a.personality];
  const load=G.coachBodyLoad||0;
  const es=EMOTIONAL_STATES[G.coachEmotionalState||'fresco'];
  const decisionLog=(G.coachDecisionLog||[]).slice(-6); // últimas 6 decisiones
  // Paso 6 de la dirección visual (2026-10-30): tipo Ficha (como la de Corredor): cabecera,
  // barras con tokens, fuerte/débil/tendencia en cifras y alertas como diagnósticos.
  const statRow=(k,v,der)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="pz-efectos" style="width:84px">${k.charAt(0).toUpperCase()+k.slice(1)}</span><div class="pz-barra" style="flex:1"><div class="pz-relleno" style="width:${v}%;background:var(--acc)"></div></div><span class="pz-num" style="width:30px;text-align:right">${der}</span></div>`;
  const stats=Object.entries(a.currentStats);
  const sorted=[...stats].sort((x,y)=>y[1]-x[1]);
  const top=sorted[0];const weak=sorted[sorted.length-1];
  // Tendencia: comparar con baseStats
  const improving=stats.filter(([k,v])=>v>(a.baseStats[k]||v)).length;
  const declining=stats.filter(([k,v])=>v<(a.baseStats[k]||v)).length;
  const trendLabel=improving>declining?'↗ Mejorando':declining>improving?'↘ Bajando':'→ Estable';
  // Alertas
  const alerts=[];
  if((G.coachBodyLoad||0)>75)alerts.push({cls:'menos',text:'Carga alta — riesgo de lesión'});
  if(G.coachTrust<35)alerts.push({cls:'ojo',text:'Confianza crítica — revisa tu relación con el atleta'});
  if(weak[1]<40)alerts.push({cls:'ojo',text:`Punto débil: ${weak[0]} (${weak[1]}) — considera trabajarlo`});
  if(G.coachEmotionalState==='quemado')alerts.push({cls:'',text:'Atleta quemado — prioriza recuperación emocional'});
  const cap=t=>t.charAt(0).toUpperCase()+t.slice(1);
  el.innerHTML=`<div class="pz">
    <div class="pz-tarjeta">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:30px">${a.flag}</span>
        <span class="pz-fila-txt"><span class="pz-titulo" style="font-size:22px;margin:0">${esc(a.name)}</span><div class="pz-efectos">${a.age} años · ${SPEC_LABEL[a.spec]||a.spec}</div></span>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">${coachChip(pl.emoji+' '+pl.label)}${coachChip(es.emoji+' '+es.label,es.desc)}</div>
      <div class="pz-efectos" style="margin-top:4px;font-style:italic">${es.desc}</div>
    </div>
    ${G.carreraVida&&G.lifecyclePhase==='overlap'&&G.lifeAthlete&&G.lifeAthlete.id===a.id?`<div class="pz-diag">🕒 Como corredor le dedicas <b>${G.lifeAthleteHours||0} h a la semana</b>${(G.lifeAthleteHours||0)>0?`: al cerrar tu temporada ganará +1 en ${lifeAthleteSeasonGain(G.lifeAthleteHours)} stat${lifeAthleteSeasonGain(G.lifeAthleteHours)>1?'s':''}`:'. Se asignan en tu bloque de entrenamiento'}.</div>`:''}
    <div class="pz-tarjeta">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="pz-label">Confianza</span><span class="pz-num">${G.coachTrust}/100</span></div>
      <div class="pz-barra"><div class="pz-relleno" style="width:${G.coachTrust}%;background:${G.coachTrust>=60?'var(--pos)':G.coachTrust>=30?'var(--avi-bar)':'var(--neg)'}"></div></div>
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Perfil de rendimiento</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;text-align:center">
      <div class="pz-tarjeta" style="margin:0;padding:8px 4px"><div class="pz-efectos">Punto fuerte</div><b>${cap(top[0])}</b><div class="pz-num pz-mas">${top[1]}</div></div>
      <div class="pz-tarjeta" style="margin:0;padding:8px 4px"><div class="pz-efectos">Punto débil</div><b>${cap(weak[0])}</b><div class="pz-num">${weak[1]}</div></div>
      <div class="pz-tarjeta" style="margin:0;padding:8px 4px"><div class="pz-efectos">Tendencia</div><b class="${improving>declining?'pz-mas':declining>improving?'pz-menos':''}">${trendLabel}</b></div>
    </div>
    ${alerts.length?`<div style="margin-top:6px">${alerts.map(al=>`<div class="pz-diag ${al.cls}">${al.text}</div>`).join('')}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Stats actuales</div>
    <div class="pz-tarjeta">${stats.map(([k,v])=>statRow(k,v,v)).join('')}</div>
    <div class="pz-tarjeta">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px"><span class="pz-label">Carga corporal</span><span class="pz-num">${Math.round(load)} %</span></div>
      <div class="pz-barra"><div class="pz-relleno" style="width:${load}%;background:${load>70?'var(--neg)':load>50?'var(--avi-bar)':'var(--pos)'}"></div></div>
      <div class="pz-efectos" style="margin-top:4px">${load>70?'Alta — riesgo de lesión':load>50?'Moderada — ojo con el volumen':'En buena forma'}</div>
    </div>
    ${decisionLog.length>0?`<div class="pz-label" style="margin:14px 0 6px">Lo que recuerda de ti</div>
    <div class="pz-tarjeta">${decisionLog.map(d=>`<div class="pz-diag ${d.positive?'mas':'ojo'}">${esc(d.label)} <span class="pz-efectos">· T${d.season}</span></div>`).join('')}</div>`:''}
  </div>`;
}

function renderCoachRepTab(){
  const el=$main();
  const hist=G.coachAthleteHistory||[];
  const curResults=G.coachRaceResults||[];
  const curWins=curResults.filter(r=>r.pos===1&&!r.dnf).length;
  const curPodiums=curResults.filter(r=>r.pos<=3&&!r.dnf).length;
  const curBest=curResults.filter(r=>!r.dnf).reduce((b,r)=>Math.min(b,r.pos),999);
  const totalWins=hist.reduce((s,h)=>s+(h.wins||0),0)+curWins;
  const totalPodiums=hist.reduce((s,h)=>s+(h.podiums||0),0)+curPodiums;
  const totalAthletes=hist.length+(G.coachAthlete?1:0);
  const totalSeasons=hist.length+(G.coachSeason||1);
  const rep=G.coachReputation||0;
  const repTier=rep<20?{label:'Novato'}:rep<40?{label:'Regional'}:rep<60?{label:'Conocido'}:rep<80?{label:'Nacional'}:{label:'Élite 🌟'};
  const repDesc=rep<20?'El circuito apenas te conoce.':rep<40?'Tienes nombre en las carreras regionales.':rep<60?'Los atletas preguntan por ti.':rep<80?'Coach de confianza en el circuito nacional.':'Los mejores atletas te buscan.';
  const a=G.coachAthlete;

  // Build per-season data for sparkline
  const allSeasons=[
    ...hist.map(h=>({name:h.name,season:h.season,wins:h.wins||0,podiums:h.podiums||0,trust:h.trust,completed:h.completed,bestPos:h.bestPos||999})),
    ...(a?[{name:a.name,season:G.coachSeason,wins:curWins,podiums:curPodiums,trust:G.coachTrust,completed:false,bestPos:curBest,current:true}]:[])
  ].sort((a,b)=>a.season-b.season);

  // Paso 6 de la dirección visual (2026-10-30): tipo Lista (Reputación): cifra grande, palmarés,
  // temporada actual con la diferencia sobre la base y el historial en filas.
  const statRow=(k,v,der)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span class="pz-efectos" style="width:84px">${k.charAt(0).toUpperCase()+k.slice(1)}</span><div class="pz-barra" style="flex:1"><div class="pz-relleno" style="width:${v}%;background:var(--acc)"></div></div><span class="pz-num" style="width:30px;text-align:right">${der}</span></div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-tarjeta">
      <div style="display:flex;align-items:baseline;gap:8px"><span class="pz-num" style="font-size:34px">${rep}</span><span class="pz-efectos">/100 · reputación · <b>${repTier.label}</b></span></div>
      <div class="pz-barra" style="margin:8px 0"><div class="pz-relleno" style="width:${rep}%;background:var(--acc)"></div></div>
      <div class="pz-efectos">${repDesc}</div>
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Palmarés acumulado</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center">
      ${[['Atletas',totalAthletes],['Temporadas',totalSeasons],['Victorias',totalWins],['Podios',totalPodiums]].map(([l,v])=>`<div class="pz-tarjeta" style="margin:0;padding:8px 4px"><div class="pz-efectos">${l}</div><div class="pz-num" style="font-size:20px">${v}</div></div>`).join('')}
    </div>
    ${a?`<div class="pz-label" style="margin:14px 0 6px">Temporada actual — ${esc(a.name)}</div>
    <div class="pz-tarjeta">
      <div class="pz-efectos" style="margin-bottom:8px">T${G.coachSeason} · ${SPEC_LABEL[a.spec]||a.spec} · confianza <b>${G.coachTrust}/100</b></div>
      ${Object.entries(a.currentStats).map(([k,v])=>{const diff=v-(a.baseStats?.[k]||50);
        return statRow(k,v,`<span class="${diff>0?'pz-mas':diff<0?'pz-menos':''}">${diff>0?'+':''}${diff||0}</span>`);}).join('')}
    </div>`:''}
    ${allSeasons.length>0?`<div class="pz-label" style="margin:14px 0 6px">Historial de temporadas</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${allSeasons.map(s=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${esc(s.name)}</b>
        <div class="pz-efectos">T${s.season} · 🏆 ${s.wins} vic. · 🎯 ${s.podiums} podios · ${s.bestPos<999?`mejor ${s.bestPos}.º`:'—'} · conf. ${s.trust}</div></span>
        <span class="pz-chip ${s.current?'':s.completed?'mas':'menos'}" style="margin:0;${s.current?'background:var(--acc-t)':''}">${s.current?'En curso':s.completed?'Renovó':'Se fue'}</span></div>`).join('')}
    </div>`:consejoHTML('coach_rep_hist','Completa tu primera temporada','para ver el historial.')}
  </div>`;
}

// ── Mid-race event resolution (Tanda 2) ──
window.doCoachMidRaceEvent=choiceIdx=>{
  const evt=G.coachRaceEventPending;if(!evt)return;
  const choice=evt.choices[choiceIdx];if(!choice)return;
  if(choice.trust)G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+(choice.trust||0)));
  if(choice.reputation)G.coachReputation=Math.min(100,(G.coachReputation||0)+(choice.reputation||0));
  if(choice.dnf){
    G.coachRaceResults.push({pos:null,dnf:true,dnfReason:'abandono',prize:0,coachCut:0,raceName:G.coachRaceData?.race?.name||''}); // T45 (v89)
    G.coachRaceIdx++;G.coachRaceData=null;G.coachRaceEventPending=null;
    generateCoachBetweenEvent();
    showToast('DNF — el atleta abandona');
    G.screen='coachHome';render();return;
  }
  // Apply stat effects
  const data=G.coachRaceData;
  if(data&&choice.timeMod)data.totalTime+=(choice.timeMod||0);
  if(data&&choice.legBoost){
    const si=G.coachRaceAnimIdx-1;
    for(let i=si;i<data.segments.length;i++){
      data.segments[i].legs=Math.min(100,(data.segments[i].legs||40)+(choice.legBoost||0));
    }
  }
  if(data&&choice.energyCost){
    const si=G.coachRaceAnimIdx-1;
    for(let i=si;i<data.segments.length;i++){
      data.segments[i].energy=Math.max(0,(data.segments[i].energy||60)-(choice.energyCost||0));
    }
  }
  if(!G.coachEventLog)G.coachEventLog=[];
  G.coachEventLog.push({evtId:evt.id,choice:choice.text,trust:choice.trust||0});
  G.coachRaceEventPending=null;
  startCoachRaceAnim();render();
};

// ── Between-race event generator (Tanda 1) ──
function generateCoachBetweenEvent(){
  if(!G.coachAthlete)return;
  const already=(G.coachEventLog||[]).map(e=>e.evtId);
  const pool=COACH_BETWEEN_EVENTS.filter(e=>{
    const times=already.filter(id=>id===e.id).length;
    return Math.random()<(e.prob||0.10)&&times<2;
  });
  if(!pool.length)return;
  G.coachPendingEvent=pool[Math.floor(Math.random()*pool.length)];
}

// ── Render between-race event (Tanda 1) ──
function renderCoachEvent(){
  const el=$main();
  const ev=G.coachPendingEvent;
  if(!ev){G.screen='coachHome';render();return;}
  const a=G.coachAthlete;
  const rival=a?.rivalName||'el rival';
  const name=a?.name||'el atleta';
  const desc=(ev.desc||'').replace(/\{\{name\}\}/g,esc(name)).replace(/\{\{rival\}\}/g,esc(rival));
  // Paso 6 de la dirección visual (2026-10-30): tipo Evento de familia gente; efectos en línea.
  el.innerHTML=`<div class="pz">
    <span class="pz-etiqueta fam-gente">${ev.icon||'📋'} Entre carreras · ${esc(name)}</span>
    <div class="pz-titulo">${ev.title}</div>
    <p style="font-style:italic;line-height:1.6">«${desc}»</p>
    ${ev.choices.map((c,ci)=>{
      const meta=[];
      if(c.trust)meta.push(`<span class="${c.trust>0?'pz-mas':'pz-menos'}">${c.trust>0?'+':''}${c.trust} confianza</span>`);
      if(c.bodyLoad)meta.push(`<span class="${c.bodyLoad<0?'pz-mas':'pz-menos'}">${c.bodyLoad>0?'+':''}${c.bodyLoad} carga</span>`);
      if(c.money)meta.push(`<span class="${c.money>0?'pz-mas':'pz-menos'}">${c.money>0?'+':'−'}€${Math.abs(c.money)}</span>`);
      if(c.reputation)meta.push(`<span class="pz-mas">+${c.reputation} reputación</span>`);
      return`<button class="pz-opcion sin-check" onclick="doCoachEventChoice(${ci})"><b>${c.text}</b>${meta.length?`<div class="pz-efectos">${meta.join(' · ')}</div>`:''}</button>`;
    }).join('')}
  </div>`;
}

window.doCoachEventChoice=choiceIdx=>{
  const ev=G.coachPendingEvent;if(!ev)return;
  const c=ev.choices[choiceIdx];if(!c)return;
  if(c.trust)G.coachTrust=Math.max(0,Math.min(100,G.coachTrust+(c.trust||0)));
  if(c.bodyLoad)G.coachBodyLoad=Math.max(0,Math.min(100,(G.coachBodyLoad||0)+(c.bodyLoad||0)));
  if(c.money)G.money=(G.money||0)+(c.money||0);
  if(c.reputation)G.coachReputation=Math.min(100,(G.coachReputation||0)+(c.reputation||0));
  // Registrar decisión si el evento la define
  if(c.decisionType)logCoachDecision(c.decisionType, c.text.replace(/"/g,'').slice(0,60), c.decisionPositive===true);
  const delta=c.trust||0;
  showToast(delta>0?`+${delta} confianza`:delta<0?`${delta} confianza`:'Evento resuelto');
  if(!G.coachEventLog)G.coachEventLog=[];
  G.coachEventLog.push({evtId:ev.id,choice:c.text,trust:c.trust||0});
  G.coachPendingEvent=null;
  updateEmotionalState();
  G.screen='coachHome';render();
};

// DS05 (v95): el objetivo guardaba su comprobación como función (checkAll).
// JSON.stringify la tira al guardar y cloneSlotValue cae a JSON al cambiar de
// slot, así que tras recargar o cambiar de atleta el objetivo salía SIEMPRE
// fallido: el jugador perdía confianza aunque lo hubiera cumplido. Ahora el
// objetivo es solo datos (id + prevBest) y se evalúa aquí por id. Cada rama
// reproduce el checkAll que se ejecutaba de verdad en partida —no los `check` de
// COACH_SEASON_OBJECTIVES, que no coinciden—, comparado contra v94.
function coachObjectiveMet(obj,all){
  const res=all||[];
  const fin=res.filter(x=>!x.dnf);
  const lastBest=()=>(G.coachAthleteHistory||[]).slice(-1)[0]?.bestPos||999;
  switch(obj&&obj.id){
    case 'win_elite':     return res.some(r=>r.pos===1&&['elite','nacional'].includes(r.tier||''));
    case 'no_abandon':
    case 'no_dnf_season':
    case 'perf_no_dnf':   return res.every(r=>!r.dnf);
    case 'podio_x2':      return fin.filter(x=>x.pos<=3).length>=2;
    case 'top10_all':     return res.every(x=>x.dnf||x.pos<=10);
    case 'finish_all':    return fin.length>=(G.coachSelectedRaces||[]).length;
    case 'improve_pb':
    case 'perf_time':     {const prev=lastBest();return fin.some(x=>x.pos<prev);}
    case 'no_injury':     return !G.coachInjury||(G.coachInjury?.severity||0)<2;
    case 'two_races':     return fin.length>=2;
    case 'first_podio':   return res.some(r=>r.pos<=3&&!r.dnf);
    case 'beat_pb':       return Math.min(...fin.map(x=>x.pos))<(obj.prevBest??999);
    case 'rebuild_trust': return G.coachTrust>=60;
    case 'zegama_time':   return res.some(r=>['nacional','elite'].includes(r.tier||'')&&!r.dnf&&r.pos<=15);
    case 'perf_top5':     return fin.some(x=>x.pos<=5&&['regional','nacional','elite'].includes(x.tier||''));
  }
  return false;
}

// ── Generate season objective ──
function generateCoachSeasonObjective(){
  const a=G.coachAthlete;if(!a)return;
  const hist=G.coachAthleteHistory||[];
  const season=G.coachSeason||1;
  const lastSeason=hist[hist.length-1];
  const prevBest=lastSeason?.bestPos||999;

  // Pool base por personalidad
  const basePool=COACH_SEASON_OBJECTIVES[a.personality]||COACH_SEASON_OBJECTIVES.obediente;

  // Pool extra basado en historial (solo temporada 2+)
  const historyPool=[];
  if(season>=2){
    if(lastSeason&&lastSeason.wins===0&&lastSeason.podiums===0){
      historyPool.push({id:'first_podio',label:'Consigue tu primer podio con este atleta',
        desc:`"El año pasado sin podios. Este año cambiamos eso."`,reward:+15,penalty:-8});
    }
    if(lastSeason&&(lastSeason.dnfs||0)>=2){
      historyPool.push({id:'no_dnf_season',label:'Temporada completa sin abandonos',
        desc:`"${a.name.split(' ')[0]} abandonó demasiado el año pasado. Esta vez llegamos al final."`,
        reward:+10,penalty:-6});
    }
    if(prevBest<999&&prevBest>5){
      historyPool.push({id:'beat_pb',label:`Superar la mejor posición del año pasado (#${prevBest})`,
        desc:`"El año pasado, el mejor fue #${prevBest}. Este año hay que hacerlo mejor."`,
        reward:+12,penalty:-5});
    }
    if(lastSeason&&lastSeason.trust<50){
      historyPool.push({id:'rebuild_trust',label:'Reconstruir la relación — terminar con confianza ≥60',
        desc:`"La temporada pasada acabó tensa. Hay que reconstruir desde dentro."`,
        reward:+14,penalty:-4});
    }
    if(season>=3&&a.personality==='perfeccionista'){
      historyPool.push({id:'zegama_time',label:`Clasificar para Zegama o carrera nacional`,
        desc:`"${a.name.split(' ')[0]} ya está listo para dar el salto. Es el momento."`,
        reward:+18,penalty:-10});
    }
  }

  // Elegir: si hay historial relevante, 60% de probabilidad de usarlo
  const useHistory=historyPool.length>0&&Math.random()<0.6;
  const pool=useHistory?historyPool:basePool;
  const chosen=pool[Math.floor(Math.random()*pool.length)];

  G.coachSeasonObjective={
    id:chosen.id,label:chosen.label,desc:chosen.desc,
    reward:chosen.reward,penalty:chosen.penalty,met:false,
    fromHistory:useHistory,
    prevBest,   // DS05 (v95): beat_pb compara con el mejor puesto del año pasado tal como era al generarse
  };
}

// ── Generate sponsor pool for the season ──
function generateCoachSponsorPool(){
  const season=G.coachSeason||1;
  const tier=season<=1?1:2;
  const pool=shuffle([...COACH_SPONSORS_POOL].filter(s=>s.tier<=tier));
  G.coachSponsorPool=pool.slice(0,3);
}

// ── Sponsors screen ──
function renderCoachSponsors(){
  const el=$main();
  const a=G.coachAthlete;
  const pool=G.coachSponsorPool||[];
  const active=G.coachSponsors||[];
  const CAT_LABEL={zapatillas:'👟 Zapatillas',ropa:'👕 Ropa',nutricion:'🍬 Nutrición',tecnologia:'⌚ Tecnología'};
  // Paso 6 de la dirección visual (2026-10-30): tipo Decisión (como los sponsors del Club).
  const libres=pool.filter(sp=>!active.find(ac=>ac.id===sp.id));
  el.innerHTML=`<div class="pz">
    <div class="pz-titulo">Sponsors del atleta</div>
    <p class="pz-sub">${esc(a?.name||'—')} · T${G.coachSeason} · comisión ${Math.round((pool[0]?.coachCut||0.15)*100)} %</p>
    ${active.length>0?`<div class="pz-label" style="margin:6px 0">Activos esta temporada</div>
      ${active.map(sp=>`<div class="pz-tarjeta" style="border-color:var(--acc);border-width:1.5px">
        <div style="display:flex;justify-content:space-between;gap:8px"><span><b>${esc(sp.name)}</b> <span class="pz-efectos">${CAT_LABEL[sp.cat]||sp.cat}</span></span><span class="pz-num">€${sp.salary}/año</span></div>
        <div class="pz-efectos">Objetivo: ${sp.objective} · <span class="pz-mas">+€${Math.round(sp.salary*(sp.coachCut||0.15))} para ti</span></div>
      </div>`).join('')}`:''}
    <div class="pz-label" style="margin:14px 0 6px">Ofertas disponibles</div>
    ${libres.length>0?libres.map(sp=>active.length<2
      ?`<button class="pz-opcion sin-check" onclick="doCoachAcceptSponsor('${sp.id}')">
        <span style="float:right" class="pz-num">€${sp.salary}/año</span><b>${esc(sp.name)}</b> <span class="pz-efectos">${CAT_LABEL[sp.cat]||sp.cat}</span>
        <div class="pz-efectos">Objetivo: ${sp.objective} · 🎁 ${sp.bonus} · <span class="pz-mas">+€${Math.round(sp.salary*(sp.coachCut||0.15))} comisión</span></div>
      </button>`
      :`<div class="pz-opcion pz-bloqueado"><b>${esc(sp.name)}</b> · €${sp.salary}/año${motivoHTML('Máx. 2 sponsors activos')}</div>`).join('')
    :'<div class="pz-diag">No hay ofertas disponibles ahora mismo.</div>'}
    <button class="pz-btn sec" style="margin-top:8px" onclick="G.screen='coachHome';render()">← Volver</button>
  </div>`;
}

window.doCoachAcceptSponsor=id=>{
  const sp=(G.coachSponsorPool||[]).find(s=>s.id===id);
  if(!sp||(G.coachSponsors||[]).find(s=>s.id===id))return;
  if(!G.coachSponsors)G.coachSponsors=[];
  G.coachSponsors.push({...sp});
  showToast(`🤝 ${sp.name} — contrato firmado`);
  render();
};
