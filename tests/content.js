// T47 (v90) — Comprobación de cobertura de contenido.  Ejecutar con: npm run content
//
// La única pieza de la auditoría que no arregla un bug: detecta la familia
// entera. T11–T14 fueron todas del mismo tipo — una condición que cita una
// propiedad que en los datos no existe, o contenido escrito que nunca puede
// salir — y las cuatro habrían caído aquí sin jugar una sola carrera.
//
// Dos severidades a propósito:
//   ERROR  → contenido roto o inalcanzable. Rompe `npm run check`.
//   AVISO  → incoherencia conocida con tarea abierta en el backlog (T48/T49
//            campos sin declarar, T52 el esquema km/desnivel). Se lista para
//            que el número baje solo según se cierren, pero no bloquea.
const {build,sources}=require('./_bundle');

const {T}=build(['freshState','ACHIEVEMENTS','RACES_DB','SPEC_RACES','SPONSORS_DB','BETWEEN_EVENTS',
  'EXPRESS_TIMED_EVENTS','EXPRESS_NARRATIVE_EVENTS','CIRCUITS_DB','TRAINING_BLOCKS','RIVALS_POOL',
  'CLUB_RUNNER_POOL','CLUB_ARCHETYPES','COACH_ATHLETE_POOL','COACH_BETWEEN_EVENTS','COACH_MID_RACE_EVENTS',
  'CLUB_SPONSORS_POOL','COACH_SPONSORS_POOL','SEASON_OBJECTIVES','RACE_STRATEGIES','FAME_ACTIONS',
  'TIER_LABEL_RACE','CLUB_OBJECTIVES','CLUB_YOUTH_POOL','LIFE_ATHLETE_POOL','RIVAL_INCIDENTS',
  'CLUB_RACES','raceGainTotal','raceDesnivel','fmtGain',
  'checkSponsorObjective','MID_RACE_RESOLVERS','MODE_LABELS','PHASE_LABEL']);
const SRC=sources();

// Los escaneos de fuente de más abajo buscan patrones como `G.campo` o
// `race.prop`. Sin quitar comentarios antes, un comentario que DOCUMENTA un bug
// ya arreglado se cuenta como el bug: `race.js` explica en un comentario el T12
// («la condición leía race.gain») y eso bastaba para que saltase la alarma.
function sinComentarios(txt){
  let out='', i=0, n=txt.length;
  let cad=null;      // comilla abierta: ' " ` o null
  while(i<n){
    const c=txt[i], d=txt[i+1];
    if(cad){
      if(c==='\\'){out+=c+(d||'');i+=2;continue;}
      if(c===cad)cad=null;
      out+=c;i++;continue;
    }
    if(c==='/'&&d==='/'){ while(i<n&&txt[i]!=='\n')i++; continue; }
    if(c==='/'&&d==='*'){ i+=2; while(i<n&&!(txt[i]==='*'&&txt[i+1]==='/'))i++; i+=2; continue; }
    if(c==="'"||c==='"'||c==='`')cad=c;
    out+=c;i++;
  }
  return out;
}
const LIMPIO=Object.fromEntries(Object.entries(SRC).map(([f,t])=>[f,sinComentarios(t)]));

let errores=0, avisos=0;
const bloque=n=>console.log('\n── '+n+' ──');
const err =(m,d='')=>{errores++;console.log('  ✗ '+m+(d?'  → '+d:''));};
const avi =(m,d='')=>{avisos++; console.log('  ⚠ '+m+(d?'  → '+d:''));};
const ok  =m=>console.log('  ✓ '+m);

// ── 1 · Ids únicos y utilizables ─────────────────────────────────────────────
bloque('Ids');
const TABLAS={ACHIEVEMENTS:T.ACHIEVEMENTS,RACES_DB:T.RACES_DB,SPONSORS_DB:T.SPONSORS_DB,
  BETWEEN_EVENTS:T.BETWEEN_EVENTS,EXPRESS_TIMED_EVENTS:T.EXPRESS_TIMED_EVENTS,
  EXPRESS_NARRATIVE_EVENTS:T.EXPRESS_NARRATIVE_EVENTS,CIRCUITS_DB:T.CIRCUITS_DB,
  TRAINING_BLOCKS:T.TRAINING_BLOCKS,RIVALS_POOL:T.RIVALS_POOL,CLUB_RUNNER_POOL:T.CLUB_RUNNER_POOL,
  COACH_ATHLETE_POOL:T.COACH_ATHLETE_POOL,COACH_BETWEEN_EVENTS:T.COACH_BETWEEN_EVENTS,
  COACH_MID_RACE_EVENTS:T.COACH_MID_RACE_EVENTS,CLUB_SPONSORS_POOL:T.CLUB_SPONSORS_POOL,
  COACH_SPONSORS_POOL:T.COACH_SPONSORS_POOL,CLUB_OBJECTIVES:T.CLUB_OBJECTIVES,
  CLUB_YOUTH_POOL:T.CLUB_YOUTH_POOL,LIFE_ATHLETE_POOL:T.LIFE_ATHLETE_POOL,
  RACE_STRATEGIES:T.RACE_STRATEGIES,FAME_ACTIONS:T.FAME_ACTIONS,RIVAL_INCIDENTS:T.RIVAL_INCIDENTS};
