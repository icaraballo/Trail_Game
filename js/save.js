const LS_PREFIX='mpt_';
const LS={
  get:(k)=>{try{return localStorage.getItem(LS_PREFIX+k);}catch(e){return null;}},
  // PUB-15 (v99): se guarda el nombre del error para que el aviso diga si es cuota
  // llena o un navegador que no deja guardar (Safari privado, datos bloqueados).
  set:(k,v)=>{try{localStorage.setItem(LS_PREFIX+k,v);LS.lastErr=null;return true;}catch(e){LS.lastErr=(e&&e.name)||'Error';return false;}},
  del:(k)=>{try{localStorage.removeItem(LS_PREFIX+k);}catch(e){}}
};
// Migración one-shot v40→v41: claves sin prefijo → mpt_*
(function migrateLS_v41(){
  try{
    if(localStorage.getItem(LS_PREFIX+'migrated_v41'))return;
    const legacy=['trail_unlocked'];
    for(let i=0;i<10;i++)legacy.push('trail_save_slot_'+i);
    legacy.forEach(k=>{
      const v=localStorage.getItem(k);
      if(v!==null){
        const nk=k.replace(/^trail_/,'');
        try{localStorage.setItem(LS_PREFIX+nk,v);localStorage.removeItem(k);}catch(e){}
      }
    });
    localStorage.setItem(LS_PREFIX+'migrated_v41','1');
  }catch(e){}
})();
const GAME_BUILD=108; // incrementar con cada versión del juego
const SAVE_KEY='save_slot_';
const SAVE_VERSION='TRAIL_SAVE_V2';
const NUM_SLOTS=5;

// Contadores de progreso/logros con prefijo _ que SÍ deben sobrevivir al guardado
// (se leen desde ACHIEVEMENTS en constants.js). El resto de claves _ son timers,
// handles o flags de un solo render y no deben persistirse.
const PERSISTENT_UNDERSCORE_KEYS=[
  '_raceResult',   // paso 6 (dirección visual): el resultado de la última carrera, como datos (T88/T122)
  '_nemesisDefeatCount','_firstSponsorObjMet','_wonWithTaper','_sponsorRenewals',
  '_cleanSponsorSeason','_clubFisioUsed','_clubEntrenadorUsed','_clubLoyaltyStreak',
  '_clubLoyaltyId','_clubAscent','_sponsorNegotiations','_sponsorBreaks',
  '_distinctPenaltySponsorIds','_abandonsByYear','_lastPlaceCount','_sabotageCount',
  '_helpingCount','_stormLowEnergyFinishes','_noTrainSeasonDone','_retireYear',
  '_rivalLossStreak','_xpTimerAnsweredCareer','_xpTimerExpiredCareer','_xpAllTimedInARace',
  '_xpNoAnswerRace','_xpPerfectTimedRace','_cnInjuryComeback','_cnBondRecovered',
  '_cnBondMinReached','_cnLowBondRaced','_cnDogDnfCount','_cnDogHealthyStreak',
  '_cnDogHealthyPrev','_cnDogInjury2Consecutive','_cnPerfectSeasons','_cnRacedWithoutCommands',
  '_cnLastPlaceCount','_cnPreseasonNothing','_cnIgnoredVetSeason','_cnVetThisSeason',
  '_yearObjectiveRewardPaid',
  // T02 (v81): estos cinco los escribe el código y los leen logros reales de
  // ACHIEVEMENTS, pero faltaban aquí, así que serializableState() los descartaba.
  // Si el logro no se comprobaba en la misma sesión, no se desbloqueaba nunca;
  // _clubObjectivesMet es un contador acumulado hasta 3, así que se reiniciaba
  // en cada recarga y su logro era directamente inalcanzable.
  '_coachClubOfferReceived','_coachBeatNemesis','_coachPerfectSeason',
  '_clubCanteraPromoted','_clubObjectivesMet',
  // T107 (v93): el comentario de freshState() dice «para no repetir toasts»,
  // pero al no persistir se vaciaba en cada recarga y los cinco avisos de
  // umbral volvían a salir en la siguiente carrera. Mismo caso que _yearObjectiveRewardPaid.
  '_thresholdsSeen',
];

// Devuelve una copia de G sin las claves transitorias (timers, flags de un solo
// render, cachés de HTML) pero conservando los contadores de logros (prefijo _
// que están en PERSISTENT_UNDERSCORE_KEYS).
function serializableState(){
  const clean={};
  for(const k in G){
    if(!k.startsWith('_')||PERSISTENT_UNDERSCORE_KEYS.includes(k)) clean[k]=G[k];
  }
  // DEV: si devUnlockAllAchievements() está activo, el guardado usa el respaldo
  // real en vez del desbloqueo de prueba — así el botón de dev sigue siendo
  // "solo en memoria" de verdad, sin importar cuántos guardados ocurran mientras
  // dure la sesión (unlockedAchievements no es una clave '_', se guarda siempre).
  // v98: el estado del panel vive en window.DEV, fuera de G (devmode.js).
  const da=window.DEV&&window.DEV.ach; if(da&&da.dirty) clean.unlockedAchievements=da.backup||[];
  return JSON.parse(JSON.stringify(clean));
}

