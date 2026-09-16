// ══════════════════════════════════════════════════════════════════
//  MODO DESARROLLADOR — solo con ?dev=1 en la URL
//
//  Reescrito entero en v98 (Tareas/Diseno-Modo-Desarrollador.md en el vault). No forma
//  parte del juego: index.html solo lo descarga con ?dev=1, y el juego lo llama siempre
//  con encadenamiento opcional (window.devTake?.('x')), así que sin él no pasa nada.
//
//  Tres reglas que rompen los tests si se olvidan:
//   1. tests/_bundle.js carga este fichero SIEMPRE, con un DOM de mentira. Nada del nivel
//      raíz toca el DOM, localStorage, addEventListener ni envuelve funciones del juego:
//      todo eso vive en devInit(), que solo corre con window.DEV_ON===true.
//   2. ESLint saca los globales de las declaraciones de nivel raíz y de las líneas que
//      empiezan por `window.X=`. Lo que llaman los onclick del panel va así.
//   3. El estado del panel NO vive en G (antes eran 14 campos _dev*): cargar una partida
//      rehacía G y apagaba el modo dev. Vive en DEV, aquí abajo.
//
//  Orden del fichero (el del documento de diseño):
//   §1 Estado del panel · §2 Armado · §3 Registro, diff, acciones y carga
//   §4 Funciones heredadas del panel de v97 · §5 Modos · §6 Catálogo de eventos
//   §7 Campos del editor · §8 Interfaz: carcasa, pintado, anclaje, buscador
//   §9 Pestañas · §10 Consola · §11 Diagnóstico · §12 Recetas · §13 Arranque y envoltorios
// ══════════════════════════════════════════════════════════════════

// ══ §1 ESTADO DEL PANEL ═════════════════════════════════════════════
const DEV={
  armed:{},                                   // clave → valor; se consume con devTake
  god:{clasico:false,coach:false,club:false,cn:false},
  ui:{tab:'partida',open:{},dock:'auto',sheet:60,width:400,help:true,drawer:false,info:{}},
  ach:{backup:null,dirty:false},              // antes _devAchievementsBackup/_devAchievementsDirty
  dirty:{},                                   // campos del editor cambiados sin aplicar
  log:[], trail:[], diary:[], checks:[], watchdog:[],
  watch:{added:[],removed:[]}, undo:[], hist:[],
  noAutosave:false, storageFull:false, seed:null,
  evt:{mode:null,type:null}, balanceMode:null,
  // Solo en memoria, de uso interno
  cov:{},                   // cobertura de eventos (se persiste en dev_coverage)
  forced:{},                // 'grupo:id' lanzados o armados desde el panel, aún sin aparecer
  pending:{},               // eventos pendientes vistos en el último render
  allow:[],                 // DEV_WATCHDOG_ALLOW: 'pantalla|ruta' que el vigilante ignora
  checksOn:true, errNew:0, busy:0, mounted:false, last:null, status:null,
  lastFinish:null,          // resultado capturado de la última carrera de Clásico
  filters:{error:true,warn:true,log:true,dev:true,repl:true},
};
window.DEV=DEV;
const DEV_WATCHDOG_ALLOW=DEV.allow;

function devLSGet(k,def){try{const v=LS.get(k);return v==null?def:JSON.parse(v);}catch(e){return def;}}
function devLSSet(k,v){try{return LS.set(k,JSON.stringify(v));}catch(e){return false;}}
function devSaveUI(){devLSSet('dev_ui',DEV.ui);}
function devSavePrefs(){devLSSet('dev_prefs',{noAutosave:DEV.noAutosave,seed:DEV.seed});}
const DEV_CLASSIC_MODES=['facil','medio','dificil','hardcore','expres'];
const devIsClassic=()=>DEV_CLASSIC_MODES.includes(G.gameMode);

// ══ §2 ARMADO: lo que el juego consume con devTake / devPeek / devGod ══════
// Cada clave dice cuándo actúa (DEV_WHEN) y cómo se describe en la franja «Armado».
const DEV_ARMABLE={
  descentFall:   {when:'tramo',    txt:()=>'Caída en la próxima bajada «a tope»'},
  midRaceEvent:  {when:'tramo',    txt:v=>'Evento en el próximo tramo: '+devEvtTitle(v)},
  coachMidEvent: {when:'carrera',  txt:v=>'Entrenador, en la próxima carrera: '+devEvtTitle(v)},
  cnEvent:       {when:'tramo',    txt:v=>'Canicross, próximo tramo: '+devEvtTitle(v)},
  betweenEvent:  {when:'carrera',  txt:v=>'Al terminar la próxima carrera: '+devEvtTitle(v)},
  trainingEvent: {when:'carrera',  txt:v=>'Al elegir el próximo bloque de entreno: '+devEvtTitle(v)},
  dayCondition:  {when:'carrera',  txt:v=>'Condición del día de la próxima carrera: '+v},
  weather:       {when:'carrera',  txt:v=>'Clima de la próxima carrera: '+v},
  clubDnf:       {when:'temporada',txt:v=>'Abandono en la próxima simulación: '+(v==='*'?'cualquier corredor':devClubRunnerName(v))},
  clubSponsorMet:{when:'temporada',txt:v=>'Sponsors en la próxima simulación: '+(v?'todos cumplen':'todos rescinden')},
};
function devArmLabel(k,v){const a=DEV_ARMABLE[k];try{return a?a.txt(v):k+' = '+JSON.stringify(v);}catch(e){return k;}}
window.devTake=k=>{
  if(!(k in DEV.armed))return undefined;
  const v=DEV.armed[k]; delete DEV.armed[k];
  devLog('dev','Consumido: '+devArmLabel(k,v)); devRefreshChrome(); return v;
};
window.devPeek=k=>DEV.armed[k];
window.devGod=m=>!!DEV.god[m];
window.devArm=(k,v)=>{DEV.armed[k]=v; devLog('dev','Armado: '+devArmLabel(k,v)); devRefreshChrome();};
window.devDisarm=k=>{
  if(!(k in DEV.armed))return;
  const v=DEV.armed[k]; delete DEV.armed[k];
  devLog('dev','Cancelado: '+devArmLabel(k,v)); devStatus('Cancelado: '+devArmLabel(k,v)); devRefreshChrome(); devPaint();
};
window.devToggleGod=m=>{
  DEV.god[m]=!DEV.god[m];
  const lbl={clasico:'Clásico y Exprés',coach:'Entrenador',club:'Club',cn:'Canicross'}[m]||m;
  devLog('dev','Modo dios '+lbl+(DEV.god[m]?' ACTIVADO':' desactivado'));
  devStatus('Modo dios '+lbl+(DEV.god[m]?' activado':' desactivado'));
  devRefreshChrome(); devPaint();
};

// ══ §3 REGISTRO, DIFF, ACCIONES Y CARGA ═══════════════════════════════
// El registro alimenta la Consola. Nunca escribe en console.*: la captura de index.html
// lo volvería a traer aquí y daría la vuelta para siempre.
function devArgText(a){
  if(a instanceof Error)return a.message;
  if(typeof a==='string')return a;
  try{const s=JSON.stringify(a);return s===undefined?String(a):(s.length>300?s.slice(0,300)+'…':s);}catch(e){return String(a);}
}
function devLog(level,msg,args){
  const lv=level==='info'||level==='debug'?'log':level;
  const m=String(msg);
  const prev=DEV.log[DEV.log.length-1];
  if(prev&&prev.l===lv&&prev.m===m&&!args){prev.n=(prev.n||1)+1;prev.t=Date.now();if(DEV.mounted)devConsoleRedrawLast();return prev;}
  const e={t:Date.now(),l:lv,m,a:args||null,n:1};
  DEV.log.push(e);
  if(DEV.log.length>500)DEV.log.shift();
  if(lv==='error')DEV.errNew++;
  if(DEV.mounted){devConsoleAppend(e);devRefreshBadge();}
  return e;
}
function devStatus(msg,isErr){
  DEV.status={msg:String(msg),err:!!isErr,t:Date.now()};
  if(!DEV.mounted)return;
  const el=document.getElementById('dev-status');
  if(el){el.textContent=(isErr?'⚠ ':'Último: ')+DEV.status.msg;el.className='dev-status'+(isErr?' err':'');}
}

// Aplanado de G para el diff: ruta → valor. Ignora las claves que empiezan por _, y de
// los historiales largos guarda solo su longitud.
const DEV_FLAT_SHORT=['coachRoster','careerHistory','careerRaceHistory','seasonDiary','coachDecisionLog','nemesisLog'];
function devFlat(obj){
  const out={};
  const walk=(v,path,depth)=>{
    if(v===null||typeof v!=='object'){if(typeof v!=='function')out[path]=v;return;}
    const arr=Array.isArray(v);
    if(depth>=5){out[path]=arr?'Array('+v.length+')':'{…}';return;}
    const keys=arr?v.map((x,i)=>i):Object.keys(v);
    if(!keys.length){out[path]=arr?'[]':'{}';return;}
    for(const k of keys){
      if(typeof k==='string'&&k.startsWith('_'))continue;
      const p=path===''?String(k):path+'.'+k;
      if(depth===0&&DEV_FLAT_SHORT.includes(k)){
        const x=v[k];out[p+'.length']=x==null?x:(Array.isArray(x)?x.length:Object.keys(x).length);continue;
      }
      walk(v[k],p,depth+1);
    }
  };
  walk(obj,'',0);
  return out;
}
// Un objeto o array vacío se aplana como '{}' / '[]'. Cuando gana su primer hijo, ese
// marcador desaparece: no es un cambio en sí (el hijo nuevo ya sale en la lista).
function devDiffList(a,b){
  const out=[];
  const hueco=v=>v==='{}'||v==='[]';
  for(const k in b)if(!(k in a)||!Object.is(a[k],b[k])){if(!(k in a)&&hueco(b[k])&&Object.keys(a).some(x=>x.startsWith(k+'.')))continue;out.push([k,a[k],b[k]]);}
  for(const k in a)if(!(k in b)){if(hueco(a[k]))continue;out.push([k,a[k],undefined]);}
  return out;
}
function devFmt(v){
  if(v===undefined)return '—';
  if(typeof v==='number')return Number.isInteger(v)?String(v):String(Math.round(v*100)/100);
  if(typeof v==='string')return JSON.stringify(v.length>60?v.slice(0,60)+'…':v);
  return String(v);
}
function devDiffText(a,b,max=30){
  const d=Array.isArray(a)?a:devDiffList(a,b);
  if(!d.length)return '';
  const lines=d.slice(0,max).map(([k,x,y])=>k+': '+devFmt(x)+' → '+devFmt(y));
  if(d.length>max)lines.push('… y '+(d.length-max)+' más');
  return lines.join('\n');
}

// Toda acción del panel pasa por aquí: instantánea para Deshacer, errores capturados,
// diff en la consola, línea de estado y repintado.
function devAct(label,fn,{undo=true,render:doRender=true}={}){
  const before=devFlat(G);
  if(undo)devPushUndo(label);
  DEV.busy++;
  try{
    const r=fn();
    const diff=devDiffList(before,devFlat(G));
    DEV.last={label,t:Date.now(),diff};
    devLog('dev',label+(diff.length?'\n'+devDiffText(diff):' · sin cambios en G'));
    devStatus(label+(diff.length?' · '+diff.slice(0,2).map(([k,x,y])=>k+': '+devFmt(x)+' → '+devFmt(y)).join(' · ')+(diff.length>2?' · +'+(diff.length-2):''):''));
    devTrailNote(label);
    if(doRender)render();
    return r;
  }catch(e){
    devLog('error',label+': '+e.message,[e]);
    devStatus('Error: '+e.message,true);
    showToast('DEV error: '+e.message,'#c0392b');
  }finally{DEV.busy--;}
}
window.devAct=devAct;

function devPushUndo(label){
  try{
    DEV.undo.push({label,json:JSON.stringify(serializableState()),t:Date.now()});
    if(DEV.undo.length>10)DEV.undo.shift();
  }catch(e){devLog('warn','No se pudo guardar la instantánea para deshacer: '+e.message);}
}
window.devUndo=()=>{
  const u=DEV.undo.pop();
  if(!u){devStatus('No hay nada que deshacer',true);return;}
  try{devLoadState(u.json,'Deshacer «'+u.label+'»');devStatus('Deshecho: '+u.label);render();}
  catch(e){devStatus('No se pudo deshacer: '+e.message,true);}
};

// Formatos que entran por el importador (§6.7): el envoltorio del panel, un estado JSON
// crudo y el texto del exportador normal del juego (SAVE_VERSION::base64).
function devParseImport(text){
  if(typeof text!=='string')throw new Error('Formato no reconocido');
  if(text.length>MAX_IMPORT_CHARS)throw new Error('Texto demasiado grande (máx. '+Math.round(MAX_IMPORT_CHARS/1024)+' KB)');
  const t=text.trim();
  if(t.startsWith(SAVE_VERSION+'::')){
    const bin=atob(t.slice(SAVE_VERSION.length+2));
    const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
    const state=JSON.parse(new TextDecoder().decode(bytes));
    return {state,build:(state&&state._build)||null,format:'juego'};
  }
  const j=JSON.parse(t);
  if(j&&j._devExport)return {state:j.state,build:j.build||null,note:j.nota||'',format:'panel'};
  return {state:j,build:(j&&j._build)||null,format:'crudo'};
}
// La cadena única de carga (importar, instantánea, deshacer, receta): la misma de
// importFromText — tope de tamaño, sanitize, migrate, sanitize — y el mismo volcado que
// loadSlot. No toca DEV: cargar ya no apaga nada.
function devLoadState(raw,origen){
  const txt=typeof raw==='string'?raw:JSON.stringify(raw);
  const {state}=devParseImport(txt);
  const safe=sanitizeState(state);
  if(!safe)throw new Error('El estado no pasa sanitizeState()');
  const migrated=migrateState(safe);
  const clean=sanitizeState(migrated)||migrated;
  const slot=G._saveSlot;
  Object.assign(G,freshState(),clean);
  G._saveSlot=slot;
  devLog('dev','Partida cargada: '+(origen||'sin origen'));
  return G;
}
window.devLoadState=devLoadState;

// ══ §4 FUNCIONES HEREDADAS DEL PANEL DE v97 ══════════════════════════
// Copiadas a mano porque funcionan y están verificadas (CR-24, BUG-18, BUG-19…). Cambian
// solo en lo que pide el rediseño: los simuladores reciben n, los modos dios viven en DEV
// y Club cierra la temporada con sus cuentas reales (devClubClose).

// T146 (v93): se deriva del despachador (screenRoutes()), así no puede divergir. Se llama
// al pintar, no al cargar: atarlo al orden de carga es lo que T63 decidió no hacer.
function devAllScreens(){return Object.keys(screenRoutes()).sort();}

// ── Saltos directos de modo ──
window.devJumpToCoach=()=>{
  const pick=LIFE_ATHLETE_POOL[Math.floor(Math.random()*LIFE_ATHLETE_POOL.length)];
  G.lifeAthlete={...pick,currentStats:{...pick.baseStats}};
  G.carreraVida=true;G.activeTab='game';
  // El flujo real (confirmLifeCoachTransition) nunca toca G.gameMode — se
  // fuerza aquí para que las pestañas funcionen bien en dev (hallazgo de
  // CR-29 en Bugs-Activos, no relacionado con este fix).
  G.gameMode='coach';
  if(!Array.isArray(G.coachRoster))G.coachRoster=[];
  // Reutiliza el flujo real en vez de montar el estado a mano — así el salto
  // de dev también aplica el bonus de fama a coachReputation (CR-24) y pasa
  // por coachIntro, exactamente igual que le pasaría a un jugador real.
  confirmLifeCoachTransition();
};
window.devJumpToClub=()=>{
  const nuevo=!G.clubModeData;
  if(nuevo){
    G.clubModeData=initClubModeData('Club de Pruebas','mixto','montanero','equilibrado');
  }
  G.gameMode='club';
  G.carreraVida=true;G.lifecyclePhase='club';
  // BUG-19 (v96): el club de pruebas arrancaba sin evento inicial ni objetivo de temporada,
  // con otras cuentas que el creado desde el menú. Lo mismo que doClubCreate().
  if(nuevo){generateClubEvent();generateClubObjective();}
  G.screen='clubHub';G.activeTab='game';
  showToast('DEV: saltado a Club','#1D9E75');
  render();
};
window.devJumpToCanicross=()=>{
  G.gameMode='canicross';
  if(!G.dog)G.dog=cnInitDog('DevDog','mestizo');
  G.screen='canicrossHub';G.activeTab='game';
  showToast('DEV: saltado a Canicross','#4a8a2a');
  render();
};
window.devJumpToClassic=()=>{
  G.gameMode='medio';
  G.screen='workSetup';G.activeTab='game';
  showToast('DEV: saltado a Clásico','#1a1a1a');
  render();
};
window.devForceAthleteOffer=()=>{
  G.carreraVida=true;
  const rejectedIds=(G.lifePendingAthletes||[]).map(a=>a.id);
  const available=LIFE_ATHLETE_POOL.filter(a=>!rejectedIds.includes(a.id));
  const pick=(available.length?available:LIFE_ATHLETE_POOL)[0];
  G.pendingLifeAthleteOffer={...pick,currentStats:{...pick.baseStats}};
  G.screen='lifeAthleteOffer';
  showToast('DEV: oferta de atleta forzada','#534AB7');
  render();
};

// ── Ganar / perder la carrera en curso (Clásico) ──
// Trucos legítimos: calcRaceResult() solo mira G.time vs G.rivals[].time,
// así que forzamos G.time y dejamos que finishRace() haga TODO lo demás
// (stat gains, logros, premio, ranking...) exactamente como en una carrera real.
window.devWinRace=()=>{
  if(!G.rivals||!G.rivals.length){showToast('DEV: no hay carrera en curso','#c0392b');return;}
  G.time=Math.max(1,Math.min(...G.rivals.map(r=>r.time))-60);
  finishRace();
};
window.devLoseRace=()=>{
  if(!G.rivals||!G.rivals.length){showToast('DEV: no hay carrera en curso','#c0392b');return;}
  G.time=Math.max(...G.rivals.map(r=>r.time))+60;
  finishRace();
};

// Simular N temporadas de Clásico de golpe — sin loop de tramos. initRace()/
// finishRace() no exigen jugar segmento a segmento (mismo principio que
// devWinRace/devLoseRace): se aproxima el tiempo total sumando el `.base` de
// cada tramo de la carrera (ya precomputado en RACES_DB) con variación
// aleatoria, tanto para el jugador como para cada rival (misma fórmula que
// usa doPace() por tramo — rv.mult*base — aplicada de una vez en vez de
// tramo a tramo). Auto-elige calendario si no hay uno ya seleccionado.
window.devSimulateClasicoSeasons=(n)=>{
  n=Math.max(1,Number(n)||1);
  try{
    for(let i=0;i<n;i++){
      if(!G.selectedRaces||!G.selectedRaces.length){
        const canAccess=canAccessRace;   // DS08 (v95)
        let spent=0;const picks=[];
        for(const r of RACES_DB){
          if(picks.length>=5)break;
          if(!canAccess(r)||spent+r.cost>G.money)continue;
          picks.push(r);spent+=r.cost;
        }
        G.selectedRaces=picks;
        if(!picks.length){showToast('DEV: sin dinero/ranking para ninguna carrera — simulación detenida en temporada '+(i+1),'#c0392b');break;}
      }
      G.currentRaceIdx=0;
      while(G.currentRaceIdx<G.selectedRaces.length){
        const race=G.selectedRaces[G.currentRaceIdx];
        G._raceInitialized=false;
        initRace();
        const totalBase=(race.segs||[]).reduce((a,s)=>a+(s.base||0),0);
        G.time=Math.round(totalBase*(0.90+Math.random()*0.20));
        G.rivals.forEach(rv=>{rv.time=Math.round(totalBase*rv.mult*(0.96+Math.random()*0.08));});
        finishRace();
        G.currentRaceIdx++;
      }
      applyTraining(true); // T25 (v89): el simulador de temporadas sí quiere reaplicar
      doNextYear(seasonYearNet());   // H19 (v95): con 0 la economía no se movía nunca
      if(G.careerEnded)break;
    }
    showToast('DEV: '+n+' temporada(s) de Clásico simuladas','#1a1a1a');
  }catch(e){
    showToast('DEV error simulando Clásico: '+e.message,'#c0392b');
    devLog('error','[devSimulateClasicoSeasons] '+e.message,[e]);
  }
  render();
};

// ── Ganar / perder la carrera en curso (Entrenador) ──
// doCoachRaceFinish() lee G.coachRaceData.finalPos, ya fijado al generar la
// carrera — lo sobreescribimos y dejamos que la función real haga el resto.
window.devWinCoachRace=()=>{
  if(!G.coachRaceData){showToast('DEV: no hay carrera de Entrenador en curso','#c0392b');return;}
  G.coachRaceData.finalPos=1;
  doCoachRaceFinish();
};
window.devLoseCoachRace=()=>{
  if(!G.coachRaceData){showToast('DEV: no hay carrera de Entrenador en curso','#c0392b');return;}
  G.coachRaceData.finalPos=G.coachRaceData.totalParticipants||99;
  doCoachRaceFinish();
};

// Simular N temporadas de Entrenador de golpe — mucho más directo que
// Clásico/Canicross: coachBuildRaceData() calcula el resultado entero
// (finalPos incluido) a partir de las stats del atleta en el momento de
// crear la carrera, sin depender de nada de lo que pase en la animación —
// así que basta con generarlo y llamar a doCoachRaceFinish() directamente,
// sin tocar la pantalla de carrera en absoluto.
window.devSimulateCoachSeasons=(n)=>{
  n=Math.max(1,Number(n)||1);
  if(!G.coachAthlete){showToast('DEV: no hay atleta de Entrenador — usa "Ir a Entrenador ahora" primero','#c0392b');return;}
  try{
    for(let i=0;i<n;i++){
      if(!G.coachSelectedRaces||!G.coachSelectedRaces.length){
        const available=RACES_DB.filter(r=>{
          if(G.coachSeason===1&&r.tier==='elite')return false;
          if(G.coachSeason<=1&&(r.reqRanking||999)<25)return false;
          return true;
        });
        G.coachSelectedRaces=available.slice(0,4);
      }
      G.coachSelectedRaces.forEach(race=>{
        G.coachRaceData=coachBuildRaceData(race,0);
        doCoachRaceFinish();
      });
      doCoachNextSeason();
    }
    showToast('DEV: '+n+' temporada(s) de Entrenador simuladas','#534AB7');
  }catch(e){
    showToast('DEV error simulando Entrenador: '+e.message,'#c0392b');
    devLog('error','[devSimulateCoachSeasons] '+e.message,[e]);
  }
  render();
};

// ── Ganar / perder la carrera en curso (Canicross) ──
// Mismo truco que Clásico: forzamos rs.time por debajo/encima del rival más
// rápido/lento y dejamos que cnFinishRace() real haga el resto.
window.devWinCnRace=()=>{
  const rs=G.cnRaceState;
  if(!rs||!rs.rivals||!rs.rivals.length||rs.done){showToast('DEV: no hay carrera de Canicross en curso','#c0392b');return;}
  rs.timePenalty=0;
  rs.time=Math.max(1,Math.min(...rs.rivals.map(r=>r.estimatedTime))-60);
  cnFinishRace();
};
window.devLoseCnRace=()=>{
  const rs=G.cnRaceState;
  if(!rs||!rs.rivals||!rs.rivals.length||rs.done){showToast('DEV: no hay carrera de Canicross en curso','#c0392b');return;}
  rs.timePenalty=0;
  rs.time=Math.max(...rs.rivals.map(r=>r.estimatedTime))+60;
  cnFinishRace();
};

// Simular N temporadas de Canicross de golpe — reutiliza cnStartRace() para
// construir rivales/estado real de cada carrera (evita reimplementar
// cnGenerateRivals a mano), luego fuerza rs.time aproximado (basePace×km con
// variación, igual que el resto de simuladores) y llama a cnFinishRace()
// directo, sin pasar por tramos ni por la pantalla de carrera.
window.devSimulateCanicrossSeasons=(n)=>{
  n=Math.max(1,Number(n)||1);
  if(!G.dog){showToast('DEV: no hay perro — usa "Ir a Canicross ahora" primero','#c0392b');return;}
  try{
    for(let i=0;i<n;i++){
      if(!G.cnSelectedRaces||!G.cnSelectedRaces.length){
        G.cnSelectedRaces=[...CANICROSS_RACES].sort((a,b)=>a.month-b.month).slice(0,5);
      }
      G.cnSelectedRaces.forEach((race,idx)=>{
        if(!cnCanRace())return; // vínculo insuficiente / perro lesionado — se salta el resto
        cnStartRace(idx);
        const rs=G.cnRaceState;
        if(!rs||rs.raceId!==race.id)return;
        const totalBase=(rs.basePace||390)*(race.km||8);
        rs.time=Math.round(totalBase*(0.90+Math.random()*0.20));
        rs.timePenalty=0;
        cnFinishRace();
      });
      cnDoSeasonTransition();
    }
    showToast('DEV: '+n+' temporada(s) de Canicross simuladas','#4a8a2a');
  }catch(e){
    showToast('DEV error simulando Canicross: '+e.message,'#c0392b');
    devLog('error','[devSimulateCanicrossSeasons] '+e.message,[e]);
  }
  render();
};

// ── Club — no hay "carrera en curso" única, la temporada se resuelve de golpe.
// P15 (v98): el cierre se hacía con doClubNextSeason(0,0,0) y no cobraba cuotas ni pagaba
// sueldos ni staff, ni crecían los socios. Ahora pasa las mismas cifras que la pantalla.
function devClubClose(){
  const c=clubSeasonClosing(G.clubModeData);
  doClubNextSeason(c.socioGain,c.socioLoss,c.closing);
  return c;
}
window.devClubClose=devClubClose;

// Simular N temporadas de golpe: auto-asigna toda la plantilla a cada carrera
// desbloqueada (mismo filtro repReq/sociosReq que usa la función real), simula con
// doClubSimulateSeason() y cierra con las cuentas reales.
window.devSimulateClubSeasons=(n)=>{
  n=Math.max(1,Number(n)||1);
  const d=G.clubModeData;
  if(!d){showToast('DEV: no hay club fundado — usa "Ir a Club ahora" primero','#c0392b');return;}
  try{
    for(let i=0;i<n;i++){
      const dd=G.clubModeData;if(!dd)break;
      const clubRep=dd.reputacion||0,clubSocios=dd.socios||8;
      dd.calAssignments={};
      CLUB_RACES.forEach(race=>{
        if((race.repReq||0)>clubRep||(race.sociosReq||0)>clubSocios)return;
        dd.calAssignments[race.id]=dd.plantilla.map(r=>r.id);
      });
      doClubSimulateSeason();
      devClubClose();
      if(G.screen==='clubDissolved')break;
    }
    showToast('DEV: '+n+' temporada(s) de Club simuladas','#1D9E75');
  }catch(e){
    showToast('DEV error simulando Club: '+e.message,'#c0392b');
    devLog('error','[devSimulateClubSeasons] '+e.message,[e]);
  }
  render();
};

// ── Forzar fin de temporada. Reutiliza la función real de cada modo. ──
window.devForceSeasonEnd=(mode)=>{
  if(mode==='coach'){doCoachNextSeason();return;}
  if(mode==='club'){devClubClose();return;}
  if(mode==='canicross'){cnDoSeasonTransition();return;}
  doNextYear(seasonYearNet());   // H19 (v95)
};