let dups=0, noAscii=0, sinId=0;
for(const [nom,tabla] of Object.entries(TABLAS)){
  if(!Array.isArray(tabla)){err(nom+' no es un array (¿nombre mal expuesto en el bundle?)');continue;}
  const vistos=new Set();
  for(const it of tabla){
    if(it.id===undefined){sinId++;continue;}
    if(vistos.has(it.id)){err('id duplicado en '+nom, it.id);dups++;}
    vistos.add(it.id);
    // T140: los ids son claves de objeto y acaban en localStorage.
    if(!/^[\w-]+$/.test(String(it.id))){avi('id con carácter no ASCII en '+nom, it.id);noAscii++;}
  }
}
if(!dups) ok('sin ids duplicados en las '+Object.keys(TABLAS).length+' tablas');
if(!noAscii) ok('todos los ids son ASCII');
if(sinId) avi(sinId+' entradas sin campo id (tablas que no lo usan)');

// ── 2 · Todos los logros se evalúan sin reventar ─────────────────────────────
bloque('Logros · los '+T.ACHIEVEMENTS.length+' check() se ejecutan');
const RAREZAS=new Set(['easy','medium','hard','legendary','joke']);
// Estado "todo al máximo": el segundo escenario, para que un check() que solo
// falla con datos dentro (h.pos sobre un historial vacío, etc.) también corra.
function estadoLleno(){
  const g=T.freshState();
  const hist=[];
  for(let y=1;y<=12;y++) for(const r of T.RACES_DB)
    hist.push({name:r.name,year:y,pos:1,time:3600,km:r.km,dnf:false,prize:100,id:r.id});
  Object.assign(g,{year:15,money:99999,followers:200000,ranking:1,specRanking:1,
    careerHistory:hist,raceResults:hist.slice(0,6),totalCareerKm:99999,
    injuryHistory:[{year:1,type:'fractura'},{year:2,type:'rotura'}],
    personalBests:Object.fromEntries(T.RACES_DB.map(r=>[r.name,3600])),
    raceFinishedCount:99,raceAbandonedCount:0,gameMode:'dificil',
    sponsors:{1:{name:'a'},2:{name:'b'},3:{name:'c'},4:{name:'d'}},
    _abandonsByYear:{},unlockedAchievements:[],
    selectedRaces:T.RACES_DB.slice(0,6).map(r=>({...r})),
    currentRaceIdx:5});
  // Varios objKey miran el tier de la carrera del resultado, no solo la posición.
  g.raceResults=g.raceResults.map((h,i)=>({...h,tier:'nacional',pos:1,dnf:false,
    name:(T.RACES_DB[i]||T.RACES_DB[0]).name,raceId:(T.RACES_DB[i]||T.RACES_DB[0]).id}));
  return g;
}
const escenarios=[['estado inicial',()=>T.freshState()],['estado lleno',estadoLleno]];
let revientan=0, ciertosAlEmpezar=[], nuncaCiertos=[];
for(const a of T.ACHIEVEMENTS){
  if(typeof a.check!=='function'){err('logro sin check()', a.id);continue;}
  if(!a.id||!a.label||!a.desc) err('logro con id/label/desc vacío', a.id||'(sin id)');
  if(!RAREZAS.has(a.rarity)) err('rareza desconocida en '+a.id, a.rarity);
  const res=[];
  for(const [nomEsc,gen] of escenarios){
    T.setG(gen());
    try{ res.push(!!a.check(T.getG())); }
    catch(e){ err('check() lanza en '+a.id+' ('+nomEsc+')', e.message); revientan++; res.push(null); }
  }
  if(res[0]===true) ciertosAlEmpezar.push(a.id);
  if(res[0]===false && res[1]===false) nuncaCiertos.push(a.id);
}
if(!revientan) ok('ninguno lanza excepción en los dos escenarios');
// Un logro cierto en una partida recién creada está roto: se desbloquea solo.
if(ciertosAlEmpezar.length) err(ciertosAlEmpezar.length+' logros ya son ciertos en una partida nueva', ciertosAlEmpezar.join(', '));
else ok('ninguno se desbloquea solo al empezar');
// No es error: muchos dependen de datos que este escenario no simula (club,
// entrenador, canicross). Pero la lista es el sitio donde miraría primero un
// «este logro no sale nunca».
if(nuncaCiertos.length) avi(nuncaCiertos.length+' logros siguen falsos con el estado lleno (revisar si son de otro modo)', nuncaCiertos.slice(0,12).join(', ')+(nuncaCiertos.length>12?'…':''));