// Fusiona un save con freshState() para añadir campos nuevos que no existían
// cuando se creó el save. Garantiza que cargar una partida vieja no deja
// propiedades undefined que revienten el render.
// v94: fase de desarrollo sin partidas guardadas. Se retiraron las conversiones
// de formatos históricos (T140, T52, v65, T115, T45, T25, T24) y no se escriben
// migraciones nuevas: lo que queda es el merge estructural, que protege la
// partida guardada ayer cuando hoy se añade un campo a freshState(). Esta regla
// se invierte con la primera publicación pública.
// v107 (2026-10-30): fuera los nombres reales de carreras, marcas y lugares que identifican
// recorridos (PUB-04 de TG-Informe-Publicacion). Las partidas guardadas los llevan en el
// historial, los récords y los textos: al cargar se traducen aquí, de lo largo a lo corto, en
// cada texto y cada clave. Es el único sitio del código donde quedan, y no se pinta nunca.
const SAVE_NOMBRES_VIEJOS=[
  ['Zegama-Aizkorri Open','Maratón de Harrigorri Open'],
  ['Zegama-Aizkorri','Maratón de Harrigorri'],
  ['Zegama Skyrace','Skyrace de Harrigorri'],
  ['Trail Mágina','Trail de la Sierra Alta'],
  ['La Pedriza Trail','Trail de los Canchos'],
  ['Copa Catalana de Trail','Copa Regional de Trail'],
  ['Maratón de Montaña de Guadarrama','Maratón de Montaña de la Sierra'],
  ['Buff Epic Trail','Gran Trail de los Lagos'],
  ['Maratón Alpino Madrileño','Maratón Alpino de la Meseta'],
  ['KV Canfranc · Vertical','KV de la Canal · Vertical'],
  ['Ultra Pirineu UP55','Ultra de los Tres Ríos 55'],
  ['Ultra Sierra Nevada','Ultra de la Sierra Blanca'],
  ['Monte Perdido Trail 50K','Trail del Monte Olvidado 50K'],
  ['Transvulcania Ultramarathon','Ultra de los Volcanes'],
  ['Andalucía Ultra Trail','Ultra Trail del Sur'],
  ['100 Millas de Aneto','Ultra del Gran Glaciar'],
  ['Trail dels Bastions','Trail de las Murallas'],
  ['UTMB OCC','Travesía de los Glaciares 55'],
  ['Descenso de Jaca','Descenso del Valle'],
  ['TransValles Cantábrico','TransValles del Norte'],
  ['TransPirenaica Técnica','Travesía Técnica de la Cordillera'],
  ['Copa Spain Trail','Copa Nacional de Trail'],
  ['Ultra Alpujarra Trail','Ultra de las Alquerías'],
  ['Transandalus Trail','Gran Travesía del Sur'],
  ['Circuito Vasco Trail','Circuito del Norte de Trail'],
  ['Vertical del Gorbea','Vertical de la Cruz'],
  ['Vuelta al Txindoki','Vuelta al Pico Agudo'],
  ['Copa de Clubes País Vasco','Copa de Clubes del Norte'],
  ['Ultra Aralar','Ultra de la Sierra Verde'],
  ['Canicross del Montseny','Canicross del Macizo'],
  ['Canicross Serra de Tramuntana','Canicross de la Sierra del Norte'],
  ['Canicross Guadarrama','Canicross de la Sierra Fría'],
  ['Canicross Volcànic','Canicross de los Volcanes'],
  ['Canicross Moncayo','Canicross del Monte Cano'],
  ['Copa de España Canicross','Copa Nacional de Canicross'],
  ['Canicross Valle de Benasque','Canicross del Valle Alto'],
  ['Campeonato de España Canicross','Campeonato Nacional de Canicross'],
  ['Polar Elite System','Pulso Elite System'],
  ['Garmont Pro GPS','Cumbre Pro GPS'],
  ['Suunto Club','Brújula Club'],
  ['Salomon Team','Sendero Team'],
  ['Clif Bar','Barrita Cima'],
  ['Suunto','Brújula'],
  ['Salomon','Sendero'],
  ['Salida Zumarraga','Salida de la plaza'],
  ['Subida Usategi','Subida al collado'],
  ['Cresta Aizkorri','Cresta de Harrigorri'],
  ['Subida Aratz','Subida a la cumbre norte'],
  ['Valle de Zegama','Valle de Harrigorri'],
  ['Meta Zegama','Meta en Harrigorri'],
  ['Salida Navacerrada','Salida del puerto'],
  ['Subida Siete Picos','Subida a los Siete Dientes'],
  ['Valle Lozoya','Valle del río'],
  ['Subida Peñalara','Subida al pico mayor'],
  ['Salida Canfranc','Salida del pueblo'],
  ['Salida Orsières','Salida del valle'],
  ['Lac de Champex','El lago'],
  ['Subida Champex','Subida al lago'],
  ['Bajada Vallorcine','Bajada al pueblo'],
  ['Subida Tête Vents','Subida de los vientos'],
  ['Cresta Brévent','Cresta del balcón'],
  ['Gran Descenso Chamonix','Gran descenso final'],
  ['Salida Benasque','Salida del valle'],
  ['Meta Benasque','Meta en el valle'],
  ['Subida Aneto 1','Subida al glaciar 1'],
  ['Subida Aneto 2','Subida al glaciar 2'],
  ['Repecho de la Pedriza','Repecho de los canchos'],
  ['Zegama','Harrigorri']
];
function renombrarNombresViejos(v){
  if(typeof v==='string'){let t=v;for(const [a,b] of SAVE_NOMBRES_VIEJOS)if(t.includes(a))t=t.split(a).join(b);return t;}
  if(Array.isArray(v))return v.map(renombrarNombresViejos);
  if(v&&typeof v==='object'){const o={};for(const k in v)o[renombrarNombresViejos(k)]=renombrarNombresViejos(v[k]);return o;}
  return v;
}
function migrateState(saved){
  saved=renombrarNombresViejos(saved);
  const base=freshState();
  const merged={...base,...saved};
  // Merge profundo en las estructuras anidadas críticas
  if(saved.runner){
    merged.runner={...base.runner,...saved.runner};
    merged.runner.stats={...base.runner.stats,...(saved.runner.stats||{})};
  }
  merged.sponsors={...base.sponsors,...(saved.sponsors||{})};
  merged.spending={...base.spending,...(saved.spending||{})};
  merged.workByQuarter={...base.workByQuarter,...(saved.workByQuarter||{})};
  merged.vacByQuarter={...base.vacByQuarter,...(saved.vacByQuarter||{})};
  merged.openQuarters={...base.openQuarters,...(saved.openQuarters||{})};
  merged.fameActionsThisSeason={...(saved.fameActionsThisSeason||{})};
  merged.personalBests={...(saved.personalBests||{})};
  merged.careerRaceHistory={...(saved.careerRaceHistory||{})};
  merged.circuitPoints={...(saved.circuitPoints||{})};
  merged.rivalRetirements={...(saved.rivalRetirements||{})};
  merged.midRaceEventTriggered={...(saved.midRaceEventTriggered||{})};
  // Asegurar arrays
  ['selectedRaces','raceResults','careerHistory','rivals','lastRaceGains',
   'injuryHistory','monthlyEvents','sponsorPenalties','joinedCircuits','circuitCompleted',
   'seasonDiary','aidSelected','paceLog','rivalChildren','lifePendingAthletes',
   'dropbagItems','workPromotionsUsed','repInvitations',
   'coachSelectedRaces','coachRaceResults','coachAthleteHistory','coachDecisionLog',
   'coachEventLog','coachRoster','coachSponsors','unlockedAchievements',
   'cnVetHistory','cnRaceResults','cnSelectedRaces','rivalIncidents',
   // T48 (v93): los cuatro arrays que se guardaban sin estar declarados
   'dropbagUsed','cnPreseasonDone','cnOpenMonths','cnOpenSeasonMonths','dogs','cnCancelledRaces']
    .forEach(k=>{if(!Array.isArray(merged[k]))merged[k]=Array.isArray(base[k])?[...base[k]]:[];});
  // T48/T51 (v93): race.js ya lee G.terrainCondition sin guarda, así que un save
  // con la clave a null (nada la escribe hoy, pero `{...base,...saved}` deja
  // ganar al save) reventaría el render de la carrera. Se restituye el neutro.
  if(!merged.terrainCondition||typeof merged.terrainCondition!=='object')merged.terrainCondition={...TERRAIN_BUENO};
  if(!merged.achievementMeta||typeof merged.achievementMeta!=='object')merged.achievementMeta={};
  // Canicross se está reescribiendo por pasos (TG-Diseno-Canicross § 12) y su ficha avisa de
  // que sus partidas no pasan al rediseño. Una de Canicross con una revisión menor que
  // CN_REV no se intenta jugar: se abre «canicrossAntigua», que lo explica. Se conserva su
  // cnRev viejo para que, si se autoguarda desde ahí, siga sin pasar la próxima vez.
  // Los demás modos no se tocan.
  if((saved.gameMode==='canicross'||saved.canicrossMode)&&(Number(saved.cnRev)||0)<CN_REV){
    merged.cnRev=Number(saved.cnRev)||0;
    merged.screen='canicrossAntigua';
  }
  // Deep-merge de objetos anidados adicionales
  // T125 (v92): estos cinco hacían {...null, ...saved.x} porque los cinco valen
  // null en freshState(): aparentaban dar valores por defecto a saves antiguos y
  // no daban ninguno. Se deja el clon, que sí sirve, y se quita el merge que
  // mentía. Cuando T48/T49 les den forma por defecto, volverá a tener sentido.
  // `club` se queda con su merge: ese sí tiene un objeto real detrás.
  // Canicross, paso 1 del rediseño: G.dog pasó a G.dogs[]. Un G.dog que llegue de una
  // partida de antes no se convierte (ver la revisión de Canicross justo debajo): se quita.
  delete merged.dog;
  if(Array.isArray(saved.dogs))merged.dogs=saved.dogs.filter(d=>d&&typeof d==='object').map(d=>({...d}));
  if(saved.club)         merged.club={...base.club,...saved.club};
  if(saved.clubModeData) merged.clubModeData={...saved.clubModeData};
  if(saved.ownBrand)     merged.ownBrand={...saved.ownBrand};
  if(saved.cnRaceState)  merged.cnRaceState={...saved.cnRaceState};
  if(saved.coachAthlete) merged.coachAthlete={...saved.coachAthlete};
  if(saved.lifeAthlete)  merged.lifeAthlete={...base.lifeAthlete,...saved.lifeAthlete};
  if(saved.trainingMomentum) merged.trainingMomentum={...base.trainingMomentum,...saved.trainingMomentum};
  if(saved.trainingBlock)merged.trainingBlock={...base.trainingBlock,...saved.trainingBlock};
  // T15 (v89): saves anteriores pueden traer el bonus horneado en runner.stats
  // (C2). No hay forma de saber cuánto era, así que no se intenta deshacer: se
  // garantiza que el campo existe y a cero para que a partir de aquí no vuelva
  // a pasar. Un save guardado a mitad de carrera sí conserva sus modificadores.
  const _rm=merged.raceModifiers;
  merged.raceModifiers={
    mental:Number(_rm?.mental)||0,
    velocidad:Number(_rm?.velocidad)||0,
    subida:Number(_rm?.subida)||0,
  };
  // T43 (v88): vacByQuarter[q] existía como número y como {amount}. vacDaysUsed()
  // trataba las dos formas pero vacTrainingHBonus() solo la numérica: con la otra
  // devolvía NaN y contaminaba las horas de entrenamiento. Se normaliza a número.
  Object.keys(merged.vacByQuarter||{}).forEach(q=>{
    const v=merged.vacByQuarter[q];
    const n=(v&&typeof v==='object')?Number(v.amount):Number(v);
    merged.vacByQuarter[q]=Number.isFinite(n)?n:0;
  });
  // T44 (v88): nemesisLog[nombre] existía como {gaps:[]} y como {gapSum,gapCount},
  // con la conversión repetida en línea dentro de race.js. Se hace aquí una vez.
  Object.keys(merged.nemesisLog||{}).forEach(k=>{
    const d=merged.nemesisLog[k];
    if(!d||typeof d!=='object'){delete merged.nemesisLog[k];return;}
    if(Array.isArray(d.gaps)){
      d.gapSum=(d.gapSum||0)+d.gaps.reduce((a,b)=>a+(Number(b)||0),0);
      d.gapCount=(d.gapCount||0)+d.gaps.length;
      delete d.gaps;
    }
    d.wins=Number(d.wins)||0;
    d.gapSum=Number(d.gapSum)||0;
    d.gapCount=Number(d.gapCount)||0;
  });
  return merged;
}

