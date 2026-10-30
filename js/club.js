// ── js/club.js ──────────────────────────────────────────────
// Modo Club (gestión de club como mánager): G.clubModeData.
// Extraído de js/coach.js el 2026-09-04 (split club.js/coach.js).
// No confundir con el sistema de club de Clásico (G.club/CLUBS,
// bonus de entrenamiento), que vive en js/render-clasico.js y js/state.js.

function clubLevelByRep(){
  const rep=(G.clubModeData&&G.clubModeData.reputacion)||0;
  const lvls=[...CLUB_LEVELS].reverse();
  return lvls.find(l=>rep>=l.repReq)||CLUB_LEVELS[0];
}

function simClubRace(runner,race,clubData){
  // Modo desarrollador — "modo dios": fuerza 1er puesto en toda carrera de Club
  // simulada mientras esté activo (Club resuelve la temporada entera de golpe,
  // no hay "carrera en curso" única). Ver js/devmode.js.
  const devDnf=window.devPeek?.('clubDnf');
  if(devDnf!==undefined&&(devDnf==='*'||devDnf===runner.id)){
    // DEV: abandono armado desde el panel. Gana al modo dios si están los dos.
    window.devTake('clubDnf');
    const rivals=(CLUB_TIER_FIELD[race.tier||'local']||CLUB_TIER_FIELD.local).rivals;
    return{pos:99,perf:10,prize:0,rivals,dnf:true};
  }
  if(window.devGod?.('club')){
    const rivals=(CLUB_TIER_FIELD[race.tier||'local']||CLUB_TIER_FIELD.local).rivals;
    return{pos:1,perf:98,prize:race.prize,rivals,dnf:false};
  }
  const d=clubData||G.clubModeData||{};
  const s=runner.stats;
  let base=(s.resistencia*0.35+s.velocidad*0.2+s.subida*0.25+s.bajada*0.2);

  // Bonus por especialidad vs terreno
  if(runner.spec==='montanero')base+=race.km>30?4:2;
  if(runner.spec==='fondista') base+=race.km>40?5:0;
  if(runner.spec==='tecnico')  base+=race.km<25?3:0;

  // C8 Rol
  const role=CLUB_ROLES[runner.role||'normal']||CLUB_ROLES.normal;
  base+=role.perfBonus||0;
  if(role.specBonus&&runner.spec===d.specialty)base+=6;
  // Decisión mensual «Resultados»: +4 en la próxima simulación. Se escribía y nadie lo leía (BUG-14).
  base+=d._monthlyFocusBonus||0;

  // C9 Filosofía: bonus si especialidad coincide
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  if(fil&&fil.specBonus&&runner.spec===fil.specBonus)base+=5;
  if(fil&&fil.raceBonus&&fil.raceBonus.includes(race.tier))base+=3;

  // C6 Cohesión: ±10 % rendimiento
  const cohMod=((d.cohesion||50)-50)/500; // -0.1 a +0.1
  base*=(1+cohMod);

  // C11 Staff: entrenador da bonus
  if(d.staff&&d.staff.entrenador)base+=3;

  // C15 Infraestructura: gimnasio mejora base
  if(d.instalaciones&&d.instalaciones.gimnasio)base+=2;

  const rng=(Math.random()*16)-8;
  const perf=Math.max(10,Math.min(98,base+rng));
  // T21 (v83): modelo de campo. La posición sale de contar cuántos rivales te
  // superan, no de una penalización lineal por número de participantes. Con la
  // fórmula anterior el primer puesto en élite era imposible con perf ≤ 98.
  const field=CLUB_TIER_FIELD[race.tier||'local']||CLUB_TIER_FIELD.local;
  const rivals=field.rivals;
  const pBeat=1/(1+Math.exp((perf-field.mean)/field.k));
  let beaten=0;
  for(let i=0;i<rivals;i++) if(Math.random()<pBeat) beaten++;
  const pos=1+beaten;
  const prize=pos===1?race.prize:pos===2?Math.round(race.prize*0.6):pos===3?Math.round(race.prize*0.4):0;

  // C11 Staff fisio reduce DNF
  const dnfChance=base<30?0.12:0;
  const injReduction=(d.staff&&d.staff.fisio?CLUB_STAFF_TYPES.fisio.injuryReduction:0)
    +(fil&&fil.injuryReduction?fil.injuryReduction:0);
  const isDnf=dnfChance>0&&Math.random()<(dnfChance*(1-injReduction));

  return{pos:isDnf?99:pos, perf:Math.round(perf), prize:isDnf?0:prize, rivals, dnf:isDnf};
}

function initClubModeData(name,specialty,filosofia,archetype){
  const fil=filosofia||'montanero';
  // T115 (v84): el arquetipo filtra el pool por edad y potencial, y el sorteo
  // aleatorio evita que dos partidas con la misma especialidad sean idénticas
  // (antes: slice(0,3), siempre los mismos tres corredores).
  const arqId=CLUB_ARCHETYPES[archetype]?archetype:'equilibrado';
  const arq=CLUB_ARCHETYPES[arqId];
  const pick=(pool,n)=>shuffle([...pool]).slice(0,n);
  const fitsArq=r=>
    (arq.ageMax==null   || r.age<=arq.ageMax)&&
    (arq.ageMin==null   || r.age>=arq.ageMin)&&
    (arq.potential==null|| arq.potential.includes(r.potential));
  let sel=pick(CLUB_RUNNER_POOL.filter(r=>(specialty==='mixto'||r.spec===specialty)&&fitsArq(r)),3);
  // Si no hay tres, se relaja primero la especialidad y solo después el arquetipo
  if(sel.length<3){
    const relax=CLUB_RUNNER_POOL.filter(r=>!sel.includes(r)&&fitsArq(r));
    sel=[...sel,...pick(relax,3-sel.length)];
  }
  if(sel.length<3){
    const rest=CLUB_RUNNER_POOL.filter(r=>!sel.includes(r));
    sel=[...sel,...pick(rest,3-sel.length)];
  }
  const plantilla=sel.map(r=>({...r,stats:{...r.stats},currentSalary:r.salary,role:'normal'}));
  // Asignar capitán al primero por defecto
  if(plantilla.length>0)plantilla[0].role='capitan';
  return{
    name, specialty, filosofia:fil, archetype:arqId,
    socios:arq.socios, reputacion:10, presupuesto:arq.presupuesto, temporada:1,
    cohesion:arq.cohesion,          // C6 moral grupal
    plantilla,
    calAssignments:{},              // C5+C10: {raceId:[runnerId,...]}
    seasonResults:[], pendingEvent:null,
    historial:[],
    instalaciones:{gimnasio:false,clinica:false,residencia:false,marketingHQ:false}, // C15
    staff:{},                       // C11: {fisio:true, entrenador:true, ...}
    clubSponsors:[],                // C13
    cantera:[],                     // C12
    seasonObjective:null,           // C18
    seasonObjectiveMet:null,
    rivalClubs:[                    // C14
      {name:'Club Montaña Oria',    rep:20,socios:15,level:'local'},
      {name:'Pirineos Trail Team',  rep:45,socios:55,level:'regional'},
      {name:'Euskadi Trail Elite',  rep:75,socios:120,level:'nacional'},
    ],
    monthlyFocus:null,              // C16 decisión mensual activa
    _monthlyFocusBonus:0,           // C16 «Resultados» de la decisión mensual: +4 en la próxima simulación
    seasonSimulated:false,
    redSeasons:0,                   // v96: temporadas seguidas cerrando con presupuesto negativo
    dissolved:false,                // v96: el club se disolvió tras CLUB_RED_SEASONS_MAX en rojo
    monthlyDecisionDone:false,      // v96: una decisión mensual completa por temporada
    sponsorOutcomes:[],             // v96: objetivo de cada sponsor, evaluado al simular
  };
}

function clubMonthlyWage(){
  const d=G.clubModeData;if(!d)return 0;
  return d.plantilla.reduce((s,r)=>s+(r.currentSalary||r.salary),0);
}
window.doClubMonthlyFocus=(focus)=>{
  const d=G.clubModeData;if(!d)return;
  d.monthlyFocus=focus;
  const msgs={resultados:'🏆 Foco en resultados — rendimiento +5% esta temporada',
    marketing:'📣 Campaña de marketing activa',formacion:'🌱 Plan de formación de cantera',
    ahorro:'💰 Control de costes activado'};
  showToast(msgs[focus]||'Foco mensual establecido');
  autoSave();render();
};
// v96: el foco se aplica al simular la temporada (doClubSimulateSeason), no al
// elegirlo, pero la elección no tenía vuelta atrás. Hasta simular, se puede cambiar.
window.clearClubMonthlyFocus=()=>{
  const d=G.clubModeData;if(!d||d.seasonSimulated)return;
  d.monthlyFocus=null;
  autoSave();render();
};
// v96: en la decisión mensual completa, tocar la opción ya elegida la desmarca.
window.clubToggleMonthlySel=(decId,optId)=>{
  const sel=G._monthlySelections||{};
  if(sel[decId]===optId)delete sel[decId];else sel[decId]=optId;
  G._monthlySelections=sel;
  render();
};

function generateClubObjective(){
  const d=G.clubModeData;if(!d)return;
  const socios=d.socios||8;
  // Filtrar objetivos apropiados según estado del club
  const eligible=CLUB_OBJECTIVES.filter(o=>{
    if(o.id==='socios_80'&&socios<40)return false;
    if(o.id==='socios_30'&&socios>=30)return false;
    if(o.id==='subir_nivel'&&socios>200)return false;
    return true;
  });
  const chosen=eligible[Math.floor(Math.random()*eligible.length)];
  d.seasonObjective=chosen;
  d.seasonObjectiveMet=null;
}

function generateClubEvent(){
  const d=G.clubModeData;if(!d)return;
  if(d.pendingEvent)return;
  const coh=d.cohesion||50;
  const rep=d.reputacion||0;
  const presup=d.presupuesto||0;
  const pool=CLUB_EVENTS.filter(e=>{
    if(e.id==='cle3'&&d.plantilla.length>=6)return false;
    if(e.id==='cle8'&&d.plantilla.length<=2)return false;
    // C3: filtros condicionales
    if(e.minCohesion!==undefined&&coh<e.minCohesion)return false;
    if(e.maxCohesion!==undefined&&coh>e.maxCohesion)return false;
    if(e.minRep!==undefined&&rep<e.minRep)return false;
    if(e.maxRep!==undefined&&rep>e.maxRep)return false;
    if(e.maxPresupuesto!==undefined&&presup>e.maxPresupuesto)return false;
    return true;
  });
  if(!pool.length)return;
  if(Math.random()<0.65)d.pendingEvent=pool[Math.floor(Math.random()*pool.length)];
}