// ── 3 · Campos de G que freshState() no declara ──────────────────────────────
// T48/T49 (v93): antes esto solo barría el bloque de ACHIEVEMENTS y avisaba.
// Cerradas las dos tareas, barre los DOCE ficheros (once hasta el patrón de modos) y es ERROR: un campo de G
// que se escribe sin estar declarado vuelve a ser la trampa de T02/T03 — se
// guarda en disco, migrateState() no le da valor por defecto y el siguiente
// `undefined+1` es NaN, o el `.prop` de turno revienta el render.
bloque('Estado · campos de G frente a freshState()');
const declarados=new Set(Object.keys(T.freshState()));
// Recorte del bloque de ACHIEVEMENTS: lo usa también la comprobación 4.
const iniAch=LIMPIO['constants.js'].indexOf('const ACHIEVEMENTS=');
const finAch=LIMPIO['constants.js'].indexOf('const RACES_DB=');
const txtAch=LIMPIO['constants.js'].slice(iniAch,finAch);
const citados=new Map();
for(const [f,txt] of Object.entries(LIMPIO)){
  for(const m of txt.matchAll(/\bG\.([A-Za-z_$][\w$]*)/g)){
    if(!citados.has(m[1]))citados.set(m[1],new Set());
    citados.get(m[1]).add(f);
  }
}
// v98: el estado del modo dev salió de G (vive en window.DEV, devmode.js). Si vuelve a
// entrar, cargar una partida lo apaga otra vez (P1 de CR-80).
const devEnG=[...declarados].filter(k=>k.startsWith('_dev'));
if(devEnG.length) err('freshState() vuelve a declarar campos del modo dev', devEnG.join(', '));
else ok('ningún campo _dev en freshState()');
const lecturasDev=[...citados.entries()].filter(([k])=>k.startsWith('_dev')).map(([k,fs])=>k+' ['+[...fs].join(' ')+']');
if(lecturasDev.length) err('el código lee G._dev*: el estado del panel vive en window.DEV', lecturasDev.join(', '));
else ok('ninguna lectura de G._dev en js/');
const huerfanos=[...citados.keys()].filter(k=>!declarados.has(k)).sort();
if(huerfanos.length){
  err(huerfanos.length+' campos de G usados y no declarados en freshState() (T48/T49)',
      huerfanos.map(k=>k+' ['+[...citados.get(k)].join(' ')+']').join(', '));
} else ok('los '+citados.size+' campos de G usados en los '+Object.keys(LIMPIO).length+' ficheros existen en freshState()');

// ── 4 · Nombres de carrera escritos a mano dentro de los check() ─────────────
bloque('Logros · literales que citan contenido');
const nombresCarrera=new Set([...T.RACES_DB.map(r=>r.name),
  ...Object.values(T.SPEC_RACES||{}).flat().map(r=>r.name)]);
let literalesMal=0;
// Solo los literales comparados contra .name — el resto de cadenas son textos.
for(const m of txtAch.matchAll(/\.name\s*===\s*'([^']+)'/g)){
  if(!nombresCarrera.has(m[1])){err('un logro compara contra una carrera que no existe', m[1]);literalesMal++;}
}
if(!literalesMal) ok('los nombres de carrera citados existen en los datos');