// ── Lesión rápida ──
window.devSetInjury=(type)=>{
  if(!type){G.injuryStatus=null;G.injuryType=null;G.injuryRacesLeft=0;showToast('DEV: lesión retirada','#4a8a2a');render();return;}
  const injData=INJURY_TYPES[type];
  if(!injData){showToast('DEV: tipo de lesión desconocido','#c0392b');return;}
  // BUG-18 (v96): hace lo mismo que una lesión de verdad —quita stats como secuela
  // recuperable y la apunta en injuryHistory—. En carrera cuenta las carreras posteriores a la
  // actual, como el juego. Entre carreras se trata como sufrida en la anterior: si impide
  // correr, pasa ya por la pantalla de baja en vez de dejar preparar una carrera que no se va a
  // correr (y que el motor cancelaba en el primer tramo).
  const races=G.selectedRaces||[];const idx=G.currentRaceIdx||0;
  const midRace=['segment','aid','midRaceEvent'].includes(G.screen);
  const entreCarreras=!midRace&&idx<races.length&&['preRace','preRacePrep','betweenRace','betweenManage','expresPrep','expresPreRacePrep'].includes(G.screen);
  G.injuryStatus='moderada';G.injuryType=type;
  G.injuryRacesLeft=injuryRacesBlocked(type,hasFisio(),midRace?racesLeftAfterCurrent():Math.max(0,races.length-idx));
  if(!G.injuryHistory)G.injuryHistory=[];
  const race=(midRace?races[idx]:races[idx-1])||races[idx];
  G.injuryHistory.push({type,label:injData.label,race:race?.name||'',year:G.year,km:race?.km||0});
  if(entreCarreras&&!injData.canRace&&G.injuryRacesLeft>0){
    G.pendingEvent=null;
    G.currentRaceIdx=idx-1;
    afterRace();                     // pinta la baja de la próxima carrera
    applyInjuryStatPenalty(type);    // después: afterRace devuelve un 15 % de la secuela pendiente
    autoSave();
    showToast('DEV: lesión aplicada — '+(injData.label||type),'#c0392b');
    return;
  }
  applyInjuryStatPenalty(type);
  showToast('DEV: lesión aplicada — '+(injData.label||type),'#c0392b');
  render();
};

// ── Logros ──
function devAchDiff(){return G.gameMode==='canicross'?'canicross':(G.gameMode||'medio');}
function devGlobalAchs(){try{return JSON.parse(LS.get('globalAchs')||'{}');}catch(e){return {};}}
window.devUnlockAllAchievements=()=>{
  // Solo en memoria — NO toca localStorage['globalAchs'], así que no ensucia
  // el historial de logros real de otras partidas guardadas. Además respalda
  // G.unlockedAchievements antes de forzarlo: serializableState() (save.js)
  // usa ese respaldo mientras dure la sesión dev, así ningún guardado normal
  // (cambiar de pantalla, terminar algo) persiste el desbloqueo de prueba.
  if(!DEV.ach.dirty){
    DEV.ach.backup=[...(G.unlockedAchievements||[])];
    DEV.ach.dirty=true;
  }
  if(!G.achievementMeta)G.achievementMeta={};
  G.unlockedAchievements=ACHIEVEMENTS.map(a=>a.id);
  ACHIEVEMENTS.forEach(a=>{if(!G.achievementMeta[a.id])G.achievementMeta[a.id]={difficulty:G.gameMode||'medio',year:G.year||1};});
  showToast('DEV: todos los logros desbloqueados (solo esta partida)','#c07a10');
  render();
};
window.devEndAchPreview=()=>{
  if(!DEV.ach.dirty)return;
  G.unlockedAchievements=[...(DEV.ach.backup||[])];
  DEV.ach.dirty=false;DEV.ach.backup=null;
  render();
};

// Toggle individual — a diferencia de "desbloquear todos" (cheat de vista
// previa, no persiste), esto es una edición real: entra/sale de
// G.unlockedAchievements normal, persiste igual que si el jugador lo hubiera
// ganado o nunca lo hubiera tenido. También actualiza localStorage['globalAchs']
// — la pantalla de logros (renderAchievements()) lee de ahí, NO de
// G.unlockedAchievements, así que sin esto el toggle no se vería en pantalla
// aunque el toast confirmara el cambio (bug encontrado 2026-09-02).
// P5 (v98): «bloquear de nuevo» también borra el logro de globalAchs, que es un trofeo
// global compartido entre partidas. Quien llama lo confirma antes (pestaña Logros).
window.devToggleAchievement=(id)=>{
  if(!id)return;
  if(!Array.isArray(G.unlockedAchievements))G.unlockedAchievements=[];
  const globalAchs=devGlobalAchs();
  const idx=G.unlockedAchievements.indexOf(id);
  if(idx>=0){
    G.unlockedAchievements.splice(idx,1);
    delete globalAchs[id];
    LS.set('globalAchs',JSON.stringify(globalAchs));
    showToast('DEV: logro bloqueado de nuevo (también en el trofeo global)','#888');
  }else{
    G.unlockedAchievements.push(id);
    if(!G.achievementMeta)G.achievementMeta={};
    const diff=devAchDiff();
    if(!G.achievementMeta[id])G.achievementMeta[id]={difficulty:diff,year:G.year||G.cnSeason||1};
    if(!globalAchs[id])globalAchs[id]={difficulty:diff,year:G.year||G.cnSeason||1};
    LS.set('globalAchs',JSON.stringify(globalAchs));
    showToast('DEV: logro desbloqueado','#c07a10');
  }
  render();
};

// Desbloquear por categoría — edición real (igual que el toggle individual, no el cheat
// de "vista previa"). P6 (v98): el comentario de v97 decía que no había logros de
// Entrenador ni de Club; los hay desde CR-38 (mode:'coach' y mode:'club'). Los 7 «club_*»
// sin etiqueta siguen en General: son de unirte a un club en Clásico, no de fundarlo.
function devAchCat(a){return a.mode==='cn'||a.mode==='expres'||a.mode==='coach'||a.mode==='club'?a.mode:'general';}
window.devUnlockCategory=(cat)=>{
  const targets=ACHIEVEMENTS.filter(a=>cat==='todos'||devAchCat(a)===cat);
  if(!Array.isArray(G.unlockedAchievements))G.unlockedAchievements=[];
  const globalAchs=devGlobalAchs();
  const diff=devAchDiff();
  if(!G.achievementMeta)G.achievementMeta={};
  targets.forEach(a=>{
    if(!G.unlockedAchievements.includes(a.id))G.unlockedAchievements.push(a.id);
    if(!G.achievementMeta[a.id])G.achievementMeta[a.id]={difficulty:diff,year:G.year||G.cnSeason||1};
    if(!globalAchs[a.id])globalAchs[a.id]={difficulty:diff,year:G.year||G.cnSeason||1};
  });
  LS.set('globalAchs',JSON.stringify(globalAchs));
  showToast('DEV: '+targets.length+' logro(s) desbloqueados','#c07a10');
  render();
};

// ══ §5 MODOS ═══════════════════════════════════════════════════════════
// Las secciones por modo se pintan desde esta tabla. Añadir Backyard o Ultratrail es
// añadir una entrada.
const DEV_MODES={
  clasico:{label:'Clásico/Exprés',icon:'🏃',active:()=>devIsClassic()&&!isCoachPhase(),
    inRace:()=>!!(G.rivals&&G.rivals.length), win:()=>devWinRace(), lose:()=>devLoseRace(),
    god:'clasico', godLabel:'Clásico y Exprés',
    seasonEnd:()=>devForceSeasonEnd('clasico'), simulate:n=>devSimulateClasicoSeasons(n),
    needsRace:'Necesita una carrera de Clásico o Exprés en curso', has:()=>true},
  coach:{label:'Entrenador',icon:'📋',active:()=>isCoachPhase(),
    inRace:()=>!!G.coachRaceData, win:()=>devWinCoachRace(), lose:()=>devLoseCoachRace(),
    god:'coach', godLabel:'Entrenador',
    seasonEnd:()=>devForceSeasonEnd('coach'), simulate:n=>devSimulateCoachSeasons(n),
    needsRace:'Necesita una carrera de Entrenador en curso',
    has:()=>!!G.coachAthlete, missing:'Aún no hay atleta de Entrenador', jump:()=>devJumpToCoach()},
  club:{label:'Club',icon:'🏕',active:()=>G.gameMode==='club',
    inRace:null, god:'club', godLabel:'Club',
    seasonEnd:()=>devForceSeasonEnd('club'), simulate:n=>devSimulateClubSeasons(n),
    noRace:'Club no tiene carrera en curso: la temporada entera se resuelve al simularla.',
    has:()=>!!G.clubModeData, missing:'Aún no hay club fundado', jump:()=>devJumpToClub()},
  canicross:{label:'Canicross',icon:'🐕',provisional:true,active:()=>G.gameMode==='canicross',
    inRace:()=>{const rs=G.cnRaceState;return !!(rs&&rs.rivals&&rs.rivals.length&&!rs.done);},
    win:()=>devWinCnRace(), lose:()=>devLoseCnRace(), god:'cn', godLabel:'Canicross',
    seasonEnd:()=>devForceSeasonEnd('canicross'), simulate:n=>devSimulateCanicrossSeasons(n),
    needsRace:'Necesita una carrera de Canicross en curso',
    has:()=>!!G.dog, missing:'Aún no hay perro', jump:()=>devJumpToCanicross()},
};
function devActiveMode(){
  for(const [id,m] of Object.entries(DEV_MODES)){try{if(m.active())return id;}catch(e){}}
  return 'clasico';
}

// ══ §6 CATÁLOGO DE EVENTOS ═════════════════════════════════════════════
// Los diez grupos de datos de §1.1 del diseño, con cómo se lanza y cómo se arma cada uno.
// can() devuelve null si se puede, o el motivo si no. Lanzar = que salga ya; armar = que
// salga en cuanto el juego llegue a ese momento (se consume con devTake).
const DEV_CLASSIC_MID_IDS=['storm','hat_blown','temp_change','frozen_hands','lost','mud_fall','trail_blocked',
  'confusing_fork','ankle_mud','false_flat','endless_climb','injured_runner','slip_nf','bad_fall','sock_adjust',
  'empty_aid','bad_gel','hunger_crisis','mid_trap','heavy_legs','stone_legs','friends_cheer','sabotage',
  'rival_pass','crowd_cameras','bottleneck','nickname_shout','lent_pole','dog_fan'];
const devClassicRace=()=>devIsClassic()&&!!(G.selectedRaces||[])[G.currentRaceIdx]&&!!(G.rivals&&G.rivals.length)
  &&['segment','aid','midRaceEvent'].includes(G.screen);
function devCnPool(){
  return [[CN_EVENTS_POS,'pos'],[CN_EVENTS_NEG,'neg'],[CN_EVENTS_RARE,'rare'],[CN_EVENTS_SPECIAL,'special']]
    .flatMap(([p,t])=>p.map(e=>({...e,_t:t})));
}
const DEV_EVENT_GROUPS=[
  {id:'mid',label:'Clásico/Exprés · en carrera',mode:'clasico',when:'tramo',armKey:'midRaceEvent',
    items:()=>DEV_CLASSIC_MID_IDS.map(id=>({id,title:devClassicMidTitle(id)})),
    ready:()=>devClassicBuildReady(),
    notReady:'Disponible tras el paso 9 (catálogo de textos de race.js)',
    canLaunch:()=>G.screen==='segment'&&devClassicRace()?null:'Necesita una carrera de Clásico o Exprés en curso, en la pantalla de tramo',
    canArm:()=>devIsClassic()?null:'Necesita una partida de Clásico o Exprés',
    launch:id=>devLaunchMid(id)},
  {id:'xpTimed',label:'Exprés · con contador',mode:'clasico',when:'tramo',armKey:'midRaceEvent',
    items:()=>EXPRESS_TIMED_EVENTS.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>G.gameMode==='expres'&&G.screen==='segment'&&devClassicRace()?null:'Necesita una carrera de Exprés en curso, en la pantalla de tramo (el contador solo corre en Exprés)',
    canArm:()=>G.gameMode==='expres'?null:'Necesita una partida de Exprés (el contador solo corre en Exprés)',
    launch:id=>devLaunchMid(id)},
  {id:'xpNarr',label:'Exprés · narrativos',mode:'clasico',when:'tramo',armKey:'midRaceEvent',
    items:()=>EXPRESS_NARRATIVE_EVENTS.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>G.gameMode==='expres'&&G.screen==='segment'&&devClassicRace()?null:'Necesita una carrera de Exprés en curso, en la pantalla de tramo',
    canArm:()=>G.gameMode==='expres'?null:'Necesita una partida de Exprés',
    launch:id=>devLaunchMid(id)},
  {id:'between',label:'Clásico · entre carreras',mode:'clasico',when:'carrera',armKey:'betweenEvent',
    items:()=>BETWEEN_EVENTS.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>devIsClassic()&&G.gameMode!=='expres'&&['preRacePrep','betweenRace'].includes(G.screen)?null:'Necesita Clásico (no Exprés) en la preparación de carrera o entre carreras',
    canArm:()=>devIsClassic()&&G.gameMode!=='expres'?null:'Necesita Clásico: en Exprés no hay eventos entre carreras',
    launch:id=>{const ev=BETWEEN_EVENTS.find(e=>e.id===id);G.pendingEvent={...ev};G.screen='betweenRace';}},
  {id:'training',label:'Clásico · entreno',mode:'clasico',when:'carrera',armKey:'trainingEvent',
    items:()=>TRAINING_EVENTS_POOL.map(e=>({id:e.id,title:(e.icon?e.icon+' ':'')+e.title})),
    canLaunch:()=>devIsClassic()&&G.screen==='training'&&G.trainingBlock&&!G.trainingBlockApplied?null:'Necesita estar en Entreno con un bloque elegido y aún sin aplicar (se aplica al empezar la primera carrera)',
    canArm:()=>devIsClassic()?null:'Necesita una partida de Clásico',
    launch:id=>{G.trainingEvent=TRAINING_EVENTS_POOL.find(e=>e.id===id);}},
  {id:'monthly',label:'Clásico · mensual',mode:'clasico',when:'ya',
    items:()=>MONTHLY_EVENTS_POOL.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>devIsClassic()&&G.gameMode!=='expres'?null:'Necesita Clásico: el balance de Exprés no enseña eventos mensuales',
    launch:id=>devLaunchMonthly(id)},
  {id:'coachMid',label:'Entrenador · en carrera',mode:'coach',when:'carrera',armKey:'coachMidEvent',
    items:()=>COACH_MID_RACE_EVENTS.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>G.coachAthlete&&G.coachRaceData&&G.screen==='coachRace'&&!G.coachRaceEventPending?null:'Necesita una carrera de Entrenador animándose (pantalla de carrera, sin otro evento abierto)',
    canArm:()=>G.coachAthlete?null:'Necesita un atleta de Entrenador',
    launch:id=>{
      // coach.js pausa la animación con esta misma asignación (startCoachRaceAnim)
      G.coachRaceEventPending=COACH_MID_RACE_EVENTS.find(e=>e.id===id);
      if(typeof clearCoachRaceTimer==='function')clearCoachRaceTimer();
    }},
  {id:'coachBetween',label:'Entrenador · entre carreras',mode:'coach',when:'ya',
    items:()=>COACH_BETWEEN_EVENTS.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>G.coachAthlete?null:'Necesita un atleta de Entrenador (usa «Ir a Entrenador»)',
    launch:id=>{G.coachPendingEvent=COACH_BETWEEN_EVENTS.find(e=>e.id===id);G.screen='coachEvent';}},
  {id:'club',label:'Club',mode:'club',when:'ya',
    items:()=>CLUB_EVENTS.map(e=>({id:e.id,title:e.title})),
    canLaunch:()=>G.clubModeData?null:'Necesita un club fundado (usa «Ir a Club»)',
    launch:id=>{G.clubModeData.pendingEvent=CLUB_EVENTS.find(e=>e.id===id);G.screen='clubEvent';}},
  {id:'cn',label:'Canicross',mode:'canicross',when:'tramo',armKey:'cnEvent',provisional:true,
    items:()=>devCnPool().map(e=>({id:e.id,title:(e.text||e.id).replace('[DOG]','el perro').replace('[KM]','X')})),
    canArm:()=>G.dog?null:'Necesita un perro (usa «Ir a Canicross»)'},
];
function devEvtGroup(id){return DEV_EVENT_GROUPS.find(g=>g.id===id);}
function devEvtTitle(id){
  for(const g of DEV_EVENT_GROUPS){
    let it=null;try{it=g.items().find(e=>e.id===id);}catch(e){}
    if(it)return it.title+' ('+id+')';
  }
  return String(id);
}
function devEvtGroupOf(id){return DEV_EVENT_GROUPS.find(g=>{try{return g.items().some(e=>e.id===id);}catch(e){return false;}});}
// Título de un evento clásico de carrera: lo pone el catálogo de race.js (paso 9).
function devClassicMidTitle(id){
  const c=CLASSIC_MID_RACE_EVENTS[id];
  try{return c?c.build({doneKm:0,mental:50}).title:id;}catch(e){return id;}
}
function devClassicBuildReady(){return typeof CLASSIC_MID_RACE_EVENTS==='object';}

// Construye un evento de carrera por id. Lo usa checkMidRaceEvents() (race.js) al consumir
// «midRaceEvent» y el botón Lanzar. Marca las mismas banderas que la check*() que lo saca.
window.devBuildMidRaceEvent=id=>{
  if(!G.midRaceEventTriggered)G.midRaceEventTriggered={};
  const t=G.midRaceEventTriggered;
  let ev=EXPRESS_TIMED_EVENTS.find(e=>e.id===id);
  if(ev){t[id]=true;t._xpTimedCount=(t._xpTimedCount||0)+1;return {...ev};}
  ev=EXPRESS_NARRATIVE_EVENTS.find(e=>e.id===id);
  if(ev){t[id]=true;t._xpNarrCount=(t._xpNarrCount||0)+1;return {...ev};}
  // Clásicos: el catálogo de race.js. Se marca su `key`, que no siempre es el id.
  const c=CLASSIC_MID_RACE_EVENTS[id];
  if(c){t[c.key]=true;return c.build();}
  devLog('warn','No se puede construir el evento de carrera «'+id+'»');
  return null;
};
function devLaunchMid(id){
  const ev=devBuildMidRaceEvent(id);
  if(!ev)throw new Error('No se pudo construir «'+id+'»');
  G.midRaceEvent=ev;G.screen='midRaceEvent';
}
// P7 (v98): esto hacía G.monthlyEvents=[ev] y se llevaba por delante los pendientes, lo
// mismo que T26 corrigió en el juego. Ahora se añade delante (la pantalla de balance solo
// enseña el primero sin resolver) y los demás siguen ahí.
function devLaunchMonthly(id){
  const ev=MONTHLY_EVENTS_POOL.find(e=>e.id===id);if(!ev)throw new Error('Evento desconocido');
  if(ev.requiresClub&&(!G.club||G.club.id==='none')){
    G.club=CLUBS.find(c=>c.id!=='none')||CLUBS[0];
    showToast('DEV: unido a "'+G.club.name+'" para que el evento tenga sentido','#4a8a2a');
  }
  if(!Array.isArray(G.monthlyEvents))G.monthlyEvents=[];
  G.monthlyEvents.unshift({...ev,resolved:false});
  G.screen='seasonBalance';
}
window.devLaunchMonthly=devLaunchMonthly;
function devEvtCan(g,kind){
  if(kind==='launch'){
    if(!g.launch)return 'Este grupo no se lanza: se arma';
    if(g.ready&&!g.ready())return g.notReady;
    return g.canLaunch?g.canLaunch():null;
  }
  if(!g.armKey)return 'Este grupo no se arma: se lanza';
  if(g.ready&&!g.ready())return g.notReady;
  return g.canArm?g.canArm():null;
}
window.devEvtLaunch=(gid,id)=>{
  const g=devEvtGroup(gid);if(!g)return;
  const why=devEvtCan(g,'launch');
  if(why){devStatus(why,true);showToast('DEV: '+why,'#c07a10');return;}
  devAct('Lanzar evento '+devEvtTitle(id),()=>{DEV.forced[gid+':'+id]=true;g.launch(id);});
};
window.devEvtArm=(gid,id)=>{
  const g=devEvtGroup(gid);if(!g)return;
  const why=devEvtCan(g,'arm');
  if(why){devStatus(why,true);showToast('DEV: '+why,'#c07a10');return;}
  DEV.forced[gid+':'+id]=true;
  devArm(g.armKey,id);
  devStatus('Armado: '+devArmLabel(g.armKey,id));
  devPaint();
};

// Sistemas (§7.2)
window.devRaiseDebtCrisis=()=>devAct('Crisis de deuda en la próxima transición',()=>{G._debtCrisisPending=true;});
window.devClubOfferFromCoach=()=>devAct('Oferta de Club estando en Entrenador',()=>{
  // Lo mismo que checkClubOffer() (render-temporada.js) sin sus condiciones.
  G._coachClubOfferReceived=true;
  checkAndUnlockAchievements();
  G.screen='clubOffer';
  devStatus('Atajo de prueba: jugando, esta oferta hoy no llega desde Entrenador');
});

// ══ §7 CAMPOS DEL EDITOR ═══════════════════════════════════════════════
// Rutas verificadas contra freshState() (state.js) y los init de cada modo
// (initClubModeData, cnInitDog, el atleta de Entrenador).
const DEV_STATS=['resistencia','velocidad','subida','bajada','nutricion','mental'];
const DEV_FIELDS=[
  {sec:'eco',k:'money',label:'Dinero',type:'num',min:0},
  {sec:'eco',k:'debt',label:'Deuda',type:'num',min:0},
  {sec:'eco',k:'debtSeasons',label:'Temporadas con deuda',type:'num',min:0},
  {sec:'eco',k:'forcedFullTime',label:'Jornada forzosa por deuda',type:'bool'},
  {sec:'tiempo',k:'year',label:'Año',type:'num',min:1},
  {sec:'tiempo',k:'currentQuarter',label:'Trimestre',type:'num',min:1,max:4},
  {sec:'dif',k:'gameMode',label:'Dificultad',type:'sel',opts:DEV_CLASSIC_MODES,warn:'No pasa por la pantalla de selección; los multiplicadores cambian desde ya'},
  ...DEV_STATS.map(s=>({sec:'runner',k:'runner.stats.'+s,label:s,type:'num',min:0,max:100})),
  {sec:'runner',k:'runner.energy',label:'Energía',type:'num',min:0,max:100},
  {sec:'runner',k:'runner.hydration',label:'Hidratación',type:'num',min:0,max:100},
  {sec:'runner',k:'runner.legs',label:'Piernas',type:'num',min:0,max:100},
  {sec:'runner',k:'runner.age',label:'Edad',type:'num',min:14,max:80,cond:()=>G.runner&&G.runner.age!=null},
  {sec:'fama',k:'ranking',label:'Ranking',type:'num',min:1,max:999},
  {sec:'fama',k:'specRanking',label:'Ranking de especialidad',type:'num',min:1,max:999},
  {sec:'fama',k:'followers',label:'Seguidores',type:'num',min:0},
  {sec:'coach',k:'coachReputation',label:'Reputación',type:'num',min:0,max:100},
  {sec:'coach',k:'coachSeason',label:'Temporada',type:'num',min:1},
  {sec:'coach',k:'coachTrust',label:'Confianza',type:'num',min:0,max:100},
  ...DEV_STATS.map(s=>({sec:'coach',k:'coachAthlete.currentStats.'+s,label:'Atleta · '+s,type:'num',min:0,max:100,
    cond:()=>!!(G.coachAthlete&&G.coachAthlete.currentStats&&G.coachAthlete.currentStats[s]!==undefined)})),
  {sec:'club',k:'clubModeData.reputacion',label:'Reputación',type:'num',min:0,max:100},
  {sec:'club',k:'clubModeData.temporada',label:'Temporada',type:'num',min:1},
  {sec:'club',k:'clubModeData.presupuesto',label:'Presupuesto',type:'num'},
  {sec:'club',k:'clubModeData.socios',label:'Socios',type:'num',min:3},
  {sec:'club',k:'clubModeData.cohesion',label:'Cohesión',type:'num',min:0,max:100},
  {sec:'club',k:'clubModeData.redSeasons',label:'Temporadas en rojo',type:'num',min:0,max:()=>CLUB_RED_SEASONS_MAX},
  {sec:'cn',k:'cnMoney',label:'Dinero',type:'num'},
  {sec:'cn',k:'cnSeason',label:'Temporada',type:'num',min:1},
  {sec:'cn',k:'dog.speed',label:'Perro · velocidad',type:'num',min:0,max:100},
  {sec:'cn',k:'dog.stamina',label:'Perro · resistencia',type:'num',min:0,max:100},
  {sec:'cn',k:'dog.bond',label:'Perro · vínculo',type:'num',min:0,max:100},
  {sec:'cn',k:'dog.health',label:'Perro · salud',type:'num',min:0,max:100},
  {sec:'cn',k:'dog.age',label:'Perro · edad',type:'num',min:0,cond:()=>G.dog&&G.dog.age!=null},
  {sec:'vida',k:'carreraVida',label:'Carrera de Vida',type:'bool'},
  {sec:'vida',k:'lifecyclePhase',label:'Fase',type:'sel',opts:['runner','overlap','coach','club'],warn:'No lanza las pantallas de transición'},
  // Salud (se pintan en su pestaña, con el mismo mecanismo)
  {sec:'salud-runner',k:'bodyLoad',label:'Carga corporal',type:'num',min:0,max:100},
  {sec:'salud-coach',k:'coachBodyLoad',label:'Carga del atleta',type:'num',min:0,max:100},
  {sec:'salud-cn',k:'dog.health',label:'Salud del perro',type:'num',min:0,max:100,id:'dog.health#salud'},
];
function devFieldId(f){return f.id||f.k;}
function devGetPath(obj,path){
  let o=obj;
  for(const p of String(path).split('.')){if(o==null)return undefined;o=o[p];}
  return o;
}
function devSetPath(obj,path,v){
  const ps=String(path).split('.');let o=obj;
  for(let i=0;i<ps.length-1;i++){if(o[ps[i]]==null)throw new Error('No existe '+ps.slice(0,i+1).join('.'));o=o[ps[i]];}
  o[ps[ps.length-1]]=v;
}
function devFieldRange(f){
  const mx=typeof f.max==='function'?f.max():f.max;
  if(f.min!=null&&mx!=null)return f.min+'–'+mx;
  if(f.min!=null)return '≥ '+f.min;
  if(mx!=null)return '≤ '+mx;
  return '';
}
// Valida y recorta. Devuelve {v} o {error}.
function devFieldParse(f,raw){
  if(f.type==='bool')return {v:raw==='true'||raw===true};
  if(f.type==='sel')return f.opts.includes(raw)?{v:raw}:{error:'Valor no permitido'};
  const s=String(raw).trim().replace(',','.');
  if(s===''||!Number.isFinite(Number(s)))return {error:'No es un número'};
  let n=Number(s);
  const mx=typeof f.max==='function'?f.max():f.max;
  if(f.min!=null)n=Math.max(f.min,n);
  if(mx!=null)n=Math.min(mx,n);
  return {v:n};
}