function renderClubCreate(){
  const el=$main();
  hideChrome();
  const name=G._clubNameDraft||'';
  const spec=G._clubSpecDraft||'mixto';
  const fil=G._clubFilDraft||'montanero';
  const arq=G._clubArqDraft||'equilibrado';
  const specs=[
    {id:'montanero', label:'🏔️ Montaña',   desc:'Mejor en subidas y ultras de montaña'},
    {id:'fondista',  label:'🏃 Fondo',      desc:'Resistencia larga. Ultras y maratones'},
    {id:'tecnico',   label:'⚡ Técnico',    desc:'Corredores rápidos en terrenos difíciles'},
    {id:'mixto',     label:'🌐 Mixto',      desc:'Sin especialidad — plantilla variada'},
  ];
  // Paso 6 de la dirección visual (2026-10-30): tipo Formulario: arquetipo y filosofía como
  // opciones en tarjeta y el resumen de con qué empiezas. Sin hex.
  const op=(sel,click,emoji,label,desc)=>`<button class="pz-opcion${sel?' sel':''}" style="display:flex;gap:10px;align-items:flex-start" onclick="${click}">${emoji?`<span style="font-size:18px;line-height:1.2">${emoji}</span>`:''}<span><b>${label}</b><div class="pz-efectos">${desc}</div></span></button>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">🏕️ Club · fundación</div>
    <div class="pz-titulo">Crear tu club</div>
    <p class="pz-sub">${G._clubFromLife?'Tu atleta entra como capitán y tu reputación de entrenador te acompaña. Elige cómo quieres que sea el club.':G._clubUnlockedHint?'Con tu experiencia como corredor y entrenador, el club ya nace con algo de credibilidad.':'Define el nombre, especialidad y filosofía del club.'}</p>
    ${G._clubFromLife?`<div class="pz-diag" style="margin-bottom:12px">Inversión inicial: <span class="pz-num">€${Math.round((G.money||0)*0.6)}</span> (60 % de tus ahorros).${G.coachAthlete?` ${esc(G.coachAthlete.name)} entra como capitán.`:''}</div>`:''}
    ${G._clubUnlockedHint&&!G._clubFromLife?`<div class="pz-diag mas" style="margin-bottom:12px">Tu historial habla por ti. Empiezas con presupuesto un 15 % mayor y reputación inicial de 13 en lugar de 10.</div>`:''}
    <label class="pz-label" for="club-name-inp" style="display:block;margin-bottom:6px">Nombre del club</label>
    <input id="club-name-inp" type="text" placeholder="Ej: Gorbea Trail Club, Txindoki Runners..." maxlength="32" value="${esc(name)}" oninput="G._clubNameDraft=this.value;"/>
    <div class="pz-label" style="margin-bottom:6px">Especialidad de la plantilla</div>
    ${specs.map(x=>op(spec===x.id,`G._clubSpecDraft='${x.id}';render()`,'',x.label,x.desc)).join('')}
    <div class="pz-label" style="margin:14px 0 6px">Filosofía del club</div>
    ${Object.entries(CLUB_FILOSOFIAS).map(([id,f])=>op(fil===id,`G._clubFilDraft='${id}';render()`,f.emoji,f.label,f.desc)).join('')}
    <div class="pz-label" style="margin:14px 0 6px">Arquetipo de plantilla</div>
    ${Object.entries(CLUB_ARCHETYPES).map(([id,a])=>op(arq===id,`G._clubArqDraft='${id}';render()`,a.emoji,a.label,a.desc)).join('')}
    <div class="pz-tarjeta pz-estado" style="margin-top:8px"><div class="pz-linea"><span class="pz-efectos">Empiezas con <b>3</b> corredores, <span class="pz-num">${CLUB_ARCHETYPES[arq].socios}</span> socios, <span class="pz-num">€${CLUB_ARCHETYPES[arq].presupuesto}</span> de presupuesto y cohesión <span class="pz-num">${CLUB_ARCHETYPES[arq].cohesion}/100</span>.</span></div></div>
    <button class="pz-btn" onclick="doClubCreate()">Fundar el club →</button>
    <button class="pz-btn sec" onclick="G.screen=G._clubFromLife?'clubOffer':'modeSelect';render()">← Volver</button>
  </div>`;
}

window.doClubCreate=()=>{
  const nameEl=document.getElementById('club-name-inp');
  const name=(nameEl?nameEl.value:G._clubNameDraft||'').trim()||'Mi Club Trail';
  const spec=G._clubSpecDraft||'mixto';
  const fil=G._clubFilDraft||'montanero';
  const arqSel=G._clubArqDraft||'equilibrado';
  G.clubModeData=initClubModeData(name,spec,fil,arqSel);
  const desdeVida=!!G._clubFromLife;   // v96: fundación desde la oferta de Carrera de Vida
  G._clubFromLife=false;
  if(desdeVida)applyLifeClubFounding();
  // Guiño narrativo si el modo está desbloqueado: presupuesto +15% y reputación inicial +3
  else if(G._clubUnlockedHint){
    G.clubModeData.presupuesto=Math.round(G.clubModeData.presupuesto*1.15);
    G.clubModeData.reputacion=Math.min(100,(G.clubModeData.reputacion||10)+3);
    G._clubUnlockedHint=false;
  }
  G._clubNameDraft=null;G._clubSpecDraft=null;G._clubFilDraft=null;G._clubArqDraft=null;
  generateClubEvent();
  generateClubObjective();
  if(desdeVida)checkAndUnlockAchievements();   // CR-38 (v76): logro cm_found
  G.screen=desdeVida?'clubIntro':'clubHub';autoSave();render();
};