// ── 5 · Coherencia interna de cada carrera ──────────────────────────────────
bloque('Carreras · '+T.RACES_DB.length+' en RACES_DB');
const TIPOS_SEG=new Set(['flat','climb','descent']);
const TIERS=new Set(Object.keys(T.TIER_LABEL_RACE));
let kmMal=0, segMal=0, desnivelMal=0, tierMal=0;
const todasLasCarreras=[...T.RACES_DB, ...Object.values(T.SPEC_RACES||{}).flat()];
for(const r of todasLasCarreras){
  for(const campo of ['id','name','km','cost','prize','month','tier','segs'])
    if(r[campo]===undefined) err('carrera sin campo obligatorio "'+campo+'"', r.id||r.name);
  if(!TIERS.has(r.tier)){err('tier desconocido en '+r.id, r.tier);tierMal++;}
  if(!Array.isArray(r.segs)||!r.segs.length){err('carrera sin tramos', r.id);segMal++;continue;}
  let sumKm=0, subida=0;
  for(const s of r.segs){
    for(const campo of ['name','km','type','gain','base'])
      if(s[campo]===undefined){err('tramo sin "'+campo+'" en '+r.id, s.name||'(sin nombre)');segMal++;}
    if(!TIPOS_SEG.has(s.type)){err('tipo de tramo desconocido en '+r.id, s.type);segMal++;}
    // Un climb con gain<=0 o un descent con gain>=0 rompe el perfil y el motor.
    if(s.type==='climb'&&!(s.gain>0)) err('tramo climb sin desnivel positivo en '+r.id, s.name);
    if(s.type==='descent'&&!(s.gain<0)) err('tramo descent sin desnivel negativo en '+r.id, s.name);
    sumKm+=s.km||0;
    if(s.gain>0) subida+=s.gain;
  }
  // El motor reparte el esfuerzo por tramo pero cobra la distancia de r.km.
  if(sumKm!==r.km){err('los tramos no suman la distancia de la carrera en '+r.id, sumKm+' km de tramos vs km:'+r.km);kmMal++;}
  // T52 (v92): el desnivel ya no se escribe a mano. Esto es el guardián: si
  // alguien vuelve a declararlo en los datos, hay otra vez dos fuentes de verdad
  // y la que se pinta puede volver a mentir (pasaba en 8 de 24 carreras).
  if(r.desnivel!==undefined){err('carrera con `desnivel` escrito a mano — se deriva de los tramos (T52)', r.id+': '+r.desnivel);desnivelMal++;}
  if(T.raceGainTotal(r)!==subida){err('raceGainTotal no coincide con la suma de los tramos en '+r.id, T.raceGainTotal(r)+' vs '+subida);desnivelMal++;}
}
if(!kmMal) ok('en todas, los tramos suman exactamente su km');
if(!segMal) ok('todos los tramos tienen name/km/type/gain/base y tipo válido');
if(!tierMal) ok('todos los tier existen en TIER_LABEL_RACE');
if(!desnivelMal) ok('ninguna declara el desnivel a mano y raceGainTotal cuadra con los tramos');

// ── 5b · T52 · un solo nombre para la distancia ─────────────────────────────
bloque('Distancia · un solo nombre');
let dist=0;
for(const [nom,tabla] of Object.entries({RACES_DB:T.RACES_DB,CLUB_RACES:T.CLUB_RACES,
    ...Object.fromEntries(Object.entries(T.SPEC_RACES||{}).map(([k,v])=>['SPEC_RACES.'+k,v]))})){
  for(const r of tabla||[]){
    // CLUB_RACES llamaba `dist` a lo mismo que el resto llama `km`.
    if(r.dist!==undefined){err('carrera con `dist` en vez de `km` en '+nom, r.id);dist++;}
    if(typeof r.km!=='number'||!(r.km>0)){err('carrera sin km numérico en '+nom, r.id+': '+r.km);dist++;}
  }
}
if(!dist) ok('todas las tablas de carrera usan `km`, y es un número positivo');
// El formato que sustituye a las cadenas a mano tiene que salir igual.
const fmtOK=T.fmtGain(600)==='600m+'&&T.fmtGain(1200)==='1.200m+'&&T.fmtGain(2800)==='2.800m+'&&T.fmtGain(0)==='0m+';
if(fmtOK) ok('fmtGain reproduce el formato de las cadenas que había escritas a mano');
else err('fmtGain no reproduce el formato original', [600,1200,2800,0].map(n=>T.fmtGain(n)).join(' · '));

// ── 6 · Referencias cruzadas entre tablas ───────────────────────────────────
bloque('Referencias cruzadas');
const idsCarrera=new Set(todasLasCarreras.map(r=>r.id));
let refsMal=0;
for(const c of T.CIRCUITS_DB) for(const id of (c.raceIds||[]))
  if(!idsCarrera.has(id)){err('el circuito '+c.id+' cita una carrera que no existe', id);refsMal++;}