// Valida y sanea un estado. Clampa numéricos, limita strings, asegura shape mínimo.
// No muta el input — devuelve una copia saneada o null si es inválido.
function sanitizeState(raw){
  if(!raw||typeof raw!=='object')return null;
  if(!raw.runner||typeof raw.runner!=='object')return null;
  if(!raw.runner.stats||typeof raw.runner.stats!=='object')return null;
  if(typeof raw.runner.name!=='string')return null;
  if(typeof raw.year!=='number'||!Number.isFinite(raw.year))return null;
  if(typeof raw.money!=='number'||!Number.isFinite(raw.money))return null;
  const s=JSON.parse(JSON.stringify(raw));
  const clampI=(v,lo,hi,def)=>{const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(lo,Math.min(hi,n)):def;};
  s.runner.name=String(s.runner.name||'').slice(0,30);
  s.runName=String(s.runName||'').slice(0,40);
  s.year=clampI(s.year,1,50,1);
  s.money=clampI(s.money,0,9999999,0);
  // T29 (v86)
  s.debt=clampI(s.debt,0,9999999,0);
  s.debtSeasons=clampI(s.debtSeasons,0,99,0);
  s.forcedFullTime=!!s.forcedFullTime;
  s.careerEnded=(typeof s.careerEnded==='string')?s.careerEnded.slice(0,20):null;
  s.debtInterestTotal=clampI(s.debtInterestTotal,0,9999999,0);   // T29b (v87)
  s.runner.age=clampI(s.runner.age,14,80,25);
  s.runner.energy=clampI(s.runner.energy,0,100,100);
  s.runner.hydration=clampI(s.runner.hydration,0,100,100);
  s.runner.legs=clampI(s.runner.legs,0,100,100);
  ['resistencia','velocidad','subida','bajada','nutricion','mental'].forEach(k=>{
    s.runner.stats[k]=clampI(s.runner.stats[k],0,100,50);
  });
  s.ranking=clampI(s.ranking,1,999,999);
  s.specRanking=clampI(s.specRanking,1,999,999);
  s.bodyLoad=clampI(s.bodyLoad,0,100,0);
  s.currentRaceIdx=clampI(s.currentRaceIdx,0,50,0);
  s.followers=clampI(s.followers,0,99999999,0);
  s.coachReputation=clampI(s.coachReputation,0,100,0);
  s.coachTrust=clampI(s.coachTrust,0,100,60);
  // T30 (v88): solo se recortaban runner.name y runName. Todas estas cadenas se
  // pintan en la interfaz y venían de un save importado sin tocar. showToast usa
  // textContent y esc() escapa el HTML, así que no había inyección abierta (ver
  // T09), pero sí un nombre de 50.000 caracteres capaz de reventar el layout.
  const cut=(v,n)=>typeof v==='string'?v.slice(0,n):v;
  if(s.club&&typeof s.club==='object')s.club.name=cut(s.club.name,40);
  if(s.clubModeData&&typeof s.clubModeData==='object'){
    s.clubModeData.name=cut(s.clubModeData.name,40);
    if(Array.isArray(s.clubModeData.runners))
      s.clubModeData.runners.forEach(r=>{if(r&&typeof r==='object')r.name=cut(r.name,30);});
  }
  s.clubCompanion=cut(s.clubCompanion,40);
  if(s.coachAthlete&&typeof s.coachAthlete==='object')s.coachAthlete.name=cut(s.coachAthlete.name,30);
  if(Array.isArray(s.dogs))s.dogs.forEach(d=>{if(d&&typeof d==='object')d.name=cut(d.name,30);});
  if(s.lifeAthlete&&typeof s.lifeAthlete==='object')s.lifeAthlete.name=cut(s.lifeAthlete.name,30);
  if(Array.isArray(s.rivals))s.rivals.forEach(r=>{if(r&&typeof r==='object')r.name=cut(r.name,40);});
  // Ultratrail (§ 31 del diseño): una sola entrada, G.ut. Números acotados y listas como listas.
  if(s.ut&&typeof s.ut==='object'){
    const u=s.ut;
    u.temporada=clampI(u.temporada,1,50,1);
    u.semana=clampI(u.semana,1,53,1);
    u.dinero=clampI(u.dinero,-9999999,9999999,0);
    u.cicloDesde=clampI(u.cicloDesde,-60,60,1);
    u.recuperaHasta=clampI(u.recuperaHasta,-60,120,1);
    ['calendario','planes','historial','movimientos','diario','visitas'].forEach(k=>{if(!Array.isArray(u[k]))u[k]=[];});
    if(u.carrera!=null&&typeof u.carrera!=='object')u.carrera=null;
    // 5b: preparaciones (0-100), carga y secuelas
    const pr=(u.prep&&typeof u.prep==='object')?u.prep:{};
    u.prep={};['base','encaje','estomago','nocturna','termica'].forEach(k=>{u.prep[k]=Math.max(0,Math.min(100,Number(pr[k])||0));});
    u.carga=Math.max(0,Math.min(100,Number(u.carga)||0));
    if(!Array.isArray(u.secuelas))u.secuelas=[];
    // 5c: piedras, sorteo y créditos de voluntario
    const pi=(u.piedras&&typeof u.piedras==='object')?u.piedras:{};
    u.piedras={saldo:Math.max(0,Math.min(999,Math.round(Number(pi.saldo)||0))),ultima:Number.isFinite(Number(pi.ultima))&&pi.ultima!=null?Number(pi.ultima):null};
    if(u.sorteo!=null&&typeof u.sorteo!=='object')u.sorteo=null;
    if(u.sorteo===undefined)u.sorteo=null;
    ['sorteos','creditoVoluntario'].forEach(k=>{if(!Array.isArray(u[k]))u[k]=[];});
    // 5d: material, índice por temporada, reconocimiento por sectores y la víspera
    const ma=(u.material&&typeof u.material==='object')?u.material:{};
    u.material={frontal:!!ma.frontal,bastones:!!ma.bastones,chaqueta:!!ma.chaqueta,zapatillasKm:Math.max(0,Math.min(99999,Math.round(Number(ma.zapatillasKm)||0)))};
    ['indices','reco','recoSuelo'].forEach(k=>{if(!u[k]||typeof u[k]!=='object'||Array.isArray(u[k]))u[k]={};});
    if(u.vispera!=null&&typeof u.vispera!=='object')u.vispera=null;
    if(u.vispera===undefined)u.vispera=null;
    if(!['completa','reducida','material','profesional'].includes(u.escalon))u.escalon='completa';
    // Paso 7: veteranía, semanas de recuperación por año, el epílogo y la retirada
    u.veterania=Math.max(0,Math.min(100,Number(u.veterania)||0));
    if(!u.semanasRecupera||typeof u.semanasRecupera!=='object'||Array.isArray(u.semanasRecupera))u.semanasRecupera={};
    if(u.final!=null&&typeof u.final!=='object')u.final=null;
    if(u.final===undefined)u.final=null;
    u.retirado=!!u.retirado;
    u.contactoSponsor=!!u.contactoSponsor;
    const op=(u.opciones&&typeof u.opciones==='object')?u.opciones:{};
    // alucina: grado máximo (diario · pantalla · todas); las de antes eran sí/no
    u.opciones={alucina:['diario','pantalla','todas'].includes(op.alucina)?op.alucina:op.alucina===false?'diario':'pantalla',tenso:!!op.tenso};
  }else if(s.ut!=null)s.ut=null;
  if(Array.isArray(s.coachRoster))s.coachRoster.forEach(sl=>{
    if(sl&&typeof sl==='object'&&sl.coachAthlete&&typeof sl.coachAthlete==='object')
      sl.coachAthlete.name=cut(sl.coachAthlete.name,30);
  });
  return cleanSavedTexts(s);
}