// BUG-13 (v96): la cohesión subía y bajaba sin que nada lo explicase. Las cifras de staff,
// capitán y filosofía salen de las constantes; las de victorias y abandonos son las de
// doClubSimulateSeason (wins*4-dnfs*6), que fija un test.
function clubCohesionTipHtml(){
  const d=G.clubModeData||{};
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  return [
    '<strong>Al simular la temporada</strong>',
    '+4 por cada victoria · −6 por cada abandono',
    `+${CLUB_ROLES.capitan.cohesionBonus} si tienes capitán · +${CLUB_STAFF_TYPES.psicologo.cohesionBonus} con psicólogo`+(fil?` · ${fil.cohesionBonus>0?'+'+fil.cohesionBonus:'±0'} por tu filosofía (${fil.label})`:''),
    '<strong>Decisión mensual</strong>',
    'Conservador +4 · Técnico +2 · Invertir +2 · Evento social +6',
    '<strong>Al cerrar la temporada</strong>',
    '−10 por cada temporada que cierras en números rojos',
    'y lo que marquen el objetivo de temporada, los eventos y las renegociaciones',
    '<br>La cohesión mueve el rendimiento de todo el equipo: −10 % con 0 y +10 % con 100.',
  ].join('<br>');
}
function renderClubHub(){
  const el=$main();
  hideChrome();
  const d=G.clubModeData;
  if(!d){G.screen='clubCreate';render();return;}
  if(d.dissolved){G.screen='clubDissolved';render();return;}
  const lvl=clubLevelByRep();
  const wages=clubMonthlyWage();
  const annualWages=wages*12;
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const staffCost=Object.keys(d.staff||{}).reduce((s,k)=>s+(CLUB_STAFF_TYPES[k]?CLUB_STAFF_TYPES[k].costMonth:0),0)*12;
  const sponsorIncome=Math.round((d.clubSponsors||[]).reduce((s,sp)=>s+(sp.monthlyIncome||0),0)*12*CLUB_SPONSOR_SPLIT.base);   // v96: previsión con el 60 % fijo
  const annualIncome=Math.round(d.socios*CLUB_SOCIO_FEE*12*(fil&&fil.socioBonus?fil.socioBonus:1));
  const annualNet=annualIncome+sponsorIncome-annualWages-staffCost;
  const assigned=Object.values(d.calAssignments||{}).filter(v=>v&&v.length>0).length;
  const allAssigned=d.plantilla.length>0&&assigned>0;
  const obj=d.seasonObjective;
  // Paso 6 de la dirección visual (2026-10-30): tipo Hub de modo, la referencia del lienzo
  // («Cerrada»): barra propia del modo, estado clave, el evento pendiente resaltado, la decisión
  // del periodo y la navegación en lista. Acento rosa por data-modo. Sin hex.
  const nav=(ico,txt,sub,click,dim)=>`<div class="pz-fila navega" style="${dim?'color:var(--ink3)':''}" onclick="${click}"><span style="font-size:18px">${ico}</span><span class="pz-fila-txt"><b>${txt}</b>${sub?`<div class="pz-efectos">${sub}</div>`:''}</span></div>`;
  const F=(txt,v)=>`<div class="pz-fila"><span class="pz-fila-txt">${txt}</span><span class="pz-fila-dato ${v>=0?'pz-mas':'pz-menos'}">${fmtEur(v,true)}</span></div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-tarjeta" style="background:var(--acc-t);border-color:var(--acc)">
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-size:30px">${lvl.icon}</span>
        <span class="pz-fila-txt"><div class="pz-titulo" style="margin:0;font-size:22px">${esc(d.name)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px"><span class="pz-chip" style="background:var(--card);margin:0">${lvl.label}</span>${fil?`<span class="pz-chip" style="background:var(--card);margin:0">${fil.emoji} ${fil.label}</span>`:''}</div></span>
        <span style="text-align:right"><div class="pz-label">Temporada</div><div class="pz-num" style="font-size:24px">${d.temporada}</div></span>
      </div>
    </div>
    ${d._coachingHistory?`<div class="pz-diag" style="margin-bottom:10px">Legado previo: <b class="pz-num">${d._coachingHistory.years}</b> años entrenando · <b class="pz-num">${d._coachingHistory.coachReputation}/100</b> de reputación acumulada</div>`:''}
    <div class="pz-tarjeta" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center">
      ${[['Socios',fmtMiles(d.socios)],['Reputación',d.reputacion],['Presupuesto',fmtEur(d.presupuesto)],['Cohesión',d.cohesion+'/100']].map(([l,v])=>`<div><div class="pz-label">${l}</div><div class="pz-num" style="font-size:18px">${v}</div></div>`).join('')}
      <div style="grid-column:1/-1;margin-top:6px;text-align:left">
        <div style="display:flex;justify-content:space-between" class="pz-efectos"><span>Cohesión <button class="tip-btn" onclick="showTip('Qué mueve la cohesión',clubCohesionTipHtml())">ⓘ</button></span><span class="pz-num">${d.cohesion}/100</span></div>
        <div class="pz-barra" style="margin-top:4px"><div class="pz-relleno${d.cohesion<40?' menos':d.cohesion<70?' ojo':''}" style="width:${d.cohesion}%;${d.cohesion>=70?'background:var(--gente)':''}"></div><div class="pz-umbral" style="left:40%"></div><div class="pz-umbral" style="left:70%"></div></div>
      </div>
    </div>
    ${d.pendingEvent?`<div class="pz-tarjeta fam-gente" style="border-color:var(--fam);border-width:1.5px;cursor:pointer" onclick="G.screen='clubEvent';render()">
      <div class="pz-etiqueta fam-gente">📣 Evento pendiente</div>
      <div style="display:flex;align-items:center;gap:8px"><b class="pz-fila-txt">${esc(d.pendingEvent.title)}</b><span>→</span></div>
    </div>`:''}
    ${obj?`<div class="pz-tarjeta"><div class="pz-label">Objetivo de temporada</div><b>${obj.label}</b><div class="pz-efectos">${obj.desc}</div>
      ${d.seasonObjectiveMet===true?'<div class="pz-diag mas">Cumplido</div>':d.seasonObjectiveMet===false?'<div class="pz-diag menos">No cumplido</div>':'<div class="pz-diag">En juego</div>'}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Economía anual estimada</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${F('Cuotas de socios',annualIncome)}
      ${sponsorIncome>0?F('Sponsors del club',sponsorIncome):''}
      ${F('Salarios de la plantilla',-annualWages)}
      ${staffCost>0?F('Staff técnico',-staffCost):''}
      <div class="pz-fila" style="font-weight:600"><span class="pz-fila-txt">Balance neto</span><span class="pz-fila-dato ${annualNet>=0?'pz-mas':'pz-menos'}" style="font-size:18px">${fmtEur(annualNet,true)}</span></div>
      ${(d.redSeasons||0)>0?`<div class="pz-fila"><span class="pz-diag menos">Números rojos: ${d.redSeasons} de ${CLUB_RED_SEASONS_MAX} temporadas seguidas. ${d.redSeasons>=CLUB_RED_SEASONS_MAX-1?'Si cierras otra en negativo, el club se disuelve.':'Cada temporada en rojo resta 10 de cohesión; a la 3.ª se despide el staff y a la 4.ª se va el corredor más caro.'}</span></div>`:''}
    </div>
    <div class="pz-diag" style="margin-bottom:10px">${d.seasonSimulated
      ?`Temporada completada — ${(d.seasonResults||[]).length} participaciones`
      :allAssigned?`${assigned} carrera${assigned!==1?'s':''} con equipo asignado. Listo para simular.`:'Asigna corredores a las carreras para empezar'}</div>
    ${d.seasonSimulated
      ?`<button class="pz-btn" onclick="G.screen='clubSeasonEnd';render()">Ver balance de temporada →</button>`
      :`${!d.monthlyFocus?`<div class="pz-label" style="margin:14px 0 6px">¿En qué enfoca el club este mes?</div>
          ${[['resultados','🏆','Resultados','Entrenamiento intensivo — rendimiento +5% esta temporada'],['marketing','📣','Marketing','Campaña de visibilidad — +4 socios extra al cerrar temporada'],['formacion','🌱','Formación','Desarrollo de jóvenes — cantera crece un 20% más rápido'],['ahorro','💰','Gestión','Control de costes — ahorro de €200 en gastos de inscripción']].map(([id,emoji,label,desc])=>`<button class="pz-opcion" onclick="doClubMonthlyFocus('${id}')"><b>${emoji} ${label}</b><div class="pz-efectos">${desc}</div></button>`).join('')}`
         :`<div class="pz-diag mas" style="margin-bottom:8px">Foco del mes: <b>${d.monthlyFocus}</b> · <button class="pz-consejo-ok" style="margin:0" onclick="clearClubMonthlyFocus()">Cambiar el foco</button></div>`}
       <button class="pz-btn ${allAssigned?'sec':''}" ${!d.monthlyFocus?'disabled':''} onclick="G.screen='clubCalendar';render()">📅 Asignar equipo a carreras</button>
       ${allAssigned?`<button class="pz-btn" onclick="doClubSimulateSeason()">🏁 Simular temporada →</button>`:''}`}
    <div class="pz-tarjeta" style="padding:2px 14px;margin-top:12px">
      ${nav('👥','Plantilla ('+d.plantilla.length+')',d.cantera&&d.cantera.length>0?'Cantera: '+d.cantera.length:'',"G.screen='clubPlantilla';render()")}
      ${nav('🧑‍⚕️','Staff técnico',Object.keys(d.staff||{}).length+' contratados',"G.screen='clubStaff';render()")}
      ${nav('🤝','Sponsors del club',(d.clubSponsors||[]).length+' firmados',"G.screen='clubSponsors';render()")}
      ${nav('⚔️','Clubes rivales','',"G.screen='clubRivals';render()")}
      ${nav('📅','Decisión mensual del club',d.monthlyDecisionDone?'Ya decidida esta temporada':'',"G.screen='clubMonthly';render()")}
      ${nav('←','Menú principal','','backToMainMenu()',true)}
    </div>
  </div>`;
}



function renderClubPlantilla(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  const wages=clubMonthlyWage();
  const inIds=d.plantilla.map(r=>r.id);
  const cantIds=(d.cantera||[]).map(r=>r.id);
  const available=CLUB_RUNNER_POOL.filter(r=>!inIds.includes(r.id)&&!cantIds.includes(r.id));
  const youthAvail=CLUB_YOUTH_POOL.filter(r=>!inIds.includes(r.id)&&!cantIds.includes(r.id));
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const hasEntrenador=d.staff&&d.staff.entrenador;

  // Paso 6 de la dirección visual (2026-10-30): tipo Lista: corredores en tarjeta con sus cifras;
  // potencial, rol y etiquetas como chips neutros (el color de cada rol ya no se usa). Sin hex.
  const chip=(t,st)=>`<span class="pz-chip" style="margin:0;${st||'background:var(--soft)'}">${t}</span>`;
  const potSt={alto:'background:var(--tier-nacional);color:var(--card)',medio:'background:var(--tier-regional)',bajo:'border:1px solid var(--line2)'};
  const runnerCard=(r,i,isCantera)=>{
    const role=CLUB_ROLES[r.role||'normal'];
    // La tarjeta anunciaba «+30%» escrito a mano mientras growthBonus valía 1.3
    // y nadie lo leía: cambiar el bonus dejaba la tarjeta mintiendo. Mismo caso
    // que T138 con FIXED_COSTS.total. Ahora el porcentaje sale del dato.
    const growthBonus=hasEntrenador?CLUB_STAFF_TYPES.entrenador.growthBonus:1;
    const growthPct=Math.round((growthBonus-1)*100);
    const specMatch=fil&&r.spec===fil.specBonus;
    const tags=[];
    if((r.seasonsInClub||0)>=3)tags.push('Veterano 🏅');
    if((r.careerWins||0)>=2)tags.push(`${r.careerWins} victorias ⭐`);
    else if((r.careerPodiums||0)>=3)tags.push(`${r.careerPodiums} podios`);
    if(r.age>=35)tags.push('Última etapa');
    if((r.careerDnfs||0)>=3)tags.push('Propenso a DNF ⚠️');
    if(r.seasonsInClub===1&&(r.careerPodiums||0)>0)tags.push('Promesa confirmada 🌱');
    return`<div class="pz-tarjeta" style="${specMatch?'border-color:var(--acc)':''}">
      <div style="display:flex;align-items:flex-start;gap:10px">
        <span style="font-size:22px">${r.flag}</span>
        <span class="pz-fila-txt">
          <span style="display:flex;align-items:center;gap:5px;flex-wrap:wrap"><b>${esc(r.name)}</b>${chip('Potencial '+r.potential,potSt[r.potential])}${chip(role.emoji+' '+role.label)}${isCantera?chip('🌱 Cantera'):''}${specMatch?chip('Encaja con la filosofía','border:1px solid var(--acc)'):''}</span>
          <div class="pz-efectos">${r.age} años · ${SPEC_LABEL[r.spec]||r.spec} · <span class="pz-num">€${r.currentSalary||r.salary}/mes</span>${hasEntrenador?` · crecimiento <span class="pz-mas">+${growthPct} %</span>`:''}</div>
          <div class="pz-efectos" style="margin-top:2px">${['Res','Vel','Sub','Baj'].map((k,ki)=>k+' <span class="pz-num" style="color:var(--ink)">'+r.stats[['resistencia','velocidad','subida','bajada'][ki]]+'</span>').join(' · ')}</div>
          <div class="pz-efectos" style="font-style:italic;margin-top:2px">${esc(r.bio)}</div>
          ${tags.length?`<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${tags.map(t=>chip(t)).join('')}</div>`:''}
          <div style="display:flex;gap:5px;margin-top:8px;flex-wrap:wrap">
            ${Object.entries(CLUB_ROLES).map(([rid,rl])=>`<button class="pz-chip" title="${rl.label}" onclick="doClubSetRole(${isCantera?`'cantera'`:`'plantilla'`},${isCantera?cantIds.indexOf(r.id):i},'${rid}')" style="cursor:pointer;margin:0;${(r.role||'normal')===rid?'border:2px solid var(--acc);background:var(--card)':'border:1px solid var(--line2);background:var(--card)'}">${rl.emoji}</button>`).join('')}
          </div>
        </span>
        ${d.plantilla.length>2&&!isCantera?`<button class="pz-btn sec" style="width:auto;padding:5px 10px;margin:0;font-size:13px" onclick="doClubRelease(${i})">Liberar</button>`:''}
      </div>
    </div>`;
  };
  const fichable=(r,coste,click,etiq)=>{const ok=d.presupuesto>=coste;
    return `<div class="pz-fila${ok?' navega':''}" style="${ok?'cursor:pointer':'color:var(--ink3)'}" ${ok?`onclick="${click}"`:''}><span style="font-size:20px">${r.flag}</span>
      <span class="pz-fila-txt"><b>${esc(r.name)}</b> ${etiq}<div class="pz-efectos">${r.age} años · ${SPEC_LABEL[r.spec]||r.spec} · €${r.salary}/mes</div>${r.bio&&etiq.includes('Joven')?`<div class="pz-efectos" style="font-style:italic">${esc(r.bio)}</div>`:''}${ok?'':motivoHTML('Sin fondos')}</span></div>`;};
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div class="pz-titulo" style="margin:0">Plantilla</div>
      <button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='clubHub';render()">← Hub</button>
    </div>
    <p class="pz-sub">Salarios <span class="pz-num">€${wages}/mes</span> · €${wages*12}/año · presupuesto <span class="pz-num">€${d.presupuesto}</span></p>
    <div class="pz-label" style="margin:6px 0">Infraestructura</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${[['gimnasio','🏋️','Gimnasio',500,'Todos los corredores +2 rendimiento'],['clinica','🏥','Clínica',800,'Reduce lesiones -30%'],['residencia','🏠','Residencia',1200,'Permite plantilla de hasta 8 corredores'],['marketingHQ','📣','Marketing HQ',600,'+5 socios automáticos al mes']].map(([id,emoji,label,cost,desc])=>{
        const owned=d.instalaciones&&d.instalaciones[id];
        return`<div class="pz-fila"><span style="font-size:16px">${emoji}</span><span class="pz-fila-txt"><b>${label}</b><div class="pz-efectos">${desc}</div></span>
          ${owned?'<span class="pz-diag mas">Activo</span>':`<button class="pz-btn sec" style="width:auto;padding:5px 10px;margin:0" onclick="doClubBuyInstalacion('${id}',${cost})">€${cost}</button>`}</div>`;
      }).join('')}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Plantilla principal (${d.plantilla.length})</div>
    ${d.plantilla.map((r,i)=>runnerCard(r,i,false)).join('')}
    ${(d.cantera||[]).length>0?`<div class="pz-label" style="margin:14px 0 6px">Cantera (${d.cantera.length})</div>${d.cantera.map((r,i)=>runnerCard(r,i,true)).join('')}`:''}
    ${available.length>0&&d.plantilla.length<(d.instalaciones&&d.instalaciones.residencia?8:6)?`<div class="pz-label" style="margin:14px 0 6px">Fichar corredor</div>
      <div class="pz-tarjeta" style="padding:2px 14px">${available.slice(0,4).map(r=>fichable(r,r.salary*3,`doClubSign('${r.id}')`,chip('Potencial '+r.potential,potSt[r.potential]))).join('')}</div>`:''}
    ${youthAvail.length>0?`<div class="pz-label" style="margin:14px 0 6px">🌱 Cantera disponible</div>
      <p class="pz-efectos" style="margin-bottom:6px">Jóvenes con potencial alto. Crecen un 50 % más rápido pero rinden menos al inicio.</p>
      <div class="pz-tarjeta" style="padding:2px 14px">${youthAvail.slice(0,3).map(r=>fichable(r,r.salary*2,`doClubSignYouth('${r.id}')`,chip('🌱 Joven'))).join('')}</div>`:''}
  </div>`;
}