// ══ §8 INTERFAZ: CARCASA, PINTADO, ANCLAJE, BUSCADOR ═════════════════════
// Colores hex (el proyecto no usa variables CSS para esto), objetivos táctiles de 40 px y
// nada que dependa del hover.
const DEV_CSS=`
#dev-btn{position:fixed;top:8px;right:8px;z-index:9999;min-height:40px;padding:0 14px;border:none;border-radius:20px;background:#1a1a1a;color:#fff;font:700 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25)}
#dev-btn.armed{background:#c07a10}
body.dev-open #dev-btn{display:none}
#dev-btn .dev-badge{display:inline-block;min-width:18px;height:18px;line-height:18px;margin-left:6px;padding:0 5px;border-radius:9px;background:#c0392b;color:#fff;font-size:11px;text-align:center}
#dev-drawer{display:none;position:fixed;z-index:9990;background:#fff;color:#1a1a1a;box-shadow:-6px 0 28px rgba(0,0,0,.18);flex-direction:column;font:13px/1.45 -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;text-align:left}
#dev-drawer.open{display:flex}
#dev-drawer.side{top:0;right:0;bottom:0;width:400px;max-width:100vw}
#dev-drawer.bottom{left:0;right:0;bottom:0;height:60vh;border-radius:14px 14px 0 0;box-shadow:0 -6px 28px rgba(0,0,0,.18)}
#dev-drawer *{box-sizing:border-box}
.dev-resize{position:absolute;left:-5px;top:0;bottom:0;width:10px;cursor:ew-resize;touch-action:none;z-index:2}
#dev-drawer.bottom .dev-resize,#dev-drawer.side .dev-grip{display:none}
.dev-grip{display:flex;justify-content:center;align-items:center;min-height:22px;cursor:ns-resize;touch-action:none;flex-shrink:0}
.dev-grip span{width:44px;height:5px;border-radius:3px;background:#d0cec8}
.dev-top{flex-shrink:0;border-bottom:1px solid #e8e6e0;padding:8px 12px 0}
.dev-headrow{display:flex;align-items:flex-start;gap:6px}
.dev-ctx{flex:1;min-width:0;font-size:12px;color:#555;line-height:1.35}
.dev-ctx b{color:#1a1a1a}
.dev-ctx .dev-flag{display:inline-block;margin:2px 4px 0 0;padding:0 6px;border-radius:8px;background:#fbe5e2;color:#c0392b;font-size:11px;font-weight:700}
.dev-hbtn{min-width:40px;min-height:40px;border:1px solid #e0dfd8;border-radius:8px;background:#fff;font-size:16px;cursor:pointer;flex-shrink:0;padding:0 6px}
.dev-status{font-size:12px;color:#2d7a2d;margin:4px 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dev-status.err{color:#c0392b}
.dev-strip{display:flex;gap:6px;overflow-x:auto;padding:3px 0;align-items:center}
.dev-strip:empty{display:none}
.dev-pill{display:inline-flex;align-items:center;gap:4px;flex-shrink:0;max-width:280px;min-height:30px;padding:2px 4px 2px 9px;border-radius:15px;font-size:11px;font-weight:600;white-space:nowrap}
.dev-pill span.t{overflow:hidden;text-overflow:ellipsis}
.dev-pill button{border:none;background:rgba(0,0,0,.08);border-radius:50%;width:24px;height:24px;cursor:pointer;font-size:11px;flex-shrink:0}
.dev-watch{background:#f0ede8;color:#333}
.dev-watch input{width:90px;min-height:28px;border:1px dashed #cfccc4;border-radius:14px;padding:0 8px;font-size:11px;background:#fff}
.dev-search{position:relative;margin:4px 0}
.dev-search input{width:100%;min-height:36px;border:1px solid #e0dfd8;border-radius:8px;padding:0 10px;font-size:13px}
.dev-results{position:absolute;left:0;right:0;top:100%;z-index:5;background:#fff;border:1px solid #e0dfd8;border-radius:8px;box-shadow:0 6px 18px rgba(0,0,0,.12);max-height:260px;overflow:auto}
.dev-results button{display:block;width:100%;text-align:left;min-height:40px;border:none;border-bottom:1px solid #f0ede8;background:#fff;padding:6px 10px;font-size:13px;cursor:pointer}
.dev-results small{color:#888}
.dev-tabs{display:flex;gap:2px;overflow-x:auto;margin:4px -12px 0;padding:0 8px}
.dev-tab{flex-shrink:0;min-height:40px;padding:0 10px;border:none;border-bottom:2px solid transparent;background:none;font-size:12px;font-weight:600;color:#888;cursor:pointer;white-space:nowrap}
.dev-tab.on{color:#1a1a1a;border-bottom-color:#1a1a1a}
.dev-tab .dev-badge{display:inline-block;min-width:16px;height:16px;line-height:16px;margin-left:4px;padding:0 4px;border-radius:8px;background:#c0392b;color:#fff;font-size:10px}
#dev-body{flex:1;overflow:auto;padding:10px 12px 16px;-webkit-overflow-scrolling:touch}
.dev-legend{flex-shrink:0;display:flex;gap:6px;overflow-x:auto;padding:6px 12px;border-top:1px solid #e8e6e0;background:#fafaf8}
.dev-when{display:inline-block;padding:0 6px;border-radius:8px;font-size:10px;font-weight:700;white-space:nowrap;vertical-align:middle;line-height:17px}
.dev-tabhelp{font-size:12px;color:#777;margin-bottom:8px}
.dev-sec{border:1px solid #e8e6e0;border-radius:10px;margin-bottom:8px;background:#fff}
.dev-sec>summary{list-style:none;cursor:pointer;min-height:42px;display:flex;align-items:center;gap:6px;padding:6px 10px;font-weight:700;font-size:13px}
.dev-sec>summary::-webkit-details-marker{display:none}
.dev-sec>summary::before{content:'▸';color:#aaa;font-size:11px}
.dev-sec[open]>summary::before{content:'▾'}
.dev-sec.dev-flash{box-shadow:0 0 0 3px #f5c542}
.dev-i{margin-left:auto;min-width:32px;min-height:32px;border:1px solid #e0dfd8;border-radius:50%;background:#fafaf8;color:#888;font-size:12px;cursor:pointer}
.dev-sec-b{padding:2px 10px 10px}
.dev-help{font-size:12px;color:#555;background:#f5f4f0;border-radius:8px;padding:6px 9px;margin:0 10px 6px}
.dev-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;align-items:center}
.dev-b{min-height:40px;padding:4px 10px;border:1px solid #d6d3cb;border-radius:8px;background:#fff;color:#1a1a1a;font-size:13px;cursor:pointer;text-align:left}
.dev-b:active{background:#f0ede8}
.dev-b.dev-on{background:#c0392b;border-color:#c0392b;color:#fff}
.dev-b.dev-sel{background:#1a1a1a;border-color:#1a1a1a;color:#fff}
.dev-b.dev-danger{border-color:#e7b7b1;color:#c0392b}
.dev-b.dev-good{border-color:#b9d7ad;color:#2d5a1a}
.dev-b.dev-big{width:100%;font-size:15px;font-weight:700;text-align:center;min-height:48px}
.dev-b.dev-sm{min-height:34px;padding:2px 8px;font-size:12px}
.dev-in{min-height:40px;border:1px solid #d6d3cb;border-radius:8px;padding:0 8px;font-size:13px;background:#fff;color:#1a1a1a;min-width:0}
.dev-in.dirty{background:#fff7cc;border-color:#e5c34a}
.dev-n{width:72px}
.dev-note{font-size:12px;color:#777;margin:4px 0}
.dev-warn{font-size:12px;color:#a8660a;margin:2px 0}
.dev-errtxt{font-size:12px;color:#c0392b}
.dev-empty{font-size:12px;color:#777;background:#fafaf8;border:1px dashed #e0dfd8;border-radius:8px;padding:8px}
.dev-f{display:grid;grid-template-columns:minmax(90px,1fr) minmax(70px,1.2fr) auto auto;gap:6px;align-items:center;margin:5px 0}
.dev-f label{font-size:12px;color:#555;overflow:hidden;text-overflow:ellipsis}
.dev-f .dev-range{grid-column:2/5;font-size:11px;color:#aaa;margin-top:-4px}
.dev-f .dev-warn,.dev-f .dev-ferr{grid-column:1/5}
.dev-ferr{font-size:12px;color:#c0392b}
.dev-ferr:empty{display:none}
.dev-tbl{width:100%;border-collapse:collapse;font-size:12px}
.dev-tbl td,.dev-tbl th{padding:3px 4px;border-bottom:1px solid #f0ede8;text-align:left;vertical-align:top}
.dev-tbl th{color:#888;font-weight:600}
.dev-tbl .r{text-align:right}
.dev-tbl tr.me td{font-weight:700;background:#fef9ec}
.dev-scrollx{overflow-x:auto}
.dev-list{max-height:none}
.dev-ev{display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid #f3f1ec}
.dev-ev .t{flex:1;min-width:0;font-size:12px}
.dev-ev .t small{color:#999}
.dev-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#e0dfd8;flex-shrink:0}
.dev-dot.seen{background:#4a8a2a}
.dev-bar{height:6px;background:#f0ede8;border-radius:3px;overflow:hidden;margin:3px 0}
.dev-bar i{display:block;height:100%;background:#4a8a2a}
.dev-mono{font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dev-ta{width:100%;min-height:90px;border:1px solid #d6d3cb;border-radius:8px;padding:6px 8px;font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dev-log{font:12px/1.45 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dev-line{display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f3f1ec;align-items:flex-start}
.dev-line .h{color:#aaa;flex-shrink:0}
.dev-line .m{flex:1;min-width:0;white-space:pre-wrap;word-break:break-word}
.dev-line.error .m{color:#c0392b}.dev-line.warn .m{color:#a8660a}.dev-line.log .m{color:#555}.dev-line.dev .m{color:#2f6fb5}.dev-line.repl .m{color:#1a1a1a}
.dev-line .n{flex-shrink:0;background:#e0dfd8;border-radius:8px;padding:0 5px;font-size:10px}
.dev-repl{position:relative;display:flex;gap:6px;align-items:flex-start;margin-top:6px}
.dev-repl .p{font:16px ui-monospace,Menlo,monospace;color:#2f6fb5;padding-top:8px}
.dev-repl textarea{flex:1;min-height:44px;border:1px solid #d6d3cb;border-radius:8px;padding:8px;font:13px/1.4 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;resize:vertical}
.dev-ac{position:absolute;left:22px;right:80px;bottom:100%;background:#fff;border:1px solid #d6d3cb;border-radius:8px;box-shadow:0 -4px 14px rgba(0,0,0,.1);z-index:6}
.dev-ac button{display:block;width:100%;text-align:left;min-height:34px;border:none;background:#fff;padding:2px 10px;font:12px ui-monospace,Menlo,monospace;cursor:pointer}
.dev-ac button.on{background:#e3eefa}
.dev-tree{font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.dev-tree details{margin-left:12px}
.dev-tree summary{cursor:pointer;list-style:none;min-height:24px}
.dev-tree summary::-webkit-details-marker{display:none}
.dev-tree .k{color:#6b3fa0}.dev-tree .s{color:#2d7a2d}.dev-tree .num{color:#2f6fb5}.dev-tree .fn{color:#a8660a}.dev-tree .nul{color:#aaa}
.dev-tree .leaf{margin-left:12px;min-height:24px}
.dev-tree .tb{border:none;background:#f0ede8;border-radius:6px;font-size:10px;padding:1px 5px;margin-left:4px;cursor:pointer;min-height:22px}
.dev-chk{display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #f3f1ec;font-size:12px}
.dev-chk input{width:22px;height:22px;flex-shrink:0}
.dev-chk .t{flex:1;min-width:0}
.dev-chk details{font-size:11px;color:#777}
`;

function $d(id){return document.getElementById(id);}
function devIsOpen(){return !!DEV.ui.drawer;}

// Botones del panel: cada pintado registra sus funciones y el onclick las llama por
// índice. Así no hay que meter comillas ni ids dentro de los atributos.
const DEV_H={};
window.devH=(r,i,el)=>{
  const f=(DEV_H[r]||[])[i];
  if(!f)return;
  try{f(el);}catch(e){devLog('error','Botón del panel: '+e.message,[e]);devStatus('Error: '+e.message,true);}
};
function devHandler(fn){const r=DEV._reg||'b';(DEV_H[r]=DEV_H[r]||[]).push(fn);return `devH('${r}',${DEV_H[r].length-1},this)`;}
function devPlain(html){return String(html).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();}
function devBtn(label,fn,o={}){
  const h=devHandler(el=>{
    const why=o.need&&o.need();
    if(why){devStatus(why,true);showToast('DEV: '+why,'#c07a10');return;}
    if(o.confirm&&!confirm(typeof o.confirm==='function'?o.confirm():o.confirm))return;
    if(o.raw)return fn(el);
    devAct(o.act||devPlain(label),()=>fn(el),{render:o.render!==false});
  });
  return `<button type="button" class="dev-b${o.cls?' '+o.cls:''}"${o.title?` title="${esc(o.title)}"`:''} onclick="${h}">${label}${o.when?' '+devWhen(o.when):''}</button>`;
}
const DEV_WHEN={
  ya:['Ya','#2d7a2d','#e6f3e1'],
  tramo:['Próximo tramo','#2f6fb5','#e3eefa'],
  carrera:['Próxima carrera','#a8660a','#fbefd9'],
  temporada:['Fin de temporada','#6b3fa0','#efe6f8'],
  activo:['Mientras esté activo','#c0392b','#fbe5e2'],
};
function devWhen(k){const w=DEV_WHEN[k];return w?`<span class="dev-when" style="color:${w[1]};background:${w[2]}">${w[0]}</span>`:'';}
function devNum(id,def){const el=$d(id);const n=el?Number(el.value):NaN;return Number.isFinite(n)?n:def;}
function devVal(id){const el=$d(id);return el?el.value:'';}

// Secciones plegables. La del modo activo va abierta salvo que el usuario la haya dejado
// de otra forma (DEV.ui.open).
function devSec(id,title,body,o={}){
  const isOpen=(id in DEV.ui.open)?DEV.ui.open[id]:!!o.open;
  const info=DEV.ui.help&&o.help?`<button type="button" class="dev-i" onclick="devInfoToggle(event,'${id}')" title="Ayuda">ⓘ</button>`:'';
  const helpTxt=DEV.ui.help&&o.help&&DEV.ui.info[id]?`<div class="dev-help">${o.help}</div>`:'';
  return `<details class="dev-sec" id="dev-sec-${id}" data-sec="${id}" data-def="${o.open?1:0}"${isOpen?' open':''} ontoggle="devSecToggle(this)"><summary>${title}${o.badge||''}${info}</summary>${helpTxt}<div class="dev-sec-b">${isOpen||o.eager?body():'<div class="dev-note">…</div>'}</div></details>`;
}
window.devSecToggle=el=>{
  const id=el.dataset.sec;if(!id)return;
  // El navegador también dispara «toggle» al insertar un <details> abierto: eso no es
  // una decisión del usuario y no se guarda.
  const was=(id in DEV.ui.open)?DEV.ui.open[id]:el.dataset.def==='1';
  if(was===el.open)return;
  DEV.ui.open[id]=el.open;devSaveUI();
  if(el.open)devPaintBody();   // el cuerpo de una sección cerrada no se pinta hasta abrirla
};
window.devInfoToggle=(ev,id)=>{
  ev.preventDefault();ev.stopPropagation();
  DEV.ui.info[id]=!DEV.ui.info[id];devSaveUI();devPaintBody();
};

// ── Cabecera de contexto ──
function devCtxHtml(){
  const m=G.gameMode;const parts=[];
  parts.push('<b>'+esc(modeLabelFull(m))+'</b>');
  if(G.carreraVida)parts.push('Vida: '+esc(PHASE_LABEL[G.lifecyclePhase]||G.lifecyclePhase||''));
  const am=devActiveMode();
  if(am==='clasico'){
    parts.push('año '+G.year+' · T'+G.currentQuarter);
    const races=G.selectedRaces||[];
    if(races.length)parts.push('carrera '+Math.min(races.length,(G.currentRaceIdx||0)+1)+'/'+races.length);
    if(devClassicRace())parts.push('tramo '+Math.min((G.seg||0)+1,curSegs().length)+'/'+curSegs().length);
  }else if(am==='coach')parts.push('temporada '+(G.coachSeason||1)+(G.coachRaceData?' · en carrera':''));
  else if(am==='club'&&G.clubModeData)parts.push('temporada '+G.clubModeData.temporada);
  else if(am==='canicross')parts.push('temporada '+(G.cnSeason||1)+(DEV_MODES.canicross.inRace()?' · tramo '+((G.cnRaceState.currentSeg||0)+1)+'/'+G.cnRaceState.numSegs:''));
  parts.push('pantalla <b>'+esc(String(G.screen))+'</b>');
  let flags='';
  if(DEV.seed!=null)flags+=`<span class="dev-flag">Semilla ${DEV.seed}</span>`;
  if(DEV.noAutosave)flags+='<span class="dev-flag">Sin autoguardado</span>';
  if(DEV.storageFull)flags+='<span class="dev-flag">Almacenamiento lleno</span>';
  return parts.join(' · ')+(flags?'<br>'+flags:'');
}

// ── Franja de armados y modos dios ──
function devArmedHtml(){
  let h='';
  for(const [k,v] of Object.entries(DEV.armed)){
    const w=DEV_WHEN[(DEV_ARMABLE[k]||{}).when]||DEV_WHEN.carrera;
    h+=`<span class="dev-pill" style="color:${w[1]};background:${w[2]}" title="${esc(w[0])}"><span class="t">⏳ ${esc(devArmLabel(k,v))}</span><button onclick="devDisarm('${k}')" title="Cancelar">✕</button></span>`;
  }
  const lbl={clasico:'Clásico y Exprés',coach:'Entrenador',club:'Club',cn:'Canicross'};
  for(const [m,on] of Object.entries(DEV.god)){
    if(!on)continue;
    h+=`<span class="dev-pill" style="color:#c0392b;background:#fbe5e2"><span class="t">😇 Modo dios · ${lbl[m]}</span><button onclick="devToggleGod('${m}')" title="Quitar">✕</button></span>`;
  }
  if(DEV.noAutosave)h+=`<span class="dev-pill" style="color:#c0392b;background:#fbe5e2"><span class="t">Sin autoguardado</span><button onclick="devToggleNoAutosave()">✕</button></span>`;
  if(DEV.storageFull)h+=`<span class="dev-pill" style="color:#c0392b;background:#fbe5e2"><span class="t">Almacenamiento lleno</span><button onclick="devToggleStorageFull()">✕</button></span>`;
  return h;
}

// ── Valores vigilados ──
function devWatchDefaults(){
  const am=devActiveMode();
  if(am==='coach')return ['coachTrust','coachBodyLoad'];
  if(am==='club')return ['clubModeData.presupuesto','clubModeData.cohesion'];
  if(am==='canicross')return ['cnMoney','dog.bond'];
  return ['money','bodyLoad','runner.stats.mental'];
}
function devWatchList(){
  const out=devWatchDefaults().filter(p=>!DEV.watch.removed.includes(p));
  for(const p of DEV.watch.added)if(!out.includes(p))out.push(p);
  return out;
}
function devWatchHtml(){
  const h=devWatchList().map(p=>{
    let v;try{v=devGetPath(G,p);}catch(e){v=undefined;}
    const txt=v!==null&&typeof v==='object'?(Array.isArray(v)?'Array('+v.length+')':'{…}'):devFmt(v);
    return `<span class="dev-pill dev-watch"><span class="t">${esc(p)}: <b>${esc(txt)}</b></span><button onclick="devUnwatch('${esc(p)}')" title="Dejar de vigilar">✕</button></span>`;
  }).join('');
  return h+`<input placeholder="+ ruta" title="Escribe una ruta de G y pulsa Enter" onkeydown="if(event.key==='Enter'){devWatchAdd(this.value);this.value='';}">`;
}
window.devWatchAdd=p=>{
  p=String(p||'').trim().replace(/^G\./,'');
  if(!p||!/^[\w$.]+$/.test(p))return;
  DEV.watch.removed=DEV.watch.removed.filter(x=>x!==p);
  if(!devWatchList().includes(p))DEV.watch.added.push(p);
  devLSSet('dev_watch',DEV.watch);devRefreshChrome();devStatus('Vigilando '+p);
};
window.devUnwatch=p=>{
  DEV.watch.added=DEV.watch.added.filter(x=>x!==p);
  if(devWatchDefaults().includes(p)&&!DEV.watch.removed.includes(p))DEV.watch.removed.push(p);
  devLSSet('dev_watch',DEV.watch);devRefreshChrome();
};

// ── Pestañas ──
const DEV_TABS=[
  {id:'partida',icon:'🎮',label:'Partida',help:'Lo que afecta a la partida del modo en el que estás: carrera, temporada, saltos y recetas de prueba.',paint:()=>devTabPartida()},
  {id:'eventos',icon:'⚡',label:'Eventos',help:'Todos los eventos del juego. «Lanzar» lo muestra ya; «Armar» hace que salga en cuanto el juego llegue a ese momento.',paint:()=>devTabEventos()},
  {id:'salud',icon:'🩹',label:'Salud',help:'Lesiones, secuelas y carga, separadas por modo. Cada modo tiene su propio sistema.',paint:()=>devTabSalud()},
  {id:'estado',icon:'✏️',label:'Estado',help:'Cambia cualquier valor. Nada se aplica hasta que pulsas Aplicar o Enter.',paint:()=>devTabEstado()},
  {id:'logros',icon:'🏆',label:'Logros',help:'Marca, desmarca y comprueba logros. Desmarcar también lo quita del trofeo global.',paint:()=>devTabLogros()},
  {id:'partidas',icon:'💾',label:'Partidas',help:'Instantáneas, JSON de la partida, guardado y semilla aleatoria.',paint:()=>devTabPartidas()},
  {id:'diagnostico',icon:'🔬',label:'Diagnóstico',help:'Para cazar bugs: qué ha pasado, qué no has visto nunca y qué no cuadra.',paint:()=>devTabDiagnostico()},
  {id:'consola',icon:'›_',label:'Consola',help:'Como la consola de F12: ejecuta código, te responde y recoge los errores del juego.',paint:()=>devTabConsola()},
];
function devTabsHtml(){
  return DEV_TABS.map(t=>`<button type="button" class="dev-tab${DEV.ui.tab===t.id?' on':''}" onclick="devSetTab('${t.id}')">${t.icon} ${t.label}${t.id==='consola'&&DEV.errNew?`<span class="dev-badge">${DEV.errNew}</span>`:''}${t.id==='diagnostico'&&(DEV.watchdog.length+DEV.checks.filter(c=>c.active).length)?`<span class="dev-badge">${DEV.watchdog.length+DEV.checks.filter(c=>c.active).length}</span>`:''}</button>`).join('');
}
window.devSetTab=id=>{
  DEV.ui.tab=id;devSaveUI();
  if(id==='consola')DEV.errNew=0;
  devRefreshChrome();devPaintBody(true);
};

// ── Pintado ──
let DEV_RAF=0;
// render() del juego llama a esto en cada pasada. Se agrupa en un frame, así se pinta
// después de que la pantalla del juego termine y una ráfaga de renders pinta una vez.
window.renderDevOverlay=()=>{
  if(!DEV.mounted||DEV_RAF)return;
  DEV_RAF=requestAnimationFrame(()=>{DEV_RAF=0;devPaint();});
};
function devPaint(){
  if(!DEV.mounted)return;
  devRefreshChrome();
  if(!devIsOpen())return;
  if(DEV.ui.tab==='consola'){devConsoleLive();return;}
  devPaintBody();
}
// No se repinta el cuerpo mientras escribes en un campo: se perdería el foco. Queda
// pendiente para la siguiente pasada.
function devPaintBody(force){
  if(!DEV.mounted)return;
  const body=$d('dev-body');if(!body)return;
  const ae=document.activeElement;
  if(!force&&ae&&body.contains(ae)&&/^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)){DEV._pendingBody=true;return;}
  DEV._pendingBody=false;
  const tab=DEV_TABS.find(t=>t.id===DEV.ui.tab)||DEV_TABS[0];
  const sc=body.scrollTop;
  const prevReg=DEV._reg;DEV._reg='b';DEV_H.b=[];
  let html;
  try{html=tab.paint();}
  catch(e){html=`<div class="dev-errtxt">Error al pintar la pestaña: ${esc(e.message)}</div>`;devLog('error','Pintando '+tab.label+': '+e.message,[e]);}
  DEV._reg=prevReg;
  body.innerHTML=(DEV.ui.help?`<div class="dev-tabhelp">${tab.help}</div>`:'')+html;
  if(tab.id==='consola')devConsoleMounted();
  body.scrollTop=force&&DEV._scrollTo==null?0:sc;
}
// Solo se toca el DOM si el HTML cambia: la franja de pestañas conserva su desplazamiento.
function devSetHtml(el,html){if(el&&el._devH!==html){el.innerHTML=html;el._devH=html;}}
function devRefreshBadge(){
  const btn=$d('dev-btn');if(!btn)return;
  const busy=Object.keys(DEV.armed).length||Object.values(DEV.god).some(Boolean)||DEV.noAutosave||DEV.storageFull||DEV.seed!=null;
  btn.className=busy?'armed':'';
  devSetHtml(btn,'🛠 DEV'+(DEV.errNew?`<span class="dev-badge">${DEV.errNew}</span>`:''));
  if(devIsOpen())devSetHtml($d('dev-tabs'),devTabsHtml());
}
function devRefreshChrome(){
  if(!DEV.mounted)return;
  devRefreshBadge();
  if(!devIsOpen())return;
  devSetHtml($d('dev-ctx'),devCtxHtml());
  devSetHtml($d('dev-armed'),devArmedHtml());
  const w=$d('dev-watchrow');
  if(w&&!w.contains(document.activeElement))devSetHtml(w,devWatchHtml());
  const hb=$d('dev-helpbtn');if(hb)hb.style.opacity=DEV.ui.help?'1':'.45';
}

function devShellHtml(){
  const legend=Object.keys(DEV_WHEN).map(k=>devWhen(k)).join('');
  return `
    <div class="dev-resize" id="dev-resize"></div>
    <div class="dev-grip" id="dev-grip"><span></span></div>
    <div class="dev-top">
      <div class="dev-headrow">
        <div class="dev-ctx" id="dev-ctx"></div>
        <button type="button" class="dev-hbtn" onclick="devUndo()" title="Deshacer la última acción del panel">↶</button>
        <button type="button" class="dev-hbtn" onclick="devCycleDock()" title="Anclaje: lateral o inferior">⇆</button>
        <button type="button" class="dev-hbtn" id="dev-helpbtn" onclick="devToggleHelp()" title="Mostrar u ocultar ayudas">?</button>
        <button type="button" class="dev-hbtn" onclick="devToggleDrawer(false)" title="Cerrar (Esc)">✕</button>
      </div>
      <div class="dev-status" id="dev-status">Panel listo · º abre y cierra</div>
      <div class="dev-strip" id="dev-armed"></div>
      <div class="dev-strip" id="dev-watchrow"></div>
      <div class="dev-search"><input id="dev-q" placeholder="🔍 Buscar sección o acción…" autocomplete="off" oninput="devSearch(this.value)" onkeydown="if(event.key==='Escape'){this.value='';devSearch('');}"><div class="dev-results" id="dev-results" hidden></div></div>
      <div class="dev-tabs" id="dev-tabs"></div>
    </div>
    <div id="dev-body"></div>
    <div class="dev-legend">${legend}</div>`;
}