// PUB-01 (v99): el save no lleva solo lo que escribe el jugador (eso ya pasa por
// esc()), también copias de datos del juego —carreras, tramos, rivales, eventos,
// patrocinios, objetivos— que se pintan con ${x.name} sin escapar en más de cien
// plantillas. Una partida exportada con HTML dentro de esos textos ejecutaba código
// al importarla, y en icaraballo.github.io eso alcanza el localStorage de todos los
// juegos. En vez de perseguir las plantillas, se limpia todo texto y toda clave al
// entrar: los cinco caracteres que abren HTML o cierran un atributo pasan a su
// equivalente tipográfico, que se lee igual. Ningún texto del juego usa marcado.
// PUB-03: de paso se descartan __proto__, constructor y prototype, que con el
// Object.assign(G,…) de loadSlot cambiaban el prototipo de G.
const SAVE_TEXT_SWAP={'<':'‹','>':'›','"':'”',"'":'’','`':'’'};
const SAVE_BAD_KEYS=['__proto__','constructor','prototype'];
function cleanSavedText(v){return v.replace(/[<>"'`]/g,c=>SAVE_TEXT_SWAP[c]);}
function cleanSavedTexts(v){
  if(typeof v==='string')return cleanSavedText(v);
  if(Array.isArray(v))return v.map(cleanSavedTexts);
  if(!v||typeof v!=='object')return v;
  const out={};
  for(const k of Object.keys(v)){
    if(SAVE_BAD_KEYS.includes(k))continue;
    out[cleanSavedText(k)]=cleanSavedTexts(v[k]);
  }
  return out;
}

function saveToSlot(slot){
  try{
    const state=serializableState();
    state._build=GAME_BUILD;
    const data={v:SAVE_VERSION,ts:Date.now(),state};
    // T05 (v82): antes se ignoraba el retorno de LS.set y se devolvía true
    // siempre. LS.set ya captura QuotaExceededError y devuelve false, así que
    // un guardado fallido se reportaba como correcto y nadie se enteraba.
    return LS.set(SAVE_KEY+slot, JSON.stringify(data));
  }catch(e){return false;}
}

function loadFromSlot(slot){
  try{
    const raw=LS.get(SAVE_KEY+slot);
    if(!raw)return null;
    const data=JSON.parse(raw);
    if(!data||!data.state)return null;
    // T124 (v92): la constante se escribía en cada guardado y no se leía nunca,
    // así que un save de un formato futuro entraba como si nada. Los saves sin
    // `v` son anteriores a que se escribiera: esos sí pasan, los migra migrateState.
    if(data.v&&data.v!==SAVE_VERSION){
      console.warn('Ranura '+slot+': formato '+data.v+', se esperaba '+SAVE_VERSION+'. No se carga.');
      return null;
    }
    // PUB-02 (v99): una partida guardada por una versión más nueva (la página de
    // esta pestaña está en caché) no se abre: la migración solo sabe ir hacia delante.
    if((Number(data.state._build)||0)>GAME_BUILD){
      console.warn('Ranura '+slot+': guardada en v'+data.state._build+', esta es v'+GAME_BUILD+'. No se carga.');
      return null;
    }
    // T30 (v88): se validaba ANTES de migrar, así que sanitizeState() juzgaba un
    // estado incompleto y los campos que la migración rellena nunca pasaban por
    // el saneado. Ahora se hace la comprobación mínima de forma, se migra, y se
    // sanea el resultado — que es lo que de verdad se carga en G.
    const safe=sanitizeState(data.state);
    if(!safe)return null;
    const migrated=migrateState(safe);
    data.state=sanitizeState(migrated)||migrated;
    return data;
  }catch(e){return null;}
}

function deleteSlot(slot){
  LS.del(SAVE_KEY+slot);
  // T123 (v92): G._saveSlot seguía apuntando a la ranura borrada, así que el
  // siguiente autoSave() la volvía a escribir. Borrar no borraba.
  if(G._saveSlot===slot)G._saveSlot=null;
}

// PUB-02 (v99): loadFromSlot() devuelve null tanto si la ranura está vacía como si
// trae algo que no se puede abrir, y la pantalla de partidas pintaba las dos igual:
// «Ranura N — vacía». Con jugadores de verdad eso es perder la partida sin aviso,
// porque «Nueva partida» la pisa. inspectSlot() distingue los cuatro casos.
//   empty  · no hay nada
//   ok     · se carga (data)
//   future · la guardó una versión más nueva que esta (build): la página está en caché
//   broken · existe pero no se puede abrir (why)
function inspectSlot(slot){
  const raw=LS.get(SAVE_KEY+slot);
  if(!raw)return {kind:'empty'};
  let d=null;
  try{d=JSON.parse(raw);}catch(e){return {kind:'broken',why:'los datos están dañados'};}
  if(!d||typeof d!=='object'||!d.state)return {kind:'broken',why:'los datos están dañados'};
  if(d.v&&d.v!==SAVE_VERSION)return {kind:'broken',why:'es de otro formato ('+String(d.v).slice(0,24)+')'};
  const build=Number(d.state._build)||0;
  if(build>GAME_BUILD)return {kind:'future',build};
  const data=loadFromSlot(slot);
  return data?{kind:'ok',data}:{kind:'broken',why:'los datos están incompletos'};
}

function getAllSlots(){
  const slots=[];
  for(let i=0;i<NUM_SLOTS;i++){
    const info=inspectSlot(i);
    slots.push({slot:i, data:info.kind==='ok'?info.data:null, info});
  }
  return slots;
}

// Copia tal cual lo que hay en la ranura, aunque esta versión no lo entienda, para
// que el jugador pueda guardarlo antes de borrar (PUB-02).
function exportRawSlot(slot){
  const raw=LS.get(SAVE_KEY+slot);
  if(!raw){alert('Ranura vacía.');return;}
  let txt=raw;
  try{
    const d=JSON.parse(raw);
    if(d&&d.state){
      const bytes=new TextEncoder().encode(JSON.stringify(d.state));
      let bin='';for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
      txt=String(d.v||SAVE_VERSION)+'::'+btoa(bin);
    }
  }catch(e){}
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>alert('✓ Datos copiados al portapapeles. Guárdalos antes de borrar la ranura.')).catch(()=>fallbackCopy(txt));
  } else fallbackCopy(txt);
}

function exportSlotToClipboard(slot){
  const data=loadFromSlot(slot);
  if(!data){alert('Ranura vacía.');return;}
  // TextEncoder + base64 estándar (evita escape/unescape deprecados)
  const bytes=new TextEncoder().encode(JSON.stringify(data.state));
  let bin='';for(let i=0;i<bytes.length;i++)bin+=String.fromCharCode(bytes[i]);
  const txt=SAVE_VERSION+'::'+btoa(bin);
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>{
      alert('✓ Partida copiada al portapapeles. Pégala donde quieras para guardarla.');
    }).catch(()=>fallbackCopy(txt));
  } else fallbackCopy(txt);
}