window.doClubSetRole=(pool,idx,role)=>{
  const d=G.clubModeData;if(!d)return;
  const arr=pool==='cantera'?d.cantera:d.plantilla;
  if(!arr||idx<0||idx>=arr.length)return;
  // Solo un capitán a la vez
  if(role==='capitan'){
    d.plantilla.forEach(r=>{if(r.role==='capitan')r.role='normal';});
    if(d.cantera)d.cantera.forEach(r=>{if(r.role==='capitan')r.role='normal';});
  }
  arr[idx].role=role;
  showToast(`${arr[idx].name.split(' ')[0]}: ${CLUB_ROLES[role].emoji} ${CLUB_ROLES[role].label}`);
  autoSave();render();
};

window.doClubBuyInstalacion=(id,cost)=>{
  const d=G.clubModeData;if(!d)return;
  if(d.presupuesto<cost){showToast('Presupuesto insuficiente');return;}
  d.instalaciones[id]=true;
  d.presupuesto-=cost;
  showToast(`✅ ${id} — instalación activa`);
  autoSave();render();
};

window.doClubSign=id=>{
  const d=G.clubModeData;if(!d)return;
  const r=CLUB_RUNNER_POOL.find(x=>x.id===id);if(!r)return;
  const maxSize=d.instalaciones&&d.instalaciones.residencia?8:6;
  if(d.plantilla.length>=maxSize){showToast(`Plantilla completa — máx. ${maxSize}`);return;}
  if(d.presupuesto<r.salary*3){showToast('Presupuesto insuficiente');return;}   // v96: la guarda solo estaba en la tarjeta
  d.plantilla.push({...r,stats:{...r.stats},currentSalary:r.salary,role:'normal'});
  d.presupuesto-=r.salary*3;
  showToast(`${r.name} fichado — coste inicial €${r.salary*3}`);
  autoSave();render();
};

window.doClubSignYouth=id=>{
  const d=G.clubModeData;if(!d)return;
  const r=CLUB_YOUTH_POOL.find(x=>x.id===id);if(!r)return;
  if(!d.cantera)d.cantera=[];
  if(d.cantera.length>=3){showToast('Cantera completa — máx. 3');return;}
  if(d.presupuesto<r.salary*2){showToast('Presupuesto insuficiente');return;}   // v96
  d.cantera.push({...r,stats:{...r.stats},currentSalary:r.salary,role:'promesa'});
  d.presupuesto-=r.salary*2;
  showToast(`🌱 ${r.name} a la cantera — €${r.salary*2}`);
  autoSave();render();
};