// ── Abrir, cerrar y anclaje ──
window.devToggleDrawer=(force)=>{
  DEV.ui.drawer=typeof force==='boolean'?force:!DEV.ui.drawer;
  devSaveUI();devApplyDock();
  if(DEV.ui.drawer){if(DEV.ui.tab==='consola')DEV.errNew=0;devRefreshChrome();devPaintBody(true);}
  else devRefreshBadge();
};
function devDockMode(){
  const d=DEV.ui.dock;
  if(d==='side'||d==='bottom')return d;
  return window.innerWidth>=700?'side':'bottom';
}
function devApplyDock(){
  const dr=$d('dev-drawer');if(!dr)return;
  const mode=devDockMode();const open=devIsOpen();
  dr.className=(open?'open ':'')+mode;
  document.body.classList.toggle('dev-open',open);   // con el panel abierto, su ✕ sustituye al botón
  if(mode==='side'){
    DEV.ui.width=Math.max(360,Math.min(720,Number(DEV.ui.width)||400));
    dr.style.width=DEV.ui.width+'px';dr.style.height='';
    document.body.style.paddingBottom='';
  }else{
    const h=[35,60,90].includes(DEV.ui.sheet)?DEV.ui.sheet:60;
    dr.style.width='';dr.style.height=h+'vh';
    document.body.style.paddingBottom=open?'calc('+h+'vh + 20px)':'';
  }
}
window.devCycleDock=()=>{
  const cur=devDockMode();
  DEV.ui.dock=cur==='side'?'bottom':'side';
  devSaveUI();devApplyDock();devStatus('Anclaje: '+(DEV.ui.dock==='side'?'lateral':'inferior'));
};
window.devToggleHelp=()=>{DEV.ui.help=!DEV.ui.help;devSaveUI();devRefreshChrome();devPaintBody(true);};
function devWireResize(){
  const rz=$d('dev-resize'),grip=$d('dev-grip');
  if(rz)rz.addEventListener('pointerdown',e=>{
    e.preventDefault();rz.setPointerCapture(e.pointerId);
    const move=ev=>{DEV.ui.width=Math.max(360,Math.min(720,window.innerWidth-ev.clientX));devApplyDock();};
    const up=()=>{rz.removeEventListener('pointermove',move);rz.removeEventListener('pointerup',up);devSaveUI();};
    rz.addEventListener('pointermove',move);rz.addEventListener('pointerup',up);
  });
  if(grip)grip.addEventListener('pointerdown',e=>{
    e.preventDefault();grip.setPointerCapture(e.pointerId);
    const y0=e.clientY;let moved=false;
    const dr=$d('dev-drawer');
    const move=ev=>{
      if(Math.abs(ev.clientY-y0)>5)moved=true;
      if(!moved)return;
      const pct=Math.max(20,Math.min(95,(window.innerHeight-ev.clientY)/window.innerHeight*100));
      dr.style.height=pct+'vh';
    };
    const up=ev=>{
      grip.removeEventListener('pointermove',move);grip.removeEventListener('pointerup',up);
      if(!moved){DEV.ui.sheet=DEV.ui.sheet===35?60:DEV.ui.sheet===60?90:35;}
      else{
        const pct=(window.innerHeight-ev.clientY)/window.innerHeight*100;
        DEV.ui.sheet=[35,60,90].reduce((a,b)=>Math.abs(b-pct)<Math.abs(a-pct)?b:a,60);
      }
      devSaveUI();devApplyDock();
    };
    grip.addEventListener('pointermove',move);grip.addEventListener('pointerup',up);
  });
}

// ── Buscador global ──
// Índice de secciones con sus acciones y palabras clave. Al elegir, cambia de pestaña,
// abre la sección, baja hasta ella y la resalta.
const DEV_INDEX=[
  ['partida','race-clasico','Carrera en curso · Clásico/Exprés','ganar perder modo dios rivales tramo saltar reservas clima'],
  ['partida','race-coach','Carrera en curso · Entrenador','ganar perder modo dios'],
  ['partida','race-club','Carrera en curso · Club','modo dios simular'],
  ['partida','race-canicross','Carrera en curso · Canicross','ganar perder modo dios perro'],
  ['partida','season','Temporada','forzar fin simular temporadas trimestre'],
  ['partida','recipes','Recetas de prueba','receta preparar playtest casilla'],
  ['partida','jump','Ir a otro modo o pantalla','saltar salto libre pantalla clasico entrenador club canicross'],
  ['partida','vida','Carrera de Vida','oferta solapamiento retirada hazte entrenador club'],
  ['partida','p-coach','Entrenador · slots','slot atleta reputación abrir'],
  ['partida','p-club','Club · plantilla, objetivo y sponsors','fichar quitar corredor objetivo sponsors'],
  ['partida','p-eco','Clásico: economía y fama','sponsor romper contrato marca propia circuitos némesis retiradas invitaciones'],
  ['eventos','evt-mid','Eventos de carrera de Clásico','evento tormenta carrera lanzar armar'],
  ['eventos','evt-xpTimed','Exprés con contador','evento expres contador'],
  ['eventos','evt-xpNarr','Exprés narrativos','evento expres narrativo'],
  ['eventos','evt-between','Eventos entre carreras','evento entre carreras'],
  ['eventos','evt-training','Eventos de entreno','evento entrenamiento bloque'],
  ['eventos','evt-monthly','Eventos mensuales','evento mensual balance'],
  ['eventos','evt-coachMid','Entrenador en carrera','evento entrenador carrera'],
  ['eventos','evt-coachBetween','Entrenador entre carreras','evento entrenador'],
  ['eventos','evt-club','Eventos de Club','evento club'],
  ['eventos','evt-cn','Eventos de Canicross','evento perro canicross'],
  ['eventos','evt-sys','Sistemas','caída bajada condición del día clima crisis deuda oferta invitaciones retiradas'],
  ['eventos','evt-now','¿Qué puede salir ahora?','elegibles por qué no sale'],
  ['salud','h-runner','Salud · Corredor','lesión tendinitis rotura fractura secuela carga zona roja'],
  ['salud','h-coach','Salud · Atleta','lesión entrenador carga'],
  ['salud','h-cn','Salud · Perro','lesión almohadillas luxación salud'],
  ['salud','h-club','Salud · Club','abandono dnf'],
  ['estado','f-eco','Economía','dinero deuda jornada forzosa'],
  ['estado','f-tiempo','Tiempo','año trimestre'],
  ['estado','f-dif','Dificultad','modo dificultad'],
  ['estado','f-runner','Corredor','stats energía hidratación piernas edad'],
  ['estado','f-fama','Rankings y fama','ranking seguidores'],
  ['estado','f-coach','Entrenador (valores)','reputación confianza temporada atleta'],
  ['estado','f-club','Club (valores)','presupuesto socios cohesión rojo reputación'],
  ['estado','f-cn','Canicross (valores)','perro dinero temporada'],
  ['estado','f-vida','Carrera de Vida (valores)','fase'],
  ['estado','f-balance','Balance de la dificultad','inspector multiplicadores modecfg'],
  ['logros','a-list','Logros','desbloquear bloquear categoría vista previa comprobar'],
  ['partidas','s-snaps','Instantáneas','snapshot restaurar guardar'],
  ['partidas','s-json','JSON de la partida','exportar importar archivo descargar'],
  ['partidas','s-save','Guardado del juego','autoguardado almacenamiento lleno ranuras'],
  ['partidas','s-seed','Semilla aleatoria','semilla random reproducir'],
  ['partidas','s-report','Informe de bug','informe bug reporte'],
  ['diagnostico','d-diary','Diario de eventos','diario eventos opciones'],
  ['diagnostico','d-cov','Cobertura de eventos','cobertura vistos no vistos'],
  ['diagnostico','d-trail','Rastro de pantallas','rastro pantallas'],
  ['diagnostico','d-watchdog','Vigilante de pantallas','vigilante render estado'],
  ['diagnostico','d-checks','Comprobaciones en vivo','nan rangos comprobaciones'],
  ['diagnostico','d-break','Desgloses','desglose cuenta del año cierre club última carrera'],
  ['diagnostico','d-ach','Logros que deberían haber saltado','logros por qué no salta'],
  ['diagnostico','d-report','Informe de bug','informe bug'],
  ['consola','c-console','Consola','código eval repl errores'],
  ['consola','c-inspector','Inspector de G','inspector árbol G'],
];
window.devSearch=q=>{
  const box=$d('dev-results');if(!box)return;
  const s=String(q||'').trim().toLowerCase();
  if(!s){box.hidden=true;box.innerHTML='';return;}
  const norm=x=>x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const ns=norm(s);
  const hits=DEV_INDEX.filter(([,,t,kw])=>norm(t+' '+kw).includes(ns)).slice(0,12);
  box.hidden=false;
  box.innerHTML=hits.length?hits.map(([tab,sec,t])=>`<button type="button" onclick="devGoTo('${tab}','${sec}')">${esc(t)} <small>· ${esc((DEV_TABS.find(x=>x.id===tab)||{}).label||tab)}</small></button>`).join(''):'<div class="dev-note" style="padding:8px">Sin resultados</div>';
};
window.devGoTo=(tab,sec)=>{
  const q=$d('dev-q');if(q)q.value='';
  devSearch('');
  DEV.ui.open[sec]=true;devSaveUI();
  devSetTab(tab);
  const el=$d('dev-sec-'+sec);
  if(el){el.open=true;el.scrollIntoView({block:'start'});el.classList.add('dev-flash');setTimeout(()=>el.classList.remove('dev-flash'),1500);}
};

// ── Campos del editor (Estado y Salud) ──
function devFieldRow(f){
  if(f.cond&&!f.cond())return '';
  const id=devFieldId(f);
  let cur;try{cur=devGetPath(G,f.k);}catch(e){cur=undefined;}
  const dirty=id in DEV.dirty;
  const val=dirty?DEV.dirty[id]:(cur==null?'':cur);
  const attrs=`data-fid="${esc(id)}" onkeydown="devFieldKey(event,this)"`;
  let input;
  if(f.type==='bool'){
    input=`<select class="dev-in${dirty?' dirty':''}" ${attrs} onchange="devFieldInput(this)"><option value="true"${String(val)==='true'?' selected':''}>sí</option><option value="false"${String(val)!=='true'?' selected':''}>no</option></select>`;
  }else if(f.type==='sel'){
    const opts=f.opts.includes(val)?f.opts:[String(val),...f.opts];
    input=`<select class="dev-in${dirty?' dirty':''}" ${attrs} onchange="devFieldInput(this)">${opts.map(o=>`<option value="${esc(o)}"${o===String(val)?' selected':''}>${esc(o)}</option>`).join('')}</select>`;
  }else{
    input=`<input class="dev-in${dirty?' dirty':''}" type="text" inputmode="decimal" value="${esc(String(val))}" ${attrs} oninput="devFieldInput(this)">`;
  }
  return `<div class="dev-f"><label title="${esc(f.k)}">${esc(f.label)}</label>${input}<button type="button" class="dev-b dev-sm" onclick="devFieldApply('${esc(id)}')">Aplicar</button>${dirty?`<button type="button" class="dev-b dev-sm" onclick="devFieldCancel('${esc(id)}')" title="Descartar">✕</button>`:'<span></span>'}${devFieldRange(f)?`<span class="dev-range">${devFieldRange(f)}</span>`:''}${f.warn?`<div class="dev-warn">${f.warn}</div>`:''}<div class="dev-ferr" id="dev-ferr-${esc(id)}"></div></div>`;
}
function devFieldsOf(sec){return DEV_FIELDS.filter(f=>f.sec===sec);}
function devFieldsBlock(sec){
  const fs=devFieldsOf(sec);
  const rows=fs.map(devFieldRow).join('');
  const anyDirty=fs.some(f=>devFieldId(f) in DEV.dirty);
  return rows+(anyDirty?`<div class="dev-row"><button type="button" class="dev-b" onclick="devFieldsApplyAll('${sec}')">Aplicar todo</button><button type="button" class="dev-b" onclick="devFieldsDiscard('${sec}')">Descartar</button></div>`:'');
}
window.devFieldInput=el=>{
  const id=el.dataset.fid;if(!id)return;
  DEV.dirty[id]=el.value;el.classList.add('dirty');
  const er=$d('dev-ferr-'+id);if(er)er.textContent='';
};
window.devFieldKey=(ev,el)=>{
  if(ev.key==='Enter'){ev.preventDefault();devFieldInput(el);devFieldApply(el.dataset.fid);}
  else if(ev.key==='Escape'){ev.preventDefault();devFieldCancel(el.dataset.fid);}
};
function devFieldApplyOne(id){
  const f=DEV_FIELDS.find(x=>devFieldId(x)===id);if(!f)return false;
  const raw=id in DEV.dirty?DEV.dirty[id]:devGetPath(G,f.k);
  const p=devFieldParse(f,raw);
  if(p.error){const er=$d('dev-ferr-'+id);if(er)er.textContent=p.error+' — no se aplica';devStatus(f.label+': '+p.error,true);return false;}
  delete DEV.dirty[id];
  devSetPath(G,f.k,p.v);
  return true;
}
window.devFieldApply=id=>{
  const f=DEV_FIELDS.find(x=>devFieldId(x)===id);if(!f)return;
  const p=devFieldParse(f,id in DEV.dirty?DEV.dirty[id]:devGetPath(G,f.k));
  if(p.error){const er=$d('dev-ferr-'+id);if(er)er.textContent=p.error+' — no se aplica';devStatus(f.label+': '+p.error,true);return;}
  if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();
  devAct('Estado · '+f.label+' = '+p.v,()=>devFieldApplyOne(id));
};
window.devFieldCancel=id=>{delete DEV.dirty[id];if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();devPaintBody(true);};
window.devFieldsApplyAll=sec=>{
  const ids=devFieldsOf(sec).map(devFieldId).filter(id=>id in DEV.dirty);
  if(!ids.length)return;
  devAct('Estado · aplicar '+ids.length+' campo(s)',()=>{ids.forEach(devFieldApplyOne);});
};
window.devFieldsDiscard=sec=>{devFieldsOf(sec).forEach(f=>{delete DEV.dirty[devFieldId(f)];});devPaintBody(true);};

// ══ §9 PESTAÑAS ═══════════════════════════════════════════════════════
// ── 9.1 Partida ──
function devTabPartida(){
  const am=devActiveMode();
  let h='';
  h+=devSec('race-'+am,'🏁 Carrera en curso — '+DEV_MODES[am].label,()=>devRaceBody(am),{open:true,
    help:'Ganar y Perder terminan la carrera en curso por el camino real (fijan el tiempo o la posición y llaman a la función del juego). '+devHelpGod()});
  h+=devSec('season','📅 Temporada',()=>devSeasonBody(am),{open:true,
    help:'Resuelve N temporadas sin jugarlas, con un calendario elegido solo y tiempos aproximados. Mueve la economía como un cierre real. Útil para llegar lejos, no para medir el balance.'});
  h+=devSec('recipes','🧪 Recetas de prueba',()=>devRecipesBody(),{
    help:'Dejan la partida lista para comprobar una casilla del plan de playtest. Antes hacen una instantánea. Confirma siempre el hallazgo en una partida normal.'});
  h+=devSec('jump','🧭 Ir a otro modo o pantalla',()=>devJumpBody(),{
    help:'Cambia de pantalla sin pasar por el juego. Algunas necesitan contexto (una carrera, un club…) y pueden salir vacías o romperse.'});
  h+=devSec('vida','🌱 Carrera de Vida',()=>devVidaBody(),{open:!!G.carreraVida,
    help:'Ofertas y transiciones del arco narrativo. Pasan por las funciones reales salvo donde se avisa.'});
  if(am==='coach'||G.coachAthlete)h+=devSec('p-coach','📋 Entrenador · slots',()=>devCoachBody(),{open:am==='coach'});
  if(am==='club'||G.clubModeData)h+=devSec('p-club','🏕 Club · plantilla, objetivo y sponsors',()=>devClubBody(),{open:am==='club'});
  if(am==='clasico')h+=devSec('p-eco','💶 Clásico: economía y fama',()=>devEcoBody(),{open:false});
  for(const id of Object.keys(DEV_MODES)){
    if(id===am)continue;
    h+=devSec('race-'+id,'🏁 Carrera en curso — '+DEV_MODES[id].label,()=>devRaceBody(id),{open:false});
  }
  return h;
}
function devHelpGod(){return 'Modo dios: mientras esté activo, toda carrera de este modo que termines se resuelve en victoria. En Clásico también afecta a Exprés, porque comparten el final de carrera.';}
function devRaceBody(mid){
  const M=DEV_MODES[mid];
  let b='';
  if(M.provisional)b+='<div class="dev-warn">Provisional: Canicross se reescribe (Diseno-Canicross).</div>';
  if(M.has&&!M.has())b+=`<div class="dev-empty">${M.missing}. ${devBtn('Ir a '+M.label,()=>M.jump(),{when:'ya'})}</div>`;
  if(M.inRace){
    b+=`<div class="dev-row">${devBtn('🏆 Ganar ya',()=>M.win(),{when:'ya',cls:'dev-good',need:()=>M.inRace()?null:M.needsRace})}${devBtn('🥴 Perder ya',()=>M.lose(),{when:'ya',cls:'dev-danger',need:()=>M.inRace()?null:M.needsRace})}</div>`;
  }else b+=`<div class="dev-note">${M.noRace}</div>`;
  const on=DEV.god[M.god];
  b+=`<div class="dev-row">${devBtn(on?'😇 Modo dios activo · quitar':'👑 Modo dios ('+M.godLabel+')',()=>devToggleGod(M.god),{when:'activo',raw:true,cls:on?'dev-on':''})}</div>`;
  if(mid==='clasico')b+=devClassicRaceExtras();
  return b;
}
function devClassicRaceExtras(){
  if(!devClassicRace())return '<div class="dev-note">Sin carrera en curso: aquí salen los rivales en vivo, el salto de tramo, las reservas y el clima.</div>';
  const ctx=raceProgressCtx();
  const segs=ctx.segs;const done=ctx.doneKm;const total=ctx.totalKm;
  const proj=t=>done>0?fmt(t/done*total):'—';
  const rows=[{name:G.runner.name||'Tú',time:G.time,mult:null,me:true},...G.rivals.map(r=>({name:r.name,time:r.time,mult:r.mult}))]
    .sort((a,b)=>a.time-b.time);
  const myPos=rows.findIndex(r=>r.me)+1;
  let h=`<div class="dev-note">Posición estimada: <b>${myPos}.º de ${rows.length}</b> (estimación: tiempos acumulados a este tramo, sin el ajuste por especialidad de meta).</div>
    <div class="dev-scrollx"><table class="dev-tbl"><tr><th>#</th><th>Nombre</th><th class="r">Tiempo</th><th class="r">mult</th><th class="r">Proyección</th></tr>
    ${rows.map((r,i)=>`<tr class="${r.me?'me':''}"><td>${i+1}</td><td>${esc(r.name)}</td><td class="r">${fmt(r.time)}</td><td class="r">${r.mult==null?'—':r.mult.toFixed(3)}</td><td class="r">${proj(r.time)}</td></tr>`).join('')}</table></div>`;
  const opts=[];for(let i=G.seg+1;i<segs.length;i++)opts.push(`<option value="${i}">Tramo ${i+1} · ${esc(segs[i].name||'')}</option>`);
  h+=`<div class="dev-row"><select id="dev-seg" class="dev-in">${opts.join('')||'<option value="">Último tramo</option>'}</select>${devBtn('Saltar al tramo',()=>devJumpSeg(devNum('dev-seg',-1)),{when:'ya',need:()=>G.screen==='segment'?null:'Solo desde la pantalla de tramo'})}</div>
    <div class="dev-note">Los tramos saltados cuentan a ritmo base para ti y para los rivales (como doPace con el ritmo neutro), sin gastar reservas ni tirar eventos.</div>`;
  h+=`<div class="dev-row">${devBtn('🔋 Rellenar reservas',()=>{G.runner.energy=100;G.runner.hydration=100;G.runner.legs=100;},{when:'ya'})}</div>`;
  h+=`<div class="dev-row">Clima ahora: ${['soleado','nublado','extremo'].map(w=>devBtn(w+(G.weather===w?' ✓':''),()=>{G.weather=w;},{when:'ya',cls:'dev-sm'})).join('')}</div>`;
  return h;
}
// Como doPace, tramo a tramo: el tiempo del jugador y de cada rival avanza con la base
// del tramo, y si el último saltado tiene avituallamiento se para en él.
function devJumpSeg(n){
  const segs=curSegs();
  if(!(n>G.seg&&n<segs.length))throw new Error('Tramo fuera de rango (vas por el '+(G.seg+1)+' de '+segs.length+')');
  for(let i=G.seg;i<n;i++){
    const s=segs[i];
    G.time+=Math.round(s.base);
    G.rivals.forEach(rv=>{rv.time+=Math.round(s.base*rv.mult);});
  }
  G.seg=n;G.midRaceEvent=null;
  if(segs[n-1]&&segs[n-1].aid){G.aidSelected=[];G.screen='aid';}
  else G.screen='segment';
}
function devSeasonBody(am){
  const M=DEV_MODES[am];
  const need=()=>M.has&&!M.has()?M.missing:null;
  let h=`<div class="dev-row">${devBtn('⏭ Forzar fin de temporada',()=>M.seasonEnd(),{when:'ya',need})}</div>
    <div class="dev-row"><input id="dev-sim-n" class="dev-in dev-n" type="number" min="1" value="3">${devBtn('⏩ Simular temporadas',()=>M.simulate(devNum('dev-sim-n',1)),{when:'ya',need})}</div>`;
  if(am==='club')h+='<div class="dev-note">Club cierra con las cuentas de la pantalla de balance: cuotas, sueldos, staff y socios (P15).</div>';
  if(am==='clasico'){
    h+=`<div class="dev-row">Trimestre: ${[1,2,3,4].map(q=>devBtn('T'+q,()=>{G.currentQuarter=q;},{cls:'dev-sm'+(G.currentQuarter===q?' dev-sel':'')})).join('')} ${devWhen('ya')}</div>
      <div class="dev-warn">Escribe G.currentQuarter como los enlaces «Otros trimestres» de la jornada laboral. No dispara lo que el juego hace al cambiar de trimestre.</div>`;
  }
  return h;
}
function devScreenGroup(s){
  if(s.startsWith('canicross'))return 'Canicross';
  if(s.startsWith('club'))return 'Club';
  if(s.startsWith('coach'))return 'Entrenador';
  if(s.startsWith('expres'))return 'Exprés';
  if(['lifeAthleteOffer','lifeRetirement','overlapHub'].includes(s))return 'Carrera de Vida';
  if(['achievements','modeSelect','intro','saveScreen','careerEnd','debtCrisis','retirement'].includes(s))return 'Comunes';
  return 'Clásico';
}
const DEV_SCREEN_NEEDS=[
  {label:'Carrera en curso',test:s=>['segment','aid','midRaceEvent','raceResult'].includes(s),ok:()=>!!(G.rivals&&G.rivals.length&&(G.selectedRaces||[])[G.currentRaceIdx])},
  {label:'Carrera de Canicross en curso',test:s=>s==='canicrossSegment',ok:()=>DEV_MODES.canicross.inRace()},
  {label:'Club fundado',test:s=>s.startsWith('club')&&!['clubCreate','clubOffer'].includes(s),ok:()=>!!G.clubModeData},
  {label:'Atleta',test:s=>s.startsWith('coach')&&!['coachSelect','coachIntro','coachStyleSelect'].includes(s),ok:()=>!!G.coachAthlete},
  {label:'Perro',test:s=>s.startsWith('canicross')&&s!=='canicrossCreateDog',ok:()=>!!G.dog},
];
function devScreenNeedText(s){
  const n=DEV_SCREEN_NEEDS.find(x=>x.test(s));
  if(!n)return '';
  return n.ok()?'✓ Necesita: '+n.label+' (lo hay)':'⚠ Necesita: '+n.label+'. Ahora no lo hay: puede salir vacía o romperse.';
}
window.devScreenSel=el=>{const n=$d('dev-screen-need');if(n)n.textContent=devScreenNeedText(el.value);};
function devJumpBody(){
  const groups={};
  for(const s of devAllScreens()){(groups[devScreenGroup(s)]=groups[devScreenGroup(s)]||[]).push(s);}
  const order=['Clásico','Exprés','Entrenador','Club','Canicross','Carrera de Vida','Comunes'];
  const sel=`<select id="dev-screen" class="dev-in" style="flex:1" onchange="devScreenSel(this)">${order.filter(g=>groups[g]).map(g=>`<optgroup label="${g}">${groups[g].map(s=>`<option value="${s}"${G.screen===s?' selected':''}>${s}</option>`).join('')}</optgroup>`).join('')}</select>`;
  return `<div class="dev-row">
      ${devBtn('🏃 Clásico',()=>devJumpToClassic(),{when:'ya'})}
      ${devBtn('📋 Entrenador',()=>devJumpToCoach(),{when:'ya'})}
      ${devBtn('🏕 Club',()=>devJumpToClub(),{when:'ya'})}
      ${devBtn('🐕 Canicross',()=>devJumpToCanicross(),{when:'ya'})}
    </div>
    <div class="dev-note">Entrenador pasa por el flujo real de transición (bonus de fama y pantalla coachIntro). Club crea el club de pruebas con evento y objetivo, como doClubCreate().</div>
    <div class="dev-row">${sel}${devBtn('Ir →',()=>{const s=devVal('dev-screen');if(!s)throw new Error('Elige una pantalla');G.screen=s;G.activeTab='game';},{when:'ya'})}</div>
    <div class="dev-warn" id="dev-screen-need">${devScreenNeedText(G.screen)}</div>`;
}
function devVidaBody(){
  return `<div class="dev-row">${devBtn('🏔 Forzar oferta «hazte entrenador»',()=>devForceAthleteOffer(),{when:'ya'})}</div>
    <div class="dev-row">${devBtn('🔀 Forzar solapamiento',()=>{devForceAthleteOffer();acceptLifeAthlete();},{when:'ya',
      need:()=>!devIsClassic()||G.gameMode==='expres'?'Necesita una partida de Clásico (no Exprés)':G.lifecyclePhase==='coach'?'Ya eres entrenador: el solapamiento sale de la fase de corredor':null})}</div>
    <div class="dev-note">La oferta y acceptLifeAthlete(), el flujo real.</div>
    <div class="dev-row">${devBtn('🏕 Oferta de Club estando en Entrenador',()=>devClubOfferFromCoach(),{raw:true,when:'ya'})}</div>
    <div class="dev-warn">Atajo de prueba: jugando, esta oferta hoy no llega desde Entrenador.</div>
    <div class="dev-row">${devBtn('👴 Forzar retirada del corredor',()=>doRetire(),{when:'ya',need:()=>devIsClassic()?null:'Necesita una partida de Clásico'})}</div>
    <div class="dev-note">doRetire(): con Carrera de Vida en fase corredor o solapamiento va a lifeRetirement; si no, a retirement.</div>`;
}
function devCoachBody(){
  if(!G.coachAthlete&&!(G.coachRoster||[]).some(s=>s&&s.coachAthlete))return `<div class="dev-empty">Aún no hay atleta. ${devBtn('Ir a Entrenador',()=>devJumpToCoach(),{when:'ya'})}</div>`;
  const act=G.coachActiveIdx||0;
  let h='<div class="dev-row">';
  for(let i=0;i<3;i++){
    const sl=(G.coachRoster||[])[i];
    const name=i===act?(G.coachAthlete?G.coachAthlete.name:'vacío'):(sl&&sl.coachAthlete?sl.coachAthlete.name:'vacío');
    const filled=i===act?!!G.coachAthlete:!!(sl&&sl.coachAthlete);
    h+=devBtn(`Slot ${i+1}: ${esc(name)}`,()=>switchCoachSlot(i),{cls:'dev-sm'+(i===act?' dev-sel':''),when:'ya',need:()=>filled?null:'Slot vacío: ábrelo con «Abrir slot sin reputación»'});
  }
  h+='</div>';
  h+=`<div class="dev-row">${devBtn('➕ Abrir slot sin reputación',()=>{
    const rep=G.coachReputation;
    G.coachReputation=Math.max(rep||0,70);   // coachSlotUnlocked pide 40 / 70
    let idx=-1;
    try{idx=coachFreeSlotIdx();if(idx<0)throw new Error('No quedan huecos: los 3 slots tienen atleta');addCoachSlot(idx);}
    finally{G.coachReputation=rep;}
    devStatus('Slot '+(idx+1)+' abierto con la reputación subida un momento a 70 (vuelve a '+rep+')');
  },{when:'ya'})}</div>
    <div class="dev-note">addCoachSlot() exige reputación 40 (2.º) o 70 (3.º): se sube un instante, se abre el slot por el flujo real y se deja como estaba.</div>`;
  return h;
}
function devClubRunnerName(id){const d=G.clubModeData;const r=d&&[...(d.plantilla||[]),...(d.cantera||[])].find(x=>x.id===id);return r?r.name:String(id);}
function devClubBody(){
  const d=G.clubModeData;
  if(!d)return `<div class="dev-empty">Aún no hay club fundado. ${devBtn('Ir a Club',()=>devJumpToClub(),{when:'ya'})}</div>`;
  const inIds=d.plantilla.map(r=>r.id);
  const avail=CLUB_RUNNER_POOL.filter(r=>!inIds.includes(r.id));
  let h='<div class="dev-note">Plantilla ('+d.plantilla.length+'):</div>';
  h+=d.plantilla.map((r,i)=>`<div class="dev-ev"><span class="t">${esc(r.name)} <small>${esc(r.spec||'')} · ${esc(r.role||'normal')} · €${r.currentSalary||r.salary}/mes</small></span>${devBtn('Quitar',()=>{
    if(d.plantilla.length<=2)throw new Error('Club necesita al menos 2 corredores');
    const gone=d.plantilla.splice(i,1)[0];
    Object.keys(d.calAssignments||{}).forEach(k=>{d.calAssignments[k]=(d.calAssignments[k]||[]).filter(x=>x!==gone.id);});
  },{cls:'dev-sm dev-danger',act:'Club · quitar '+r.name})}</div>`).join('');
  h+=`<div class="dev-row"><select id="dev-club-add" class="dev-in" style="flex:1">${avail.map(r=>`<option value="${r.id}">${esc(r.name)} · €${r.salary}/mes (fichaje €${r.salary*3})</option>`).join('')}</select>${devBtn('Fichar',()=>doClubSign(devVal('dev-club-add')),{when:'ya',need:()=>avail.length?null:'No quedan corredores libres en CLUB_RUNNER_POOL'})}</div>
    <div class="dev-note">Ficha con doClubSign(), el flujo real: cobra 3 meses de sueldo y respeta el tope de plantilla. Quitar no pide confirmación (doClubRelease sí) y lo saca también del calendario.</div>`;
  h+=`<div class="dev-note">Objetivo de temporada: <b>${esc(d.seasonObjective?d.seasonObjective.label:'—')}</b> · ahora: ${d.seasonObjectiveMet===true?'cumplido':d.seasonObjectiveMet===false?'fallido':'sin evaluar'}</div>
    <div class="dev-row">${devBtn('✅ Marcar cumplido',()=>{d.seasonObjectiveMet=true;},{when:'temporada'})}${devBtn('❌ Marcar fallido',()=>{d.seasonObjectiveMet=false;},{when:'temporada'})}</div>
    <div class="dev-note">Lo lee el cierre (doClubNextSeason). Ojo: simular la temporada lo vuelve a calcular.</div>
    <div class="dev-row">${devBtn('Sponsors: todos cumplen',()=>{devArm('clubSponsorMet',true);},{raw:true,when:'temporada'})}${devBtn('Sponsors: todos rescinden',()=>{devArm('clubSponsorMet',false);},{raw:true,when:'temporada'})}</div>`;
  return h;
}
function devEcoBody(){
  let h='<div class="dev-note"><b>Sponsors activos</b></div>';
  const sp=Object.entries(G.sponsors||{}).filter(([,s])=>s);
  h+=sp.length?sp.map(([cat,s])=>`<div class="dev-ev"><span class="t">${esc(s.name)} <small>${esc(cat)} · €${s.salary}/año · ${s.duration} temp.</small></span>${devBtn('Romper contrato',()=>breakSponsorContract(cat),{raw:true,cls:'dev-sm dev-danger',when:'ya'})}</div>`).join(''):'<div class="dev-note">Ninguno.</div>';
  h+='<div class="dev-note">Romper abre la confirmación real del juego (breakSponsorContract).</div>';
  h+=`<div class="dev-row">${devBtn('👟 Lanzar marca sin requisitos',()=>doLaunchBrand(),{raw:true,when:'ya',need:()=>G.ownBrand?'Ya tienes marca propia':null})}</div>
    <div class="dev-note">Llama a doLaunchBrand() sin pasar por canLaunchBrand() (ranking ≤ 30, año 3 o 100.000 seguidores). Sigue cobrando €2.500 y pide confirmación.</div>`;
  const joined=(G.joinedCircuits||[]);
  h+=`<div class="dev-note"><b>Circuitos</b> (${joined.length} inscrito${joined.length===1?'':'s'})</div>`;
  h+=joined.length?`<div class="dev-row"><select id="dev-circ" class="dev-in">${joined.map(id=>{const c=CIRCUITS_DB.find(x=>x.id===id);return `<option value="${id}">${esc(c?c.name:id)} · ${G.circuitPoints[id]||0} pts</option>`;}).join('')}</select><input id="dev-circ-n" class="dev-in dev-n" type="number" value="10">${devBtn('Sumar puntos',()=>{const id=devVal('dev-circ');G.circuitPoints[id]=(G.circuitPoints[id]||0)+devNum('dev-circ-n',0);},{when:'ya'})}</div>`:'<div class="dev-note">Inscríbete en un circuito desde la pestaña Fama.</div>';
  h+=`<div class="dev-note"><b>Némesis</b>: ${G.nemesis?esc(G.nemesis.name)+' ('+G.nemesis.wins+' victorias)':'ninguna'}</div>
    <div class="dev-row"><select id="dev-nem" class="dev-in" style="flex:1">${RIVALS_POOL.map((r,i)=>`<option value="${i}">${esc(r.name)} · tier ${r.tier}</option>`).join('')}</select>${devBtn('Fijar némesis',()=>{const r=RIVALS_POOL[devNum('dev-nem',0)];G.nemesis={name:r.name,flag:r.flag||'',wins:1,avgGap:0};},{when:'ya'})}</div>
    <div class="dev-row">${devBtn('Retiradas de rivales: comprobar ahora',()=>checkRivalRetirements(),{when:'ya',need:()=>G.carreraVida&&G.lifecyclePhase==='coach'?null:'checkRivalRetirements() solo actúa con Carrera de Vida en fase Entrenador'})}</div>
    <div class="dev-row">${devBtn('Invitaciones: generar ahora',()=>calcRepInvitations(),{when:'ya'})}</div>
    <div class="dev-note">calcRepInvitations() reparte por seguidores (${G.followers||0}); hoy tienes ${(G.repInvitations||[]).length}.</div>`;
  return h;
}