function fallbackCopy(txt){
  const ta=document.createElement('textarea');
  ta.value=txt;ta.style.position='fixed';ta.style.opacity='0';
  document.body.appendChild(ta);ta.focus();ta.select();
  try{document.execCommand('copy');alert('✓ Partida copiada al portapapeles.');}
  catch(e){alert('No se pudo copiar automáticamente. Selecciona el texto manualmente.');}
  document.body.removeChild(ta);
}

// T42 (v88): importFromText aceptaba cualquier pegado y lo escribía en
// localStorage — vía directa a llenar la cuota. Un save real ronda los 40-80 KB;
// 512 KB deja margen de sobra para una partida larga y corta el abuso.
const MAX_IMPORT_CHARS=512*1024;

function importFromText(txt, slot){
  try{
    if(typeof txt!=='string')throw new Error('Formato no reconocido');
    if(txt.length>MAX_IMPORT_CHARS)throw new Error('Texto demasiado grande');
    const clean=txt.trim();
    if(!clean.startsWith(SAVE_VERSION+'::'))throw new Error(/^TRAIL_SAVE_V\d+::/.test(clean)?'Otra versión':'Formato no reconocido');
    const b64=clean.slice(SAVE_VERSION.length+2);
    const bin=atob(b64);
    const bytes=Uint8Array.from(bin,c=>c.charCodeAt(0));
    const json=new TextDecoder().decode(bytes);
    const raw=JSON.parse(json);
    if(raw&&(Number(raw._build)||0)>GAME_BUILD)throw new Error('Otra versión');   // PUB-02 (v99)
    const safe=sanitizeState(raw);
    if(!safe)throw new Error('Estado inválido');
    const migrated=migrateState(safe);          // T30 (v88): sanear después de migrar
    const state=sanitizeState(migrated)||migrated;
    const data={v:SAVE_VERSION,ts:Date.now(),state};
    importFromText.lastError=null;
    return LS.set(SAVE_KEY+slot, JSON.stringify(data));
  }catch(e){importFromText.lastError=e.message;return false;}
}