window.doClubRelease=idx=>{
  const d=G.clubModeData;if(!d)return;
  if(d.plantilla.length<=2){showToast('Necesitas al menos 2 corredores');return;}
  const r=d.plantilla[idx];
  if(!confirm(`¿Liberar a ${r.name}?`))return;
  d.plantilla.splice(idx,1);
  Object.keys(d.calAssignments||{}).forEach(k=>{
    if(Array.isArray(d.calAssignments[k]))d.calAssignments[k]=d.calAssignments[k].filter(id=>id!==r.id);
  });
  showToast(`${r.name} liberado`);
  autoSave();render();
};
// Paso 6 de la dirección visual (2026-10-30): tipo Lista: una tarjeta por carrera con su nivel
// en grises y los corredores como chips que se marcan con el acento; bloqueadas con motivo.
function renderClubCalendar(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  const assignments=d.calAssignments||{};
  const M=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const clubRep=d.reputacion||0;
  const clubSocios=d.socios||8;
  const unlocked=CLUB_RACES.filter(r=>(r.repReq||0)<=clubRep&&(r.sociosReq||0)<=clubSocios);
  const locked=CLUB_RACES.filter(r=>(r.repReq||0)>clubRep||(r.sociosReq||0)>clubSocios);
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between"><div class="pz-titulo" style="margin:0">Calendario</div><button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='clubHub';render()">← Hub</button></div>
    <p class="pz-sub">Asigna de 1 a 4 corredores por carrera. Toca su nombre para añadirlo o quitarlo.</p>
    ${unlocked.map(race=>{
      const assigned=assignments[race.id]||[];
      return`<div class="pz-tarjeta" style="${assigned.length?'border-color:var(--acc)':''}">
        <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:8px">
          <span class="pz-fila-txt"><span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap"><b>${esc(race.name)}</b>${nivelTag(race.tier)}</span>
            <div class="pz-efectos">${race.km} km · ${M[race.month-1]} · ${race.cost>0?`€${race.cost} inscripción`:'Gratuita'} · premio <span class="pz-num">€${race.prize}</span></div></span>
          <span class="pz-num">${assigned.length}/4</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">
          ${d.plantilla.concat(d.cantera||[]).map(r=>{const isSel=assigned.includes(r.id);const role=CLUB_ROLES[r.role||'normal'];
            return`<button class="pz-chip" onclick="doClubToggleAssign('${race.id}','${r.id}')" style="cursor:pointer;margin:0;${isSel?'border:2px solid var(--acc);background:var(--card);color:var(--ink)':'border:1px solid var(--line2);background:var(--card);color:var(--ink2)'}">${role.emoji} ${esc(r.name.split(' ')[0])}</button>`;}).join('')}
        </div>
      </div>`;}).join('')}
    ${locked.length>0?`<div class="pz-label" style="margin:14px 0 6px">Carreras bloqueadas</div>
      ${locked.map(race=>{const needRep=race.repReq>clubRep;const needSocios=race.sociosReq>clubSocios;
        return`<div class="pz-opcion pz-bloqueado"><b>${esc(race.name)}</b> ${nivelTag(race.tier)}${motivoHTML([needRep?`Reputación ${race.repReq} (tienes ${clubRep})`:'',needSocios?`${race.sociosReq} socios (tienes ${clubSocios})`:''].filter(Boolean).join(' · '))}</div>`;}).join('')}`:''}
    <button class="pz-btn" style="margin-top:10px" onclick="G.screen='clubHub';render()">← Volver al hub</button>
  </div>`;
}

window.doClubToggleAssign=(raceId,runnerId)=>{
  const d=G.clubModeData;if(!d)return;
  if(!d.calAssignments)d.calAssignments={};
  if(!d.calAssignments[raceId])d.calAssignments[raceId]=[];
  const arr=d.calAssignments[raceId];
  const idx=arr.indexOf(runnerId);
  if(idx>=0)arr.splice(idx,1);
  else if(arr.length<4)arr.push(runnerId);
  else{showToast('Máximo 4 corredores por carrera');return;}
  autoSave();render();
};

// v96 · Objetivos de los sponsors del club. Estaban escritos en CLUB_SPONSORS_POOL
// (objKey, duration) y nada los leía: el sponsor pagaba entero y para siempre.
function clubSponsorObjectiveMet(sp,results,d){
  const devMet=window.devPeek?.('clubSponsorMet');   // DEV: resultado armado desde el panel
  if(devMet!==undefined)return devMet;
  const fin=(results||[]).filter(r=>!r.dnf);
  switch(sp.objKey){
    case 'top10x3': return fin.filter(r=>r.pos<=10).length>=3;
    case 'part5':   return (results||[]).length>=5;
    case 'no_dnf':  return (results||[]).length>0&&results.every(r=>!r.dnf);
    case 'podio1':  return fin.some(r=>r.pos<=3);
    case 'top5nat': return fin.some(r=>r.pos<=5&&['nacional','elite'].includes(r.race?.tier));
    case 'socios50':return (d.socios||0)>=50;
    default:        return true;
  }
}

window.doClubSimulateSeason=()=>{
  const d=G.clubModeData;if(!d)return;
  const results=[];
  const clubRep=d.reputacion||0;
  const clubSocios=d.socios||8;
  CLUB_RACES.forEach(race=>{
    if((race.repReq||0)>clubRep||(race.sociosReq||0)>clubSocios)return; // C4: carrera bloqueada
    const runnerIds=d.calAssignments[race.id]||[];
    if(!runnerIds.length)return;
    const allRunners=[...d.plantilla,...(d.cantera||[])];
    // Coste de inscripción × número de corredores
    if(race.cost>0)d.presupuesto-=race.cost*runnerIds.length;
    runnerIds.forEach(rid=>{
      const runner=allRunners.find(r=>r.id===rid);
      if(!runner)return;
      const res=simClubRace(runner,race,d);
      if(!res.dnf)d.presupuesto+=res.prize;
      results.push({race,runner,pos:res.pos,perf:res.perf,prize:res.dnf?0:res.prize,rivals:res.rivals,dnf:res.dnf});
    });
  });
  // C16 Aplicar foco mensual
  if(d.monthlyFocus==='resultados')results.forEach(r=>{if(!r.dnf)r.pos=Math.max(1,r.pos-1);});
  if(d.monthlyFocus==='marketing')d.socios=Math.min(999,(d.socios||8)+4);
  if(d.monthlyFocus==='ahorro')d.presupuesto+=200;
  d._monthlyFocusBonus=0;   // BUG-14 (v96): el bonus de «Resultados» se gasta en esta simulación

  d.seasonResults=results;
  d.seasonSimulated=true;

  // Actualizar reputación
  const podiums=results.filter(r=>r.pos<=3&&!r.dnf).length;
  const top10=results.filter(r=>r.pos<=10&&!r.dnf).length;
  d.reputacion=Math.min(100,(d.reputacion||0)+podiums*8+top10*3+(results.length>0?2:0));

  // C6 Cohesión: sube con victorias, baja con DNFs
  const wins=results.filter(r=>r.pos===1).length;
  const dnfs=results.filter(r=>r.dnf).length;
  const capitan=d.plantilla.find(r=>r.role==='capitan');
  const capBonus=capitan?CLUB_ROLES.capitan.cohesionBonus:0;
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const filBonus=fil?fil.cohesionBonus:0;
  const staffPsi=d.staff&&d.staff.psicologo?CLUB_STAFF_TYPES.psicologo.cohesionBonus:0;
  d.cohesion=Math.max(0,Math.min(100,(d.cohesion||50)+wins*4-dnfs*6+capBonus+filBonus+staffPsi));

  // C11 Staff marketing suma socios
  if(d.staff&&d.staff.marketing)d.socios=Math.min(999,d.socios+CLUB_STAFF_TYPES.marketing.sociosPerMonth*12);

  // Comprobar objetivo de temporada C18
  if(d.seasonObjective){
    const obj=d.seasonObjective;
    const lvl=clubLevelByRep();
    try{d.seasonObjectiveMet=obj.check(d,lvl);}catch(e){d.seasonObjectiveMet=false;}
  }

  // v96 · Sponsors con objetivo: se cobra el 60 % del contrato de la temporada y el
  // objetivo se evalúa con los resultados reales. Si se cumple entra el 40 % restante;
  // si no, −3 de reputación y el sponsor rescinde al cerrar (doClubNextSeason).
  d.sponsorOutcomes=(d.clubSponsors||[]).map(sp=>{
    const total=(sp.monthlyIncome||0)*12;
    const met=clubSponsorObjectiveMet(sp,results,d);
    const base=Math.round(total*CLUB_SPONSOR_SPLIT.base);
    const bonus=met?total-base:0;
    d.presupuesto+=base+bonus;
    if(!met)d.reputacion=Math.max(0,(d.reputacion||0)-CLUB_SPONSOR_SPLIT.failRep);
    return {id:sp.id,name:sp.name,objective:sp.objective,met,base,bonus};
  });
  window.devTake?.('clubSponsorMet');

  checkAndUnlockAchievements(); // CR-38 (v76)
  autoSave();
  G.screen='clubSimulate';
  G._clubSimIdx=0;
  render();
};

// Paso 6 de la dirección visual (2026-10-30): tipo En directo para el Club: los resultados van
// entrando uno a uno, con el puesto en grande y franja según el puesto. Sin hex.
function renderClubSimulate(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const results=d.seasonResults||[];
  const idx=G._clubSimIdx||0;
  const isDone=idx>=results.length;
  if(isDone){
    el.innerHTML=`<div class="pz"><div class="pz-franja transicion"><div class="pz-franja-num" style="font-size:40px">Temporada completa</div><div class="pz-franja-sub">Todos los resultados registrados</div></div>
      <button class="pz-btn" onclick="G.screen='clubSeasonEnd';render()">Ver balance de temporada →</button></div>`;
    return;
  }
  const r=results[idx];
  const posIcon=r.pos===1?'🥇':r.pos===2?'🥈':r.pos===3?'🥉':r.pos<=10?'🎯':'🏃';
  el.innerHTML=`<div class="pz">
    <div style="display:flex;justify-content:space-between" class="pz-efectos"><span>Resultado ${idx+1} de ${results.length}</span><span>${esc(d.name)}</span></div>
    <div class="pz-barra" style="margin:6px 0 14px"><div class="pz-relleno" style="width:${Math.round((idx/results.length)*100)}%;background:var(--acc)"></div></div>
    <div class="pz-franja ${r.pos<=3?'podio':'fuera'}">
      <div class="pz-franja-sub" style="margin:0 0 4px">${posIcon} ${esc(r.race.name)} · ${clubRaceKm(r.race)} km</div>
      <div class="pz-franja-num">${r.pos}.º</div>
      <div class="pz-franja-sub">de ${r.rivals} · ${esc(r.runner.flag)} ${esc(r.runner.name)}</div>
    </div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      <div class="pz-fila"><span class="pz-fila-txt">Rendimiento</span><span class="pz-fila-dato">${r.perf}/100</span></div>
      ${r.prize>0?`<div class="pz-fila"><span class="pz-fila-txt">Premio</span><span class="pz-fila-dato pz-mas">+€${r.prize}</span></div>`:''}
    </div>
    <button class="pz-btn" onclick="G._clubSimIdx=${idx+1};render()">${idx+1<results.length?'Siguiente resultado →':'Ver balance final →'}</button>
  </div>`;
}

// ── STAFF TÉCNICO (C11) ────────────────────────────────────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Decisión: el staff como opciones con su coste.
function renderClubStaff(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between"><div class="pz-titulo" style="margin:0">Staff técnico</div><button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='clubHub';render()">← Hub</button></div>
    <p class="pz-sub">Contrata personal de apoyo. Cada miembro del staff tiene un coste mensual y mejora un aspecto del club.</p>
    ${Object.entries(CLUB_STAFF_TYPES).map(([id,st])=>{const hired=d.staff&&d.staff[id];
      return`<div class="pz-tarjeta" style="${hired?'border-color:var(--acc);border-width:1.5px':''}">
        <div style="display:flex;align-items:flex-start;gap:10px"><span style="font-size:22px">${st.emoji}</span>
          <span class="pz-fila-txt"><b>${st.label}</b>${hired?' <span class="pz-chip mas" style="margin:0">Contratado</span>':''}<div class="pz-efectos">${st.desc}</div></span>
          <span class="pz-num">€${st.costMonth}/mes</span></div>
        ${hired?`<button class="pz-btn sec" style="margin-top:8px" onclick="doClubFireStaff('${id}')">Despedir</button>`
          :`<button class="pz-btn sec" style="margin-top:8px" onclick="doClubHireStaff('${id}',${st.costMonth})">Contratar — €${st.costMonth}/mes</button>`}
      </div>`;}).join('')}
  </div>`;
}
window.doClubHireStaff=(id,cost)=>{
  const d=G.clubModeData;if(!d)return;
  if(d.presupuesto<cost*3){showToast('Presupuesto insuficiente');return;}
  if(!d.staff)d.staff={};
  d.staff[id]=true;
  showToast(`${CLUB_STAFF_TYPES[id].emoji} ${CLUB_STAFF_TYPES[id].label} contratado`);
  autoSave();render();
};
window.doClubFireStaff=(id)=>{
  const d=G.clubModeData;if(!d)return;
  if(d.staff)delete d.staff[id];
  showToast(`${CLUB_STAFF_TYPES[id].label} despedido`);
  autoSave();render();
};

// ── PATROCINIO DE CLUB (C13) ───────────────────────────────────────────────
// Paso 6 de la dirección visual (2026-10-30): tipo Decisión; el objetivo del sponsor como efecto en línea.
function renderClubSponsors(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const activeIds=(d.clubSponsors||[]).map(x=>x.id);
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  // Más sponsors disponibles según filosofía comercial
  const available=CLUB_SPONSORS_POOL.filter(x=>
    d.reputacion>=(x.tier===2?40:0)&&
    (fil&&fil.sponsorBonus===x.cat?true:x.tier<=1||(d.clubSponsors||[]).length<2)
  );
  const libres=available.filter(x=>!activeIds.includes(x.id));
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between"><div class="pz-titulo" style="margin:0">Sponsors del club</div><button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='clubHub';render()">← Hub</button></div>
    <p class="pz-sub">Cada sponsor paga el 60 % de su contrato al simular la temporada y el 40 % restante solo si se cumple su objetivo. Si no se cumple, rescinde.</p>
    ${(d.clubSponsors||[]).length>0?`<div class="pz-label" style="margin:6px 0">Activos</div>
      ${(d.clubSponsors||[]).map(sp=>`<div class="pz-tarjeta" style="border-color:var(--acc);border-width:1.5px">
        <div style="display:flex;justify-content:space-between;gap:8px"><b>${esc(sp.name)}</b><span class="pz-num">€${sp.monthlyIncome}/mes</span></div>
        <div class="pz-efectos">Objetivo: ${sp.objective} · ${sp.seasonsLeft||1} temporada${(sp.seasonsLeft||1)!==1?'s':''} de contrato</div>
        <button class="pz-btn sec" style="margin-top:8px" onclick="doClubRemoveSponsor('${sp.id}')">Rescindir contrato</button>
      </div>`).join('')}`:''}
    <div class="pz-label" style="margin:14px 0 6px">Disponibles</div>
    ${libres.map(sp=>`<button class="pz-opcion" onclick="doClubAddSponsor('${sp.id}')"><span style="float:right" class="pz-num">€${sp.monthlyIncome}/mes</span><b>${esc(sp.name)}</b><div class="pz-efectos">Objetivo: ${sp.objective} · ${sp.duration||1} temporada${(sp.duration||1)!==1?'s':''} · firmar</div></button>`).join('')
      ||'<div class="pz-diag">Sin sponsors disponibles aún. Sube tu reputación para desbloquear más.</div>'}
  </div>`;
}
window.doClubAddSponsor=(id)=>{
  const d=G.clubModeData;if(!d)return;
  const sp=CLUB_SPONSORS_POOL.find(s=>s.id===id);if(!sp)return;
  if(!d.clubSponsors)d.clubSponsors=[];
  d.clubSponsors.push({...sp,seasonsLeft:sp.duration||1});   // v96: el contrato dura lo que dice
  showToast(`🤝 ${sp.name} — contrato firmado`);
  autoSave();render();
};
window.doClubRemoveSponsor=(id)=>{
  const d=G.clubModeData;if(!d)return;
  d.clubSponsors=(d.clubSponsors||[]).filter(s=>s.id!==id);
  showToast('Contrato rescindido');
  autoSave();render();
};

// ── CLUBES RIVALES (C14) ───────────────────────────────────────────────────
function renderClubRivals(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const lvl=clubLevelByRep();
  // Rivales crecen con el tiempo
  const rivals=(d.rivalClubs||[]).map(r=>({
    ...r,
    rep:Math.min(100,(r.rep||20)+(d.temporada||1)*3),
    socios:Math.min(500,(r.socios||10)+(d.temporada||1)*5),
  }));
  // Paso 6 de la dirección visual (2026-10-30): tipo Lista; tu club con el acento, y quién va por
  // delante como diagnóstico (punto ámbar), no como color de borde.
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between"><div class="pz-titulo" style="margin:0">Clubes rivales</div><button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='clubHub';render()">← Hub</button></div>
    <div class="pz-tarjeta" style="border-color:var(--acc);border-width:1.5px;margin-top:12px">
      <div class="pz-label">Tu club</div>
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${esc(d.name)}</b><span class="pz-chip" style="margin:0;background:var(--acc-t)">${lvl.label}</span></div>
      <div class="pz-efectos">Rep. ${d.reputacion}/100 · ${d.socios} socios · cohesión ${d.cohesion}/100</div>
    </div>
    ${rivals.map(r=>{const isAhead=r.rep>d.reputacion;
      return`<div class="pz-tarjeta">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><b>${esc(r.name)}</b><span class="pz-diag ${isAhead?'ojo':'mas'}" style="margin:0">${isAhead?'Por delante':'Por detrás'}</span></div>
        <div class="pz-efectos">Rep. ${r.rep}/100 · ${r.socios} socios · nivel ${r.level}</div>
      </div>`;}).join('')}
    ${consejoHTML('club_rivales','Los rivales crecen cada temporada.','Si uno supera tu reputación puede intentar ficharte corredores.')}
  </div>`;
}