// ── 9.3 Salud ──
function devTabSalud(){
  const am=devActiveMode();
  return devSec('h-runner','🏃 Corredor (Clásico/Exprés)',()=>devHealthRunner(),{open:am==='clasico',
      help:'Lesiones del corredor con devSetInjury(), que hace lo mismo que una lesión de verdad: baja por carreras, secuela recuperable e historial.'})
    +devSec('h-coach','📋 Atleta (Entrenador)',()=>devHealthCoach(),{open:am==='coach',
      help:'La lesión pasa por applyCoachInjury(), la misma función que usa el juego: cuesta confianza y deja entrada en el log.'})
    +devSec('h-cn','🐕 Perro (Canicross, provisional)',()=>devHealthDog(),{open:am==='canicross'})
    +devSec('h-club','🏕 Club',()=>devHealthClub(),{open:am==='club'});
}
function devHealthRunner(){
  let h=`<div class="dev-note">Ahora: <b>${G.injuryType?esc((INJURY_TYPES[G.injuryType]||{}).label||G.injuryType)+' · '+G.injuryRacesLeft+' carrera(s) de baja':'sin lesión'}</b></div>
    <div class="dev-row">${['tendinitis','rotura','fractura'].map(t=>devBtn(esc((INJURY_TYPES[t]||{}).label||t),()=>devSetInjury(t),{when:'ya',cls:'dev-sm'})).join('')}${devBtn('Quitar lesión',()=>devSetInjury(null),{when:'ya',cls:'dev-sm'})}</div>`;
  const seq=Object.entries(G.injurySequel||{}).filter(([,v])=>v>0);
  h+=`<div class="dev-note"><b>Secuela pendiente</b>: ${seq.length?seq.map(([k,v])=>esc(k)+' −'+v).join(' · '):'ninguna'}</div>`;
  if(seq.length)h+=`<div class="dev-row">${devBtn('Curar secuela',()=>{let i=0;while(Object.keys(G.injurySequel||{}).length&&i++<20)recoverInjurySequel(1);},{when:'ya'})}</div><div class="dev-note">recoverInjurySequel(1) hasta vaciarla: devuelve lo perdido a los stats.</div>`;
  h+=devFieldsBlock('salud-runner');
  h+=`<div class="dev-row">${devBtn('Carga a 0',()=>{G.bodyLoad=0;},{when:'ya',cls:'dev-sm'})}${devBtn('Carga en rojo (90)',()=>{G.bodyLoad=90;},{when:'ya',cls:'dev-sm'})}</div>`;
  const z=G.redZoneZeroHits||{};
  h+=`<div class="dev-note"><b>Zona roja de la carrera en curso</b> (se pone a cero al terminarla)</div>
    <table class="dev-tbl"><tr><td>redZoneStreak</td><td>tramos seguidos con energía, hidratación o piernas por debajo de 10</td><td class="r">${G.redZoneStreak||0}</td></tr>
    <tr><td>redZoneMax</td><td>la racha más larga de esta carrera</td><td class="r">${G.redZoneMax||0}</td></tr>
    <tr><td>redZoneZeroHits</td><td>qué reserva tocó 0 en algún tramo</td><td class="r">${['energy','hydration','legs'].filter(k=>z[k]).join(', ')||'—'}</td></tr></table>
    <div class="dev-note">Al terminar la carrera, resolveRedZoneConsequence() decide la secuela con cuántas tocaron 0 y la racha máxima.</div>`;
  return h;
}
function devHealthCoach(){
  if(!G.coachAthlete)return `<div class="dev-empty">Aún no hay atleta. ${devBtn('Ir a Entrenador',()=>devJumpToCoach(),{when:'ya'})}</div>`;
  let h=`<div class="dev-note">Ahora: <b>${G.coachInjury?esc(G.coachInjury.label)+' · '+G.coachInjury.racesLeft+' carrera(s)':'sin lesión'}</b></div>
    <div class="dev-row">${COACH_INJURY_TYPES.map(inj=>devBtn(esc(inj.label),()=>applyCoachInjury(inj),{when:'ya',cls:'dev-sm'})).join('')}${devBtn('Quitar lesión',()=>{G.coachInjury=null;},{when:'ya',cls:'dev-sm'})}</div>
    <div class="dev-note">Quitar no devuelve los stats que quitó la lesión (el juego tampoco lo hace al curarse).</div>`;
  h+=devFieldsBlock('salud-coach');
  return h;
}
function devHealthDog(){
  if(!G.dog)return `<div class="dev-empty">Aún no hay perro. ${devBtn('Ir a Canicross',()=>devJumpToCanicross(),{when:'ya'})}</div>`;
  const d=G.dog;
  return `<div class="dev-warn">Provisional: Canicross se reescribe.</div>
    <div class="dev-note">Ahora: <b>${d.injury?esc(d.injury)+' · '+(d.injuryRaces||0)+' carrera(s)':'sin lesión'}</b></div>
    <div class="dev-row">${devBtn('Almohadillas (1 carrera)',()=>{d.injury='almohadillas';d.injuryRaces=1;},{when:'ya',cls:'dev-sm'})}${devBtn('Luxación (2 carreras)',()=>{d.injury='luxacion';d.injuryRaces=2;},{when:'ya',cls:'dev-sm'})}${devBtn('Quitar lesión',()=>{d.injury=null;d.injuryRaces=0;},{when:'ya',cls:'dev-sm'})}</div>
    <div class="dev-note">Escribe dog.injury y dog.injuryRaces como cnFinishRace(). No resta salud (el juego resta 20 al lesionarse en carrera).</div>
    ${devFieldsBlock('salud-cn')}`;
}
function devHealthClub(){
  const d=G.clubModeData;
  let h='<div class="dev-note">Este modo no tiene lesiones: solo abandonos al simular la temporada.</div>';
  if(!d)return h+`<div class="dev-empty">Aún no hay club. ${devBtn('Ir a Club',()=>devJumpToClub(),{when:'ya'})}</div>`;
  h+=`<div class="dev-row"><select id="dev-club-dnf" class="dev-in" style="flex:1"><option value="*">Cualquiera (el primero que corra)</option>${[...d.plantilla,...(d.cantera||[])].map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>${devBtn('Forzar abandono',()=>{devArm('clubDnf',devVal('dev-club-dnf')||'*');},{raw:true,when:'temporada'})}</div>
    <div class="dev-note">Se consume en la primera carrera simulada de ese corredor. Si el modo dios de Club está activo, gana el abandono.</div>`;
  return h;
}

// ── 9.4 Estado ──
function devTabEstado(){
  const noData=(what,btn)=>`<div class="dev-empty">Aún no hay ${what}. ${btn}</div>`;
  const am=devActiveMode();
  let h='';
  h+=devSec('f-eco','💶 Economía (Clásico/Exprés)',()=>devFieldsBlock('eco'),{open:am==='clasico'});
  h+=devSec('f-tiempo','🗓 Tiempo',()=>devFieldsBlock('tiempo'),{open:am==='clasico'});
  h+=devSec('f-dif','🎚 Dificultad',()=>devFieldsBlock('dif'),{});
  h+=devSec('f-runner','🏃 Corredor',()=>devFieldsBlock('runner')+`<div class="dev-row">${devBtn('Stats a 90',()=>{DEV_STATS.forEach(s=>{G.runner.stats[s]=90;});},{when:'ya',cls:'dev-sm'})}${devBtn('Stats a 30',()=>{DEV_STATS.forEach(s=>{G.runner.stats[s]=30;});},{when:'ya',cls:'dev-sm'})}</div>`,{open:am==='clasico'});
  h+=devSec('f-fama','⭐ Rankings y fama',()=>devFieldsBlock('fama'),{});
  h+=devSec('f-coach','📋 Entrenador',()=>G.coachAthlete||G.coachReputation?devFieldsBlock('coach'):noData('atleta de Entrenador',devBtn('Ir a Entrenador',()=>devJumpToCoach(),{when:'ya'})),{open:am==='coach'});
  h+=devSec('f-club','🏕 Club',()=>G.clubModeData?devFieldsBlock('club'):noData('club',devBtn('Ir a Club',()=>devJumpToClub(),{when:'ya'})),{open:am==='club'});
  h+=devSec('f-cn','🐕 Canicross',()=>G.dog?devFieldsBlock('cn'):noData('perro',devBtn('Ir a Canicross',()=>devJumpToCanicross(),{when:'ya'})),{open:am==='canicross'});
  h+=devSec('f-vida','🌱 Carrera de Vida',()=>devFieldsBlock('vida'),{open:!!G.carreraVida});
  h+=devSec('f-balance','⚖️ Balance de la dificultad (solo lectura)',()=>devBalanceBody(),{
    help:'Multiplicadores efectivos de modeCfg() por modo, para comparar dificultades sin jugar carreras. Independiente del modo real de la partida.'});
  return h+'<div class="dev-note">La carga corporal y la del atleta están en Salud. El modo de juego se cambia en Partida · Ir a otro modo.</div>';
}
window.devBalanceMode=el=>{DEV.balanceMode=el.value;devPaintBody(true);};
function devBalanceBody(){
  const modes=['facil','medio','dificil','hardcore','expres','coach'];
  const bm=DEV.balanceMode||(modes.includes(G.gameMode)?G.gameMode:'medio');
  const cfg=modeCfg(bm);
  const injAt=(load)=>Math.min(95,Math.round((0.08+(load-70)*0.004)*cfg.injuryRiskMult*100));
  const fatAt=(streak)=>((streak>=3?2.2:streak===2?1.6:1.0)*cfg.fatigueMult).toFixed(2);
  const row=(k,v)=>`<tr><td>${k}</td><td class="r"><b>${v}</b></td></tr>`;
  return `<div class="dev-row"><select class="dev-in" onchange="devBalanceMode(this)">${modes.map(m=>`<option value="${m}"${bm===m?' selected':''}>${m}</option>`).join('')}</select></div>
    <table class="dev-tbl">${row('injuryRiskMult',cfg.injuryRiskMult)}${row('fatigueMult',cfg.fatigueMult)}${row('rivalMult',cfg.rivalMult)}${row('sponsorMult',cfg.sponsorMult)}${row('trainingMult',cfg.trainingMult)}${row('startMoney','€'+cfg.startMoney)}${row('maxYears',cfg.maxYears)}</table>
    <div class="dev-note">tierDiffMult (mayor = rivales más lentos)</div>
    <table class="dev-tbl">${['local','regional','nacional','elite'].map(t=>row(t,cfg.tierDiffMult[t])).join('')}</table>
    <div class="dev-note">Ejemplos derivados</div>
    <table class="dev-tbl">${row('Riesgo de lesión por tramo (carga 90)',injAt(90)+'%')}${row('Fatiga efectiva (3 tramos a tope)','×'+fatAt(3))}</table>`;
}

// ── 9.5 Logros ──
function devAchState(){
  if(!DEV.ui.ach)DEV.ui.ach={q:'',mode:'todos',rarity:'todas',status:'todos'};
  return DEV.ui.ach;
}
function devTabLogros(){
  const st=devAchState();
  const cats=[['todos','Todos'],['general','General/Clásico'],['cn','Canicross'],['expres','Exprés'],['coach','Entrenador'],['club','Club']];
  const rar=['todas','easy','medium','hard','legendary','joke'];
  const body=()=>`
    <div class="dev-row"><input class="dev-in" style="flex:1" placeholder="Buscar logro…" value="${esc(st.q)}" oninput="devAchFilter('q',this.value)"></div>
    <div class="dev-row">
      <select class="dev-in" onchange="devAchFilter('mode',this.value)">${cats.map(([v,l])=>`<option value="${v}"${st.mode===v?' selected':''}>${l} (${v==='todos'?ACHIEVEMENTS.length:ACHIEVEMENTS.filter(a=>devAchCat(a)===v).length})</option>`).join('')}</select>
      <select class="dev-in" onchange="devAchFilter('rarity',this.value)">${rar.map(v=>`<option value="${v}"${st.rarity===v?' selected':''}>${v}</option>`).join('')}</select>
      <select class="dev-in" onchange="devAchFilter('status',this.value)">${[['todos','Todos'],['si','Desbloqueados'],['no','Bloqueados']].map(([v,l])=>`<option value="${v}"${st.status===v?' selected':''}>${l}</option>`).join('')}</select>
    </div>
    <div class="dev-row">
      ${devBtn('Desbloquear categoría',()=>devUnlockCategory(st.mode),{when:'ya',confirm:()=>'Desbloquear '+(st.mode==='todos'?ACHIEVEMENTS.length:ACHIEVEMENTS.filter(a=>devAchCat(a)===st.mode).length)+' logros de verdad (también en el trofeo global)?'})}
      ${DEV.ach.dirty?devBtn('Terminar vista previa',()=>devEndAchPreview(),{when:'ya'}):devBtn('Vista previa de todos',()=>devUnlockAllAchievements(),{when:'ya'})}
      ${devBtn('Comprobar logros ahora',()=>{const before=new Set(G.unlockedAchievements||[]);checkAndUnlockAchievements();const nuevos=(G.unlockedAchievements||[]).filter(id=>!before.has(id));devStatus(nuevos.length?'Nuevos: '+nuevos.join(', '):'checkAndUnlockAchievements(): ninguno nuevo');},{when:'ya'})}
      ${devBtn('¿Por qué no salta?',()=>devGoTo('diagnostico','d-ach'),{raw:true})}
    </div>
    ${DEV.ach.dirty?'<div class="dev-warn">Vista previa activa: no se guarda (los guardados usan la lista real).</div>':''}
    <div class="dev-note">Los 7 «club_*» de General son de unirte a un club en Clásico, no de fundar el modo Club: por eso cuentan ahí (CR-38, v76).</div>
    <div id="dev-ach-list">${devAchListHtml()}</div>`;
  return devSec('a-list','🏆 Logros ('+(G.unlockedAchievements||[]).length+'/'+ACHIEVEMENTS.length+')',body,{open:true,eager:true});
}
function devAchListHtml(){
  const st=devAchState();
  const un=new Set(G.unlockedAchievements||[]);
  const q=st.q.trim().toLowerCase();
  const list=ACHIEVEMENTS.filter(a=>(st.mode==='todos'||devAchCat(a)===st.mode)&&(st.rarity==='todas'||a.rarity===st.rarity)
    &&(st.status==='todos'||(st.status==='si')===un.has(a.id))
    &&(!q||(a.label+' '+a.id+' '+(a.desc||'')).toLowerCase().includes(q)));
  if(!list.length)return '<div class="dev-note">Ningún logro con estos filtros.</div>';
  return list.slice(0,300).map(a=>`<div class="dev-chk"><input type="checkbox"${un.has(a.id)?' checked':''} onchange="devAchCheck('${a.id}',this)"><div class="t"><b>${esc(a.label)}</b> <small style="color:#999">${a.rarity} · ${devAchCat(a)} · ${a.id}</small><details><summary>descripción</summary>${esc(a.desc||'')}</details></div></div>`).join('')
    +(list.length>300?'<div class="dev-note">… y '+(list.length-300)+' más: afina el filtro.</div>':'');
}
window.devAchFilter=(k,v)=>{
  devAchState()[k]=v;devSaveUI();
  const el=$d('dev-ach-list');
  if(el){const prev=DEV._reg;DEV._reg='b';el.innerHTML=devAchListHtml();DEV._reg=prev;}
};
window.devAchCheck=(id,el)=>{
  const un=(G.unlockedAchievements||[]).includes(id);
  if(un&&!confirm('Esto también lo quita del trofeo global, compartido entre partidas. ¿Seguir?')){el.checked=true;return;}
  devAct((un?'Bloquear logro ':'Desbloquear logro ')+id,()=>devToggleAchievement(id));
};

// ── 9.6 Partidas ──
function devSnaps(){return devLSGet('dev_snaps',[]);}
function devSnapName(){const m=modeLabelOf(G.gameMode);const am=devActiveMode();
  const y=am==='coach'?'temp. '+G.coachSeason:am==='club'&&G.clubModeData?'temp. '+G.clubModeData.temporada:am==='canicross'?'temp. '+G.cnSeason:'año '+G.year;
  return m+' · '+y+' · '+G.screen;}