// T06 (v82): el autoguardado fallaba en silencio en tres capas (LS.set devolvía
// false, saveToSlot lo ignoraba, autoSave descartaba hasta el retorno). Ahora el
// fallo levanta G._saveFailed, que updateFinBar() convierte en un ⚠ rojo
// permanente en la barra superior: un toast solo no vale, porque se pisa con los
// demás y el jugador puede seguir temporadas enteras creyendo que se guarda.
// _saveFailed no está en PERSISTENT_UNDERSCORE_KEYS a propósito: es de sesión.
function markSaveFailed(){
  const first=!G._saveFailed;
  G._saveFailed=true;
  if(first&&typeof showToast==='function'){
    showToast(LS.lastErr==='QuotaExceededError'?'⚠ No se pudo guardar: almacenamiento lleno':'⚠ No se pudo guardar: este navegador no deja guardar datos');
  }
  if(typeof updateFinBar==='function')updateFinBar();
}

function autoSave(){
  // En modo Entrenador hay que volcar antes el slot activo al roster,
  // si no se perdería el progreso del atleta en curso al serializar G.
  if(G.gameMode==='coach'){try{saveCoachSlot();}catch(e){markSaveFailed();}}
  if(G._saveSlot==null)return;
  let ok=false;
  try{ok=saveToSlot(G._saveSlot);}catch(e){ok=false;}
  if(ok){
    if(G._saveFailed){G._saveFailed=false;if(typeof updateFinBar==='function')updateFinBar();}
  }else markSaveFailed();
}