// ── DECISIONES MENSUALES COMPLETAS (C16) ──────────────────────────────────
function renderClubMonthly(){
  const el=$main();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  hideChrome();
  const sel=G._monthlySelections||{};
  const decDefs=[
    {id:'training',label:'Foco de entrenamiento',icon:'💪',options:[
      {id:'intensivo',  emoji:'🔥',text:'Intensivo',   desc:'+3 stats a toda la plantilla'},
      {id:'conservador',emoji:'🛡',text:'Conservador', desc:'+4 cohesión grupal'},
      {id:'tecnico',    emoji:'⚡',text:'Técnico',     desc:'+5 stat especialidad + 2 cohesión'},
    ]},
    {id:'focus',label:'Foco del club',icon:'🎯',options:[
      {id:'resultados', emoji:'🏆',text:'Resultados',  desc:'+4 rendimiento en próxima simulación'},
      {id:'marketing',  emoji:'📣',text:'Marketing',   desc:'+4 socios, +3 reputación'},
      {id:'formacion',  emoji:'🌱',text:'Formación',   desc:'Cantera +2 stats extra'},
    ]},
    {id:'budget',label:'Gestión presupuesto',icon:'💶',options:[
      {id:'invertir',   emoji:'💶',text:'Invertir',    desc:'€200 → +2 cohesión +2 stats',    cost:200},
      {id:'ahorrar',    emoji:'🏦',text:'Ahorrar',     desc:'+€150 reserva'},
      {id:'evento',     emoji:'🎪',text:'Evento social',desc:'€100 → +6 cohesión +2 socios',   cost:100},
    ]},
  ];
  const allChosen=decDefs.every(d=>sel[d.id]);
  // Paso 6 de la dirección visual (2026-10-30): tipo Decisión, una pz-opcion por opción; sin
  // fondos = bloqueada con su motivo.
  el.innerHTML=`<div class="pz">
    <div style="display:flex;align-items:center;justify-content:space-between"><div class="pz-titulo" style="margin:0">Decisión mensual</div><button class="pz-btn sec" style="width:auto;padding:6px 12px;margin:0" onclick="G.screen='clubHub';render()">← Hub</button></div>
    <p class="pz-sub">Elige una opción en cada área y confirma. Nada se aplica hasta confirmar; toca una opción elegida para desmarcarla.${d.monthlyDecisionDone?'<br><b>Ya has decidido esta temporada.</b> La siguiente decisión llega con la próxima temporada.':' Una decisión por temporada.'}</p>
    ${decDefs.map(dec=>`
      <div class="pz-label" style="margin:12px 0 6px">${dec.icon} ${dec.label}</div>
      ${dec.options.map(opt=>{
        const isSel=sel[dec.id]===opt.id;
        const sinFondos=!isSel&&(opt.cost||0)>(d.presupuesto||0);   // BUG-15 (v96)
        return`<button class="pz-opcion${isSel?' sel':''}${sinFondos?' pz-bloqueado':''}" ${sinFondos?'':`onclick="clubToggleMonthlySel('${dec.id}','${opt.id}')"`}>
          <b>${opt.emoji} ${opt.text}</b><div class="pz-efectos">${opt.desc}${opt.cost?` · −€${opt.cost}`:''}</div>${sinFondos?motivoHTML('Sin fondos'):''}
        </button>`;
      }).join('')}`).join('')}
    <button class="pz-btn" style="margin-top:12px${(!allChosen||d.monthlyDecisionDone)?';opacity:0.4;pointer-events:none':''}" onclick="doClubApplyMonthlyFull()">Confirmar decisiones →</button>
  </div>`;
}

window.doClubApplyMonthlyFull=()=>{
  const d=G.clubModeData;if(!d)return;
  if(d.monthlyDecisionDone){showToast('Ya has tomado la decisión de esta temporada');return;}   // v96: se confirmaba sin límite y cada vez volvía a sumar
  const sel=G._monthlySelections||{};
  const costs={invertir:200,evento:100};
  // BUG-15 (v96): sin presupuesto para la opción elegida se aplicaban igual las otras dos
  // áreas y se gastaba la decisión de la temporada. Se comprueba antes de aplicar nada.
  if((costs[sel.budget]||0)>(d.presupuesto||0)){showToast(`Sin fondos para esa opción (€${costs[sel.budget]}): elige otra`);return;}
  const effects={
    training:{
      intensivo:  (d)=>d.plantilla.forEach(r=>Object.keys(r.stats).forEach(k=>r.stats[k]=Math.min(95,(r.stats[k]||40)+3))),
      conservador:(d)=>{d.cohesion=Math.min(100,(d.cohesion||50)+4);},
      tecnico:    (d)=>{const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;const key=fil?.statGrowthKey;if(key)d.plantilla.forEach(r=>{r.stats[key]=Math.min(95,(r.stats[key]||40)+5);});d.cohesion=Math.min(100,(d.cohesion||50)+2);},
    },
    focus:{
      resultados: (d)=>{d._monthlyFocusBonus=(d._monthlyFocusBonus||0)+4;},
      marketing:  (d)=>{d.socios=Math.min(999,(d.socios||8)+4);d.reputacion=Math.min(100,(d.reputacion||0)+3);},
      formacion:  (d)=>{(d.cantera||[]).forEach(r=>Object.keys(r.stats).forEach(k=>r.stats[k]=Math.min(90,(r.stats[k]||30)+2)));},
    },
    budget:{
      invertir:   (d,cost)=>{if(d.presupuesto<cost){showToast('Sin fondos');return false;}d.presupuesto-=cost;d.cohesion=Math.min(100,(d.cohesion||50)+2);d.plantilla.forEach(r=>Object.keys(r.stats).forEach(k=>r.stats[k]=Math.min(95,(r.stats[k]||40)+2)));},
      ahorrar:    (d)=>{d.presupuesto=(d.presupuesto||0)+150;},
      evento:     (d,cost)=>{if(d.presupuesto<cost){showToast('Sin fondos');return false;}d.presupuesto-=cost;d.cohesion=Math.min(100,(d.cohesion||50)+6);d.socios=Math.min(999,(d.socios||8)+2);},
    },
  };
  let msgs=[];
  ['training','focus','budget'].forEach(area=>{
    const optId=sel[area];if(!optId)return;
    const fn=effects[area]?.[optId];if(!fn)return;
    const result=fn(d,costs[optId]||0);
    if(result!==false)msgs.push(optId);
  });
  G._monthlySelections={};
  d.monthlyDecisionDone=true;
  showToast(`✅ Decisiones aplicadas`);
  autoSave();G.screen='clubHub';render();
};

// v96 · Recompensa o penalización del objetivo de temporada (CLUB_OBJECTIVES). La calcula
// la pantalla de balance para enseñarla y la aplica doClubNextSeason() una sola vez.
// Hasta v96 la pantalla sumaba la reputación al pintarse —cada redibujo, otra vez— y los
// socios del objetivo se enseñaban pero no se sumaban nunca.
function clubObjectiveDeltas(d){
  const obj=d&&d.seasonObjective;
  if(!obj)return {rep:0,socios:0,cohesion:0};
  const r=(d.seasonObjectiveMet===true?obj.reward:obj.penalty)||{};
  return {rep:r.rep||0,socios:r.socios||0,cohesion:r.cohesion||0};
}

// v98 · Las cuentas del cierre de temporada, fuera de la pantalla. Vivían dentro de
// renderClubSeasonEnd(), así que el modo dev cerraba con doClubNextSeason(0,0,0): no cobraba
// cuotas ni pagaba sueldos ni staff, y los socios no crecían (el mismo fallo que H19 en
// Clásico). Pura: solo lee. Las fórmulas son las de v97, copiadas tal cual.
function clubSeasonClosing(d){
  const results=d.seasonResults||[];
  const podiums=results.filter(r=>r.pos<=3&&!r.dnf).length;
  const top10=results.filter(r=>r.pos<=10&&!r.dnf).length;
  const wins=results.filter(r=>r.pos===1&&!r.dnf).length;
  const dnfs=results.filter(r=>r.dnf).length;
  const totalPrize=results.reduce((s,r)=>s+(r.prize||0),0);
  const staffCost=Object.keys(d.staff||{}).reduce((s,k)=>s+(CLUB_STAFF_TYPES[k]?CLUB_STAFF_TYPES[k].costMonth*12:0),0);
  const sponsorOutcomes=d.sponsorOutcomes||[];
  const sponsorIncome=sponsorOutcomes.reduce((s,o)=>s+(o.base||0)+(o.bonus||0),0);
  const raceCosts=results.reduce((s,r)=>s+(r.race?.cost||0),0);
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  const wages=clubMonthlyWage()*12;
  const socioIncome=Math.round(d.socios*CLUB_SOCIO_FEE*12*(fil&&fil.socioBonus?fil.socioBonus:1));
  // v96: premios, inscripciones y sponsors ya entraron en el presupuesto al simular
  // (doClubSimulateSeason) y este cierre los volvía a sumar: se cobraban dos veces.
  // netBalance es el año entero, para enseñarlo; closing es lo que queda por aplicar.
  const netBalance=socioIncome+totalPrize+sponsorIncome-raceCosts-wages-staffCost;
  const closing=socioIncome-wages-staffCost;
  const socioGain=Math.round((podiums*4+top10*1.5+(d.reputacion/20))*Math.max(0,1-d.socios/CLUB_SOCIOS_SOFT_CAP));   // v96: techo blando
  const socioLoss=results.length===0?3:0;
  return {podiums,top10,wins,dnfs,totalPrize,staffCost,sponsorIncome,raceCosts,wages,socioIncome,netBalance,closing,socioGain,socioLoss};
}