// T139: EXCLUSIVE_CLUB_RACE se construye a partir de un id concreto de RACES_DB.
const usaId=(LIMPIO['constants.js'].match(/EXCLUSIVE_CLUB_RACE=\(\(\)=>\{[\s\S]{0,400}?id===['"]([^'"]+)['"]/)||[])[1];
if(usaId&&!idsCarrera.has(usaId)){err('EXCLUSIVE_CLUB_RACE se apoya en un id que ya no existe', usaId);refsMal++;}
else if(usaId) ok('EXCLUSIVE_CLUB_RACE apunta a "'+usaId+'", que existe');
if(!refsMal) ok('los circuitos citan solo carreras reales');

// ── 7 · Contenido que el motor nunca podría usar ────────────────────────────
bloque('Contenido alcanzable');
// 7a · objKey de sponsor: si el despachador no lo trata, el objetivo no se
// cumple jamás y el contrato se pierde sin que el jugador pueda hacer nada.
const objKeys=[...new Set([...T.SPONSORS_DB,...T.COACH_SPONSORS_POOL,...T.CLUB_SPONSORS_POOL]
  .map(s=>s&&s.objKey).filter(Boolean))];
let objMal=0;
for(const k of objKeys){
  T.setG(estadoLleno());
  let tratado=false;
  try{ tratado = T.checkSponsorObjective({objKey:k})===true; }catch(e){ tratado=false; }
  if(!tratado){
    // Segunda oportunidad: puede ser un objetivo de otro modo (coach/club), que
    // tiene su propio despachador. Buscamos el literal en el resto del código.
    const enCodigo=Object.entries(LIMPIO).some(([f,s])=>f!=='constants.js'&&s.includes("'"+k+"'"));
    if(!enCodigo){err('ningún despachador trata el objetivo de sponsor', k);objMal++;}
    else avi('objKey no cumplido con el estado lleno, pero sí aparece en el código', k);
  }
}
if(!objMal) ok('los '+objKeys.length+' objKey de sponsor tienen despachador');
// 7b · effect de los eventos entre carreras: mismo razonamiento. Un effect que
// no aparece en ningún `case` es una opción que el jugador puede pulsar y no
// hace nada — la familia T13/T14.
const codigoJuego=Object.entries(LIMPIO).filter(([f])=>f!=='constants.js').map(([,s])=>s).join('\n');
let efMal=0;
const efectos=[...new Set(T.BETWEEN_EVENTS.flatMap(e=>(e.choices||[]).map(c=>c.effect)).filter(Boolean))];
for(const e of efectos)
  if(!codigoJuego.includes("'"+e+"'")){err('un evento ofrece un efecto que nadie implementa', e);efMal++;}
if(!efMal) ok('los '+efectos.length+' efectos de BETWEEN_EVENTS tienen implementación');
// 7c · Los eventos con contador se buscan por id (`e.id==='xp_x'`) y se
// resuelven por id (`evId==='xp_x'`): faltar cualquiera de las dos los deja
// mudos. Los narrativos van por pool aleatorio, así que solo se les puede
// exigir la rama del resolutor.
const resolutor=LIMPIO['race.js'];
const eventosCarrera=[...T.EXPRESS_TIMED_EVENTS,...T.EXPRESS_NARRATIVE_EVENTS];
let sinRama=0, sinDisparo=0;
// T83 (v93): esto buscaba el texto "evId==='x'" en el fuente. Desde que el
// resolutor es una tabla se pregunta al OBJETO, que además es la comprobación
// buena: encontrar el texto no garantizaba que la rama fuese alcanzable — los
// ocho eventos clásicos tenían su rama, se encontraba, y aun así su narración
// la pisaba el `else` de la segunda cadena.
for(const e of eventosCarrera)
  if(typeof T.MID_RACE_RESOLVERS[e.id]!=='function'){err('evento sin resolutor: se dispara y no pasa nada', e.id);sinRama++;}
for(const e of T.EXPRESS_TIMED_EVENTS)
  if(!resolutor.includes("e.id==='"+e.id+"'")){err('evento con contador que nadie puede disparar', e.id);sinDisparo++;}
if(!sinRama) ok('los '+eventosCarrera.length+' eventos de carrera tienen resolutor en MID_RACE_RESOLVERS');
// Y al revés: un resolutor que ningún dato puede disparar es contenido muerto.
// Los ocho clásicos y los de modo normal no están en esas dos tablas, así que
// solo se avisa; lo que importa es que la cifra no crezca sin motivo.
const idsDato=new Set(eventosCarrera.map(e=>e.id));
const huerfanosEv=Object.keys(T.MID_RACE_RESOLVERS).filter(id=>!idsDato.has(id)&&!resolutor.includes("id:'"+id+"'"));
if(huerfanosEv.length) avi(huerfanosEv.length+' resolutores no aparecen en ninguna tabla de eventos', huerfanosEv.join(', '));
else ok('los '+Object.keys(T.MID_RACE_RESOLVERS).length+' resolutores son disparables');
if(!sinDisparo) ok('los '+T.EXPRESS_TIMED_EVENTS.length+' eventos con contador son disparables');
// La cadena if/else solo nombra el id de la primera opción: con tres o más,
// la tercera cae en el mismo `else` que la segunda y hace lo que no toca.
let tresOps=0;
for(const e of eventosCarrera)
  if((e.choices||[]).length>2){avi('evento de carrera con más de dos opciones y resolutor de if/else', e.id);tresOps++;}
if(!tresOps) ok('ninguno tiene más de dos opciones (el if/else del resolutor las cubre)');

// 7e · LA FAMILIA T12. El motor condiciona eventos y cálculos a propiedades que
// lee de la carrera en curso. Si ninguna carrera de los datos la lleva, ese
// código está muerto y el contenido que protege no sale jamás — y no hay
// manera de notarlo jugando, porque el síntoma es que no pasa nada.
const propsCarrera=new Set();
for(const m of resolutor.matchAll(/(?:selectedRaces\[G\.currentRaceIdx\]\??\.|\brace\??\.)([A-Za-z_$][\w$]*)/g))
  propsCarrera.add(m[1]);
const METODOS=new Set(['filter','map','find','some','every','length','forEach','slice','includes','reduce','push','join','indexOf','sort','flat','toFixed','name','id']);
const enDatos=new Set();
for(const r of todasLasCarreras) for(const k of Object.keys(r)) enDatos.add(k);
const inexistentes=[...propsCarrera].filter(k=>!enDatos.has(k)&&!METODOS.has(k)).sort();
if(inexistentes.length) err(inexistentes.length+' propiedades que race.js lee de una carrera y ninguna carrera tiene', inexistentes.join(', '));
else ok('las '+propsCarrera.size+' propiedades de carrera que lee race.js existen en los datos');
// Y las que existen pero en muy pocas: no es un bug, pero sí donde mirar si
// «ese evento no me ha salido nunca».
const raras=[...propsCarrera].filter(k=>enDatos.has(k)&&!METODOS.has(k))
  .map(k=>[k,todasLasCarreras.filter(r=>r[k]!==undefined).length])
  .filter(([,n])=>n>0&&n<=2);
for(const [k,n] of raras) avi('race.js condiciona contenido a "'+k+'", que solo tienen '+n+' carrera(s)', 'raro de ver en partida');

// 7d · todo evento con opciones debe tener al menos dos, o no es una decisión.
let unaOpcion=0;
for(const [nom,tabla] of Object.entries({BETWEEN_EVENTS:T.BETWEEN_EVENTS,
    EXPRESS_TIMED_EVENTS:T.EXPRESS_TIMED_EVENTS,EXPRESS_NARRATIVE_EVENTS:T.EXPRESS_NARRATIVE_EVENTS,
    COACH_BETWEEN_EVENTS:T.COACH_BETWEEN_EVENTS,COACH_MID_RACE_EVENTS:T.COACH_MID_RACE_EVENTS}))
  for(const e of tabla){
    const ops=e.choices||e.options;
    if(ops&&ops.length<2){err('evento con una sola opción en '+nom, e.id);unaOpcion++;}
    if(ops) for(const o of ops) if(!o.text){err('opción sin texto en '+nom+'/'+e.id);unaOpcion++;}
  }
if(!unaOpcion) ok('todos los eventos ofrecen al menos dos opciones con texto');

// ── 8 · Calendario ──────────────────────────────────────────────────────────
// ── T54 (v93) · una sola tabla de etiquetas de modo ──────────────────────────
// Eran seis tablas repartidas y ninguna coincidía con otra; dos ni siquiera
// tenían los ocho modos, así que en Exprés pintaban `undefined`. Ahora
// MODE_LABELS es la única, y esto impide que vuelva a escribirse otra a mano:
// ningún fichero salvo constants.js puede contener un literal `facil:` o
// `hardcore:`, que es la forma que tenían las seis.
bloque('Interfaz · etiquetas de modo');
const MODOS=['facil','medio','dificil','hardcore','expres','coach','club','canicross'];
// Paso 6 (2026-10-30): sin bg/fg; el color de cada modo lo da el chasis (data-modo), no el dato.
const faltan=MODOS.filter(m=>!T.MODE_LABELS[m]||!T.MODE_LABELS[m].label||!T.MODE_LABELS[m].emoji);
if(faltan.length) err('modos sin entrada completa en MODE_LABELS', faltan.join(', '));
else ok('los '+MODOS.length+' modos tienen label y emoji');
const sueltas=Object.entries(LIMPIO).filter(([f,t])=>f!=='constants.js'&&/\b(facil|hardcore):\s*'/.test(t)).map(([f])=>f);
if(sueltas.length) err('tabla de etiquetas de modo escrita a mano fuera de constants.js (T54)', sueltas.join(', '));
else ok('ningún fichero repite la tabla de modos');
if(Object.keys(T.PHASE_LABEL).length!==4) err('PHASE_LABEL debería tener las 4 fases del arco narrativo');
else ok('las 4 fases del arco narrativo tienen etiqueta única');

bloque('Calendario');
let calMal=0;
for(const r of T.RACES_DB){
  if(!(r.month>=1&&r.month<=12)){err('mes fuera de rango en '+r.id, r.month);calMal++;}
  const qEsperado=Math.floor((r.month-1)/3)+1;
  if(r.quarter!==undefined&&r.quarter!==qEsperado){avi('el trimestre no corresponde al mes en '+r.id, 'month:'+r.month+' → Q'+qEsperado+', pero pone quarter:'+r.quarter);calMal++;}
}
if(!calMal) ok('meses en rango y trimestres coherentes');

// ── 9 · T53 · el corte de render.js no puede haber roto nada ─────────────────
bloque('Estructura de los ficheros');
const fsx=require('fs'), pathx=require('path');
const JS=pathx.join(__dirname,'..','js');
const HTML=fsx.readFileSync(pathx.join(__dirname,'..','index.html'),'utf8');
const {FILES}=require('./_bundle');

// 9a · Los .js del disco y los que carga index.html tienen que ser los mismos, en
// el mismo orden. Un fichero nuevo que nadie incluye no da error: simplemente sus
// funciones no existen, y solo se nota al pulsar el botón que las llama.
const enDisco=fsx.readdirSync(JS).filter(f=>f.endsWith('.js')).sort();
const enHtml=[...HTML.matchAll(/js\/([\w-]+\.js)\?v=\d+/g)].map(m=>m[1]);
const faltanEnHtml=enDisco.filter(f=>!enHtml.includes(f));
const sobranEnHtml=enHtml.filter(f=>!enDisco.includes(f));
if(faltanEnHtml.length) err('ficheros en js/ que index.html no carga', faltanEnHtml.join(', '));
if(sobranEnHtml.length) err('index.html carga ficheros que no existen', sobranEnHtml.join(', '));
if(!faltanEnHtml.length&&!sobranEnHtml.length) ok('los '+enDisco.length+' ficheros de js/ son exactamente los que carga index.html');
// 9b · Y el banco de pruebas tiene que usar ESE orden, no otro: si no, un test
// puede pasar con un orden que el navegador nunca ejecuta.
const ordenHtml=enHtml.join(',');
if(FILES.join(',')!==ordenHtml) err('tests/_bundle.js carga los ficheros en otro orden que index.html', 'bundle: '+FILES.join(',')+' · html: '+ordenHtml);
else ok('el banco de pruebas usa el mismo orden de carga que index.html');

// 9c · Ningún nombre de nivel raíz puede estar declarado en dos ficheros: en el
// navegador son un único ámbito global, y dos `const` con el mismo nombre lanzan
// SyntaxError antes de que arranque nada.
const RE_TOP=/^(?:function\s+([\w$]+)|(?:const|let|var)\s+([\w$]+)\s*=)/gm;
const dueño=new Map(); let choques=0;
for(const f of FILES){
  const txt=LIMPIO[f]||fsx.readFileSync(pathx.join(JS,f),'utf8');
  for(const m of txt.matchAll(RE_TOP)){
    const n=m[1]||m[2];
    if(dueño.has(n)&&dueño.get(n)!==f){err('nombre de nivel raíz declarado en dos ficheros', n+': '+dueño.get(n)+' y '+f);choques++;}
    else dueño.set(n,f);
  }
}
if(!choques) ok('los '+dueño.size+' nombres de nivel raíz son únicos entre los '+FILES.length+' ficheros');

// 9d · LA COMPROBACIÓN QUE IMPORTA TRAS MOVER FUNCIONES DE FICHERO: cada manejador
// citado desde el HTML que genera el juego tiene que existir. Si el corte hubiera
// perdido una función, el síntoma sería un botón que no hace nada al pulsarlo —
// invisible hasta que alguien lo pulsa, en la pantalla concreta donde vive.
const definidos=new Set(dueño.keys());
for(const f of FILES)
  for(const m of (LIMPIO[f]||'').matchAll(/^window\.([\w$]+)\s*=/gm)) definidos.add(m[1]);
// Lo que aporta el navegador, más `render` y `G`, que sí son del juego.
for(const g of ['document','window','event','Math','JSON','Object','Array','String','Number',
  'localStorage','console','history','location','alert','confirm','setTimeout','clearTimeout',
  'requestAnimationFrame','parseInt','parseFloat','encodeURIComponent','decodeURIComponent','G'])
  definidos.add(g);
const PALABRAS=new Set(['if','for','while','switch','return','typeof','function','catch','new','do','else']);
const manejadores=new Map();
for(const [f,txt] of Object.entries(LIMPIO).concat([['index.html',HTML]]))
  // El atributo va siempre entre comillas dobles en este proyecto; dentro se usan
  // simples. Hay que leer el atributo ENTERO y no solo su primera sentencia,
  // porque la mitad de los manejadores se montan dentro de una expresión de
  // plantilla: onclick="${locked?'':'toggleCircuit(\''+c.id+'\')'}".
  for(const m of txt.matchAll(/\bon(?:click|input|change|submit|keyup|blur|focus)\s*=\s*"([^"]*)"/g))
    // `([^.\w$])` delante evita contar los métodos (`x.foo()`), y exigir que el
    // paréntesis vaya PEGADO al nombre evita la prosa: «ranking (recientes)».
    for(const c of m[1].matchAll(/(?:^|[^.\w$])([\w$]+)\(/g))
      if(!PALABRAS.has(c[1])&&!manejadores.has(c[1])) manejadores.set(c[1], f);
let sinDefinir=0;
for(const [n,f] of manejadores)
  if(!definidos.has(n)){err('un manejador del HTML llama a algo que no existe', n+'() citado desde '+f);sinDefinir++;}
if(!sinDefinir) ok('los '+manejadores.size+' manejadores citados desde el HTML existen y están definidos');

// ── 10 · v102 · Dirección visual: ningún hex fuera de los tokens ─────────────
// TG-Direccion-Visual § 6. Los colores viven como tokens en el :root de
// index.html y los renders escriben var(--token). Hoy hay ~2.000 hex repartidos
// por todo el juego: cada fichero tiene un TECHO con los que lleva, y es ERROR
// pasarse. Al migrar una pantalla el número baja y aquí se avisa de bajar su
// techo, para que lo ganado no se pueda volver a perder. Cuando un fichero llega
// a 0 se quita de la lista y desde ahí cualquier hex es ERROR.
// devmode.js queda fuera a propósito: el panel de desarrollo tiene estilo propio.
bloque('10 · Dirección visual: hex fuera de los tokens');
// Vacía desde el 2026-10-30 (paso 6 acabado): ningún fichero puede tener hex fuera del bloque de
// tokens. Si algún día hace falta una excepción, va aquí con su techo y su porqué.
const HEX_TECHO={};
const HEX_FUERA=new Set(['devmode.js']);
// `&#127939;` es una entidad HTML, no un color; `#tab-nav` un selector, no un hex.
const RE_HEX=/(?<![&\w])#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![\w-])/g;
function sinTokens(html){
  // El bloque de tokens es el único sitio con hex permitido (del comentario
  // «DIRECCIÓN VISUAL (v102) · TOKENS» a las @font-face de Barlow).
  const a=html.indexOf('/* ══ DIRECCIÓN VISUAL (v102) · TOKENS'),b=html.indexOf('/* Barlow servida');
  if(a<0||b<a){err('index.html: no encuentro el bloque de tokens','¿se ha movido el comentario de cabecera?');return html;}
  // La meta theme-color tampoco cuenta: es el --ground escrito a mano porque una meta no lee var().
  return (html.slice(0,a)+html.slice(b)).replace(/\/\*[\s\S]*?\*\//g,'').replace(/<!--[\s\S]*?-->/g,'')
    .replace(/<meta name="theme-color" content="#[0-9a-fA-F]{6}">/,'');
}
{
  const cuentas=Object.entries(LIMPIO).filter(([f])=>!HEX_FUERA.has(f))
    .map(([f,t])=>[f,(t.match(RE_HEX)||[]).length]).concat([['index.html',(sinTokens(HTML).match(RE_HEX)||[]).length]]);
  let total=0,mal=0;
  for(const [f,n] of cuentas){
    total+=n;
    const techo=HEX_TECHO[f]||0;
    if(n>techo){err(f+': '+n+' hex, el techo es '+techo,'usa var(--token) de index.html (TG-Direccion-Visual § 2)');mal++;}
    else if(n<techo) avi(f+': '+n+' hex, por debajo del techo '+techo,'baja HEX_TECHO[\''+f+'\'] a '+n+' en tests/content.js');
  }
  for(const f of Object.keys(HEX_TECHO)) if(!cuentas.some(([g])=>g===f)) avi('HEX_TECHO cita '+f+', que no existe','quítalo de la lista');
  if(!mal) ok(total+' hex fuera de los tokens, ninguno nuevo (techo por fichero en HEX_TECHO)');
}

console.log('\n'+(errores===0
  ? '✅ CONTENIDO OK'+(avisos?'  ('+avisos+' avisos, ninguno bloquea)':'')
  : '❌ '+errores+' ERRORES de contenido'+(avisos?' · '+avisos+' avisos':'')));
process.exit(errores?1:0);