window.devSnapNew=(name)=>{
  const nm=name!=null?name:prompt('Nombre de la instantánea',devSnapName());
  if(nm==null)return;
  const snaps=devSnaps();
  const entry={name:String(nm).slice(0,60)||devSnapName(),ts:Date.now(),mode:G.gameMode,year:devActiveMode()==='clasico'?G.year:null,build:GAME_BUILD,state:serializableState()};
  snaps.unshift(entry);
  while(snaps.length>8)snaps.pop();
  if(!devLSSet('dev_snaps',snaps)){devStatus('No cabe en localStorage: borra alguna instantánea',true);return;}
  devStatus('Instantánea guardada: '+entry.name);devPaintBody(true);
};
function devTabPartidas(){
  let h='';
  h+=devSec('s-snaps','📸 Instantáneas',()=>{
    const snaps=devSnaps();
    return `<div class="dev-row">${devBtn('＋ Nueva instantánea',()=>devSnapNew(),{raw:true,when:'ya'})}<span class="dev-note">${snaps.length}/8</span></div>`
      +(snaps.length?snaps.map((s,i)=>`<div class="dev-ev"><span class="t"><b>${esc(s.name)}</b><br><small>${new Date(s.ts).toLocaleString('es-ES')} · ${esc(modeLabelOf(s.mode))}${s.year?' · año '+s.year:''} · v${s.build}</small></span>
        ${devBtn('Restaurar',()=>{devLoadState(JSON.stringify(s.state),'instantánea «'+s.name+'»');},{cls:'dev-sm',when:'ya',confirm:'¿Restaurar «'+s.name+'»? La partida actual se pierde si no la has guardado.'})}
        ${devBtn('✎',()=>{const nm=prompt('Nuevo nombre',s.name);if(nm==null)return;const all=devSnaps();all[i].name=nm.slice(0,60);devLSSet('dev_snaps',all);devPaintBody(true);},{raw:true,cls:'dev-sm',title:'Renombrar'})}
        ${devBtn('⬇',()=>devDownload('snap-'+String(s.name).replace(/[^\w-]+/g,'_')+'.json',JSON.stringify({_devExport:1,build:s.build,fecha:new Date(s.ts).toISOString(),nota:s.name,state:s.state},null,1)),{raw:true,cls:'dev-sm',title:'Exportar como JSON'})}
        ${devBtn('🗑',()=>{const all=devSnaps();all.splice(i,1);devLSSet('dev_snaps',all);devPaintBody(true);},{raw:true,cls:'dev-sm dev-danger',title:'Borrar',confirm:'¿Borrar «'+s.name+'»?'})}</div>`).join('')
        :'<div class="dev-note">No hay instantáneas.</div>');
  },{open:true,help:'Una copia de la partida guardada en este navegador. Restaurarla te devuelve a ese momento exacto. Deshacer usa las mismas copias, pero solo en memoria.'});
  h+=devSec('s-json','🧾 JSON de la partida',()=>`
    <input id="dev-io-note" class="dev-in" style="width:100%" placeholder="Nota opcional para el export">
    <div class="dev-row">
      ${devBtn('Mostrar aquí',()=>{$d('dev-io').value=devExportText();},{raw:true})}
      ${devBtn('Copiar',()=>devCopy(devExportText(),'JSON copiado al portapapeles'),{raw:true})}
      ${devBtn('⬇ Descargar .json',()=>devDownload(devExportName(),devExportText()),{raw:true})}
    </div>
    <textarea id="dev-io" class="dev-ta" placeholder="Pega aquí un JSON del panel, un estado crudo o el texto de «Exportar» del juego"></textarea>
    <div class="dev-row">
      ${devBtn('⬆ Importar lo pegado',()=>devImportText(devVal('dev-io'),'JSON pegado'),{raw:true,when:'ya'})}
      <label class="dev-b" style="display:inline-flex;align-items:center">📂 Elegir archivo<input type="file" accept=".json,.txt,application/json,text/plain" style="display:none" onchange="devImportFile(this)"></label>
    </div>`,{help:'Guarda la partida entera tal como está ahora, en un texto o en un archivo. Puedes cargarla otro día para volver a este momento exacto o convertirla en una receta. Si se hizo con otra versión del juego, avisa antes de cargar.'});
  h+=devSec('s-save','💾 Guardado del juego',()=>{
    let rows='';
    for(let i=0;i<NUM_SLOTS;i++){
      const raw=LS.get(SAVE_KEY+i);
      const lb=raw?slotLabel(loadFromSlot(i)):null;
      rows+=`<div class="dev-ev"><span class="t"><b>Ranura ${i+1}</b>${G._saveSlot===i?' ✓ activa':''}<br><small>${lb?lb.name+' · '+lb.mode+' · año '+lb.year+' · '+lb.date:(raw?'no se puede leer':'vacía')}${raw?' · '+(raw.length/1024).toFixed(1)+' KB':''}</small></span>${raw?devBtn('Borrar',()=>deleteSlot(i),{cls:'dev-sm dev-danger',confirm:'¿Borrar la ranura '+(i+1)+'? No se puede deshacer.'}):''}</div>`;
    }
    return `<div class="dev-row">${devBtn(DEV.noAutosave?'⏸ Sin autoguardado · activar de nuevo':'⏸ Sin autoguardado',()=>devToggleNoAutosave(),{raw:true,when:'activo',cls:DEV.noAutosave?'dev-on':''})}</div>
      <div class="dev-note">Mientras esté activo, el juego no escribe en tu ranura. Guardar a mano sigue funcionando. En Entrenador sí vuelca el atleta al roster (saveCoachSlot), para no perderlo al cambiar de slot.</div>
      <div class="dev-row">${devBtn(DEV.storageFull?'💥 Almacenamiento lleno · quitar':'💥 Simular almacenamiento lleno',()=>devToggleStorageFull(),{raw:true,when:'activo',cls:DEV.storageFull?'dev-on':''})}</div>
      <div class="dev-note">Hace creer al juego que no queda espacio al guardar: saveToSlot devuelve false y sale el ⚠ rojo de la barra (sesión 1, «Si el guardado falla, se nota»).</div>
      <div class="dev-note">Ranura activa: <b>${G._saveSlot==null?'ninguna':G._saveSlot+1}</b></div>${rows}`;
  },{});
  h+=devSec('s-seed','🎲 Semilla aleatoria',()=>`
    <div class="dev-row"><input id="dev-seed" class="dev-in" type="number" style="width:120px" value="${DEV.seed==null?'':DEV.seed}" placeholder="1234">
      ${devBtn('Aplicar semilla',()=>devSetSeed(devNum('dev-seed',null)),{raw:true,when:'activo'})}
      ${DEV.seed!=null?devBtn('Quitar',()=>devSetSeed(null),{raw:true}):''}</div>
    <div class="dev-note">${DEV.seed==null?'Sin semilla: Math.random normal.':'Activa: <b>'+DEV.seed+'</b>. Persiste al recargar.'}</div>`,
    {help:'Con la misma semilla y la misma partida, el azar sale igual. Sirve para repetir un fallo exactamente. Al aplicarla, el generador vuelve a empezar.'});
  h+=devSec('s-report','🐞 Informe de bug',()=>devReportBody(),{open:true,help:'Copia todo lo necesario para reproducir el fallo: versión, pantalla, cómo llegaste, errores, últimos eventos y la partida entera. Pégalo en Bugs-Activos o en el chat de Claude: con eso se puede cargar tu partida exacta y buscar el fallo en el código.'});
  return h;
}
function devExportObj(){return {_devExport:1,build:GAME_BUILD,fecha:new Date().toISOString(),nota:devVal('dev-io-note')||'',state:serializableState()};}
function devExportText(){return JSON.stringify(devExportObj(),null,1);}
function devExportName(){
  const am=devActiveMode();
  const y=am==='coach'?G.coachSeason:am==='club'&&G.clubModeData?G.clubModeData.temporada:am==='canicross'?G.cnSeason:G.year;
  return 'trail-'+G.gameMode+'-a'+y+'-v'+GAME_BUILD+'-'+new Date().toISOString().slice(0,10)+'.json';
}
function devImportText(txt,origen){
  if(!String(txt||'').trim()){devStatus('No hay nada que importar',true);return;}
  let parsed;
  try{parsed=devParseImport(txt);}catch(e){devStatus('No se pudo leer: '+e.message,true);return;}
  if(parsed.build&&parsed.build!==GAME_BUILD&&!confirm('Este JSON es de la v'+parsed.build+' y el juego va por la v'+GAME_BUILD+'. Sin migración de saves puede cargar mal. ¿Cargar igualmente?'))return;
  devAct('Importar ('+parsed.format+'): '+origen,()=>devLoadState(txt,origen));
}
window.devImportFile=el=>{
  const f=el.files&&el.files[0];if(!f)return;
  if(f.size>MAX_IMPORT_CHARS){devStatus('Archivo demasiado grande',true);return;}
  const rd=new window.FileReader();
  rd.onload=()=>{devImportText(String(rd.result),'archivo '+f.name);el.value='';};
  rd.onerror=()=>devStatus('No se pudo leer el archivo',true);
  rd.readAsText(f);
};
function devDownload(name,text,mime){
  try{
    const url=window.URL.createObjectURL(new window.Blob([text],{type:mime||'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();
    setTimeout(()=>{window.URL.revokeObjectURL(url);a.remove();},500);
    devStatus('Descargado: '+name);
  }catch(e){devStatus('No se pudo descargar: '+e.message,true);}
}
// Mismo fallback que fallbackCopy() de save.js, sin sus alert().
function devCopy(txt,okMsg){
  const fallback=()=>{
    const ta=document.createElement('textarea');
    ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
    document.body.appendChild(ta);ta.focus();ta.select();
    let ok=false;try{ok=document.execCommand('copy');}catch(e){ok=false;}
    document.body.removeChild(ta);
    devStatus(ok?okMsg:'No se pudo copiar: selecciona el texto a mano',!ok);
  };
  if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(txt).then(()=>devStatus(okMsg),fallback);
  else fallback();
}
window.devToggleNoAutosave=()=>{DEV.noAutosave=!DEV.noAutosave;devSavePrefs();devLog('dev','Sin autoguardado: '+(DEV.noAutosave?'sí':'no'));devRefreshChrome();devPaint();};
window.devToggleStorageFull=()=>{DEV.storageFull=!DEV.storageFull;devLog('dev','Almacenamiento lleno simulado: '+(DEV.storageFull?'sí':'no'));devRefreshChrome();devPaint();};

// ── 9.2 Eventos ──
function devCovKey(gid,id){return gid+':'+id;}
function devCovOf(gid,id){return DEV.cov[devCovKey(gid,id)]||null;}
function devEvtState(){if(!DEV.ui.evt)DEV.ui.evt={q:'',unseen:false};return DEV.ui.evt;}
function devTabEventos(){
  const am=devActiveMode();
  const st=devEvtState();
  let h=`<div class="dev-row"><input class="dev-in" style="flex:1" placeholder="Buscar evento por título o id…" value="${esc(st.q)}" oninput="devEvtFilter('q',this.value)">
    <label class="dev-b dev-sm" style="display:inline-flex;gap:6px;align-items:center"><input type="checkbox"${st.unseen?' checked':''} onchange="devEvtFilter('unseen',this.checked)"> No vistos nunca</label></div>`;
  h+=devSec('evt-now','🔮 ¿Qué puede salir ahora? (Clásico/Exprés)',()=>devEligibleBody(),{open:am==='clasico'&&devClassicRace(),
    help:'Pregunta a los sistemas de eventos qué saldría en este tramo si la suerte acompañara. No cambia nada de la partida.'});
  for(const g of DEV_EVENT_GROUPS){
    let items=[];try{items=g.items();}catch(e){}
    const seen=items.filter(e=>devCovOf(g.id,e.id)).length;
    h+=devSec('evt-'+g.id,`${esc(g.label)} <small style="color:#999;font-weight:400">· ${seen}/${items.length} vistos</small> ${devWhen(g.when)}`,
      ()=>`<div id="dev-evtlist-${g.id}">${devEvtListHtml(g)}</div>`,{open:g.mode===am&&g.id!=='xpTimed'&&g.id!=='xpNarr'||(g.mode===am&&G.gameMode==='expres')});
  }
  h+=devSec('evt-sys','⚙️ Sistemas',()=>devSystemsBody(),{open:false,
    help:'Lo que no es un evento con opciones pero se puede provocar: caídas, condición del día, clima, crisis de deuda, ofertas, invitaciones y retiradas.'});
  return h;
}
window.devEvtFilter=(k,v)=>{
  devEvtState()[k]=v;devSaveUI();
  const prev=DEV._reg;DEV._reg='b';
  for(const g of DEV_EVENT_GROUPS){const el=$d('dev-evtlist-'+g.id);if(el)el.innerHTML=devEvtListHtml(g);}
  DEV._reg=prev;
};
function devEvtListHtml(g){
  const st=devEvtState();
  let items=[];try{items=g.items();}catch(e){return '<div class="dev-errtxt">'+esc(e.message)+'</div>';}
  const q=st.q.trim().toLowerCase();
  const list=items.filter(e=>(!q||(e.title+' '+e.id).toLowerCase().includes(q))&&(!st.unseen||!devCovOf(g.id,e.id)));
  let h='';
  if(g.provisional)h+='<div class="dev-warn">Provisional: Canicross se reescribe.</div>';
  if(g.ready&&!g.ready())h+=`<div class="dev-warn">${g.notReady}</div>`;
  if(!list.length)return h+'<div class="dev-note">Ninguno con este filtro.</div>';
  const canL=g.launch?devEvtCan(g,'launch'):'x';
  const canA=g.armKey?devEvtCan(g,'arm'):'x';
  h+=list.map(e=>{
    const c=devCovOf(g.id,e.id);
    let btn;
    if(g.launch&&!canL)btn=`<button type="button" class="dev-b dev-sm dev-good" onclick="devEvtLaunch('${g.id}','${e.id}')">Lanzar</button>`;
    else if(g.armKey&&!canA)btn=`<button type="button" class="dev-b dev-sm" onclick="devEvtArm('${g.id}','${e.id}')">Armar</button>`;
    else btn=`<button type="button" class="dev-b dev-sm" onclick="devEvtWhy('${g.id}')">${g.launch?'Lanzar':'Armar'} ?</button>`;
    return `<div class="dev-ev"><span class="dev-dot${c?' seen':''}" title="${c?'Visto '+c.n+(c.f?' ('+c.f+' forzados)':''):'Nunca visto'}"></span><span class="t">${esc(e.title)} <small>${esc(e.id)}${c?' · visto '+c.n+(c.f?' ('+c.f+' forzados)':''):''}</small></span>${btn}</div>`;
  }).join('');
  return h;
}
window.devEvtWhy=gid=>{
  const g=devEvtGroup(gid);if(!g)return;
  const why=(g.launch?devEvtCan(g,'launch'):null)||(g.armKey?devEvtCan(g,'arm'):null)||'Ahora sí se puede: vuelve a pintar';
  devStatus(why,true);showToast('DEV: '+why,'#c07a10');
};
function devSystemsBody(){
  const needClassic=()=>devIsClassic()?null:'Necesita una partida de Clásico o Exprés';
  const opt=(arr,sel)=>arr.map(([v,l])=>`<option value="${esc(v)}"${v===sel?' selected':''}>${esc(l)}</option>`).join('');
  return `<div class="dev-ev"><span class="t">🪨 Caída en la próxima bajada «a tope»</span>${devBtn('Armar',()=>devArm('descentFall',true),{raw:true,when:'tramo',need:needClassic})}</div>
    <div class="dev-row"><span class="t">🌅 Condición del día</span><select id="dev-daycond" class="dev-in">${opt(DAY_CONDITIONS.map(c=>[c.id,(c.icon?c.icon+' ':'')+c.id]))}</select>${devBtn('Armar',()=>devArm('dayCondition',devVal('dev-daycond')),{raw:true,when:'carrera',need:needClassic})}</div>
    <div class="dev-note">Se consume al generar la condición de la próxima carrera (initRace, una vez por carrera): si la de la carrera en curso ya salió, cuenta para la siguiente.</div>
    <div class="dev-row"><span class="t">🌦 Clima</span><select id="dev-weather" class="dev-in">${opt([['soleado','soleado'],['nublado','nublado'],['extremo','extremo']])}</select>${devBtn('Armar',()=>devArm('weather',devVal('dev-weather')),{raw:true,when:'carrera',need:needClassic})}</div>
    <div class="dev-ev"><span class="t">💸 Crisis de deuda</span>${devBtn('Lanzar',()=>devRaiseDebtCrisis(),{raw:true,when:'temporada',need:()=>devIsClassic()?null:'Necesita una partida de Clásico'})}</div>
    <div class="dev-note">Pone la marca que consume el cierre de temporada (doNextYear): la pantalla de crisis sale en la próxima transición.</div>
    <div class="dev-ev"><span class="t">🏕 Oferta de Club desde Entrenador</span>${devBtn('Lanzar',()=>devClubOfferFromCoach(),{raw:true,when:'ya'})}</div>
    <div class="dev-ev"><span class="t">🏔 Oferta «hazte entrenador»</span>${devBtn('Lanzar',()=>devForceAthleteOffer(),{when:'ya'})}</div>
    <div class="dev-ev"><span class="t">✉️ Invitaciones por reputación</span>${devBtn('Lanzar',()=>calcRepInvitations(),{when:'ya'})}</div>
    <div class="dev-ev"><span class="t">👋 Retiradas de rivales</span>${devBtn('Lanzar',()=>checkRivalRetirements(),{when:'ya',need:()=>G.carreraVida&&G.lifecyclePhase==='coach'?null:'Solo actúa con Carrera de Vida en fase Entrenador'})}</div>`;
}

// «¿Qué puede salir ahora?» — versión ligera (paso 8). Las check*() de race.js solo leen G
// y escriben G.midRaceEventTriggered, y todas sus tiradas son Math.random()<p o
// Math.random()*n: con el azar a 0 y una copia de las marcas, cada sistema devuelve lo que
// saldría si la suerte acompaña. Se restaura todo al terminar.
function devEligibleNow(){
  const saveT=G.midRaceEventTriggered, saveR=Math.random, out=[], seen=new Set();
  try{
    G.midRaceEventTriggered=JSON.parse(JSON.stringify(saveT||{}));
    Math.random=()=>0;                                  // toda tirada «p» con p>0 pasa
    const ctx=raceProgressCtx();
    if(!ctx)return out;
    for(const fn of [checkWeatherAndEnvironmentEvents,checkTerrainNavigationEvents,checkInjuryAndFallEvents,
                     checkFatigueAndEnergyEvents,checkSocialAndRivalEvents,checkExpressTimedEvents,checkExpressNarrativeEvents]){
      for(let i=0;i<40;i++){ const ev=fn(ctx); if(!ev||seen.has(ev.id))break; seen.add(ev.id); out.push({id:ev.id,title:ev.title,sys:fn.name}); }
    }
  } finally { G.midRaceEventTriggered=saveT; Math.random=saveR; }
  return out;
}
window.devEligibleNow=devEligibleNow;
const DEV_SYS_LABEL={checkWeatherAndEnvironmentEvents:'clima',checkTerrainNavigationEvents:'terreno',checkInjuryAndFallEvents:'lesiones y caídas',
  checkFatigueAndEnergyEvents:'fatiga',checkSocialAndRivalEvents:'social y rivales',checkExpressTimedEvents:'Exprés con contador',checkExpressNarrativeEvents:'Exprés narrativo'};
// Qué id sale de cada marca de midRaceEventTriggered (no siempre coinciden: «hat» → hat_blown).
function devTriggeredIds(){
  const t=G.midRaceEventTriggered||{};
  return Object.keys(t).filter(k=>t[k]&&!k.startsWith('_')).map(k=>devMidIdForKey(k));
}
function devMidIdForKey(k){
  const e=Object.entries(CLASSIC_MID_RACE_EVENTS).find(([,c])=>c.key===k);
  return e?e[0]:k;
}
function devEligibleBody(){
  if(!devClassicRace())return '<div class="dev-note">Solo con una carrera de Clásico o Exprés en curso.</div>';
  let can=[];
  try{can=devEligibleNow();}catch(e){return '<div class="dev-errtxt">Error preguntando a los sistemas: '+esc(e.message)+'</div>';}
  const done=devTriggeredIds();
  const all=[...DEV_CLASSIC_MID_IDS,...EXPRESS_TIMED_EVENTS.map(e=>e.id),...EXPRESS_NARRATIVE_EVENTS.map(e=>e.id)];
  const canIds=new Set(can.map(e=>e.id));
  const rest=all.filter(id=>!canIds.has(id)&&!done.includes(id));
  const ctx=raceProgressCtx();
  return `<div class="dev-note">Tramo ${G.seg+1} · km ${Math.round(ctx.doneKm)} de ${ctx.totalKm} (${Math.round(ctx.pct*100)} %) · clima ${esc(G.weather||'—')}. ${devBtn('Actualizar',()=>devPaintBody(true),{raw:true,cls:'dev-sm'})}</div>
    <div class="dev-note"><b>Puede salir en este tramo</b> (${can.length})</div>
    ${can.length?can.map(e=>`<div class="dev-ev"><span class="t">${esc(e.title||e.id)} <small>${esc(e.id)} · ${DEV_SYS_LABEL[e.sys]||e.sys}</small></span></div>`).join(''):'<div class="dev-note">Ninguno.</div>'}
    <div class="dev-note"><b>Ya salió en esta carrera</b> (${done.length})</div>
    <div class="dev-note">${done.length?done.map(esc).join(' · '):'—'}</div>
    <details><summary class="dev-note"><b>No puede salir ahora</b> (${rest.length})</summary>${rest.map(id=>`<div class="dev-ev"><span class="t"><small>${esc(id)}</small>${devWhyNotHtml(id)}</span></div>`).join('')}</details>
    <div class="dev-note">Salvedad: los narrativos de Exprés dependen del mes y la altitud, y como mucho salen dos por carrera; con probabilidad 0 un evento nunca aparece aunque se cumpla todo lo demás.</div>`;
}
function devWhyNotHtml(){return '';}

// ── 9.7 Diagnóstico ──
function devTabDiagnostico(){
  let h='';
  h+=devSec('d-diary','📓 Diario de eventos ('+DEV.diary.length+')',()=>devDiaryBody(),{open:true});
  h+=devSec('d-cov','📊 Cobertura de eventos',()=>devCoverageBody(),{help:'Qué eventos has visto alguna vez jugando y cuáles nunca. Se guarda entre sesiones.'});
  h+=devSec('d-now','🔮 ¿Qué puede salir ahora?',()=>devEligibleBody(),{help:'Pregunta a los sistemas de eventos qué saldría en este tramo si la suerte acompañara. No cambia nada de la partida.'});
  h+=devSec('d-trail','👣 Rastro de pantallas',()=>devTrailBody(),{});
  h+=devSec('d-watchdog','🐕‍🦺 Vigilante de pantallas'+(DEV.watchdog.length?' ⚠ '+DEV.watchdog.length:''),()=>devWatchdogBody(),{open:DEV.watchdog.length>0,
    help:'Avisa si una pantalla cambia la partida solo por mostrarse. Eso no debería pasar nunca. Una pantalla que redirige (por ejemplo, el evento de carrera sin evento) cambia «screen», y eso está permitido.'});
  const act=DEV.checks.filter(c=>c.active).length;
  h+=devSec('d-checks','✅ Comprobaciones en vivo'+(act?' ⚠ '+act:''),()=>devChecksBody(),{open:act>0,help:'Avisa de números imposibles (vacíos, negativos donde no toca, fuera de rango) en cuanto aparecen.'});
  h+=devSec('d-break','🧮 Desgloses',()=>devBreakdownBody(),{});
  h+=devSec('d-ach','🏆 Logros que deberían haber saltado',()=>devAchDiagBody(),{});
  h+=devSec('d-report','🐞 Informe de bug',()=>devReportBody(),{open:true,help:'Copia todo lo necesario para reproducir el fallo: versión, pantalla, cómo llegaste, errores, últimos eventos y la partida entera. Pégalo en Bugs-Activos o en el chat de Claude: con eso se puede cargar tu partida exacta y buscar el fallo en el código.'});
  return h;
}
function devHM(t){const d=new Date(t);return [d.getHours(),d.getMinutes(),d.getSeconds()].map(n=>String(n).padStart(2,'0')).join(':');}
function devDiaryBody(){
  if(!DEV.ui.diaryMode)DEV.ui.diaryMode='todos';
  const fm=DEV.ui.diaryMode;
  const list=DEV.diary.filter(e=>fm==='todos'||e.mode===fm);
  return `<div class="dev-row"><select class="dev-in" onchange="devDiaryMode(this.value)">${[['todos','Todos'],['clasico','Clásico/Exprés'],['coach','Entrenador'],['club','Club'],['canicross','Canicross']].map(([v,l])=>`<option value="${v}"${fm===v?' selected':''}>${l}</option>`).join('')}</select>
    ${devBtn('Copiar',()=>devCopy(devDiaryText(list),'Diario copiado'),{raw:true,cls:'dev-sm'})}${devBtn('Vaciar',()=>{DEV.diary.length=0;devPaintBody(true);},{raw:true,cls:'dev-sm'})}</div>`
    +(list.length?list.slice(0,200).map(e=>`<div class="dev-line ${e.kind==='aparece'?'dev':'repl'}"><span class="h">${devHM(e.t)}</span><span class="m"><b>${e.kind==='aparece'?'Aparece':'Resuelto'}</b> · ${esc(e.title)} <small>(${esc(e.id)})</small>${e.forced?' · <b>forzado</b>':''}<br><small>${esc(e.when)}</small>${e.choice?'<br>Opción: '+esc(e.choice):''}${e.effect?'<br><span class="dev-mono">'+esc(e.effect)+'</span>':''}</span></div>`).join(''):'<div class="dev-note">Aún no ha salido ningún evento en esta sesión.</div>');
}
window.devDiaryMode=v=>{DEV.ui.diaryMode=v;devSaveUI();devPaintBody(true);};
function devDiaryText(list){return (list||DEV.diary).map(e=>devHM(e.t)+' · '+(e.kind==='aparece'?'Aparece':'Resuelto')+' · '+e.title+' ('+e.id+')'+(e.forced?' · forzado':'')+' · '+e.when+(e.choice?' · opción: '+e.choice:'')+(e.effect?'\n    '+e.effect.replace(/\n/g,'\n    '):'')).join('\n');}
function devCoverageBody(){
  let h=`<div class="dev-row">${devBtn('Reiniciar cobertura',()=>{DEV.cov={};devLSSet('dev_coverage',DEV.cov);devPaintBody(true);},{raw:true,cls:'dev-sm dev-danger',confirm:'¿Borrar la cobertura acumulada de todas las sesiones?'})}</div>`;
  for(const g of DEV_EVENT_GROUPS){
    let items=[];try{items=g.items();}catch(e){}
    const seen=items.filter(e=>devCovOf(g.id,e.id));
    const forced=seen.reduce((a,e)=>a+(devCovOf(g.id,e.id).f||0),0);
    const unseen=items.filter(e=>!devCovOf(g.id,e.id));
    const pct=items.length?Math.round(seen.length/items.length*100):0;
    h+=`<details><summary class="dev-note"><b>${esc(g.label)}</b> · vistos ${seen.length} de ${items.length}${forced?' ('+forced+' veces forzados)':''}<div class="dev-bar"><i style="width:${pct}%"></i></div></summary>
      ${unseen.length?unseen.map(e=>`<div class="dev-ev"><span class="t">${esc(e.title)} <small>${esc(e.id)}</small></span>${g.launch?`<button type="button" class="dev-b dev-sm" onclick="devEvtLaunch('${g.id}','${e.id}')">Lanzar</button>`:''}${g.armKey?`<button type="button" class="dev-b dev-sm" onclick="devEvtArm('${g.id}','${e.id}')">Armar</button>`:''}</div>`).join(''):'<div class="dev-note">Todos vistos.</div>'}</details>`;
  }
  return h;
}
function devTrailBody(){
  const rows=[];
  for(const e of DEV.trail){const last=rows[rows.length-1];if(last&&last.s===e.s){last.n++;last.t=e.t;}else rows.push({...e,n:1});}
  return rows.length?rows.slice(-30).reverse().map(e=>`<div class="dev-line log"><span class="h">${devHM(e.t)}</span><span class="m"><b>${esc(e.s)}</b>${e.n>1?' ×'+e.n:''}${e.via?' <small>← '+esc(e.via)+'</small>':''}</span></div>`).join(''):'<div class="dev-note">Aún no hay pantallas registradas.</div>';
}
function devWatchdogBody(){
  return `<div class="dev-row">${devBtn('Vaciar',()=>{DEV.watchdog.length=0;devRefreshChrome();devPaintBody(true);},{raw:true,cls:'dev-sm'})}<span class="dev-note">Ignoradas: ${DEV_WATCHDOG_ALLOW.length}</span>${DEV_WATCHDOG_ALLOW.length?devBtn('Dejar de ignorar',()=>{DEV_WATCHDOG_ALLOW.length=0;devPaintBody(true);},{raw:true,cls:'dev-sm'}):''}</div>`
    +(DEV.watchdog.length?`<div class="dev-scrollx"><table class="dev-tbl"><tr><th>Pantalla</th><th>Ruta</th><th>Antes → después</th><th class="r">Veces</th><th></th></tr>${DEV.watchdog.map((w,i)=>`<tr><td>${esc(w.screen)}</td><td class="dev-mono">${esc(w.path)}</td><td>${esc(devFmt(w.a))} → ${esc(devFmt(w.b))}</td><td class="r">${w.n}</td><td>${devBtn('Ignorar esta',()=>{DEV_WATCHDOG_ALLOW.push(w.screen+'|'+w.path);DEV.watchdog.splice(i,1);devRefreshChrome();devPaintBody(true);},{raw:true,cls:'dev-sm'})}</td></tr>`).join('')}</table></div>`
    :'<div class="dev-note">Ninguna pantalla ha cambiado la partida al pintarse.</div>');
}
function devChecksBody(){
  return `<div class="dev-row">${devBtn(DEV.checksOn?'Apagar comprobaciones':'Encender comprobaciones',()=>{DEV.checksOn=!DEV.checksOn;devPaintBody(true);},{raw:true,cls:'dev-sm'+(DEV.checksOn?'':' dev-on')})}${devBtn('Vaciar',()=>{DEV.checks.length=0;devRefreshChrome();devPaintBody(true);},{raw:true,cls:'dev-sm'})}</div>`
    +(DEV.checks.length?DEV.checks.map(c=>`<div class="dev-line ${c.active?'warn':'log'}"><span class="h">${devHM(c.t)}</span><span class="m">${c.active?'⚠':'✓ ya no'} ${esc(c.msg)}${c.n>1?' <small>×'+c.n+'</small>':''}</span></div>`).join(''):'<div class="dev-note">Sin fallos.</div>');
}
function devBreakdownBody(){
  let h='';
  const am=devActiveMode();
  if(am==='clasico'){
    const race=(G.selectedRaces||[])[G.currentRaceIdx];
    if(devClassicRace()&&race){
      let res=null;try{res=calcRaceResult(race);}catch(e){h+='<div class="dev-errtxt">'+esc(e.message)+'</div>';}
      if(res)h+=`<div class="dev-note"><b>Si terminara ahora</b> (calcRaceResult, pura): ${res.pos}.º de ${res.total} · premio €${res.prize} · tu tiempo con especialidad ${fmt(res.playerTime)}${race.spec&&race.spec===G.runner.specialty?' (×0,92 por especialidad)':''}</div>${devResultTable(res.all)}
        <div class="dev-note">Rivales de tu especialidad ×0,97 · premio = PRIZE_TABLE × sponsorMult (${modeCfg().sponsorMult}) · ganancias: ${res.statGains.map(g=>g.k+' +'+g.v).join(', ')||'ninguna'}</div>`;
    }else{
      const last=(G.raceResults||[]).slice(-1)[0];
      if(last&&last.all)h+=`<div class="dev-note"><b>Última carrera</b>: ${esc(last.name)} · ${last.pos}.º · premio €${last.prize} · ganancias: ${(last.statGains||[]).map(g=>g.k+' +'+g.v).join(', ')||'ninguna'}</div>${devResultTable(last.all)}`;
      else if(last)h+=`<div class="dev-note"><b>Última carrera</b>: ${esc(last.name||'')} · ${last.dnf?'DNF ('+esc(last.dnfReason||'')+')':last.pos+'.º'}</div>`;
      else h+='<div class="dev-note">Aún no hay carreras esta temporada.</div>';
    }
    const exp=G.gameMode==='expres';
    const raceIncome=(G.raceResults||[]).reduce((a,r)=>a+(r.prize||0),0);
    const rows=exp?[['Sponsors (sponsorAnnual)',sponsorAnnual()],['Premios',raceIncome]]:[
      ['Trabajo (monthlyWorkIncome × 12)',monthlyWorkIncome()*12],['Sponsors (sponsorAnnual)',sponsorAnnual()],
      ['Marca (monthlyBrandIncome × 12)',monthlyBrandIncome()*12],['Premios',raceIncome],
      ['Gastos fijos (FIXED_COSTS × 12)',-FIXED_COSTS.total*12],['Club (monthlyClubCost × 12)',-monthlyClubCost()*12],
      ['Staff (monthlyStaffCost × 12)',-monthlyStaffCost()*12],['Inscripciones',-(G.selectedRaces||[]).reduce((a,r)=>a+(r.cost||0),0)]];
    h+=`<div class="dev-note" style="margin-top:8px"><b>Cuenta del año</b> (seasonYearNet${exp?', Exprés: solo sponsors y premios':''})</div><table class="dev-tbl">${rows.map(([k,v])=>`<tr><td>${k}</td><td class="r">${v>=0?'+':''}€${v}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="r"><b>€${seasonYearNet()}</b></td></tr></table>`;
  }
  if(G.clubModeData){
    const d=G.clubModeData;const c=clubSeasonClosing(d);
    h+=`<div class="dev-note" style="margin-top:8px"><b>Cierre de temporada del Club</b> (clubSeasonClosing${d.seasonSimulated?'':', temporada sin simular'})</div><table class="dev-tbl">
      ${[['Cuotas de socios',c.socioIncome],['Premios',c.totalPrize],['Sponsors',c.sponsorIncome],['Inscripciones',-c.raceCosts],['Sueldos',-c.wages],['Staff',-c.staffCost]].map(([k,v])=>`<tr><td>${k}</td><td class="r">${v>=0?'+':''}€${v}</td></tr>`).join('')}
      <tr><td><b>Balance del año</b></td><td class="r"><b>€${c.netBalance}</b></td></tr>
      <tr><td>Pendiente al cerrar (closing = cuotas − sueldos − staff)</td><td class="r">€${c.closing}</td></tr>
      <tr><td>Presupuesto ahora → al cerrar</td><td class="r">€${d.presupuesto} → €${d.presupuesto+c.closing}</td></tr>
      <tr><td>Socios</td><td class="r">${d.socios} +${c.socioGain} −${c.socioLoss}</td></tr></table>`;
  }
  if(G._lastRaceResult&&(am==='coach'||G.coachAthlete)){
    const r=G._lastRaceResult;
    h+=`<div class="dev-note" style="margin-top:8px"><b>Última carrera de Entrenador</b>: ${esc(r.raceName||'')} · ${r.isDnf?'DNF':r.pos+'.º'} · premio €${r.prize||0} · tu parte €${r.coachCut||0}</div>`;
  }
  return h||'<div class="dev-note">Nada que desglosar en este modo.</div>';
}
function devResultTable(all){
  return `<div class="dev-scrollx"><table class="dev-tbl"><tr><th>#</th><th>Nombre</th><th class="r">Tiempo</th></tr>${(all||[]).map((x,i)=>`<tr class="${x.me?'me':''}"><td>${i+1}</td><td>${esc(x.flag||'')} ${esc(x.name)}</td><td class="r">${fmt(x.time)}</td></tr>`).join('')}</table></div>`;
}
function devAchDiag(){
  const un=new Set(G.unlockedAchievements||[]);
  const glob=devGlobalAchs();
  const cumple=[],errores=[];
  for(const a of ACHIEVEMENTS){
    if(un.has(a.id))continue;
    try{if(a.check(G))cumple.push(a);}catch(e){errores.push([a,e.message]);}
  }
  const soloPartida=[...un].filter(id=>!glob[id]);
  const soloGlobal=Object.keys(glob).filter(id=>!un.has(id));
  return {cumple,errores,soloPartida,soloGlobal};
}
function devAchDiagBody(){
  const r=devAchDiag();
  const name=id=>{const a=ACHIEVEMENTS.find(x=>x.id===id);return a?a.label:id;};
  return `<div class="dev-row">${devBtn('Comprobar logros ahora',()=>checkAndUnlockAchievements(),{when:'ya'})}</div>
    <div class="dev-note"><b>Cumple la condición y no está desbloqueado</b> (${r.cumple.length})</div>
    ${r.cumple.length?'<div class="dev-note">El juego solo comprueba en ciertos momentos; pulsa «Comprobar logros ahora». Si sigue sin saltar, es un bug.</div>'+r.cumple.map(a=>`<div class="dev-ev"><span class="t">${esc(a.label)} <small>${a.id}</small></span></div>`).join(''):'<div class="dev-note">Ninguno.</div>'}
    <div class="dev-note"><b>La comprobación da error</b> (${r.errores.length})</div>
    ${r.errores.length?r.errores.map(([a,m])=>`<div class="dev-line error"><span class="m">${esc(a.label)} (${a.id}): ${esc(m)}</span></div>`).join(''):'<div class="dev-note">Ninguno.</div>'}
    <div class="dev-note"><b>Desbloqueados en la partida pero no en el trofeo global</b> (${r.soloPartida.length}): ${r.soloPartida.map(id=>esc(name(id))).join(' · ')||'—'}</div>
    <div class="dev-note"><b>En el trofeo global pero no en la partida</b> (${r.soloGlobal.length}): ${r.soloGlobal.slice(0,40).map(id=>esc(name(id))).join(' · ')||'—'}</div>
    <div class="dev-note">La pantalla de logros lee el trofeo global (globalAchs); los guardados, la lista de la partida.</div>`;
}

// ── Informe de bug ──
function devReportBody(){
  return `<textarea id="dev-report-desc" class="dev-ta" style="min-height:60px" placeholder="Descripción (opcional): qué hiciste, qué esperabas y qué pasó"></textarea>
    <div class="dev-row">${devBtn('🐞 Copiar informe de bug',()=>devCopy(devReportText(),'Informe copiado al portapapeles'),{raw:true,cls:'dev-big'})}</div>
    <div class="dev-row">${devBtn('⬇ Descargar .md',()=>devDownload('bug-trail-v'+GAME_BUILD+'-'+new Date().toISOString().slice(0,16).replace(/[:T]/g,'')+'.md',devReportText(),'text/markdown'),{raw:true})}</div>`;
}
function devReportText(){
  const now=new Date();
  const am=devActiveMode();
  const desc=devVal('dev-report-desc');
  const races=G.selectedRaces||[];
  const ctx=[modeLabelOf(G.gameMode),DEV_MODES[am].label];
  if(am==='clasico')ctx.push('año '+G.year,'T'+G.currentQuarter,'carrera '+Math.min(races.length,(G.currentRaceIdx||0)+1)+'/'+races.length,'tramo '+((G.seg||0)+1));
  if(am==='coach')ctx.push('temporada '+G.coachSeason);
  if(am==='club'&&G.clubModeData)ctx.push('temporada '+G.clubModeData.temporada);
  if(am==='canicross')ctx.push('temporada '+G.cnSeason);
  ctx.push('pantalla '+G.screen);
  const armed=Object.entries(DEV.armed).map(([k,v])=>devArmLabel(k,v)).join('; ')||'—';
  const gods=Object.entries(DEV.god).filter(([,v])=>v).map(([k])=>k).join(', ')||'—';
  const trail=[];for(const e of DEV.trail){const l=trail[trail.length-1];if(l&&l.s===e.s)l.n++;else trail.push({...e,n:1});}
  const errs=DEV.log.filter(e=>e.l==='error'||e.l==='warn').slice(-20);
  const acts=DEV.log.filter(e=>e.l==='dev').slice(-10);
  const pad2=n=>String(n).padStart(2,'0');
  return `# Informe de bug — Trail Game v${GAME_BUILD} — ${now.getFullYear()}-${pad2(now.getMonth()+1)}-${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}
Descripción: ${desc||'(sin descripción)'}
Modo: ${ctx.join(' · ')}
Carrera de Vida: ${G.carreraVida?'sí ('+(G.lifecyclePhase||'')+')':'no'} · Semilla: ${DEV.seed==null?'—':DEV.seed} · Autoguardado: ${DEV.noAutosave?'no':'sí'} · Armado: ${armed} · Modo dios: ${gods}

## Rastro de pantallas (últimas 30)
${trail.slice(-30).map(e=>'- '+devHM(e.t)+' '+e.s+(e.n>1?' ×'+e.n:'')+(e.via?' ← '+e.via:'')).join('\n')||'—'}

## Errores y avisos (últimos 20)
${errs.map(e=>'- '+devHM(e.t)+' ['+e.l+'] '+e.m.replace(/\n/g,' ⏎ ')+(e.n>1?' ×'+e.n:'')).join('\n')||'—'}

## Diario de eventos (últimos 15)
${devDiaryText(DEV.diary.slice(0,15))||'—'}

## Vigilante y comprobaciones (pendientes)
${[...DEV.watchdog.map(w=>'- Vigilante: la pantalla '+w.screen+' cambió '+w.path+' al pintarse: '+devFmt(w.a)+' → '+devFmt(w.b)+' (×'+w.n+')'),
   ...DEV.checks.filter(c=>c.active).map(c=>'- Comprobación: '+c.msg)].join('\n')||'—'}

## Últimas acciones del panel (10)
${acts.map(e=>'- '+devHM(e.t)+' '+e.m.split('\n')[0]).join('\n')||'—'}

## Partida (JSON)
\`\`\`json
${JSON.stringify({_devExport:1,build:GAME_BUILD,fecha:now.toISOString(),nota:desc||'',state:serializableState()})}
\`\`\`
`;
}

// ══ §10 CONSOLA ════════════════════════════════════════════════════════
function devTabConsola(){
  const counts={error:0,warn:0,log:0,dev:0,repl:0};
  DEV.log.forEach(e=>{counts[e.l]=(counts[e.l]||0)+1;});
  const f=DEV.filters;
  const fb=(k,l)=>`<button type="button" class="dev-b dev-sm${f[k]?' dev-sel':''}" onclick="devLogFilter('${k}')">${l} ${counts[k]||0}</button>`;
  return `<div class="dev-row" id="dev-logfilters">${fb('error','Errores')}${fb('warn','Avisos')}${fb('log','Log')}${fb('dev','Dev')}${fb('repl','Consola')}
      ${devBtn('Copiar todo',()=>devCopy(DEV.log.map(e=>devHM(e.t)+' ['+e.l+'] '+e.m+(e.n>1?' ×'+e.n:'')).join('\n'),'Registro copiado'),{raw:true,cls:'dev-sm'})}
      ${devBtn('Vaciar',()=>{DEV.log.length=0;DEV.errNew=0;devRefreshBadge();devPaintBody(true);},{raw:true,cls:'dev-sm'})}</div>
    <div id="dev-log" class="dev-log">${DEV.log.filter(e=>f[e.l]).map(devLineHtml).join('')}</div>
    <div class="dev-repl"><span class="p">›</span><textarea id="dev-repl" rows="2" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder="G.money" onkeydown="devReplKey(event)" oninput="devAcUpdate()"></textarea><button type="button" class="dev-b" onclick="devReplRun()">▶ Ejecutar</button><div class="dev-ac" id="dev-ac" hidden></div></div>
    ${DEV.ui.help?'<div class="dev-note"><code>let</code> y <code>const</code> no sobreviven a la siguiente ejecución: usa <code>window.x = …</code> para guardar algo. <code>$_</code> es el último resultado. <code>dev.help()</code> lista los atajos. Sin red de seguridad: puedes dejar el estado incoherente.</div>':''}
    <details class="dev-sec" id="dev-sec-c-inspector" data-sec="c-inspector"${DEV.ui.open['c-inspector']?' open':''} ontoggle="devSecToggleConsole(this)"><summary>🌳 Inspector de G</summary>
      <div class="dev-sec-b"><input class="dev-in" style="width:100%" placeholder="Buscar clave…" value="${esc(DEV.ui.inspQ||'')}" oninput="devInspSearch(this.value)"><div id="dev-insp" class="dev-tree"></div></div></details>`;
}
window.devSecToggleConsole=el=>{
  if(!!DEV.ui.open['c-inspector']===el.open&&el.dataset.filled)return;
  DEV.ui.open['c-inspector']=el.open;devSaveUI();
  if(el.open){el.dataset.filled='1';devInspFill();}
};
function devInspFill(){
  const box=$d('dev-insp');if(!box)return;
  box.innerHTML=devInspHtml();
  if(!DEV.ui.inspQ){const d=box.querySelector('details');if(d){d.open=true;window.devTreeOpen(d);}}
}
window.devLogFilter=k=>{DEV.filters[k]=!DEV.filters[k];devPaintBody(true);};
function devConsoleMounted(){
  if(DEV.ui.open['c-inspector'])devInspFill();
  const lg=$d('dev-log');if(lg)lg.scrollTop=lg.scrollHeight;
  const body=$d('dev-body');if(body)body.scrollTop=body.scrollHeight;
}
// La Consola no se repinta en cada render (perderías lo que escribes): solo añade líneas.
function devConsoleLive(){}
function devConsoleVisible(){return DEV.mounted&&devIsOpen()&&DEV.ui.tab==='consola'&&!!$d('dev-log');}
function devConsoleAppend(e){
  if(!devConsoleVisible()){return;}
  DEV.errNew=0;
  if(!DEV.filters[e.l])return;
  const lg=$d('dev-log');const body=$d('dev-body');
  const atEnd=body.scrollHeight-body.scrollTop-body.clientHeight<60;
  lg.insertAdjacentHTML('beforeend',devLineHtml(e));
  while(lg.childElementCount>500)lg.firstElementChild.remove();
  if(atEnd)body.scrollTop=body.scrollHeight;
}
function devConsoleRedrawLast(){
  if(!devConsoleVisible())return;
  const lg=$d('dev-log');const last=DEV.log[DEV.log.length-1];
  if(!last||!DEV.filters[last.l]||!lg.lastElementChild)return;
  lg.lastElementChild.outerHTML=devLineHtml(last);
}
function devLineHtml(e){
  let m=esc(e.m);
  if(e.v!==undefined)m=(e.m?esc(e.m)+' ':'')+devTreeHtml(e.v,e.vpath||null,null,true);
  else if(e.a&&e.l!=='dev'&&e.a.some(x=>x!==null&&typeof x==='object'&&!(x instanceof Error)))
    m=e.a.map(x=>x!==null&&typeof x==='object'&&!(x instanceof Error)?devTreeHtml(x,null,null,true):esc(devArgText(x))).join(' ');
  return `<div class="dev-line ${e.l}"><span class="h">${devHM(e.t)}</span><span class="m">${m}</span>${e.n>1?`<span class="n">×${e.n}</span>`:''}</div>`;
}

// ── Árbol de objetos: se despliega al abrirlo, con protección de ciclos y 100 hijos ──
const DEV_TREE=[];
const DEV_TREE_BASE={n:0};
function devTreeReg(v,path){
  DEV_TREE.push({v,path});
  if(DEV_TREE.length>5000){DEV_TREE.splice(0,1000);DEV_TREE_BASE.n+=1000;}
  return DEV_TREE_BASE.n+DEV_TREE.length-1;
}
function devTreeGet(i){return DEV_TREE[i-DEV_TREE_BASE.n];}
function devTreeLeaf(v){
  if(v===null)return '<span class="nul">null</span>';
  if(v===undefined)return '<span class="nul">undefined</span>';
  if(typeof v==='number')return `<span class="num">${v}</span>`;
  if(typeof v==='boolean')return `<span class="num">${v}</span>`;
  if(typeof v==='function')return `<span class="fn">ƒ ${esc(v.name||'')}()</span>`;
  if(typeof v==='string'){
    if(v.length>200)return `<span class="s">"${esc(v.slice(0,200))}</span><details style="display:inline"><summary class="nul">… ver más</summary><span class="s">${esc(v.slice(200))}"</span></details>`;
    return `<span class="s">"${esc(v)}"</span>`;
  }
  return esc(String(v));
}
function devTreeSummary(v){
  if(Array.isArray(v))return 'Array('+v.length+')';
  if(v instanceof Error)return esc(v.name+': '+v.message);
  const ks=Object.keys(v);
  return '{'+esc(ks.slice(0,4).join(', '))+(ks.length>4?', …':'')+'}';
}
function devTreeTools(path){
  if(!path||!/^G(\.|$)/.test(path))return '';
  return `<button type="button" class="tb" onclick="devTreeCopy(event,'${esc(path)}')">copiar ruta</button><button type="button" class="tb" onclick="devTreeWatch(event,'${esc(path)}')">vigilar</button>`;
}
function devTreeHtml(v,path,key,inline){
  const k=key!=null?`<span class="k">${esc(String(key))}</span>: `:'';
  if(v===null||typeof v!=='object')return (inline?'':'<div class="leaf">')+k+devTreeLeaf(v)+(path?devTreeTools(path):'')+(inline?'':'</div>');
  const i=devTreeReg(v,path);
  return `<details class="dev-treenode"${inline?' style="display:inline-block;margin-left:0;vertical-align:top"':''} data-tid="${i}" ontoggle="devTreeOpen(this)"><summary>${k}${devTreeSummary(v)}${devTreeTools(path)}</summary></details>`;
}
window.devTreeOpen=el=>{
  if(!el.open||el.dataset.done)return;
  const n=devTreeGet(Number(el.dataset.tid));if(!n)return;
  el.dataset.done='1';
  const v=n.v;
  const keys=Array.isArray(v)?v.map((x,i)=>i):Object.keys(v);
  const seen=DEV._treeSeen||(DEV._treeSeen=new WeakSet());
  let h='';
  for(const key of keys.slice(0,100)){
    let child;try{child=v[key];}catch(e){child='(error al leer: '+e.message+')';}
    const p=n.path!=null?(n.path+'.'+key):null;
    if(child!==null&&typeof child==='object'&&child===v){h+=`<div class="leaf"><span class="k">${esc(String(key))}</span>: <span class="nul">[ciclo]</span></div>`;continue;}
    h+=devTreeHtml(child,p,key,false);
  }
  if(keys.length>100)h+=`<div class="leaf nul">… ${keys.length-100} más</div>`;
  if(!keys.length)h+='<div class="leaf nul">(vacío)</div>';
  el.insertAdjacentHTML('beforeend',h);
  seen.add(v);
};
window.devTreeCopy=(ev,path)=>{ev.preventDefault();ev.stopPropagation();devCopy(path,'Ruta copiada: '+path);};
window.devTreeWatch=(ev,path)=>{ev.preventDefault();ev.stopPropagation();devWatchAdd(path);};
function devInspHtml(){
  const q=String(DEV.ui.inspQ||'').trim().toLowerCase();
  if(!q)return devTreeHtml(G,'G','G',false);
  const hits=[];
  const walk=(v,path,depth)=>{
    if(hits.length>=60||v===null||typeof v!=='object'||depth>6)return;
    const keys=Array.isArray(v)?[]:Object.keys(v);
    for(const k of keys){
      const p=path+'.'+k;
      if(k.toLowerCase().includes(q))hits.push([p,v[k]]);
      if(hits.length>=60)return;
      walk(v[k],p,depth+1);
    }
    if(Array.isArray(v))v.slice(0,50).forEach((x,i)=>walk(x,path+'.'+i,depth+1));
  };
  walk(G,'G',0);
  return hits.length?hits.map(([p,v])=>devTreeHtml(v,p,p.replace(/^G\./,''),false)).join('')+(hits.length>=60?'<div class="leaf nul">… hay más: afina la búsqueda</div>':''):'<div class="dev-note">Ninguna clave coincide.</div>';
}
window.devInspSearch=v=>{DEV.ui.inspQ=v;devInspFill();};

// ── REPL ──
// Usa eval() DIRECTO (no new Function, no window.eval) a propósito: solo el eval
// directo ve el scope léxico compartido entre <script> del documento (todas las
// const/let de constants.js, race.js, etc. — SPONSORS_DB, RACES_DB, INJURY_TYPES...).
// new Function() solo ve variables globales var/function, se queda corto para esto.
window.devEval=code=>{ let r; try{ r=eval(code); }catch(e){ return {error:e}; } return {value:r}; };
function devErrLine(e){
  const st=String(e&&e.stack||'').split('\n').find(l=>/\.js|eval/.test(l)&&!/devmode\.js/.test(l))||'';
  return (e&&e.name?e.name+': ':'')+(e&&e.message||String(e))+(st?'\n'+st.trim():'');
}
window.devReplRun=()=>{
  const ta=$d('dev-repl');if(!ta)return;
  const code=ta.value;if(!code.trim())return;
  DEV.hist=DEV.hist.filter(h=>h!==code);DEV.hist.push(code);
  while(DEV.hist.length>50)DEV.hist.shift();
  devLSSet('dev_hist',DEV.hist);DEV._histIdx=null;
  ta.value='';devAcHide();
  devLog('repl','› '+code);
  const before=devFlat(G);
  devPushUndo('Consola: '+code.slice(0,40));
  DEV.busy++;
  let res;
  try{res=window.devEval(code);}finally{DEV.busy--;}
  const show=v=>{window.$_=v;const e=devLog('repl','‹',[]);e.v=v;e.m='‹';if(devConsoleVisible()){const lg=$d('dev-log');if(lg&&lg.lastElementChild)lg.lastElementChild.outerHTML=devLineHtml(e);}};
  if(res.error)devLog('error',devErrLine(res.error));
  else if(res.value&&typeof res.value.then==='function'){
    devLog('repl','‹ Promise (esperando…)');
    res.value.then(v=>show(v),e=>devLog('error','Promesa rechazada: '+devErrLine(e)));
  }else show(res.value);
  try{render();}catch(e){devLog('error','render() tras la consola: '+e.message);}
  const diff=devDiffList(before,devFlat(G));
  if(diff.length){devLog('dev','Cambios en G:\n'+devDiffText(diff));DEV.last={label:'Consola',t:Date.now(),diff};}
  else DEV.undo.pop();
};
function devIsCoarse(){try{return window.matchMedia('(pointer:coarse)').matches;}catch(e){return false;}}
window.devReplKey=ev=>{
  const ta=ev.target;
  const ac=$d('dev-ac');
  if(ac&&!ac.hidden){
    if(ev.key==='Tab'||(ev.key==='Enter'&&DEV._acSel!=null)){ev.preventDefault();devAcAccept(DEV._acSel||0);return;}
    if(ev.key==='ArrowDown'||ev.key==='ArrowUp'){ev.preventDefault();devAcMove(ev.key==='ArrowDown'?1:-1);return;}
    if(ev.key==='Escape'){ev.preventDefault();devAcHide();return;}
  }
  if(ev.key==='Enter'&&!ev.shiftKey&&!devIsCoarse()){ev.preventDefault();devReplRun();return;}
  const before=ta.value.slice(0,ta.selectionStart),after=ta.value.slice(ta.selectionEnd);
  if(ev.key==='ArrowUp'&&!before.includes('\n')&&DEV.hist.length){
    ev.preventDefault();
    DEV._histIdx=DEV._histIdx==null?DEV.hist.length-1:Math.max(0,DEV._histIdx-1);
    ta.value=DEV.hist[DEV._histIdx];
  }else if(ev.key==='ArrowDown'&&!after.includes('\n')&&DEV._histIdx!=null){
    ev.preventDefault();
    DEV._histIdx++;
    if(DEV._histIdx>=DEV.hist.length){DEV._histIdx=null;ta.value='';}
    else ta.value=DEV.hist[DEV._histIdx];
  }
};
// Atajos escribibles en la consola
window.dev={
  help:()=>'dev.snap(nombre) · dev.arm(clave, valor) · dev.watch(ruta) · dev.diff() · dev.report() · claves armables: '+Object.keys(DEV_ARMABLE).join(', '),
  snap:(name)=>{devSnapNew(name||devSnapName());return 'Instantánea creada';},
  arm:(k,v)=>{if(!(k in DEV_ARMABLE))return 'Clave desconocida. Válidas: '+Object.keys(DEV_ARMABLE).join(', ');devArm(k,v);return 'Armado: '+devArmLabel(k,v);},
  watch:(p)=>{devWatchAdd(p);return 'Vigilando '+p;},
  diff:()=>DEV.last?DEV.last.label+'\n'+(devDiffText(DEV.last.diff)||'sin cambios'):'Aún no hay acciones',
  report:()=>devReportText(),
};

// ── Autocompletar ──
const DEV_NAMES={list:[],loaded:false};
function devLoadNames(){
  const files=['constants','state','save','race','coach','club','canicross','render-core','render-clasico','render-temporada'];
  if(typeof window.fetch!=='function'){devLog('dev','Autocompletar: sin fetch, solo claves de G y de window');return;}
  Promise.all(files.map(f=>window.fetch('js/'+f+'.js?v='+GAME_BUILD).then(r=>{if(!r.ok)throw new Error(r.status);return r.text();})))
    .then(texts=>{
      const names=new Set();
      for(const code of texts){
        for(const m of code.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm))names.add(m[1]);
        for(const m of code.matchAll(/^window\.([A-Za-z_$][\w$]*)\s*=/gm))names.add(m[1]);
      }
      DEV_NAMES.list=[...names].sort();DEV_NAMES.loaded=true;
    })
    .catch(e=>devLog('dev','Autocompletar: no se pudieron leer los scripts ('+e.message+'); solo claves de G y de window'));
}
function devAcCandidates(text){
  const m=text.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.([\w$]*)$|([A-Za-z_$][\w$]*)$/);
  if(!m)return null;
  if(m[1]!=null){
    const base=m[1],pre=m[2];
    if(!/^[\w$.]+$/.test(base))return null;
    const r=window.devEval(base);
    if(r.error||r.value==null||(typeof r.value!=='object'&&typeof r.value!=='function'))return null;
    let keys=[];try{keys=Object.keys(r.value);}catch(e){return null;}
    return {pre,list:keys.filter(k=>k.startsWith(pre)&&k!==pre).slice(0,8)};
  }
  const pre=m[3];
  if(pre.length<2)return null;
  const pool=new Set([...DEV_NAMES.list,'G','dev','$_',...Object.keys(window).filter(k=>/^[A-Za-z_$][\w$]*$/.test(k))]);
  return {pre,list:[...pool].filter(k=>k.startsWith(pre)&&k!==pre).sort().slice(0,8)};
}
window.devAcUpdate=()=>{
  const ta=$d('dev-repl'),ac=$d('dev-ac');if(!ta||!ac)return;
  const c=devAcCandidates(ta.value.slice(0,ta.selectionStart));
  if(!c||!c.list.length){devAcHide();return;}
  DEV._ac=c;DEV._acSel=null;
  ac.hidden=false;
  ac.innerHTML=c.list.map((k,i)=>`<button type="button" onclick="devAcAccept(${i})">${esc(k)}</button>`).join('');
};
window.devAcAccept=i=>{
  const ta=$d('dev-repl');const c=DEV._ac;if(!ta||!c||!c.list[i])return;
  const pos=ta.selectionStart;
  const start=pos-c.pre.length;
  ta.value=ta.value.slice(0,start)+c.list[i]+ta.value.slice(pos);
  ta.selectionStart=ta.selectionEnd=start+c.list[i].length;
  ta.focus();devAcHide();
};
function devAcMove(d){
  const ac=$d('dev-ac');const n=(DEV._ac&&DEV._ac.list.length)||0;if(!n)return;
  DEV._acSel=DEV._acSel==null?(d>0?0:n-1):(DEV._acSel+d+n)%n;
  [...ac.children].forEach((b,i)=>b.classList.toggle('on',i===DEV._acSel));
}
function devAcHide(){const ac=$d('dev-ac');if(ac){ac.hidden=true;ac.innerHTML='';}DEV._ac=null;DEV._acSel=null;}

// ══ §11 DIAGNÓSTICO: lo que corre tras cada render ═══════════════════════
// Rastro de pantallas
function devTrailNote(label){DEV._via=label;DEV._viaT=Date.now();}
function devTrailPush(){
  const s=String(G.screen);
  const last=DEV.trail[DEV.trail.length-1];
  if(last&&last.s===s)return;
  const via=DEV._via&&Date.now()-DEV._viaT<3000?DEV._via:null;
  DEV._via=null;
  DEV.trail.push({s,t:Date.now(),via});
  if(DEV.trail.length>200)DEV.trail.splice(0,DEV.trail.length-200);
}
// Vigilante: una pantalla no cambia el estado al pintarse.
function devWatchdog(before,after,screen){
  const diff=devDiffList(before,after).filter(([p])=>p!=='screen'&&p!=='activeTab'&&!DEV_WATCHDOG_ALLOW.includes(screen+'|'+p));
  for(const [path,a,b] of diff){
    let w=DEV.watchdog.find(x=>x.screen===screen&&x.path===path);
    if(w){w.n++;w.a=a;w.b=b;continue;}
    w={screen,path,a,b,n:1,t:Date.now()};
    DEV.watchdog.push(w);
    devLog('error','La pantalla '+screen+' cambió '+path+' al pintarse: '+devFmt(a)+' → '+devFmt(b));
  }
}
// Comprobaciones en vivo
const DEV_NUM_PATHS=['money','debt','year','ranking','followers','bodyLoad','cnMoney','coachTrust','coachBodyLoad',
  ...DEV_STATS.map(s=>'runner.stats.'+s),'runner.energy','runner.hydration','runner.legs',
  'clubModeData.presupuesto','clubModeData.socios','clubModeData.reputacion','clubModeData.cohesion',
  'dog.speed','dog.stamina','dog.bond','dog.health'];
const DEV_RANGE_PATHS=[...DEV_STATS.map(s=>'runner.stats.'+s),'runner.energy','runner.hydration','runner.legs','bodyLoad','coachBodyLoad','coachTrust',
  'clubModeData.cohesion','clubModeData.reputacion','dog.speed','dog.stamina','dog.bond','dog.health'];
function devRunChecks(){
  if(!DEV.checksOn)return;
  const fails={};
  const parentOk=p=>{const i=p.lastIndexOf('.');return i<0||devGetPath(G,p.slice(0,i))!=null;};
  for(const p of DEV_NUM_PATHS){
    if(!parentOk(p))continue;
    const v=devGetPath(G,p);
    if(v===undefined||typeof v!=='number'||!Number.isFinite(v))fails['num:'+p]=p+' vale '+(typeof v==='number'?String(v):v===undefined?'undefined':JSON.stringify(v));
  }
  for(const p of DEV_RANGE_PATHS){
    if(!parentOk(p))continue;
    const v=devGetPath(G,p);
    if(typeof v==='number'&&Number.isFinite(v)&&(v<0||v>100))fails['rng:'+p]=p+' fuera de 0-100: '+v;
  }
  if(typeof G.followers==='number'&&G.followers<0)fails['rng:followers']='followers negativo: '+G.followers;
  if(!screenRoutes()[G.screen])fails['scr']='La pantalla «'+G.screen+'» no existe en screenRoutes()';
  if(devIsClassic()&&Array.isArray(G.selectedRaces)&&G.currentRaceIdx>G.selectedRaces.length&&!['seasonBalance','expresSeasonBalance','debtCrisis','workSetup','seasonStart','expresSeasonStart','careerEnd'].includes(G.screen))
    fails['cal']='currentRaceIdx ('+G.currentRaceIdx+') pasa de las carreras del calendario ('+G.selectedRaces.length+') fuera del cierre';
  for(const [key,msg] of Object.entries(fails)){
    let c=DEV.checks.find(x=>x.key===key);
    if(c&&c.active&&c.msg===msg)continue;
    if(c){c.msg=msg;c.active=true;c.n++;c.t=Date.now();}
    else{c={key,msg,active:true,n:1,t:Date.now()};DEV.checks.push(c);}
    devLog('warn','Comprobación: '+msg);
  }
  for(const c of DEV.checks)if(c.active&&!(c.key in fails)){c.active=false;c.t=Date.now();}
  if(DEV.checks.length>100)DEV.checks.splice(0,DEV.checks.length-100);
}
// Eventos pendientes: al aparecer uno, diario y cobertura.
function devPendingNow(){
  const out={};
  const put=(gid,ev)=>{if(ev&&ev.id!=null)out[gid+':'+ev.id]={gid,ev};};
  const mid=G.midRaceEvent;
  if(mid&&mid.id!=null)put(String(mid.id).startsWith('xp_')?'xpTimed':String(mid.id).startsWith('xn_')?'xpNarr':'mid',mid);
  put('between',G.pendingEvent);
  put('training',G.trainingEvent);
  (G.monthlyEvents||[]).forEach(e=>{if(e&&!e.resolved)put('monthly',e);});
  put('coachMid',G.coachRaceEventPending);
  put('coachBetween',G.coachPendingEvent);
  if(G.clubModeData)put('club',G.clubModeData.pendingEvent);
  if(G.cnRaceState)put('cn',G.cnRaceState.pendingEvent);
  return out;
}
function devMomentText(mode){
  if(mode==='coach')return 'temporada '+(G.coachSeason||1)+', carrera '+((G.coachRaceIdx||0)+1);
  if(mode==='club')return G.clubModeData?'temporada '+G.clubModeData.temporada:'';
  if(mode==='canicross')return 'temporada '+(G.cnSeason||1)+(G.cnRaceState?', tramo '+((G.cnRaceState.currentSeg||0)+1):'');
  const races=G.selectedRaces||[];
  return 'año '+G.year+' · T'+G.currentQuarter+(races[G.currentRaceIdx]?' · carrera '+(G.currentRaceIdx+1)+' ('+races[G.currentRaceIdx].name+'), tramo '+((G.seg||0)+1):'');
}
function devEvtMode(gid){const g=devEvtGroup(gid);return g?g.mode:'clasico';}
function devEventsDetect(){
  const now=devPendingNow();
  let changed=false;
  for(const [key,{gid,ev}] of Object.entries(now)){
    if(DEV.pending[key])continue;
    const forced=!!DEV.forced[key];
    delete DEV.forced[key];
    const c=DEV.cov[key]||(DEV.cov[key]={n:0,f:0,last:0});
    c.n++;if(forced)c.f++;c.last=Date.now();changed=true;
    devDiaryPush({kind:'aparece',gid,id:ev.id,title:devEvtLabel(gid,ev),forced,mode:devEvtMode(gid)});
  }
  DEV.pending=now;
  if(changed)devLSSet('dev_coverage',DEV.cov);
}
function devEvtLabel(gid,ev){
  if(ev.title)return String(ev.title);
  if(ev.text)return String(ev.text).replace('[DOG]','el perro').replace('[KM]','X');
  return devEvtTitle(ev.id);
}
function devDiaryPush(e){
  e.t=Date.now();e.when=e.when||devMomentText(e.mode);
  DEV.diary.unshift(e);
  if(DEV.diary.length>200)DEV.diary.length=200;
}
// Resolutores: se captura el pendiente y la opción antes, y el efecto después.
const DEV_EFFECT_RE=/^(money|time|bodyLoad|followers|runner\.|coach|clubModeData\.|dog\.)/;
const DEV_RESOLVERS=[
  ['resolveMidRaceEvent','clasico',a=>G.midRaceEvent,(ev,a)=>(ev.choices||[]).find(c=>c.id===a[1])],
  ['handleEv','clasico',a=>G.pendingEvent,(ev,a)=>(ev.choices||[])[a[1]]],
  ['resolveMonthlyEvent','clasico',a=>(G.monthlyEvents||[])[a[0]],(ev,a)=>(ev.options||[])[a[1]]],
  ['doCoachMidRaceEvent','coach',a=>G.coachRaceEventPending,(ev,a)=>(ev.choices||[])[a[0]]],
  ['doCoachEventChoice','coach',a=>G.coachPendingEvent,(ev,a)=>(ev.choices||[])[a[0]]],
  ['doClubEvent','club',a=>G.clubModeData&&G.clubModeData.pendingEvent,(ev,a)=>(ev.options||[])[a[0]]],
  ['cnMakeDecision','canicross',a=>G.cnRaceState&&G.cnRaceState.pendingEvent,(ev,a)=>(ev.options||[])[a[0]]],
];
function devWrapResolver([name,mode,getEv,getChoice]){
  const orig=window[name];
  if(typeof orig!=='function'){devLog('warn','Envoltorio: no existe '+name);return;}
  window[name]=function(...args){
    let ev=null,choice=null,before=null,when='';
    try{ev=getEv(args);if(ev){choice=getChoice(ev,args);before=devFlat(G);when=devMomentText(mode);}}catch(e){}
    const r=orig.apply(this,args);
    try{
      if(ev){
        const diff=devDiffList(before,devFlat(G)).filter(([p])=>DEV_EFFECT_RE.test(p));
        devDiaryPush({kind:'resuelto',id:ev.id,title:ev.title||devEvtTitle(ev.id),mode,when,
          choice:choice?String(choice.text||choice.id||''):'(opción '+JSON.stringify(args.slice(1))+')',
          effect:devDiffText(diff,null,8),forced:false});
      }
    }catch(e){devLog('warn','Diario: '+e.message);}
    return r;
  };
}
function devAfterRender(before,screenBefore){
  devTrailPush();
  if(before&&!DEV.busy)devWatchdog(before,devFlat(G),screenBefore);
  devRunChecks();
  devEventsDetect();
}

// ══ §12 RECETAS ════════════════════════════════════════════════════════
// Cada receta deja la partida lista para una casilla del plan de playtest, usando las
// mismas funciones del panel. Si una no se puede montar con lo que existe, no se inventa.
function devRecipeRaces(n){
  return [...RACES_DB].filter(r=>!r.zegamaSpecial).sort((a,b)=>a.month-b.month)
    .filter((r,i,arr)=>arr.findIndex(x=>x.month===r.month)===i).slice(0,n).map(r=>({...r}));
}
function devRecipeClassic(mode){
  if(!devIsClassic()||isCoachPhase())devJumpToClassic();
  G.gameMode=mode||'medio';
  G.carreraVida=false;
}
function devRecipeStartRace(races,idx){
  G.selectedRaces=races;G.currentRaceIdx=idx;
  G.raceResults=races.slice(0,idx).map(r=>({id:r.id,name:r.name,pos:10,dnf:false,prize:0,time:3600}));
  resetRaceFlags();resetRaceDayState();
  G._raceInitialized=false;G.injuryType=null;G.injuryStatus=null;G.injuryRacesLeft=0;
  initRace();
  G.screen='segment';G.activeTab='game';
}
function devRecipeFractura(fisio){
  devRecipeClassic('medio');
  const races=devRecipeRaces(6);
  G.selectedRaces=races;G.currentRaceIdx=1;
  G.raceResults=[{id:races[0].id,name:races[0].name,pos:10,dnf:false,prize:0,time:3600}];
  G.injuryType=null;G.injuryStatus=null;G.injuryRacesLeft=0;
  G.spending.fisio=!!fisio;
  if(G.club&&G.club.hasFisio)G.club=CLUBS.find(c=>c.id==='none')||G.club;
  G.rivals=[];G.screen='preRacePrep';G.activeTab='game';
  devSetInjury('fractura');
}
const DEV_RECIPES=[
  {id:'save_fail',label:'Guardado que falla',sesion:'1',casilla:'Si el guardado falla, se nota',
    pasos:()=>{
      devRecipeClassic('medio');
      if(G._saveSlot==null){
        let i=0;while(i<NUM_SLOTS&&LS.get(SAVE_KEY+i))i++;
        if(i>=NUM_SLOTS)throw new Error('Las 5 ranuras están ocupadas: libera una en Partidas');
        G._saveSlot=i;saveToSlot(i);
      }
      DEV.storageFull=true;
    },luego:'Haz algo que guarde (confirma la jornada, por ejemplo): debe salir el ⚠ rojo en la barra. Quita «Almacenamiento lleno» al terminar.'},
  {id:'monthly_pending',label:'Evento mensual pendiente',sesion:'1',casilla:'Los eventos mensuales pendientes sobreviven al cierre (T26)',
    pasos:()=>{devRecipeClassic('medio');devLaunchMonthly('surplus');},
    luego:'Cierra la temporada sin resolver el evento: debe seguir ahí en el balance siguiente.'},
  {id:'fract_nofisio',label:'Fractura sin fisio en la carrera 2 de 6',sesion:'2',casilla:'Fractura: bloquea las carreras que quedan',
    pasos:()=>devRecipeFractura(false),luego:'Deben quedar bloqueadas las carreras que faltan (5).'},
  {id:'fract_fisio',label:'Fractura con fisio en la carrera 2 de 6',sesion:'2',casilla:'Fractura con fisio: el 30 %',
    pasos:()=>devRecipeFractura(true),luego:'Con fisio, bloqueadas el 30 % de las que quedan (mínimo 1).'},
  {id:'rotura_seq',label:'Rotura con secuela',sesion:'2',casilla:'Secuela recuperable (CR-75)',
    pasos:()=>{devRecipeClassic('medio');if(!(G.selectedRaces||[]).length){G.selectedRaces=devRecipeRaces(6);G.currentRaceIdx=0;G.raceResults=[];}devSetInjury('rotura');DEV.ui.tab='salud';DEV.ui.open['h-runner']=true;},
    luego:'Mira los stats y la secuela en Salud · Corredor. Corre una carrera: vuelve el 15 % de lo pendiente (mínimo 1 por stat).'},
  {id:'red_zone',label:'Zona roja',sesion:'2',casilla:'Secuelas de zona roja (CR-72)',
    pasos:()=>{
      devRecipeClassic('medio');devRecipeStartRace(devRecipeRaces(6),0);
      G.bodyLoad=90;G.runner.energy=0;G.runner.hydration=5;G.runner.legs=0;
    },luego:'Corre un tramo (energía y piernas siguen a 0: cuentan como «tocó 0», zeroCount 2) y termina la carrera, o usa «Ganar ya». resolveRedZoneConsequence() decide con cuántas reservas tocaron 0 y la racha máxima en rojo: con 2 sale una secuela severa.'},
  {id:'abandon',label:'Abandono',sesion:'2',casilla:'El abandono deja DNF en el historial (CR-75)',
    pasos:()=>{devRecipeClassic('medio');devRecipeStartRace(devRecipeRaces(6),0);G.runner.energy=5;G.runner.legs=5;G.runner.hydration=20;},
    luego:'En race.js no hay umbral de abandono forzado por reservas: el forzado solo sale de una lesión en carrera que impide correr. Pulsa «Abandonar carrera» y confirma: debe quedar el DNF en el balance y en la carrera deportiva.'},
  {id:'debt1',label:'Deuda: escalón 1',sesion:'3',casilla:'Números rojos: −3 mental por temporada',
    pasos:()=>{
      devRecipeClassic('dificil');
      const soft=modeCfg().bankruptcy.soft;
      G.forcedFullTime=false;G.debtSeasons=0;
      G.spending={fisio:false,entrenador:false,suplementos:false};
      // settleDebtSeason amortiza el 25 % del dinero que quede tras el año. Para que la deuda
      // siga viva y por debajo del umbral, se cuenta con el resultado del año: si es negativo
      // el dinero lo cubre justo; si es positivo la deuda lleva de más lo que se va a amortizar.
      const yn=seasonYearNet();
      if(yn<0){G.money=-yn;G.debt=Math.round(soft*0.4);}
      else{G.money=0;G.debt=Math.floor(yn*0.25)+Math.round(soft*0.4);}
      G.screen='seasonBalance';
    },luego:'Cierra la temporada: sigue la deuda (con intereses, por debajo del umbral) y −3 mental.'},
  {id:'debt2',label:'Deuda: escalón 2',sesion:'3',casilla:'Vuelta forzosa: jornada al 100 % y staff cancelado',
    pasos:()=>{
      devRecipeClassic('dificil');
      const soft=modeCfg().bankruptcy.soft;
      // settleDebtSeason paga primero el 25 % del dinero y luego mira el escalón: con dinero a 0
      // no amortiza nada y la deuda sigue por encima del umbral cuando checkDebtEscalation la mira.
      G.debt=Math.round(soft*1.5);G.money=0;G.forcedFullTime=false;
      G.screen='seasonBalance';
    },luego:'Cierra la temporada: debe salir la pantalla de crisis (jornada al 100 % y staff fuera).'},
  {id:'cn_march',label:'Canicross en marzo sin correr',sesion:'4 (provisional)',casilla:'La temporada de Canicross se puede cerrar con marzo sin correr (BUG-17)',
    pasos:()=>{
      if(G.gameMode!=='canicross')devJumpToCanicross();
      const march=CANICROSS_RACES.find(r=>r.month===3);
      if(!march)throw new Error('No hay carrera de Canicross en marzo');
      G.cnSelectedRaces=[march];
      G.cnRaceResults=(G.cnRaceResults||[]).filter(r=>!(r.season===G.cnSeason&&r.raceId===march.id));
      G.cnWeek=20;G.cnRaceState=null;G.screen='canicrossHub';
    },luego:'Estás en marzo con la carrera sin correr. Avanza desde marzo o sáltala: la temporada debe poder cerrarse.'},
  {id:'coach_two',label:'Entrenador con dos atletas',sesion:'5',casilla:'Historiales separados por atleta',
    pasos:()=>{
      if(!G.coachAthlete)devJumpToCoach();
      if(!G.coachAthlete)throw new Error('El salto a Entrenador no dejó atleta (¿pantalla de estilo pendiente?)');
      G.coachReputation=Math.max(G.coachReputation||0,40);
      const idx=coachFreeSlotIdx();
      if(idx<0)throw new Error('No hay hueco libre');
      addCoachSlot(idx);
      if(G.coachPool&&G.coachPool[0])doCoachSelect(G.coachPool[0].id);
    },luego:'Cambia de slot (Partida · Entrenador) y comprueba que cada atleta conserva su historial.'},
  {id:'overlap',label:'Solapamiento',sesion:'5',casilla:'Cambiar entre corredor y entrenador',
    pasos:()=>{devRecipeClassic('medio');G.carreraVida=true;G.lifecyclePhase='runner';G.lifeAthlete=null;devForceAthleteOffer();acceptLifeAthlete();},
    luego:'Usa el botón flotante para pasar de corredor a entrenador y vuelta.'},
  {id:'club_offer',label:'Oferta de Club desde Entrenador',sesion:'Decisión abierta',casilla:'Tramo Entrenador → Club',
    pasos:()=>{if(!G.coachAthlete)devJumpToCoach();G.carreraVida=true;G.lifecyclePhase='coach';G._coachClubOfferReceived=true;checkAndUnlockAchievements();G.screen='clubOffer';},
    luego:'Acepta la oferta y recorre la fundación del club desde Entrenador.'},
  {id:'club_red4',label:'Club en la 4.ª temporada en rojo',sesion:'6',casilla:'Escalón 4: se vende el corredor más caro',
    pasos:()=>{devJumpToClub();const d=G.clubModeData;d.temporada=4;d.redSeasons=3;d.presupuesto=-6000;},
    luego:'Simula la temporada y ciérrala en rojo: 4.ª temporada seguida, se va el corredor con más sueldo.'},
  {id:'club_red5',label:'Club a punto de disolverse',sesion:'6',casilla:'Quiebra del Club en 5 temporadas',
    pasos:()=>{devJumpToClub();const d=G.clubModeData;d.temporada=5;d.redSeasons=4;d.presupuesto=-6000;},
    luego:'Simula la temporada y ciérrala en rojo: el club se disuelve.'},
  {id:'expres3',label:'Exprés, año 3, carrera en curso',sesion:'7',casilla:'Eventos con contador de Exprés',
    pasos:()=>{devRecipeClassic('expres');G.year=3;devRecipeStartRace(devRecipeRaces(5),0);},
    luego:'Arma un evento con contador (Eventos · Exprés con contador), corre un tramo y deja que el contador expire: se elige la opción por defecto.'},
];
function devRecipesBody(){
  return `<div class="dev-warn">Llega rápido al sitio, pero confirma el hallazgo en una partida normal: ya ha pasado que el bug estaba en el atajo.</div>
    <div class="dev-row"><select id="dev-recipe" class="dev-in" style="flex:1">${DEV_RECIPES.map(r=>`<option value="${r.id}">S${esc(r.sesion)} · ${esc(r.label)}</option>`).join('')}</select>
    ${devBtn('Preparar',()=>devRecipeRun(devVal('dev-recipe')),{raw:true,when:'ya'})}</div>`;
}
window.devRecipeRun=id=>{
  const r=DEV_RECIPES.find(x=>x.id===id);if(!r)return;
  devSnapNew('Antes de: '+r.label);
  devAct('Receta · '+r.label,()=>r.pasos());
  devStatus('Receta «'+r.label+'» (sesión '+r.sesion+' · '+r.casilla+'). Ahora: '+r.luego);
  showToast('DEV: receta lista — mira la línea de estado del panel','#534AB7');
};

// ══ §13 ARRANQUE Y ENVOLTORIOS ══════════════════════════════════════════
function devSetSeed(seed){
  if(seed==null||seed===''||!Number.isFinite(Number(seed))){
    DEV.seed=null;
    if(DEV._rand0)Math.random=DEV._rand0;
    devStatus('Semilla quitada: Math.random normal');
  }else{
    DEV.seed=Math.floor(Number(seed));
    let a=DEV.seed>>>0;
    // mulberry32
    Math.random=function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};
    devStatus('Semilla '+DEV.seed+' aplicada: el generador empieza de nuevo');
  }
  devSavePrefs();devLog('dev','Semilla: '+(DEV.seed==null?'ninguna':DEV.seed));
  devRefreshChrome();devPaint();
}
window.devSetSeed=devSetSeed;

function devInstallWrappers(){
  // render: rastro, vigilante, comprobaciones y eventos tras la pasada exterior.
  const origRender=window.render;
  let depth=0;
  let first=true;
  window.render=function(...args){
    if(depth>0)return origRender.apply(this,args);
    if(first){first=false;devLog('dev','Envoltorio de render activo');}
    depth++;
    let before=null;const scr=String(G.screen);
    try{before=DEV.busy?null:devFlat(G);}catch(e){before=null;}
    try{return origRender.apply(this,args);}
    finally{
      depth--;
      try{devAfterRender(before,scr);}catch(e){devLog('error','Diagnóstico tras render: '+e.message,[e]);}
    }
  };
  // autoSave: «Sin autoguardado»
  const origAuto=window.autoSave;
  window.autoSave=function(...args){
    if(DEV.noAutosave){
      // En Entrenador el autoguardado también vuelca el slot activo al roster en memoria:
      // sin eso se pierde el progreso del atleta al cambiar de slot.
      if(G.gameMode==='coach'){try{saveCoachSlot();}catch(e){devLog('warn','saveCoachSlot: '+e.message);}}
      devLog('dev','Autoguardado omitido');
      return;
    }
    return origAuto.apply(this,args);
  };
  // LS.set: «Almacenamiento lleno» solo para las ranuras de guardado (SAVE_KEY).
  const origSet=LS.set;
  LS.set=(k,v)=>{if(DEV.storageFull&&String(k).startsWith(SAVE_KEY))return false;return origSet(k,v);};
  // Resolutores de eventos: diario.
  DEV_RESOLVERS.forEach(devWrapResolver);
}

function devInit(){
  if(DEV.mounted)return;
  // 1. Preferencias
  const ui=devLSGet('dev_ui',null);
  if(ui&&typeof ui==='object')Object.assign(DEV.ui,ui,{open:ui.open||{},info:ui.info||{}});
  const prefs=devLSGet('dev_prefs',{});
  DEV.noAutosave=!!prefs.noAutosave;
  const w=devLSGet('dev_watch',null);
  if(w&&Array.isArray(w.added)&&Array.isArray(w.removed))DEV.watch=w;
  DEV.hist=devLSGet('dev_hist',[]);if(!Array.isArray(DEV.hist))DEV.hist=[];
  DEV.cov=devLSGet('dev_coverage',{});if(!DEV.cov||typeof DEV.cov!=='object')DEV.cov={};
  // Migración única de la instantánea del panel de v97
  const old=LS.get('dev_snapshot');
  if(old){
    try{const snaps=devSnaps();snaps.push({name:'Snapshot antiguo',ts:Date.now(),mode:'',year:null,build:0,state:JSON.parse(old)});while(snaps.length>8)snaps.shift();devLSSet('dev_snaps',snaps);LS.del('dev_snapshot');}catch(e){}
  }
  // 2 y 3. CSS, botón y drawer
  const st=document.createElement('style');st.id='dev-css';st.textContent=DEV_CSS;document.head.appendChild(st);
  const btn=document.createElement('button');btn.id='dev-btn';btn.type='button';btn.setAttribute('onclick','devToggleDrawer()');
  document.body.appendChild(btn);
  const dr=document.createElement('div');dr.id='dev-drawer';
  document.body.appendChild(dr);
  // 4. Carcasa, una sola vez
  const prev=DEV._reg;DEV._reg='c';
  dr.innerHTML=devShellHtml();
  DEV._reg=prev;
  DEV.mounted=true;
  devWireResize();
  // 5. Consola: lo capturado durante la carga y lo que venga
  const buf=window.__devBuf||[];
  for(const [l,a,t] of buf){const e=devLog(l,(a||[]).map(devArgText).join(' '),a);if(e)e.t=t||e.t;}
  window.__devBuf=[];
  window.__devSink=(l,a)=>{try{devLog(l,(a||[]).map(devArgText).join(' '),a);}catch(e){}};
  // 6. Envoltorios
  DEV._rand0=Math.random;
  devInstallWrappers();
  // 7. Atajos de teclado: º abre y cierra; Esc cierra. No actúan escribiendo.
  document.addEventListener('keydown',ev=>{
    const t=ev.target;
    if(t&&/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))return;
    if(ev.code==='Backquote'||ev.key==='º'){ev.preventDefault();devToggleDrawer();}
    else if(ev.key==='Escape'&&devIsOpen()){devToggleDrawer(false);}
  });
  window.addEventListener('resize',()=>devApplyDock());
  // 8. Semilla guardada
  if(prefs.seed!=null)devSetSeed(prefs.seed);
  // 9. Nombres para autocompletar
  devLoadNames();
  devApplyDock();
  devRefreshBadge();
  if(devIsOpen()){devRefreshChrome();devPaintBody(true);}
  devLog('dev','Modo desarrollador listo (v'+GAME_BUILD+')');
}
window.devInit=devInit;

if(window.DEV_ON===true)devInit();