function slotLabel(data){
  if(!data)return null;
  const s=data.state;
  const name=esc(s.runner?.name||'Corredor');
  const runName=esc(s.runName||'');
  const year=s.year||1;
  const ranking=s.ranking<900?'#'+s.ranking:'—';
  const specRanking=s.specRanking&&s.specRanking<900?'#'+s.specRanking:'—';
  const specLabel=SPEC_LABEL;
  const spec=specLabel[s.runner?.specialty]||'—';
  const mode=modeLabelFull(s.gameMode);   // T54 (v93)
  const totalKm=s.totalCareerKm||0;
  const date=new Date(data.ts).toLocaleDateString('es-ES',{day:'2-digit',month:'short'});
  // Fase del arco narrativo
  const phase=s.carreraVida?(PHASE_LABEL[s.lifecyclePhase]||PHASE_LABEL.runner):null;   // T54 (v93)
  // Ultratrail no tiene ranking ni especialidad: su línea es temporada, edad y ultras terminadas
  const linea=s.gameMode==='ultratrail'&&s.ut?(s.ut.retirado?`Carrera deportiva cerrada · ${s.ut.temporada||1} temporadas · ${s.runner?.age||'—'} años`
    :`Temporada ${s.ut.temporada||1} · ${s.runner?.age||'—'} años · ${(s.ut.historial||[]).filter(h=>h&&h.kind==='finisher').length} terminadas`):null;
  return {name,runName,year,ranking,specRanking,spec,mode,totalKm,date,phase,linea,
          ended:s.careerEnded||null};   // T29 (v86)
}