function renderClubSeasonEnd(){
  const el=$main();
  hideChrome();
  const d=G.clubModeData;if(!d){G.screen='clubHub';render();return;}
  const results=d.seasonResults||[];
  const sponsorOutcomes=d.sponsorOutcomes||[];
  const {podiums,wins,dnfs,totalPrize,staffCost,raceCosts,wages,socioIncome,netBalance,closing,socioGain,socioLoss}=clubSeasonClosing(d);

  // C18 — Resultado del objetivo. v96: esta pantalla solo lo ENSEÑA; se aplica una vez en
  // doClubNextSeason(). Antes la reputación se sumaba aquí, en cada redibujo.
  const obj=d.seasonObjective;
  const objMet=d.seasonObjectiveMet===true;
  const {rep:objRepDelta,socios:objSociosDelta}=clubObjectiveDeltas(d);
  const newSocios=Math.max(3,d.socios+socioGain-socioLoss+objSociosDelta);

  // C17 — Narrativa de temporada
  const correvelacion=results.filter(r=>!r.dnf).sort((a,b)=>a.pos-b.pos)[0];
  const corrdecepcion=results.filter(r=>r.dnf).sort((a,b)=>b.pos-a.pos)[0];
  let narrative='';
  if(wins>=2) narrative=`Un año para recordar. ${esc(d.name)} firmó ${wins} victorias y se consolida como referencia del circuito.`;
  else if(wins===1) narrative=`Una victoria que cambia la narrativa del club. El trabajo empieza a dar frutos.`;
  else if(podiums>=3) narrative=`Sin victorias pero con constancia. Tres podios que demuestran que el nivel está ahí.`;
  else if(dnfs>=2) narrative=`Una temporada irregular. Los abandonos pesaron más que los buenos resultados.`;
  else if(d.cohesion>=70) narrative=`Resultados discretos, pero el vestuario nunca estuvo tan unido. La cohesión es el activo del año.`;
  else if(d.cohesion<35) narrative=`El grupo está fragmentado. Sin cohesión interna, los resultados difícilmente pueden mejorar.`;
  else narrative=`Una temporada de transición. Se siembra ahora para recoger en los próximos años.`;

  // Paso 6 de la dirección visual (2026-10-30): tipo Resumen: franja de cierre, la crónica, el
  // objetivo como diagnóstico, cifras y filas de economía. Temporadas en rojo: punto rojo.
  const fila=(t,v,cl)=>`<div class="pz-fila"><span class="pz-fila-txt">${t}</span><span class="pz-fila-dato ${cl||''}">${v}</span></div>`;
  const repFinal=Math.max(0,Math.min(100,(d.reputacion||0)+objRepDelta));
  const presFinal=d.presupuesto+closing;
  el.innerHTML=`<div class="pz">
    <div class="pz-franja cierre">
      <div class="pz-franja-sub" style="margin:0 0 4px">${wins>0?'🏆':podiums>0?'🎯':d.cohesion>=70?'🤝':'📋'} ${esc(d.name)}</div>
      <div class="pz-franja-num" style="font-size:40px">Temporada ${d.temporada}</div>
    </div>
    <div class="pz-tarjeta">
      <p style="margin:0 0 6px;font-style:italic">«${narrative}»</p>
      <div class="pz-efectos">${[correvelacion?`⭐ Revelación: <b>${esc(correvelacion.runner.name.split(' ')[0])}</b> (#${correvelacion.pos})`:'',corrdecepcion?`😞 Decepción: <b>${esc(corrdecepcion.runner.name.split(' ')[0])}</b> (DNF)`:'',`🤝 Cohesión final: <b>${d.cohesion}/100</b>`].filter(Boolean).join(' · ')}</div>
    </div>
    ${obj?`<div class="pz-diag ${objMet?'mas':'menos'}"><b>Objetivo de temporada${objMet?' cumplido':' no cumplido'}:</b> ${obj.label}${objRepDelta?` · <span class="${objRepDelta>0?'pz-mas':'pz-menos'}">${objRepDelta>0?'+':''}${objRepDelta} rep</span>`:''}${objSociosDelta?` · <span class="${objSociosDelta>0?'pz-mas':'pz-menos'}">${objSociosDelta>0?'+':''}${objSociosDelta} socios</span>`:''}</div>`:''}
    <div class="pz-label" style="margin:14px 0 6px">Resultados</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;text-align:center">
      ${[['Carreras',results.length],['Victorias',wins],['Podios',podiums],['DNF',dnfs]].map(([l,v])=>`<div class="pz-tarjeta" style="margin:0;padding:8px 4px"><div class="pz-efectos">${l}</div><div class="pz-num" style="font-size:20px">${v}</div></div>`).join('')}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Economía</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${fila('Cuotas de socios',fmtEur(socioIncome,true),'pz-mas')}
      ${fila('Premios en carrera',fmtEur(totalPrize,true),'pz-mas')}
      ${sponsorOutcomes.map(o=>fila(`${esc(o.name)} · ${esc(o.objective||'')} ${o.met?'✅':'❌ rescinde'}`,fmtEur((o.base||0)+(o.bonus||0),true),'pz-mas')).join('')}
      ${raceCosts>0?fila('Inscripciones',fmtEur(-raceCosts),'pz-menos'):''}
      ${fila('Salarios plantilla',fmtEur(-wages),'pz-menos')}
      ${staffCost>0?fila('Staff técnico',fmtEur(-staffCost),'pz-menos'):''}
      ${fila('<b>Balance neto</b>',`<b>${fmtEur(netBalance,true)}</b>`,netBalance>=0?'pz-mas':'pz-menos')}
    </div>
    <div class="pz-label" style="margin:14px 0 6px">Evolución del club</div>
    <div class="pz-tarjeta" style="padding:2px 14px">
      ${fila('Socios',`${d.socios} → <b>${newSocios}</b>${socioGain>0?` <span class="pz-mas">(+${socioGain})</span>`:''}`)}
      ${fila('Reputación',`<b>${repFinal}/100</b>${objRepDelta?` <span class="${objRepDelta>0?'pz-mas':'pz-menos'}">${objRepDelta>0?'+':''}${objRepDelta}</span>`:''}`)}
      ${fila('Presupuesto final',`<b>${fmtEur(presFinal)}</b>`,presFinal<0?'pz-menos':'')}
      ${fila('Cohesión',`<b>${d.cohesion}/100</b>`)}
    </div>
    ${presFinal<0?`<div class="pz-diag menos"><b>Cierras en números rojos:</b> ${(d.redSeasons||0)+1} de ${CLUB_RED_SEASONS_MAX} temporadas seguidas.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" onclick="doClubNextSeason(${socioGain},${socioLoss},${closing})">Temporada ${d.temporada+1} →</button>
    <button class="pz-btn sec" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}

// v96 · Fin del Modo Club por quiebra: cinco temporadas seguidas cerrando en rojo.
// Paso 6 de la dirección visual (2026-10-30): tipo Momento negativo.
function renderClubDissolved(){
  const el=$main();
  hideChrome();
  const d=G.clubModeData;
  el.innerHTML=`<div class="pz">
    <div class="pz-franja negativo">
      <div class="pz-franja-sub" style="margin:0 0 4px">🏚️ ${esc(d?.name||'Tu club')}${d?` · ${(d.historial||[]).length} temporadas`:''}</div>
      <div class="pz-franja-num" style="font-size:36px">El club se disuelve</div>
    </div>
    <div class="pz-diag menos">${CLUB_RED_SEASONS_MAX} temporadas seguidas en números rojos. La junta no encuentra más
      dinero y el club cierra${d?` con una deuda de <b>€${Math.abs(Math.min(0,d.presupuesto))}</b>`:''}.</div>
    <button class="pz-btn" style="margin-top:12px" onclick="backToMainMenu()">← Menú principal</button>
  </div>`;
}

window.doClubNextSeason=(socioGain,socioLoss,netBalance)=>{
  const d=G.clubModeData;if(!d)return;
  // CR-38 (v76): contador acumulado de objetivos cumplidos — logro cm_objective_3
  if(d.seasonObjectiveMet===true)G._clubObjectivesMet=(G._clubObjectivesMet||0)+1;
  // v96: el objetivo se aplica aquí, una sola vez (antes, al pintar el balance)
  const _obj=clubObjectiveDeltas(d);
  d.reputacion=Math.max(0,Math.min(100,(d.reputacion||0)+_obj.rep));
  if(_obj.cohesion)d.cohesion=Math.max(0,Math.min(100,(d.cohesion||50)+_obj.cohesion));
  d.historial.push({
    temporada:d.temporada,socios:d.socios,
    reputacion:d.reputacion,presupuesto:d.presupuesto,
    cohesion:d.cohesion,
    wins:(d.seasonResults||[]).filter(r=>r.pos===1).length,
    podiums:(d.seasonResults||[]).filter(r=>r.pos<=3&&!r.dnf).length,
  });
  const seasonRes=d.seasonResults||[];
  d.socios=Math.max(3,d.socios+socioGain-socioLoss+_obj.socios);   // v96: los socios del objetivo por fin se suman
  // Bonus socios por instalación marketingHQ
  if(d.instalaciones&&d.instalaciones.marketingHQ)d.socios=Math.min(999,d.socios+60);
  d.presupuesto=d.presupuesto+netBalance;   // v96: sin suelo en 0. netBalance = cierre pendiente (cuotas − sueldos − staff)
  // v96 · Sponsors: el que falló su objetivo rescinde; a los evaluados que cumplieron les
  // baja una temporada de contrato, y al acabar vuelven a la lista de disponibles.
  const _evaluados=d.sponsorOutcomes||[];
  d.clubSponsors=(d.clubSponsors||[]).filter(sp=>{
    const o=_evaluados.find(x=>x.id===sp.id);
    if(!o)return true;
    if(!o.met){showToast(`${sp.name} rescinde: objetivo no cumplido`);return false;}
    sp.seasonsLeft=(sp.seasonsLeft||sp.duration||1)-1;
    if(sp.seasonsLeft<=0){showToast(`Termina el contrato con ${sp.name}: puedes volver a firmarlo`);return false;}
    return true;
  });
  d.sponsorOutcomes=[];d.monthlyDecisionDone=false;
  // v96 · Quiebra en cinco temporadas (decisión del 2026-09-15). Cuenta el presupuesto
  // FINAL negativo en temporadas seguidas, no el neto del año: un club que empieza con
  // capital puede perder dinero sin estar en rojo. cada una: −10 cohesión · 3.ª: fuera
  // el staff · 4.ª: se va el corredor más caro · 5.ª: el club se disuelve. Una temporada
  // cerrada en positivo pone el contador a cero.
  if(d.presupuesto<0){
    d.redSeasons=(d.redSeasons||0)+1;
    if(d.redSeasons>=CLUB_RED_SEASONS_MAX){d.dissolved=true;G.screen='clubDissolved';autoSave();render();return;}
    d.cohesion=Math.max(0,(d.cohesion||50)-10);
    if(d.redSeasons>=3&&Object.keys(d.staff||{}).length){d.staff={};showToast('Números rojos: se despide a todo el staff');}
    if(d.redSeasons===4&&d.plantilla.length>1){
      const i=d.plantilla.reduce((best,r,j,arr)=>(r.currentSalary||r.salary)>(arr[best].currentSalary||arr[best].salary)?j:best,0);
      const gone=d.plantilla.splice(i,1)[0];
      showToast(`Números rojos: ${gone.name} se va del club`);
    }
    // BUG-12 (v96): el −10 se aplica en todas, pero el aviso solo salía en las dos primeras.
    showToast(`Números rojos (${d.redSeasons}/${CLUB_RED_SEASONS_MAX}): ${d.redSeasons<3?'los sueldos llegan tarde':'el vestuario lo nota'}, −10 cohesión`);
  } else d.redSeasons=0;
  d.temporada++;
  d.calAssignments={};d.seasonResults=[];d.seasonSimulated=false;
  d.pendingEvent=null;d.seasonObjective=null;d.seasonObjectiveMet=null;

  // C7 — Progresión real según potencial, edad y staff
  const hasEntrenador=d.staff&&d.staff.entrenador;
  const fil=d.filosofia?CLUB_FILOSOFIAS[d.filosofia]:null;
  // C1: actualizar historial de corredor
  const growAll=[...d.plantilla,...(d.cantera||[])];
  growAll.forEach(r=>{
    r.age=(r.age||20)+1;
    r.seasonsInClub=(r.seasonsInClub||0)+1;
    const rWins=seasonRes.filter(x=>x.runner&&x.runner.id===r.id&&x.pos===1&&!x.dnf).length;
    const rPodiums=seasonRes.filter(x=>x.runner&&x.runner.id===r.id&&x.pos<=3&&!x.dnf).length;
    const rDnfs=seasonRes.filter(x=>x.runner&&x.runner.id===r.id&&x.dnf).length;
    r.careerWins=(r.careerWins||0)+rWins;
    r.careerPodiums=(r.careerPodiums||0)+rPodiums;
    r.careerDnfs=(r.careerDnfs||0)+rDnfs;
    const isYouth=r.age<=22;
    const base=r.potential==='alto'?(isYouth?4:3):r.potential==='medio'?2:0;
    const isCantera=r.role==='promesa';
    const coef=(isCantera||isYouth)?CLUB_ROLES.promesa.growthBonus:1;
    // Foco «Formación» del hub: la cantera crece un 20 % más rápido. Lo prometía y nada lo leía.
    const focusCoef=d.monthlyFocus==='formacion'&&(d.cantera||[]).includes(r)?1.2:1;
    const staffCoef=hasEntrenador?CLUB_STAFF_TYPES.entrenador.growthBonus:1;
    const cap=r.potential==='alto'?95:r.potential==='medio'?88:82;
    Object.keys(r.stats).forEach(k=>{
      let delta=Math.floor(Math.random()*(base+1))*coef*staffCoef*focusCoef;
      // Filosofía: extra en el stat clave
      if(fil&&k===fil.statGrowthKey)delta+=1;
      // Declive para veteranos (+35 años)
      if(r.age>35)delta-=Math.floor(Math.random()*2);
      r.stats[k]=Math.max(10,Math.min(cap,(r.stats[k]||40)+Math.round(delta)));
    });
    // Promover cantera a plantilla si son suficientemente buenos
    if(isCantera&&r.age>=22){
      const avgStat=Object.values(r.stats).reduce((s,v)=>s+v,0)/Object.values(r.stats).length;
      if(avgStat>=55){
        d.plantilla.push({...r,role:'normal'});
        d.cantera=d.cantera.filter(c=>c.id!==r.id);
        G._clubCanteraPromoted=true; // CR-38 (v76): logro cm_cantera_promote
        showToast(`🎓 ${r.name} sube a la plantilla principal`);
      }
    }
  });

  // C14 — Rivales crecen y pueden generar eventos
  if(d.rivalClubs){
    d.rivalClubs.forEach(r=>{
      r.rep=Math.min(100,(r.rep||20)+Math.floor(Math.random()*5)+2);
      r.socios=Math.min(500,(r.socios||10)+Math.floor(Math.random()*8)+3);
    });
    // ¿Algún rival intenta llevarse a un corredor?
    const topRival=d.rivalClubs.find(r=>r.rep>d.reputacion+15);
    if(topRival&&d.plantilla.length>2&&Math.random()<0.3){
      const target=d.plantilla.find(r=>r.potential==='alto');
      if(target){
        d.pendingEvent={
          title:`${topRival.name} quiere ficharte a ${target.name}`,
          options:[
            {text:`Ofrecerle renovación (+€${Math.round(target.currentSalary*0.2)}/mes)`,repDelta:5,salaryIncrease:true,cost:target.currentSalary*0.2*12},
            {text:'Dejarle ir — el club no puede retenerle a cualquier precio',repDelta:-8,loseRunner:true},
          ]
        };
      }
    }
  }

  // C2: renegociación salarial — corredores con ≥1 temporada en el club
  if(!d.pendingEvent){
    const renegCandidates=d.plantilla.filter(r=>(r.seasonsInClub||0)>=1&&(r.careerPodiums||0)>0);
    const chosen=renegCandidates.length?renegCandidates[Math.floor(Math.random()*renegCandidates.length)]:null;
    if(chosen&&Math.random()<0.4){
      const increase=Math.round((chosen.currentSalary||chosen.salary)*0.2/10)*10;
      const risk=chosen.potential==='alto'?'alto':'medio';
      d.pendingEvent={
        title:`${chosen.name.split(' ')[0]} pide una revisión salarial`,
        body:`Lleva ${chosen.seasonsInClub} temporada${chosen.seasonsInClub>1?'s':''} en el club y ha conseguido ${chosen.careerPodiums} podio${chosen.careerPodiums>1?'s':''}. Pide +€${increase}/mes. Riesgo de marcharse: ${risk}.`,
        options:[
          {text:`Aceptar (+€${increase}/mes para ${chosen.name.split(' ')[0]})`,repDelta:3,cohesionDelta:4,salarySpecificIncrease:true,targetId:chosen.id,increaseAmount:increase},
          {text:`Negociar — solo la mitad (+€${Math.round(increase/2)}/mes)`,   // DS04 (v95): iba entre comillas simples y se pintaba el ${…} literal
          repDelta:1,cohesionDelta:0,salarySpecificIncrease:true,targetId:chosen.id,increaseAmount:Math.round(increase/2)},
          {text:'Rechazar — el presupuesto no da para más',repDelta:-3,cohesionDelta:-6,loseRunnerById:chosen.id,loseChance:risk==='alto'?0.5:0.2},
        ]
      };
    }
  }
  if(!d.pendingEvent)generateClubEvent();
  generateClubObjective();
  checkAndUnlockAchievements(); // CR-38 (v76): logros de Club — antes no se comprobaban nunca en este modo
  G.screen='clubHub';autoSave();render();
};

// Paso 6 de la dirección visual (2026-10-30): tipo Evento, familia gente; cada opción con sus
// efectos en línea (+ verde, − rojo).
function renderClubEvent(){
  const el=$main();
  const d=G.clubModeData;if(!d||!d.pendingEvent){G.screen='clubHub';render();return;}
  const ev=d.pendingEvent;
  const ef=(v,txt)=>v>0?`<span class="pz-mas">+${v} ${txt}</span>`:v<0?`<span class="pz-menos">${v} ${txt}</span>`:'';
  el.innerHTML=`<div class="pz">
    <span class="pz-etiqueta fam-gente">📣 Evento del club</span>
    <div class="pz-titulo">${esc(ev.title)}</div>
    ${ev.body?`<p class="pz-sub">${esc(ev.body)}</p>`:''}
    ${ev.options.map((opt,i)=>`<button class="pz-opcion sin-check" onclick="doClubEvent(${i})">
      <b>${esc(opt.text)}</b>
      <div class="pz-efectos">${[ef(opt.repDelta,'rep'),ef(opt.sociosDelta,'socios'),opt.cost?`<span class="pz-menos">−€${opt.cost}</span>`:'',opt.income?`<span class="pz-mas">+€${opt.income}</span>`:''].filter(Boolean).join(' · ')}</div>
    </button>`).join('')}
  </div>`;
}

window.doClubEvent=idx=>{
  const d=G.clubModeData;if(!d||!d.pendingEvent)return;
  const ev=d.pendingEvent;
  const opt=ev.options[idx];if(!opt)return;
  if(opt.repDelta)d.reputacion=Math.max(0,Math.min(100,(d.reputacion||0)+opt.repDelta));
  if(opt.sociosDelta)d.socios=Math.max(3,(d.socios||8)+opt.sociosDelta);
  if(opt.cohesionDelta)d.cohesion=Math.max(0,Math.min(100,(d.cohesion||50)+opt.cohesionDelta));
  if(opt.cost)d.presupuesto=Math.max(0,(d.presupuesto||0)-opt.cost);
  if(opt.income)d.presupuesto=Math.max(0,(d.presupuesto||0)+opt.income);
  if(opt.addRunner){
    const inIds=d.plantilla.map(r=>r.id);
    const avail=CLUB_RUNNER_POOL.filter(r=>!inIds.includes(r.id));
    if(avail.length&&d.plantilla.length<6){
      const newR={...avail[0],stats:{...avail[0].stats},currentSalary:avail[0].salary};
      d.plantilla.push(newR);
      showToast(`${newR.name} se une al club`);
    }
  }
  if(opt.salaryIncrease&&d.plantilla.length>0){
    const leavingIdx=Math.floor(Math.random()*d.plantilla.length);
    d.plantilla[leavingIdx].currentSalary=(d.plantilla[leavingIdx].currentSalary||d.plantilla[leavingIdx].salary)+50;
  }
  if(opt.salarySpecificIncrease&&opt.targetId){
    const tr=d.plantilla.find(r=>r.id===opt.targetId);
    if(tr){tr.currentSalary=(tr.currentSalary||tr.salary)+(opt.increaseAmount||0);showToast(`${tr.name.split(' ')[0]}: +€${opt.increaseAmount}/mes`);}
  }
  if(opt.loseRunner&&d.plantilla.length>2){
    const leavingIdx=Math.floor(Math.random()*d.plantilla.length);
    const leaving=d.plantilla.splice(leavingIdx,1)[0];
    showToast(`${leaving.name} se va al club rival`);
  }
  if(opt.loseRunnerById&&d.plantilla.length>2){
    if(Math.random()<(opt.loseChance||0.3)){
      const idx=d.plantilla.findIndex(r=>r.id===opt.loseRunnerById);
      if(idx>=0){const leaving=d.plantilla.splice(idx,1)[0];showToast(`${leaving.name} se va — no aceptó la oferta`);}
    }
  }
  let toastMsg=opt.repDelta>0?`+${opt.repDelta} reputación`:opt.repDelta<0?`${opt.repDelta} reputación`:'Decisión tomada';
  showToast(toastMsg);
  d.pendingEvent=null;
  autoSave();G.screen='clubHub';render();
};

