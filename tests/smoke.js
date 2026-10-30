// Ejecutar con: npm test
//
// T105 (v89) — segunda pieza, después del linter. No cubre el juego entero: son
// las invariantes de las tareas que más fácil se rompen al refactorizar (T15,
// T22, T25, T45 y las de la auditoría v80 que se fueron sumando). Si una de
// estas falla, algo que ya estaba arreglado se ha vuelto a romper.
// v94: sin partidas guardadas, ya no se prueban migraciones de formatos
// históricos — T25 y T45 se cubren en ejecución (applyTraining, isDNF).

// Banco de pruebas: concatena los .js en UN solo ámbito, igual que el navegador
// (son scripts clásicos, no módulos), con stubs de DOM. El footer expone las
// funciones y un setter de G, porque los `const`/`let` de nivel raíz no se
// cuelgan del objeto global.
// El banco de pruebas (concatenar los 9 .js en un ámbito con stubs de DOM) vive
// en _bundle.js, compartido con content.js.
const {build,scorer,domStub}=require('./_bundle');
const {T,ctx,src}=build(['freshState','modeCfg','currentWorkPct','setWorkPct','getEffStat',
  'applyTraining','checkSponsorObjective','isDNF','finishedResults','dnfLabel','migrateState',
  'TRAINING_BLOCKS','monthlyWorkIncome','curWorkOpt','endRaceCleanup',
  'resetRaceFlags','resetRaceDayState','drain','bumpStat','raceHistoryFor',
  'runnerCritState','screenRoutes','profBounds','serializableState',
  'deleteSlot','loadFromSlot','saveToSlot','SAVE_VERSION','SAVE_KEY','LS',
  'cnGetCategory','cnMonth','cnSeasonOver','CN_MONTHS','CANICROSS_RACES','CN_CATEGORIES','shuffle','CIRCUITS_DB',
  'raceGainTotal','raceDesnivel','fmtGain','clubRaceKm','RACES_DB','CLUB_RACES','SPEC_RACES',
  'screenRoutes','CLUB_STAFF_TYPES','renderExpresCalendar','renderCoachIntro','TRAINING_BLOCKS',
  'seasonYearNet','STAFF_COSTS','generateCoachSeasonObjective','coachObjectiveMet','raceLoadGain','canAccessRace',
  'seasonMonthLabel','isCoachPhase','injuryThisRace','restWeeksEffMult','legsTrainingMult','raceMental','fairPlayMental',
  'injuryRacesBlocked','injuryBlockText','INJURY_BLOCK_SEASON','overlapRunnerScreen',
  'applyInjuryStatPenalty','recoverInjurySequel','INJURY_SEQUEL_RECOVERY','recordDNF','careerAgg','ACHIEVEMENTS',
  'CLUB_SOCIO_FEE','CLUB_RED_SEASONS_MAX','clubSponsorObjectiveMet','clubObjectiveDeltas',
  'coachViewActive','initClubModeData','simClubRace','CLUB_RACES','CLUB_ROLES','TOAST_QUEUE',
  'LIFE_EXTRA_ATHLETES','CLUB_SOCIOS_SOFT_CAP',
  'DEV','DAY_CONDITIONS','MAX_IMPORT_CHARS','MONTHLY_EVENTS_POOL','BETWEEN_EVENTS','TRAINING_EVENTS_POOL',
  'COACH_INJURY_TYPES','EXPRESS_TIMED_EVENTS','clubSeasonClosing','applyCoachInjury','CLASSIC_MID_RACE_EVENTS','MID_RACE_RESOLVERS','COACH_ATHLETE_POOL',
  'inspectSlot','sanitizeState','importFromText','GAME_BUILD','RIVALS_POOL','PRIVACY_KEY_PHRASES','PRIVACY_PARAGRAPHS',
  'opinionCuerpo','opinionModo','opinionMomento','OPINION_CAMPOS',
  'CN_REV','cnAddDog','cnActiveDog','cnDogs','cnDogById','cnInitDog','CN_MONTH_NAMES',
  'cnPerfFactor','cnTeamLevel','cnDogCapMult','cnDogGain','cnGenerateRivals','cnRivalTime','cnAgeRivals','CN_RIVAL_TEAMS','CN_TIER_LEVELS','cnRival',
  'CN_BEHAVIOURS','CN_COMMANDS','CN_INTENTS','CN_TEMPERAMENTS','cnPickBehaviour','cnObedience','cnApplyMonthHours','cnHoursUsed','cnSponsorIncome','CN_EQUIP','CN_CMD_LEVEL_HOURS','cnEquipSeg',
  'ultraStart','ultraTramos','ultraCorrerBloque','ultraParar','ultraMargen','ultraCarrera','ultraRetirarse','ULTRA_RACES','ULTRA_CORREDORES','byStart','bySalir','byEntrarCorral','byHacer','byPalanca','byALaLineaLogica','byVivos','byTiempoPrevisto','byCorrerVuelta','byCampanaRivales','byEncadenar','byFijarRutina','byNoSalgo','byNocheAhora','BY_EVENTOS','BY_CORREDORES','BY_NOMBRES','BY_LEYENDAS','BY_ORGANIZADOR','BY_LUGAR',
  'cnDestiny','cnRetireDogAs','cnCircuitStanding','cnHomeDogs','cnCompanionStrip','cnSyncGraph','renderCnNotebook','renderCnEpilogo','cnCalibrate',
  'cnTempPen','cnComfort','cnTickCondition','cnGiveCondition','CN_CONDITIONS','CN_HEAT_CANCEL','cnDoneIds','cnSegSurface',
  'ultraBateriaEnBolsa','ultraAvitualla','utNueva','utCalendario','utAparece','utInscribirse','utNoPuedeInscribirse','utApuntarse',
  'utAvanzar','utCiclo','utObjetivoHoy','utObjetivoSiguiente','utCerrarCarrera','utNuevaTemporada','utExigencia','utSolape','utQuitarPlan',
  'UT_PERFILES','UT_SEMANAS','UT_RECUPERA','slotLabel',
  'utHacerFase','utTocaTirada','utRecuperar','utSemaforo','utDeficit','utAbsorbe','utSemanaEntreno','UT_PLANES','UT_VOLUMEN','UT_PREP_INICIAL',
  'utPuntos','utProbSorteo','utPiedrasActivas','utIndice','utSolicitarSorteo','utNoPuedeSolicitar','utResolverSorteo','utListaEspera','utFraseSorteo','UT_PIEDRAS',
  'utEscalonesPosibles','utEscalon','utComprar','utNoPuedeComprar','utRaceVariante','utVispera','utSectores','utReco','utReconocerSector','utFinDeSemanaReco',
  'utRecoDecae','utChaquetaObligatoria','UT_ESCALONES','UT_ZAPAS_VIDA','ultraControles','utSimularFase',
  'utAceptarBackyard','utNoPuedeBackyard','utBackyardHoy','utEmpezarBackyard','utCerrarBackyard','utBackyardCorredor','utBackyardDif','UT_BACKYARD','byNoSalgo','byALaLineaLogica',
  'utSumarVeterania','utEnvejecer','utEpilogoDisparado','utCuentaPendiente','utPuedeMontar','utEpilogos','utElegirEpilogo','utCerrarCuenta','utCarreraPropia','utCorrerPropia',
  'utMontarCarrera','utPropias','utProyectos','utEmpezarProyecto','utEtapa','utCerrarReferencia','utResumenVida','UT_EDAD_FINAL',
  'utCabecera','byFarolRival','byTensoTick','ultraGradoAlucina','utPerfilHTML','utSectorDuro','ultraSortearTiempo','ULTRA_TIEMPO','checkAndUnlockAchievements']);
const t=scorer();
const setG=o=>{const g=T.freshState();Object.assign(g,o);T.setG(g);return g;};

console.log('\n── T45 · isDNF / finishedResults ──');
const R=[{pos:3,dnf:false},{pos:null,dnf:true,dnfReason:'abandono'},{pos:null,dnf:true,dnfReason:'lesion'},{pos:1,dnf:false}];
t('un 3.º cuenta como terminada', T.isDNF(R[0])===false);
t('un abandono es DNF', T.isDNF(R[1])===true);
t('una baja por lesión es DNF', T.isDNF(R[2])===true);
t('finishedResults deja 2 de 4', T.finishedResults(R).length===2, T.finishedResults(R).length);
t('forma antigua pos:0 sigue siendo DNF', T.isDNF({pos:0})===true);
t('forma antigua pos:999 sigue siendo DNF', T.isDNF({pos:999,dnf:true})===true);
t('forma antigua pos:null (canicross) es DNF', T.isDNF({pos:null})===true);
t('dnfLabel distingue el motivo', T.dnfLabel(R[1])==='Abandono'&&T.dnfLabel(R[2])==='Baja por lesión');

console.log('\n── T45 · EL BUG: abandonar contaba como top-10 ──');
setG({raceResults:[{pos:null,dnf:true,dnfReason:'abandono',prize:0},{pos:null,dnf:true,dnfReason:'lesion',prize:0}],selectedRaces:[]});
t('2 DNF NO cumplen «top 10»', T.checkSponsorObjective({objKey:'top10'})===false);
t('2 DNF NO cumplen «terminar 2»', T.checkSponsorObjective({objKey:'finish2'})===false);
t('2 DNF NO cumplen «podio»', T.checkSponsorObjective({objKey:'top5x2'})===false);
T.getG().raceResults.push({pos:7,dnf:false,prize:0});
t('un 7.º real SÍ cumple «top 10»', T.checkSponsorObjective({objKey:'top10'})===true);
t('1 terminada + 2 DNF no cumplen «terminar 2»', T.checkSponsorObjective({objKey:'finish2'})===false);
T.getG().raceResults.push({pos:9,dnf:false,prize:0});
t('2 terminadas sí cumplen «terminar 2»', T.checkSponsorObjective({objKey:'finish2'})===true);

console.log('\n── T15 · raceModifiers garantizado ──');
// v94: las aserciones de T45 y T25 que vivían aquí probaban migraciones de
// formatos históricos, retiradas de migrateState() (fase sin partidas guardadas).
const viejo={runner:{name:'Txiki',age:30,stats:{resistencia:50,velocidad:50,subida:50,bajada:50,nutricion:50,mental:50}},year:2,money:100};
const mig=T.migrateState(viejo);
t('T15: raceModifiers garantizado a cero', mig.raceModifiers.mental===0&&mig.raceModifiers.velocidad===0);

console.log('\n── T22 · una sola «jornada actual» ──');
setG({currentQuarter:3,workByQuarter:{1:100,2:80,3:60,4:40},workPct:100});
t('lee el trimestre en curso, no G.workPct', T.currentWorkPct()===60, T.currentWorkPct());
T.getG().forcedFullTime=true;
t('la vuelta forzosa por deuda manda sobre todo', T.currentWorkPct()===100);
T.getG().forcedFullTime=false;
T.setWorkPct(20,2);
t('setWorkPct escribe el trimestre pedido', T.getG().workByQuarter[2]===20);
t('y deja G.workPct como espejo del actual', T.getG().workPct===60, T.getG().workPct);
t('curWorkOpt usa la misma fuente', T.curWorkOpt().pct===60, T.curWorkOpt().pct);

console.log('\n── T22 · el sueldo deja de escalar con los patrocinadores ──');
for(const m of ['facil','medio','dificil','hardcore','expres']){
  T.getG().gameMode=m;
  const c=T.modeCfg();
  t(m+': workIncomeMult ('+c.workIncomeMult+') === sponsorMult ('+c.sponsorMult+') — mismo balance',
    c.workIncomeMult===c.sponsorMult&&c.workIncomeMult!==undefined);
}

console.log('\n── T15 · los modificadores no tocan el stat base ──');
setG({});
T.getG().runner.stats.mental=70;
T.getG().raceModifiers={mental:8,velocidad:0,subida:0};
t('getEffStat suma el modificador', T.getEffStat('mental')===78, T.getEffStat('mental'));
t('el stat base no se ha tocado', T.getG().runner.stats.mental===70);
T.getG().runner.stats.mental=98; T.getG().raceModifiers.mental=5;
t('tope de 100 respetado', T.getEffStat('mental')===100, T.getEffStat('mental'));
t('y el base sigue en 98 (antes el clamp se lo comía)', T.getG().runner.stats.mental===98);
T.getG().raceModifiers.mental=-40; T.getG().runner.stats.mental=20;
t('suelo de 10 respetado', T.getEffStat('mental')===10, T.getEffStat('mental'));
T.endRaceCleanup();
t('endRaceCleanup vacía los modificadores', T.getG().raceModifiers.mental===0);
t('y no ha tocado el stat base', T.getG().runner.stats.mental===20);

console.log('\n── T25 · applyTraining es idempotente ──');
setG({trainingBlock:T.TRAINING_BLOCKS[0],trainingBlockApplied:false,selectedRaces:[]});
const antes=JSON.stringify(T.getG().runner.stats);
T.applyTraining();
const trasUna=JSON.stringify(T.getG().runner.stats);
T.applyTraining(); T.applyTraining(); T.applyTraining();
const trasCuatro=JSON.stringify(T.getG().runner.stats);
t('la primera llamada sube stats', antes!==trasUna, antes+' → '+trasUna);
t('las tres siguientes no hacen NADA', trasUna===trasCuatro, trasUna+' vs '+trasCuatro);
t('queda marcado como aplicado', T.getG().trainingBlockApplied===true);
T.applyTraining(true);
t('force:true sí reaplica (modo desarrollador)', JSON.stringify(T.getG().runner.stats)!==trasCuatro);

console.log('\n── T74 (v90) · un solo reset de carrera ──');
// Eran cuatro copias de las mismas líneas. Son DOS resets distintos a propósito:
// resetRaceFlags no toca la condición del día ni el material, resetRaceDayState sí.
setG({preRaceNutrition:'x',dropbagShown:true,redZoneStreak:9,_raceInitialized:true,
  _recoveryUsed:true,dayConditionGenerated:true,dayCondition:{id:'x'},gelsCarried:3,warmedUp:true,startStrategy:'x'});
T.resetRaceFlags();
const g74=T.getG();
t('resetRaceFlags limpia nutrición, dropbag y zona roja',
  g74.preRaceNutrition==='pasta'&&g74.dropbagShown===false&&g74.redZoneStreak===0);
t('resetRaceFlags baja las dos banderas de inicialización',
  g74._raceInitialized===false&&g74._recoveryUsed===false);
t('resetRaceFlags NO toca la condición del día ni el material (la divergencia es real)',
  g74.dayConditionGenerated===true&&g74.gelsCarried===3&&g74.warmedUp===true);
T.resetRaceDayState();
t('resetRaceDayState sí limpia condición del día, geles y estrategia',
  T.getG().dayConditionGenerated===false&&T.getG().dayCondition===null&&
  T.getG().gelsCarried===0&&T.getG().warmedUp===false&&T.getG().startStrategy===null);

console.log('\n── T77/T78 (v90) · drain y bumpStat con la semántica de antes ──');
const o78={legs:50,energy:5};
t('drain resta y devuelve el valor', T.drain(o78,'legs',12)===38&&o78.legs===38);
t('drain corta en 0, no en negativo', T.drain(o78,'energy',12)===0);
t('drain con undefined da NaN, como la línea que sustituye', Number.isNaN(T.drain({},'legs',3)));
const p77={stats:{mental:97}};
t('bumpStat respeta el techo de 100', T.bumpStat(p77,'mental',10)===100);
t('bumpStat parte de 50 si el stat no existe', T.bumpStat({stats:{}},'mental',5)===55);

console.log('\n── T62/T63 (v90) · lo que ahora se cachea ──');
t('modeCfg devuelve el mismo objeto en dos llamadas', T.modeCfg('dificil')===T.modeCfg('dificil'));
t('y no mezcla modos', T.modeCfg('facil').startMoney===550&&T.modeCfg('hardcore').startMoney===150);
t('un modo inventado sigue cayendo en la config de medio', T.modeCfg('zzz').startMoney===300);
t('el despachador de rutas se construye una sola vez', T.screenRoutes()===T.screenRoutes());
t('y las 73 rutas apuntan a funciones',
  Object.values(T.screenRoutes()).every(f=>typeof f==='function'), Object.keys(T.screenRoutes()).length+' rutas');

console.log('\n── T80/T73 (v90) · helpers de carrera ──');
setG({careerRaceHistory:{}});
T.raceHistoryFor('pinar').finished++;
T.raceHistoryFor('pinar').abandoned++;
t('raceHistoryFor crea la ficha y deja contar', T.getG().careerRaceHistory.pinar.finished===1&&T.getG().careerRaceHistory.pinar.abandoned===1);
setG({runner:{...T.freshState().runner,energy:5,hydration:8,legs:50}});
t('runnerCritState cuenta los stats bajo 10', T.runnerCritState().critCount===2);
t('y devuelve el mínimo', T.runnerCritState().minStat===5);

console.log('\n── T68 · por qué NO se cambió a structuredClone ──');
// Hasta v94 G.coachSeasonObjective guardaba un checkAll (coach.js): JSON.stringify
// lo tiraba en silencio y structuredClone habría lanzado. Desde DS05 (v95) el
// objetivo es solo datos, pero la guarda sigue: cualquier función que vuelva a
// colarse en G rompería el guardado con structuredClone.
setG({coachSeasonObjective:{id:'win_elite',met:false,checkAll:()=>true}});
t('serializableState sigue tragando una función dentro de G',
  !('checkAll' in T.serializableState().coachSeasonObjective));
let clonable=true; try{structuredClone({f:()=>1})}catch(e){clonable=false;}
t('y structuredClone la rechazaría: el cambio de T68 rompería el guardado', clonable===false);

console.log('\n── T123 (v92) · borrar una ranura la borra de verdad ──');
// El bug: G._saveSlot seguía apuntando ahí y el siguiente autoSave la recreaba.
setG({_saveSlot:2});
T.deleteSlot(2);
t('deleteSlot suelta la ranura activa', T.getG()._saveSlot===null);
setG({_saveSlot:1});
T.deleteSlot(2);
t('y no toca la ranura activa si borras otra', T.getG()._saveSlot===1);

console.log('\n── T124 (v92) · SAVE_VERSION se comprueba al cargar ──');
const almacen={};
const LSfake={get:k=>almacen[k]??null,set:(k,v)=>{almacen[k]=v;return true;},del:k=>{delete almacen[k]}};
const LSreal=T.LS.get, LSrealSet=T.LS.set, LSrealDel=T.LS.del;
T.LS.get=LSfake.get; T.LS.set=LSfake.set; T.LS.del=LSfake.del;
const estadoMin=()=>{const g=T.freshState();g.runner.name='Txiki';return g;};
almacen[T.SAVE_KEY+'9']=JSON.stringify({v:T.SAVE_VERSION,ts:1,state:estadoMin()});
t('un save del formato actual carga', T.loadFromSlot(9)!==null);
almacen[T.SAVE_KEY+'9']=JSON.stringify({v:'TRAIL_SAVE_V9',ts:1,state:estadoMin()});
t('un save de un formato futuro ya NO entra como si nada', T.loadFromSlot(9)===null);
almacen[T.SAVE_KEY+'9']=JSON.stringify({ts:1,state:estadoMin()});
t('un save antiguo sin campo v sigue cargando (lo migra migrateState)', T.loadFromSlot(9)!==null);

console.log('\n── PUB-02 (v99) · lo que no se puede abrir no sale como «vacía» ──');
delete almacen[T.SAVE_KEY+'8'];
t('una ranura sin nada es «empty»', T.inspectSlot(8).kind==='empty');
almacen[T.SAVE_KEY+'8']=JSON.stringify({v:T.SAVE_VERSION,ts:1,state:estadoMin()});
t('un save del formato actual es «ok» y trae los datos', T.inspectSlot(8).kind==='ok'&&!!T.inspectSlot(8).data);
almacen[T.SAVE_KEY+'8']=JSON.stringify({v:'TRAIL_SAVE_V9',ts:1,state:estadoMin()});
t('otro formato es «broken», no «empty»', T.inspectSlot(8).kind==='broken');
almacen[T.SAVE_KEY+'8']='{esto no es json';
t('datos rotos son «broken»', T.inspectSlot(8).kind==='broken');
const futuro=estadoMin();futuro._build=T.GAME_BUILD+1;
almacen[T.SAVE_KEY+'8']=JSON.stringify({v:T.SAVE_VERSION,ts:1,state:futuro});
t('un save de una build más nueva es «future» con su build', T.inspectSlot(8).kind==='future'&&T.inspectSlot(8).build===T.GAME_BUILD+1);
t('y loadFromSlot no lo abre', T.loadFromSlot(8)===null);
const b64=o=>T.SAVE_VERSION+'::'+Buffer.from(JSON.stringify(o),'utf8').toString('base64');
t('importar un save de una build más nueva se rechaza', T.importFromText(b64(futuro),7)===false&&T.importFromText.lastError==='Otra versión');
t('importar un TRAIL_SAVE_V9 dice «Otra versión»', T.importFromText('TRAIL_SAVE_V9::e30=',7)===false&&T.importFromText.lastError==='Otra versión');
t('importar uno bueno sigue funcionando', T.importFromText(b64(estadoMin()),7)===true);
delete almacen[T.SAVE_KEY+'8'];delete almacen[T.SAVE_KEY+'7'];

console.log('\n── PUB-01/PUB-03 (v99) · un save importado no mete HTML ni __proto__ ──');
const VENENO='"\'><img src=x onerror=alert(1)>`';
const ev=estadoMin();
ev.selectedRaces=[{id:'x',name:'Carrera'+VENENO,segs:[{name:'Tramo'+VENENO}]}];
ev.rivals=[{name:'Rival'+VENENO,flag:VENENO,country:VENENO}];
ev.nemesisLog={['Nombre'+VENENO]:{wins:1,gapSum:2,gapCount:1}};
ev.monthlyEvents=[{title:VENENO,options:[{text:VENENO}]}];
ev.clubModeData={name:'Club',plantilla:[{name:'A',flag:VENENO}]};
const evJson=JSON.stringify(ev).replace(/^\{/,'{"__proto__":{"polluted":"SI"},');
const limpio=T.sanitizeState(JSON.parse(evJson));
const malosTxt=[];(function walk(v,p){if(typeof v==='string'){if(/[<>"'`]/.test(v))malosTxt.push(p);return;}if(v&&typeof v==='object')for(const k of Object.keys(v)){if(/[<>"'`]/.test(k))malosTxt.push(p+'['+k+']');walk(v[k],p+'.'+k);}})(limpio,'G');
t('ningún texto ni clave del save conserva comillas ni < >', malosTxt.length===0, malosTxt.slice(0,3));
t('el texto se sigue leyendo (‹img…› en vez de <img…>)', limpio.selectedRaces[0].name==='Carrera”’›‹img src=x onerror=alert(1)›’');
t('las claves también se limpian', Object.keys(limpio.nemesisLog)[0]==='Nombre”’›‹img src=x onerror=alert(1)›’');
t('__proto__ se descarta y no cambia el prototipo', !Object.keys(limpio).includes('__proto__')&&Object.getPrototypeOf(Object.getPrototypeOf(limpio))===null&&limpio.polluted===undefined);
t('un nombre normal no cambia', T.sanitizeState(estadoMin()).runner.name==='Txiki');

console.log('\n── PUB-04 (v99) · sin atletas reales ──');
// Los 18 que había en RIVALS_POOL y los dos rivalName de Entrenador. Si vuelve uno, falla.
const REALES=['Kilian Jornet','Haene','Jim Walmsley','Courtney Dauwalter','Pau Capell','Tom Evans','Rémi Bonnet',
  'Ruth Croft','Ludovic Pommeret','Anna Comet','Silvia Rampazzo','Dakota Jones','Mathieu Blanchard','Andrea Huser',
  'Ryoichi Sekiya','Thibaut Baronian','Antoine Guillon','Camille Herron','Núria Picas','Jornet'];
const jsTodo=require('fs').readdirSync(__dirname+'/../js').map(f=>require('fs').readFileSync(__dirname+'/../js/'+f,'utf8')).join('\n');
t('ningún fichero de js/ nombra a los atletas reales de antes', REALES.every(n=>!jsTodo.includes(n)), REALES.filter(n=>jsTodo.includes(n)));
t('RIVALS_POOL sigue con 18 rivales', T.RIVALS_POOL.length===18);
t('y sin nombres repetidos', new Set(T.RIVALS_POOL.map(r=>r.name)).size===18);

console.log('\n── PUB-07 (v99) · la privacidad dice lo mismo en el juego y en el README ──');
const readme=require('fs').readFileSync(__dirname+'/../README.md','utf8').replace(/\*\*/g,'');
const enJuego=T.PRIVACY_PARAGRAPHS.join(' ');
T.PRIVACY_KEY_PHRASES.forEach(f=>t('«'+f+'» está en el juego y en el README', enJuego.includes(f)&&readme.includes(f)));

console.log('\n── T140 (v92) · el id del circuito pasa a ASCII ──');
// v94: la migración de saves con el id viejo se retiró; queda fijado el dato.
t('CIRCUITS_DB ya no tiene ids con ñ', T.CIRCUITS_DB.every(c=>/^[\w-]+$/.test(c.id)));
t('y el circuito de montaña existe con el id nuevo', T.CIRCUITS_DB.some(c=>c.id==='circuito_montana'));
T.LS.get=LSreal; T.LS.set=LSrealSet; T.LS.del=LSrealDel;

console.log('\n── T119/T120 (v92) · bordes de canicross ──');
// Reloj de Canicross desde el paso 2 del rediseño: cnMonthIdx en lugar de cnWeek.
setG({cnMonthIdx:-5});
t('cnMonth con un índice negativo da octubre, no marzo', T.cnMonth()===10, T.cnMonth());
setG({cnMonthIdx:0});   t('mes 0 → octubre', T.cnMonth()===10);
setG({cnMonthIdx:999}); t('un índice enorme sigue dando el último mes y la temporada terminada', T.cnMonth()===3&&T.cnSeasonOver());
t('cnGetCategory con edad negativa da la primera categoría', T.cnGetCategory(-4)===T.CN_CATEGORIES[0], JSON.stringify(T.cnGetCategory(-4)));
t('y con edad no numérica también', T.cnGetCategory(undefined)===T.CN_CATEGORIES[0]);

console.log('\n── T117 (v92) · el barajado es uniforme ──');
// sort(()=>Math.random()-0.5) dejaba el primer elemento en su sitio mucho más
// de lo que le toca. Con 6.000 barajados de 5 elementos, cada posición debería
// salir ~1.200 veces; se admite un margen amplio para que no sea escamosa.
const cuenta=[0,0,0,0,0];
for(let i=0;i<6000;i++) cuenta[T.shuffle([0,1,2,3,4]).indexOf(0)]++;
const peor=Math.max(...cuenta.map(c=>Math.abs(c-1200)));
t('el primer elemento acaba repartido por las 5 posiciones', peor<220, 'reparto: '+cuenta.join('/'));

console.log('\n── T52 (v92) · un solo esquema de carrera ──');
// El desnivel se escribía a mano Y se podía sumar de los tramos, y las dos
// cifras no coincidían en 8 de 24 carreras. Ahora la fuente son los tramos.
t('fmtGain reproduce el formato de las cadenas que había',
  T.fmtGain(600)==='600m+'&&T.fmtGain(1200)==='1.200m+'&&T.fmtGain(2800)==='2.800m+',
  [600,1200,2800].map(n=>T.fmtGain(n)).join(' '));
t('fmtGain no se rompe con 0 ni con basura', T.fmtGain(0)==='0m+'&&T.fmtGain(undefined)==='0m+'&&T.fmtGain(-50)==='0m+');
const todasR=[...T.RACES_DB,...Object.values(T.SPEC_RACES||{}).flat()];
t('ninguna carrera declara ya el desnivel a mano', todasR.every(r=>r.desnivel===undefined));
t('raceGainTotal suma solo los tramos de subida',
  todasR.every(r=>T.raceGainTotal(r)===r.segs.reduce((a,x)=>a+Math.max(0,x.gain||0),0)));
t('y lo que se pinta sale de ahí (Harrigorri: 2.800m+)',
  T.raceDesnivel(T.RACES_DB.find(r=>r.id==='mayo'))==='2.800m+', T.raceDesnivel(T.RACES_DB.find(r=>r.id==='mayo')));
t('pinar ya anuncia sus 600m reales, no los 1.200m+ que decía',
  T.raceDesnivel(T.RACES_DB.find(r=>r.id==='pinar'))==='600m+', T.raceDesnivel(T.RACES_DB.find(r=>r.id==='pinar')));
t('una carrera sin tramos no revienta ni pinta undefined', T.raceDesnivel({id:'x'})==='—'&&T.raceGainTotal(null)===0);
t('un save antiguo con la cadena dentro la sigue pudiendo pintar si no hay tramos',
  T.raceDesnivel({id:'x',desnivel:'1.900m+'})==='1.900m+');

console.log('\n── T52 (v92) · `dist` desaparece, todo es `km` ──');
t('CLUB_RACES usa km y ninguna conserva dist', T.CLUB_RACES.every(r=>typeof r.km==='number'&&r.dist===undefined));
t('clubRaceKm lee un save nuevo', T.clubRaceKm({km:35})===35);
t('y uno viejo, que trae dist', T.clubRaceKm({dist:21})===21);
t('y no pinta undefined con basura', T.clubRaceKm(null)===0&&T.clubRaceKm({})===0);

console.log('\n── v92 · interfaz que se calculaba y no se pintaba ──');
// Esta tanda salió de revisar los 13 avisos de variables muertas del linter.
// Una variable calculada y sin usar es a veces ruido y a veces una pieza de
// interfaz escrita y nunca conectada: aquí se fijan las tres que lo eran.
const pintar=domStub(ctx);

// 🐛 zegamaBadge: la insignia existía, la mecánica existe (G.zegamaQual se gana
// terminando Harrigorri bajo el corte) y la plantilla nunca la interpolaba.
setG({gameMode:'expres',screen:'expresCalendar',year:2,ranking:50,zegamaQual:true,
  selectedRaces:[],expresRaces:[]});
let html=pintar(()=>T.renderExpresCalendar());
t('con G.zegamaQual, el calendario exprés dice «Clasificado por tiempo»',
  html.includes('Clasificado por tiempo'), html.includes('Harrigorri')?'(Harrigorri sí sale)':'(Harrigorri no sale)');
setG({gameMode:'expres',screen:'expresCalendar',year:2,ranking:5,zegamaQual:false,
  selectedRaces:[],expresRaces:[]});
html=pintar(()=>T.renderExpresCalendar());
t('y con top-20 sin clasificación, dice «Invitación por ranking»', html.includes('Invitación por ranking'));
setG({gameMode:'expres',screen:'expresCalendar',year:2,ranking:500,zegamaQual:false,
  selectedRaces:[],expresRaces:[]});
html=pintar(()=>T.renderExpresCalendar());
t('sin acceso no se anuncia ninguna clasificación',
  !html.includes('Clasificado por tiempo')&&!html.includes('Invitación por ranking'));

// El resumen de legado de coachIntro contaba las carreras y no las enseñaba.
// (Ojo: renderLifeRetirement tiene OTRO resumen distinto que sí las mostraba —
//  el primer intento de este test pintaba ese y pasaba por el motivo equivocado.)
setG({screen:'coachIntro',year:6,ranking:12,
  careerHistory:[{pos:1,prize:100},{pos:4,prize:20},{pos:2,prize:50}],
  lifeAthlete:{name:'Ane Uriarte',age:19,spec:'montanero',stats:{}}});
html=pintar(()=>T.renderCoachIntro());
// La aserción va sobre la celda concreta, no sobre un '3' suelto en la página.
const celda=/Carreras<\/div>\s*<div[^>]*>(\d+)<\/div>/.exec(html);
t('el resumen de legado de coachIntro muestra las carreras corridas',
  !!celda&&celda[1]==='3', celda?('pinta '+celda[1]):'no encuentra la celda «Carreras»');
t('y sigue mostrando victorias, temporadas y premios',
  html.includes('Victorias')&&html.includes('Temporadas')&&html.includes('Premios ganados'));

// El «+30%» de la tarjeta de club estaba escrito a mano al lado del dato.
t('el porcentaje de crecimiento del entrenador sale de CLUB_STAFF_TYPES, no a mano',
  Math.round((T.CLUB_STAFF_TYPES.entrenador.growthBonus-1)*100)===30,
  'growthBonus='+T.CLUB_STAFF_TYPES.entrenador.growthBonus);

console.log('\n── H19 (v95) · staff mensual y una sola cuenta del año ──');
{
  const _render=ctx.render,_toast=ctx.showToast;
  ctx.render=()=>{};ctx.showToast=()=>{};
  setG({gameMode:'medio',money:5000,currentQuarter:1,workByQuarter:{1:100,2:100,3:100,4:100},workPct:100});
  const base=T.seasonYearNet();
  ctx.toggleSpend('fisio');
  t('contratar fisio no toca el dinero en el acto', T.getG().money===5000, T.getG().money);
  t('el balance lo cobra una vez, 12 meses', T.seasonYearNet()===base-T.STAFF_COSTS.fisio*12);
  T.getG().ownBrand={launched:1,hasEmployee:false};
  t('la marca propia entra en el balance del año', T.seasonYearNet()===base-T.STAFF_COSTS.fisio*12+300*12);
  setG({gameMode:'dificil',money:0,currentQuarter:1,workByQuarter:{1:40,2:40,3:40,4:40},workPct:40});
  ctx.toggleSpend('fisio');
  t('sin saldo no deja contratar staff', T.getG().spending.fisio===false);
  setG({gameMode:'medio',money:99999,forcedFullTime:true});
  ctx.toggleSpend('entrenador');
  t('con la jornada forzosa por deuda tampoco', T.getG().spending.entrenador===false);
  ctx.render=_render;ctx.showToast=_toast;
}

console.log('\n── DS05 (v95) · el objetivo de Entrenador sobrevive al guardado ──');
setG({coachAthlete:{name:'Ane Uriarte',personality:'obediente'},coachSeason:1,coachAthleteHistory:[],coachSelectedRaces:[{},{}]});
T.generateCoachSeasonObjective();
const objG=T.getG().coachSeasonObjective;
t('el objetivo es solo datos: no lleva funciones', !!objG&&Object.values(objG).every(v=>typeof v!=='function'));
const objJ=JSON.parse(JSON.stringify(T.serializableState().coachSeasonObjective));
t('tras guardar conserva el id y se puede evaluar', objJ.id===objG.id&&typeof T.coachObjectiveMet(objJ,[])==='boolean');
t('el balance de Entrenador aplica la confianza del objetivo una sola vez',/if\(!obj\.trustApplied\)G\.coachTrust=/.test(src['coach.js'])&&/trustApplied:true\}/.test(src['coach.js']));
t('«primer podio» se cumple con un 3.º', T.coachObjectiveMet({id:'first_podio'},[{pos:3,dnf:false}])===true);
t('«superar tu mejor puesto» usa el prevBest guardado',
  T.coachObjectiveMet({id:'beat_pb',prevBest:8},[{pos:6,dnf:false}])===true&&T.coachObjectiveMet({id:'beat_pb',prevBest:8},[{pos:9,dnf:false}])===false);

console.log('\n── DS01 (v95) · la carga del atleta no sale del corredor ──');
t('coach.js ya no calcula la carga del atleta con bodyLoadAfterRace', !/G\.coachBodyLoad=bodyLoadAfterRace\(/.test(src['coach.js']));
t('una carrera suma lo mismo que antes', T.raceLoadGain(20)===8&&T.raceLoadGain(30)===12&&T.raceLoadGain(40)===16&&T.raceLoadGain(60)===22);

console.log('\n── DS08 (v95) · una sola regla de acceso a carreras ──');
setG({ranking:999,year:1,zegamaQual:false,repInvitations:[{id:'inv'}]});
t('una invitación da acceso aunque el ranking no llegue', T.canAccessRace({id:'inv',reqRanking:10})===true);
t('las carreras abiertas siguen abiertas', T.canAccessRace({id:'a',reqRanking:999})===true);
t('sin ranking ni invitación, bloqueada', T.canAccessRace({id:'b',reqRanking:50})===false);
t('ningún calendario reescribe la regla a mano',
  !['render-clasico.js','devmode.js'].some(f=>/const canAccess=r=>/.test(src[f])));

console.log('\n── T74 (v95) · la carrera siguiente no hereda el día de la anterior ──');
{
  const _r=ctx.render,_M=ctx.Math;
  const M=Object.create(Math);M.random=()=>0.99;   // sin evento entre carreras
  ctx.render=()=>{};ctx.Math=M;
  setG({gameMode:'medio',selectedRaces:[{id:'a',name:'A',month:3},{id:'b',name:'B',month:5}],currentRaceIdx:0,
    dayConditionGenerated:true,dayCondition:{id:'calor'},gelsCarried:3,gelsUsed:2,warmedUp:true,startStrategy:'agresivo'});
  ctx.afterRace();
  const g=T.getG();
  t('sin evento entre carreras va directo a la preparación', g.screen==='preRacePrep', g.screen);
  t('y llega sin la condición del día, los geles, el calentamiento ni la estrategia de la anterior',
    !g.dayConditionGenerated&&g.dayCondition===null&&g.gelsCarried===0&&g.gelsUsed===0&&!g.warmedUp&&g.startStrategy===null);
  ctx.render=_r;ctx.Math=_M;
}

console.log('\n── H15-bis (v95) · el contador de la barra avanza en cada modo ──');
setG({gameMode:'coach',year:1,coachSeason:4,coachSelectedRaces:[{month:6}],coachRaceIdx:0});
t('Entrenador suelto: su temporada y el mes de su carrera', T.seasonMonthLabel()==='A4 · Jun', T.seasonMonthLabel());
setG({gameMode:'medio',carreraVida:true,lifecyclePhase:'coach',year:9,coachSeason:2,coachSelectedRaces:[],coachRaceIdx:0});
t('Carrera de Vida en fase Entrenador: también', T.seasonMonthLabel()==='A2 · —', T.seasonMonthLabel());
t('y enruta las pestañas como Entrenador', T.isCoachPhase()===true);
setG({gameMode:'medio',year:3,selectedRaces:[{month:4}],currentRaceIdx:0});
t('Clásico sigue igual', T.seasonMonthLabel()==='A3 · Abr'&&T.isCoachPhase()===false, T.seasonMonthLabel());
setG({gameMode:'canicross',canicrossMode:true,cnSeason:5,cnMonthIdx:0});
t('Canicross: su temporada y su mes', T.seasonMonthLabel()==='A5 · Oct', T.seasonMonthLabel());

console.log('\n── H10 (v95) · abandonar no esconde una lesión ya sufrida ──');
setG({selectedRaces:[{id:'z',name:'Harrigorri',km:42}],currentRaceIdx:0,year:2,injuryType:'tendinitis',
  injuryHistory:[{type:'tendinitis',label:'Tendinitis',race:'Harrigorri',year:2,km:20}]});
t('detecta la lesión sufrida en esta carrera', T.injuryThisRace()?.label==='Tendinitis');
T.getG().injuryHistory[0].year=1;
t('y no la confunde con una de otra temporada', T.injuryThisRace()===null);

console.log('\n── Secuelas de zona roja (v95) · lo que se anuncia se aplica ──');
setG({postRaceRestWeeks:1});
t('una semana de descanso resta un 5 % de eficacia', Math.abs(T.restWeeksEffMult()-0.95)<1e-9);
T.getG().postRaceRestWeeks=3;
t('la hospitalización, un 15 %', Math.abs(T.restWeeksEffMult()-0.85)<1e-9);
T.getG().postRaceRestWeeks=20;
t('con suelo en −30 %', T.restWeeksEffMult()===0.7);
setG({seasonLegsPenalty:0.2});
t('la sobrecarga deja subida, bajada y velocidad al 80 %', ['subida','bajada','velocidad'].every(k=>Math.abs(T.legsTrainingMult(k)-0.8)<1e-9));
t('y no toca resistencia, nutrición ni mental', ['resistencia','nutricion','mental'].every(k=>T.legsTrainingMult(k)===1));
t('las dos se limpian al cerrar la temporada', /G\.postRaceRestWeeks=0;G\.seasonLegsPenalty=0;/.test(src['render-temporada.js']));
t('H17: el aviso «Modo Club disponible» ya no se pinta', !/<strong>Modo Club disponible<\/strong>/.test(src['coach.js']));

console.log('\n── H14 (v95) · el mental de los eventos solo cuenta esa carrera ──');
{
  const f=T.freshState();
  setG({runner:{...f.runner,stats:{...f.runner.stats,mental:60}},raceModifiers:{mental:0,velocidad:0,subida:0}});
  T.raceMental(10);
  t('un evento sube el mental efectivo de la carrera', T.getEffStat('mental')===70, T.getEffStat('mental'));
  t('pero no el mental del corredor', T.getG().runner.stats.mental===60);
  T.fairPlayMental(4);
  t('ayudar a otro deja +1 permanente y el resto es de la carrera',
    T.getG().runner.stats.mental===61&&T.getEffStat('mental')===74, T.getG().runner.stats.mental+' / '+T.getEffStat('mental'));
  T.endRaceCleanup();
  t('al terminar solo queda el +1 de deportividad', T.getEffStat('mental')===61, T.getEffStat('mental'));
  // El único bumpStat de mental que queda en race.js es el +1 de fairPlayMental.
  t('ningún evento sube ya el mental con bumpStat, salvo el +1 de deportividad',
    (src['race.js'].match(/bumpStat\((r|G\.runner),'mental'/g)||[]).length===1
    &&/function fairPlayMental\(n\)\{bumpStat\(G\.runner,'mental',1\)/.test(src['race.js']));
}

console.log('\n── v96 · la ayuda de lesiones sale de los datos (T46) ──');
t('la rotura: 2 carreras, 1 con fisio', T.injuryRacesBlocked('rotura',false)===2&&T.injuryRacesBlocked('rotura',true)===1);
t('la fractura bloquea las carreras que quedan (v96: ya no el 999)', T.injuryRacesBlocked('fractura',false,6)===6);
t('la tendinitis no bloquea', T.injuryRacesBlocked('tendinitis',true)===0);
t('el texto de la rotura dice lo que aplica el juego', T.injuryBlockText('rotura')==='2 carreras de baja (1 carrera con fisio)', T.injuryBlockText('rotura'));
t('el de la fractura ya no promete carreras', /resto de la temporada/.test(T.injuryBlockText('fractura')), T.injuryBlockText('fractura'));
t('ninguna ayuda dice «4 carreras bloqueadas»', !['render-core.js','render-clasico.js'].some(f=>/4 carreras bloqueadas/.test(src[f])));
t('race.js y devmode.js usan la misma cuenta',
  /injuryRacesBlocked\(specificInjury,hasFisio\(\),racesLeftAfterCurrent\(\)\)/.test(src['race.js'])
  &&/injuryRacesBlocked\(midRaceInjury,hasFisio\(\),racesLeftAfterCurrent\(\)\)/.test(src['race.js'])
  &&/injuryRacesBlocked\(type,hasFisio\(\),/.test(src['devmode.js']));

console.log('\n── v96 · el solapamiento no repite carreras ──');
setG({raceResults:[],currentRaceIdx:0});
t('sin temporada empezada, se vuelve a la jornada laboral', T.overlapRunnerScreen()==='workSetup');
setG({raceResults:[{pos:3,dnf:false}],currentRaceIdx:1,pendingEvent:null});
t('a mitad de temporada, a la preparación y no al arranque', T.overlapRunnerScreen()==='preRacePrep', T.overlapRunnerScreen());
setG({raceResults:[{pos:3,dnf:false}],currentRaceIdx:1,pendingEvent:{id:'x',choices:[]}});
t('con un evento entre carreras pendiente, al evento', T.overlapRunnerScreen()==='betweenRace');
setG({raceResults:[{pos:3,dnf:false}],currentRaceIdx:0});
t('con la carrera en curso ya terminada, a su resultado (falta afterRace)', T.overlapRunnerScreen()==='raceResult');
setG({raceResults:[{pos:3,dnf:false}],currentRaceIdx:1,overlapRunnerScreen:'betweenManage'});
t('si se guardó la pantalla del corredor, se vuelve a esa', T.overlapRunnerScreen()==='betweenManage');
setG({raceResults:[{pos:3,dnf:false}],currentRaceIdx:1,overlapRunnerScreen:'segment'});
t('una pantalla de carrera guardada no vale: se deduce', T.overlapRunnerScreen()==='preRacePrep');
setG({raceResults:[],currentRaceIdx:0,overlapRunnerScreen:'coachHome'});
t('una pantalla de Entrenador guardada tampoco', T.overlapRunnerScreen()==='workSetup');
t('overlapRunnerScreen está declarado y se guarda', 'overlapRunnerScreen' in T.freshState()&&'overlapRunnerScreen' in T.serializableState());
t('ni el botón de cambio ni el hub mandan a workSetup a pelo',
  !/onCoachSide\)\{G\.screen='workSetup'/.test(src['render-temporada.js'])&&/onclick="goToRunnerFromOverlap\(\)"/.test(src['render-temporada.js']));
t('cargar en el lado corredor recuerda la pantalla', /G\.overlapRunnerScreen=s;\s*G\.screen='overlapHub'/.test(src['render-core.js']));
t('doStartRaces no vacía una temporada empezada',
  /if\(G\.raceResults\.length>0\|\|G\.currentRaceIdx>0\)\{goNextRace\(\);autoSave\(\);return;\}\s*G\.raceResults=\[\];G\.currentRaceIdx=0;/.test(src['render-clasico.js']));

console.log('\n── v96 · decisiones del Club con vuelta atrás ──');
t('el foco mensual se puede quitar antes de simular', /window\.clearClubMonthlyFocus=/.test(src['club.js'])&&/onclick="clearClubMonthlyFocus\(\)"/.test(src['club.js']));
t('la opción elegida se desmarca al tocarla', /if\(sel\[decId\]===optId\)delete sel\[decId\]/.test(src['club.js'])&&/onclick="clubToggleMonthlySel\(/.test(src['club.js']));

console.log('\n── v96 · lesión: la baja acaba con la temporada, secuela recuperable y fisio ──');
t('fractura con fisio: el 30 % de las que quedan, redondeando arriba', T.injuryRacesBlocked('fractura',true,6)===2);
t('con fisio, al menos una si queda alguna', T.injuryRacesBlocked('fractura',true,1)===1);
t('en la última carrera no bloquea nada', T.injuryRacesBlocked('fractura',true,0)===0&&T.injuryRacesBlocked('fractura',false,0)===0);
{
  const f=T.freshState();
  setG({runner:{...f.runner,stats:{...f.runner.stats,resistencia:60,subida:60,mental:60,velocidad:60}},injurySequel:{},spending:{...f.spending,fisio:false}});
  T.applyInjuryStatPenalty('fractura');
  const g=T.getG();
  t('la fractura quita sus stats y los apunta como secuela',
    g.runner.stats.resistencia===51&&g.injurySequel.resistencia===9&&g.injurySequel.velocidad===3, JSON.stringify(g.injurySequel));
  T.recoverInjurySequel(T.INJURY_SEQUEL_RECOVERY.perRace);
  t('una carrera devuelve ~15 % de lo pendiente, mínimo 1 por stat',
    g.runner.stats.resistencia===52&&g.injurySequel.resistencia===8&&g.injurySequel.velocidad===2, JSON.stringify(g.injurySequel));
  T.recoverInjurySequel(1);
  t('nunca devuelve más de lo perdido', g.runner.stats.resistencia===60&&g.runner.stats.velocidad===60&&Object.keys(g.injurySequel).length===0, JSON.stringify(g.runner.stats));
  setG({runner:{...f.runner,stats:{...f.runner.stats,resistencia:50}},injurySequel:{resistencia:10},spending:{...f.spending,fisio:true}});
  T.recoverInjurySequel(0.2);
  t('con fisio recupera ×1,5', T.getG().injurySequel.resistencia===7, T.getG().injurySequel.resistencia);
}
t('la pretemporada cura la baja y recupera la mitad de la secuela',
  /G\.injuryRacesLeft=0;G\.injuryType=null;G\.injuryStatus=null;\s*recoverInjurySequel\(INJURY_SEQUEL_RECOVERY\.preseason\)/.test(src['render-temporada.js']));
t('cada carrera que pasa recupera, salvo con la carga en aviso 2',
  /if\(getBodyLoad\(\)<getLoadThresholdsByMode\(\)\.warningLevel2\)recoverInjurySequel\(INJURY_SEQUEL_RECOVERY\.perRace\);\s*G\.currentRaceIdx\+\+;/.test(src['render-temporada.js']));
t('las dos lesiones de carrera pasan por la secuela', (src['race.js'].match(/applyInjuryStatPenalty\(/g)||[]).length===2&&!/injData\.statPenalty\|\|\{\}\)\.forEach/.test(src['race.js']));

console.log('\n── v96 · los DNF entran en el historial del corredor ──');
{
  const fin=(name,pos,year)=>({name,year,time:100,pos,dnf:false,prize:0});
  const dnf=(name,year,reason)=>({name,year,time:0,pos:null,dnf:true,dnfReason:reason,prize:0});
  setG({careerHistory:[fin('A',1,1),fin('B',1,1),fin('C',1,1)]});
  const sinDnf=T.careerAgg();
  t('sin DNF, los agregados de siempre', sinDnf.n===3&&sinDnf.wins===3&&sinDnf.maxWinStreak===3&&sinDnf.racesByYear[1]===3);
  setG({careerHistory:[fin('A',1,1),dnf('X',1,'abandono'),fin('B',1,1),fin('C',1,1)]});
  const a=T.careerAgg();
  t('un DNF no es carrera, victoria ni podio', a.n===3&&a.wins===3&&a.podiums===3&&a.racesByYear[1]===3, JSON.stringify({n:a.n,w:a.wins,p:a.podiums}));
  t('pero un abandono corta la racha', a.maxWinStreak===2, a.maxWinStreak);
  setG({careerHistory:[fin('A',1,1),fin('B',1,1),dnf('X',1,'lesion'),fin('C',1,1)]});
  t('y la baja por lesión también', T.careerAgg().maxWinStreak===2);
  const pf=T.ACHIEVEMENTS.find(x=>x.id==='perfect_full');
  setG({careerHistory:[1,2,3,4,5].map(i=>fin('R'+i,1,1))});
  t('«Invicto total» con cinco de cinco', pf.check()===true);
  setG({careerHistory:[...[1,2,3,4,5].map(i=>fin('R'+i,1,1)),dnf('X',1,'abandono')]});
  t('y no con un DNF esa temporada', pf.check()===false);
  setG({year:2,raceResults:[],careerHistory:[]});
  T.recordDNF({id:'r1',name:'Carrera'},'abandono');
  const g=T.getG();
  t('recordDNF apunta en los dos historiales con la forma de T45',
    g.raceResults.length===1&&g.careerHistory.length===1&&T.isDNF(g.raceResults[0])&&T.isDNF(g.careerHistory[0])&&g.careerHistory[0].year===2);
  t('abandonar, el abandono forzado y la baja lo usan',
    /recordDNF\(race,'abandono'\)/.test(src['race.js'])&&/recordDNF\(race2,'abandono'\)/.test(src['race.js'])&&/recordDNF\(race,'lesion'/.test(src['render-temporada.js']));
  t('las pantallas cuentan carreras sin los DNF',
    !/G\.careerHistory\.filter\(|\(G\.careerHistory\|\|\[\]\)\.(length|filter)|G\.careerHistory\.length;|const hist=G\.careerHistory/.test(src['render-temporada.js']+src['render-clasico.js']));
}

console.log('\n── v96 · economía del Club ──');
t('la cuota de socio es €25 y sale de la constante', T.CLUB_SOCIO_FEE===25&&!/socios\*25\*12/.test(src['club.js']));
{
  const R=[{pos:2,dnf:false,race:{tier:'local'}},{pos:8,dnf:false,race:{tier:'regional'}},{pos:9,dnf:false,race:{tier:'local'}},
    {pos:null,dnf:true,race:{tier:'local'}},{pos:4,dnf:false,race:{tier:'nacional'}}];
  const ok=k=>T.clubSponsorObjectiveMet({objKey:k},R,{socios:40});
  t('top10x3 y podio1 se cumplen con estos resultados', ok('top10x3')&&ok('podio1'));
  t('part5 cuenta participaciones, también el DNF', ok('part5'));
  t('no_dnf falla con un abandono', !ok('no_dnf'));
  t('top5nat mira el tier nacional', ok('top5nat')&&!T.clubSponsorObjectiveMet({objKey:'top5nat'},R.slice(0,4),{socios:40}));
  t('socios50 mira los socios', !ok('socios50')&&T.clubSponsorObjectiveMet({objKey:'socios50'},R,{socios:50}));
}
t('al simular se cobra el 60 % y el 40 % solo si se cumple',
  /const base=Math\.round\(total\*CLUB_SPONSOR_SPLIT\.base\);\s*const bonus=met\?total-base:0;/.test(src['club.js']));
t('el cierre ya no vuelve a sumar premios ni sponsors',
  /onclick="doClubNextSeason\(\$\{socioGain\},\$\{socioLoss\},\$\{closing\}\)"/.test(src['club.js'])&&/const closing=socioIncome-wages-staffCost;/.test(src['club.js']));
t('el presupuesto ya no tiene suelo en 0 al cerrar', !/d\.presupuesto=Math\.max\(0,d\.presupuesto\+netBalance\)/.test(src['club.js']));
t('cinco temporadas seguidas en rojo disuelven el club', T.CLUB_RED_SEASONS_MAX===5
  &&/if\(d\.redSeasons>=CLUB_RED_SEASONS_MAX\)\{d\.dissolved=true;G\.screen='clubDissolved'/.test(src['club.js'])
  &&/clubDissolved:renderClubDissolved/.test(src['render-core.js']));
t('una decisión mensual por temporada', /if\(d\.monthlyDecisionDone\)\{showToast/.test(src['club.js'])&&/d\.sponsorOutcomes=\[\];d\.monthlyDecisionDone=false;/.test(src['club.js']));

console.log('\n── v96 · el objetivo de temporada del Club se aplica una vez ──');
{
  const obj={reward:{rep:15,socios:10},penalty:{rep:-5}};
  const ok=T.clubObjectiveDeltas({seasonObjective:obj,seasonObjectiveMet:true});
  const ko=T.clubObjectiveDeltas({seasonObjective:obj,seasonObjectiveMet:false});
  t('cumplido: +15 rep y +10 socios; fallado: −5 rep', ok.rep===15&&ok.socios===10&&ko.rep===-5&&ko.socios===0);
  t('sin objetivo, nada', JSON.stringify(T.clubObjectiveDeltas({seasonObjective:null}))==='{"rep":0,"socios":0,"cohesion":0}');
  const pintar=src['club.js'].slice(src['club.js'].indexOf('function renderClubSeasonEnd'),src['club.js'].indexOf('window.doClubNextSeason'));
  t('la pantalla de balance ya no toca reputación ni cohesión', !/d\.reputacion=|d\.cohesion=/.test(pintar));
  t('doClubNextSeason aplica reputación y socios del objetivo',
    /d\.reputacion=Math\.max\(0,Math\.min\(100,\(d\.reputacion\|\|0\)\+_obj\.rep\)\)/.test(src['club.js'])&&/socioLoss\+_obj\.socios\)/.test(src['club.js']));
}

console.log('\n── v96 · Canicross se puede cerrar en marzo ──');
t('el cierre sale con marzo terminado aunque queden carreras', /const marchDone=cnSeasonOver\(\);/.test(src['canicross-render.js'])&&/const allRaceDone=marchDone\|\|\(races\.length>0&&pendingRaces\.length===0\);/.test(src['canicross-render.js']));

console.log('\n── Tanda del playtest v96 ──');
{
  const _render=ctx.render,_toast=ctx.showToast;
  const pinta=domStub(ctx);

  // BUG-05: la pantalla, no el texto del fuente
  setG({gameMode:'canicross',canicrossMode:true,screen:'canicrossSeasonBalance',activeTab:'game',cnSeason:1,cnMonthIdx:6,cnRaceResults:[],dogs:[]});
  let html=pinta(()=>_render());
  t('Canicross: «Cerrar temporada» llega al balance y se pinta', html.includes('cnEndSeason()'), html.slice(0,80));

  // BUG-17
  setG({cnMonthIdx:1}); t('Canicross: mes 1 es noviembre', T.cnMonth()===11, T.cnMonth());
  setG({cnMonthIdx:5}); t('mes 5 es marzo y la temporada no ha terminado', T.cnMonth()===3&&!T.cnSeasonOver());
  t('el aviso de «Avanzar» nombra el mes que termina', /const doneMonth=cnMonth\(\);[\s\S]*cnEndMonth\(\);[\s\S]*CN_MONTH_NAMES\[doneMonth\]/.test(src['canicross.js']));

  // BUG-08
  setG({carreraVida:true,lifecyclePhase:'overlap',screen:'coachHome'});
  t('solapamiento, lado Entrenador: se pinta como Entrenador', T.coachViewActive()===true&&T.isCoachPhase()===false);
  setG({carreraVida:true,lifecyclePhase:'overlap',screen:'preRacePrep'});
  t('solapamiento, lado Corredor: se pinta como Corredor', T.coachViewActive()===false);

  // BUG-04
  {
    const nodo={textContent:'',style:{},classList:{add(){},remove(){}},offsetWidth:1};
    const _gid=ctx.document.getElementById,_st=ctx.setTimeout;const timers=[];
    ctx.document.getElementById=id=>id==='toast-notif'?nodo:_gid(id);
    ctx.setTimeout=f=>{timers.push(f);return timers.length;};
    _toast('🏆 Logro: A');_toast('🏆 Logro: B');_toast('🏆 Logro: B');
    t('dos avisos seguidos: se ve el primero', nodo.textContent==='🏆 Logro: A');
    t('el repetido no se encola', T.TOAST_QUEUE.length===1, T.TOAST_QUEUE.length);
    timers.shift()();
    t('y al acabar sale el segundo, no se pierde', nodo.textContent==='🏆 Logro: B');
    timers.shift()();
    t('la cola se vacía', T.TOAST_QUEUE.length===0&&timers.length===0);
    ctx.document.getElementById=_gid;ctx.setTimeout=_st;
  }

  ctx.render=()=>{};ctx.showToast=()=>{};

  // BUG-15
  setG({gameMode:'club'});
  let d=T.initClubModeData('Test','mixto','montanero','equilibrado');
  T.getG().clubModeData=d;d.presupuesto=50;
  const coh=d.cohesion,soc=d.socios;
  T.getG()._monthlySelections={training:'conservador',focus:'marketing',budget:'invertir'};
  ctx.doClubApplyMonthlyFull();
  t('Club: «Invertir» sin fondos no aplica nada ni gasta la decisión', d.monthlyDecisionDone===false&&d.cohesion===coh&&d.socios===soc);

  // BUG-14
  {
    const _M=ctx.Math;ctx.Math=Object.assign(Object.create(Math),{random:()=>0.5});
    const runner={id:'r1',stats:{resistencia:60,velocidad:60,subida:60,bajada:60},spec:'fondista',role:'normal',age:28};
    const race=T.CLUB_RACES[0];
    d=T.initClubModeData('Test','mixto','montanero','equilibrado');
    const sin=T.simClubRace(runner,race,d).perf;
    d._monthlyFocusBonus=4;
    const con=T.simClubRace(runner,race,d).perf;
    ctx.Math=_M;
    t('Club: «Resultados» de la decisión mensual sube el rendimiento', con>sin, sin+' → '+con);
  }
  t('Club: el foco «Formación» del hub acelera la cantera', /const focusCoef=d\.monthlyFocus==='formacion'/.test(src['club.js'])&&/\*coef\*staffCoef\*focusCoef;/.test(src['club.js']));

  // BUG-16
  t('Club: el Capitán ya no promete bonus a los compañeros', !/corredores cercanos/.test(T.CLUB_ROLES.capitan.desc));

  // BUG-19
  setG({clubModeData:null});
  ctx.devJumpToClub();
  t('dev: el salto a Club crea el club con objetivo de temporada', !!T.getG().clubModeData&&!!T.getG().clubModeData.seasonObjective);

  // BUG-18
  const rs=[{id:'a',name:'A',km:20,month:3,cost:10,prize:50},{id:'b',name:'B',km:20,month:5,cost:10,prize:50},{id:'c',name:'C',km:20,month:7,cost:10,prize:50}];
  setG({gameMode:'medio',screen:'preRacePrep',selectedRaces:rs,currentRaceIdx:1,raceResults:[{}]});
  const antes=Object.values(T.getG().runner.stats).reduce((a,b)=>a+b,0);
  pinta(()=>ctx.devSetInjury('fractura'));
  let g=T.getG();
  t('dev: fractura en la preparación → pantalla de baja, sin preparar la carrera', g.screen==='raceResult'&&g.currentRaceIdx===1, g.screen+' idx '+g.currentRaceIdx);
  t('y quita stats y la apunta en el historial', Object.values(g.runner.stats).reduce((a,b)=>a+b,0)<antes&&g.injuryHistory.length===1);

  // Canicross sin ranura
  t('Canicross ya no se inventa la ranura 1', !/if\(G\._saveSlot==null\)G\._saveSlot=0;/.test(src['canicross.js']));

  ctx.render=_render;ctx.showToast=_toast;
}

console.log('\n── Activos del playtest v96, segunda tanda ──');
{
  const _render=ctx.render,_toast=ctx.showToast;
  const pinta=domStub(ctx);
  ctx.render=()=>{};ctx.showToast=()=>{};

  // Ficha 3
  t('injuryRecoverySeasons ya no existe', !Object.values(src).some(s=>/injuryRecoverySeasons|recoverySeasons:/.test(s)));

  // Ficha 6 · horas del pupilo
  t('mejora por horas: 0h nada, 2h → 1, 5h → 2, 10h → 3',
    ctx.lifeAthleteSeasonGain(0)===0&&ctx.lifeAthleteSeasonGain(2)===1&&ctx.lifeAthleteSeasonGain(5)===2&&ctx.lifeAthleteSeasonGain(10)===3);
  {
    const base={resistencia:50,velocidad:50,subida:50,bajada:50,nutricion:50,mental:50};
    const life={id:'noa',name:'Noa Prueba',age:20,spec:'fondista',baseStats:{...base},currentStats:{...base}};
    const coachA={...life,currentStats:{...base,resistencia:70}};   // otro objeto, como tras guardar y cargar
    setG({gameMode:'medio',carreraVida:true,lifecyclePhase:'overlap',lifeAthlete:life,coachAthlete:coachA,lifeAthleteHours:10,year:3,selectedRaces:[],raceResults:[]});
    let err='';
    try{ctx.doNextYear(0);}catch(e){err=e.message;}
    const g=T.getG();
    const suma=o=>Object.values(o).reduce((a,b)=>a+b,0);
    t('las horas llegan también al atleta que entrenas en el lado Entrenador',
      !err&&suma(g.coachAthlete.currentStats)===suma(base)+20+3&&suma(g.lifeAthlete.currentStats)===suma(base)+3, err||suma(g.coachAthlete.currentStats));
    setG({gameMode:'medio',carreraVida:true,lifecyclePhase:'overlap',lifeAthlete:{...life},coachAthlete:{...coachA,currentStats:{...base,resistencia:70}},year:12,unlockedAchievements:[]});
    try{ctx.confirmLifeCoachTransition();}catch(e){err=e.message;}
    t('al retirarte no se pisa lo entrenado en el lado Entrenador', !err&&T.getG().coachAthlete.currentStats.resistencia===70, err||T.getG().coachAthlete.currentStats.resistencia);
    setG({carreraVida:true,lifecyclePhase:'overlap',lifeAthlete:{...life},lifeAthleteHours:5,year:3});
    const html=pinta(()=>ctx.renderOverlapHub());
    t('el hub del solapamiento habla de horas a la semana y de la retirada', html.includes('a la semana')&&html.includes('dejar la competición')&&!html.includes('llevas'));
  }

  // Ficha 7 · cohesión
  setG({clubModeData:{filosofia:'montanero'}});
  const tip=ctx.clubCohesionTipHtml();
  t('el ⓘ de la cohesión dice lo que hace la simulación',
    tip.includes('+4 por cada victoria')&&tip.includes('−6 por cada abandono')&&tip.includes('+8 con psicólogo')&&tip.includes('+2 por tu filosofía')
    &&/wins\*4-dnfs\*6/.test(src['club.js']));

  // Ficha 8 · números rojos
  t('el aviso de números rojos sale en todas las temporadas', !/if\(d\.redSeasons<3\)showToast/.test(src['club.js']));

  // Ficha 11a · invitaciones
  setG({selectedRaces:[{id:'x',_invite:true}],repInvitations:[{id:'y'}]});
  t('invitación del organizador y por reputación se distinguen',
    ctx.inviteBadge({id:'x'}).includes('organizador')&&ctx.inviteBadge({id:'y'}).includes('reputación')&&ctx.inviteBadge({id:'z'})==='');
  t('el distintivo sale en las tres listas', (src['render-clasico.js'].match(/\$\{inviteBadge\(r\)\}/g)||[]).length===3);

  ctx.render=_render;ctx.showToast=_toast;
}

console.log('\n── Carrera de Vida: de Entrenador a Club · economía del Club ──');
{
  const _render=ctx.render,_toast=ctx.showToast,_M=ctx.Math;
  const pinta=domStub(ctx);
  ctx.render=()=>{};ctx.showToast=()=>{};
  ctx.Math=Object.assign(Object.create(Math),{random:()=>0.99});   // sin retiros ni atleta extra por azar
  const base={resistencia:55,velocidad:55,subida:55,bajada:55,nutricion:50,mental:50};
  const ane={id:'ane',name:'Ane Prueba',flag:'🇪🇸',spec:'todoterreno',personality:'obediente',age:24,baseStats:{...base},currentStats:{...base}};
  let err='',g;

  setG({gameMode:'medio',carreraVida:true,lifecyclePhase:'coach',coachAthlete:{...ane},coachSeason:2,coachReputation:70,coachRaceResults:[],coachTrainerStyle:'x',money:10000});
  try{ctx.doCoachNextSeason();}catch(e){err=e.message;}
  t('Entrenador en Carrera de Vida: al cerrar la 3.ª temporada llega la oferta de club', !err&&T.getG().screen==='clubOffer', err||T.getG().screen);

  ctx.confirmClubOffer();
  g=T.getG();
  t('aceptar lleva a la fundación completa, precargada', g.screen==='clubCreate'&&g._clubFromLife===true&&g._clubSpecDraft==='mixto'&&g.lifecyclePhase==='coach');
  g._clubArqDraft='cantera';g._clubFilDraft='estrategico';
  try{ctx.doClubCreate();}catch(e){err=e.message;}
  g=T.getG();const dc=g.clubModeData;
  t('fundar: arquetipo y filosofía elegidos, tu atleta de capitán (único) y fase Club',
    !err&&dc&&dc.archetype==='cantera'&&dc.filosofia==='estrategico'&&dc.plantilla[0].name==='Ane Prueba'
    &&dc.plantilla.filter(r=>r.role==='capitan').length===1&&g.lifecyclePhase==='club'&&g.screen==='clubIntro'&&g.money===4000&&!g._clubFromLife,
    err||JSON.stringify({arq:dc&&dc.archetype,screen:g.screen,money:g.money}));

  const extra={...T.LIFE_EXTRA_ATHLETES[0],currentStats:{...T.LIFE_EXTRA_ATHLETES[0].baseStats}};
  setG({gameMode:'medio',carreraVida:true,lifecyclePhase:'coach',coachAthlete:{...ane},coachActiveIdx:0,coachRoster:[],coachReputation:45,coachTrainerStyle:'x',pendingLifeAthleteOffer:{...extra}});
  try{ctx.acceptLifeAthlete();}catch(e){err=e.message;}
  g=T.getG();
  t('siendo entrenador, aceptar un atleta lo mete en el hueco libre, sin volver al solapamiento',
    !err&&g.lifecyclePhase==='coach'&&g.coachActiveIdx===1&&g.coachAthlete.id===extra.id&&g.coachRoster[0]&&g.coachRoster[0].coachAthlete.id==='ane',
    err||JSON.stringify({fase:g.lifecyclePhase,idx:g.coachActiveIdx}));
  setG({gameMode:'medio',carreraVida:true,lifecyclePhase:'coach',coachAthlete:{...ane},coachActiveIdx:0,coachRoster:[],coachReputation:10,pendingLifeAthleteOffer:{...extra}});
  ctx.acceptLifeAthlete();
  t('sin hueco libre no se ficha', !!T.getG().pendingLifeAthleteOffer&&T.getG().coachAthlete.id==='ane');
  ctx.rejectLifeAthlete();
  t('y rechazar devuelve al hub de Entrenador, no a la jornada laboral', T.getG().screen==='coachHome');

  // Economía: techo blando de socios
  const res=[{race:{name:'R',tier:'local',cost:0},runner:{id:'a',name:'A'},pos:2,dnf:false,prize:0},{race:{name:'R2',tier:'local',cost:0},runner:{id:'a',name:'A'},pos:3,dnf:false,prize:0}];
  const ganancia=socios=>{
    setG({gameMode:'club'});
    const dd=T.initClubModeData('Eco','mixto','montanero','equilibrado');
    dd.socios=socios;dd.reputacion=10;dd.seasonResults=res;T.getG().clubModeData=dd;
    const h=pinta(()=>ctx.renderClubSeasonEnd());
    return +((h.match(/doClubNextSeason\((-?[\d.]+),/)||[])[1]);
  };
  const g0=ganancia(0),g60=ganancia(60),g120=ganancia(120);
  t('socios por resultados: a 60 la mitad, a 120 ninguno', T.CLUB_SOCIOS_SOFT_CAP===120&&g0>0&&g60===Math.round(g0/2)&&g120===0, g0+' · '+g60+' · '+g120);

  ctx.render=_render;ctx.showToast=_toast;ctx.Math=_M;
}

console.log('\n── v98 · modo desarrollador (CR-80) ──');
{
  const _render=ctx.render,_toast=ctx.showToast,_M=ctx.Math,_atob=ctx.atob;
  const pinta=domStub(ctx);
  ctx.render=()=>{};ctx.showToast=()=>{};
  const D=T.DEV;

  // P1 · el estado del panel no vive en G
  t('freshState() ya no declara campos _dev', !Object.keys(T.freshState()).some(k=>k.startsWith('_dev')));
  D.god.clasico=true;ctx.devArm('weather','extremo');
  setG({money:777});
  T.setG(T.migrateState(T.serializableState()));
  ctx.devLoadState(JSON.stringify(T.serializableState()),'test');
  t('migrar, rehacer G o cargar no apaga el modo dios ni lo armado', D.god.clasico===true&&D.armed.weather==='extremo'&&T.getG().money===777);

  // devTake / devPeek
  t('devPeek no consume', ctx.devPeek('weather')==='extremo'&&ctx.devPeek('weather')==='extremo');
  t('devTake devuelve lo armado una vez y después undefined', ctx.devTake('weather')==='extremo'&&ctx.devTake('weather')===undefined);
  D.god.clasico=false;

  // Sin devmode.js (sin ?dev=1) el juego sigue funcionando
  {
    const saved={devTake:ctx.devTake,devPeek:ctx.devPeek,devGod:ctx.devGod,devBuildMidRaceEvent:ctx.devBuildMidRaceEvent};
    for(const k of Object.keys(saved))delete ctx[k];
    let err='';
    try{
      const races=T.RACES_DB.slice(0,3).map(r=>({...r}));
      setG({gameMode:'medio',selectedRaces:races,currentRaceIdx:0,seg:2});
      ctx.initRace();ctx.checkMidRaceEvents();ctx.getTrainingEvent('base');
      const d=T.initClubModeData('Sin dev','mixto','montanero','equilibrado');
      T.simClubRace(d.plantilla[0],T.CLUB_RACES[0],d);
    }catch(e){err=e.message;}
    Object.assign(ctx,saved);
    t('sin window.devTake: initRace, checkMidRaceEvents, getTrainingEvent y simClubRace funcionan', !err, err);
  }

  // P15 · Club cierra con sus cuentas
  {
    ctx.Math=Object.assign(Object.create(Math),{random:()=>0.5});
    setG({gameMode:'club'});
    const d=T.initClubModeData('Cierre','mixto','montanero','equilibrado');
    d.socios=40;d.reputacion=30;T.getG().clubModeData=d;
    d.calAssignments={};T.CLUB_RACES.forEach(r=>{d.calAssignments[r.id]=d.plantilla.map(x=>x.id);});
    ctx.doClubSimulateSeason();
    const c=T.clubSeasonClosing(d);
    const h=pinta(()=>ctx.renderClubSeasonEnd());
    const m=h.match(/doClubNextSeason\((-?[\d.]+),(-?[\d.]+),(-?[\d.]+)\)/)||[];
    t('clubSeasonClosing da las cifras que pasa la pantalla', +m[1]===c.socioGain&&+m[2]===c.socioLoss&&+m[3]===c.closing, m.slice(1).join(',')+' vs '+[c.socioGain,c.socioLoss,c.closing]);
    const antes=d.presupuesto;
    ctx.devClubClose();
    t('devClubClose aplica el cierre al presupuesto (antes, doClubNextSeason(0,0,0))', T.getG().clubModeData.presupuesto===antes+c.closing&&c.closing!==0, antes+' + '+c.closing+' → '+T.getG().clubModeData.presupuesto);
    ctx.Math=_M;
  }

  // Club · abandono y sponsors armados
  {
    setG({gameMode:'club'});
    const d=T.initClubModeData('Dnf','mixto','montanero','equilibrado');T.getG().clubModeData=d;
    ctx.devArm('clubDnf','*');D.god.club=true;
    const r1=T.simClubRace(d.plantilla[0],T.CLUB_RACES[0],d);
    const r2=T.simClubRace(d.plantilla[0],T.CLUB_RACES[0],d);
    D.god.club=false;
    t('clubDnf «*»: la primera carrera simulada sale DNF (gana al modo dios) y la clave se consume', r1.dnf===true&&r1.pos===99&&r1.prize===0&&r2.dnf===false&&ctx.devPeek('clubDnf')===undefined);
    ctx.devArm('clubSponsorMet',false);
    t('clubSponsorMet manda sobre el objetivo', ctx.clubSponsorObjectiveMet({objKey:'part5'},[1,2,3,4,5,6],d)===false);
    d.clubSponsors=[];d.calAssignments={};
    ctx.doClubSimulateSeason();
    t('y se consume al final de la simulación', ctx.devPeek('clubSponsorMet')===undefined);
  }

  // Entrenador · applyCoachInjury
  {
    const base={resistencia:60,velocidad:60,subida:60,bajada:60,nutricion:60,mental:60};
    const inj=T.COACH_INJURY_TYPES[0];
    setG({gameMode:'coach',coachAthlete:{id:'x',name:'X',currentStats:{...base}},coachTrust:50,coachDecisionLog:[]});
    T.applyCoachInjury(inj);
    const g=T.getG();
    const esperado=Object.fromEntries(Object.entries(base).map(([k,v])=>[k,inj.statPenalty&&inj.statPenalty[k]!==undefined?Math.max(10,v+inj.statPenalty[k]):v]));
    t('applyCoachInjury: baja, stats, −4 de confianza y entrada en el log', g.coachInjury.id===inj.id&&g.coachInjury.racesLeft===inj.racesOut
      &&JSON.stringify(g.coachAthlete.currentStats)===JSON.stringify(esperado)&&g.coachTrust===46&&g.coachDecisionLog.length===1);
    t('doCoachRaceFinish usa esa misma función', /applyCoachInjury\(inj\)/.test(src['coach.js'])&&!/G\.coachInjury=\{\.\.\.inj/.test(src['coach.js'].replace(/function applyCoachInjury[\s\S]*?\n\}/,'')));
  }

  // P7 · forzar un mensual no borra los pendientes
  setG({gameMode:'medio',monthlyEvents:[{...T.MONTHLY_EVENTS_POOL[1],resolved:false}]});
  ctx.devLaunchMonthly(T.MONTHLY_EVENTS_POOL[0].id);
  t('forzar un evento mensual con otro pendiente deja los dos', T.getG().monthlyEvents.length===2&&T.getG().monthlyEvents.every(e=>!e.resolved));

  // Clásico · enganches
  {
    ctx.Math=Object.assign(Object.create(Math),{random:()=>0.99});   // sin evento entre carreras por azar
    const ev=T.BETWEEN_EVENTS[T.BETWEEN_EVENTS.length-1];
    ctx.devArm('betweenEvent',ev.id);
    setG({gameMode:'medio',selectedRaces:[{id:'a',name:'A',month:3},{id:'b',name:'B',month:5}],currentRaceIdx:0});
    ctx.afterRace();
    t('betweenEvent armado: al terminar la carrera sale ese evento', T.getG().pendingEvent&&T.getG().pendingEvent.id===ev.id&&T.getG().screen==='betweenRace', T.getG().screen);
    const te=T.TRAINING_EVENTS_POOL[0];
    ctx.devArm('trainingEvent',te.id);
    t('trainingEvent armado sale aunque el dado diga que no', ctx.getTrainingEvent('base')===te&&ctx.getTrainingEvent('base')===null);
    const races=T.RACES_DB.slice(0,2).map(r=>({...r}));
    ctx.devArm('weather','extremo');ctx.devArm('dayCondition','dia_especial');
    setG({gameMode:'medio',selectedRaces:races,currentRaceIdx:0,_raceInitialized:false,dayConditionGenerated:false});
    ctx.initRace();
    t('weather y dayCondition armados salen en la siguiente carrera', T.getG().weather==='extremo'&&T.getG().dayCondition&&T.getG().dayCondition.id==='dia_especial'&&ctx.devPeek('weather')===undefined);
    ctx.Math=_M;
  }
  t('DAY_CONDITIONS: los 7 de v97, con sus pesos y en el mismo orden',
    JSON.stringify(T.DAY_CONDITIONS.map(c=>[c.id,c.w]))===JSON.stringify([['normal',0.40],['buena_noche',0.12],['mala_noche',0.12],['estomago',0.10],['piernas_mal',0.10],['dia_especial',0.08],['calor_extra',0.08]]));

  // ¿Qué puede salir ahora?
  {
    const races=T.RACES_DB.filter(r=>r.km>=35).slice(0,1).map(r=>({...r}));
    setG({gameMode:'medio',selectedRaces:races,currentRaceIdx:0,seg:3,weather:'extremo',midRaceEventTriggered:{storm:true}});
    ctx.initRace();T.getG().seg=3;T.getG().weather='extremo';T.getG().midRaceEventTriggered={storm:true};
    const antes=JSON.stringify(T.getG().midRaceEventTriggered);const rnd=ctx.Math.random;
    const lista=ctx.devEligibleNow();
    t('devEligibleNow no cambia midRaceEventTriggered ni Math.random', JSON.stringify(T.getG().midRaceEventTriggered)===antes&&ctx.Math.random===rnd&&Array.isArray(lista));
    t('y no ofrece lo que ya salió en esta carrera', !lista.some(e=>e.id==='storm'));
  }

  // Paso 9 · catálogo de los eventos clásicos de carrera
  {
    const C=T.CLASSIC_MID_RACE_EVENTS;
    const ids=Object.keys(C);
    const races=T.RACES_DB.slice(0,1).map(r=>({...r}));
    setG({gameMode:'medio',selectedRaces:races,currentRaceIdx:0,seg:1,followers:900});
    ctx.initRace();
    const malos=ids.filter(id=>{const e=C[id].build();return !(e.id===id&&e.title&&e.desc&&Array.isArray(e.choices)&&e.choices.length>=2&&e.choices.every(c=>c.text&&c.id));});
    t('los 29 build() devuelven id, title, desc y choices', ids.length===29&&!malos.length, ids.length+' · '+malos.join(','));
    t('los 29 tienen resolutor', ids.every(id=>typeof T.MID_RACE_RESOLVERS[id]==='function'));
    let fallan=[];
    for(const id of ids){
      setG({gameMode:'medio',selectedRaces:races.map(r=>({...r})),currentRaceIdx:0,seg:1,screen:'segment',midRaceEventTriggered:{},followers:900});
      ctx.initRace();T.getG().seg=1;T.getG().screen='segment';
      try{
        ctx.devEvtLaunch('mid',id);
        const g=T.getG();
        if(g.screen!=='midRaceEvent'||!g.midRaceEvent||g.midRaceEvent.id!==id||!g.midRaceEventTriggered[C[id].key]){fallan.push(id+':lanzar');continue;}
        ctx.resolveMidRaceEvent(id,g.midRaceEvent.choices[0].id);
        if(T.getG().screen!=='segment')fallan.push(id+':resolver→'+T.getG().screen);
      }catch(e){fallan.push(id+':'+e.message);}
    }
    t('lanzar cualquiera en segment lleva a midRaceEvent y resolverlo vuelve a segment', !fallan.length, fallan.join(', '));
    // Paso 10 · condiciones como datos
    const corta={...T.RACES_DB[0],km:21,segs:Array.from({length:10},(_,j)=>({name:'t',km:2.1,type:'flat',gain:0,base:600}))};
    setG({gameMode:'medio',selectedRaces:[corta],currentRaceIdx:0,seg:5,midRaceEventTriggered:{}});
    const w=ctx.devWhyNot('storm');
    t('devWhyNot dice la primera condición que falla y su valor', w&&w.label==='Carrera de 35 km o más'&&w.val==='21 km', JSON.stringify(w));
    T.getG().midRaceEventTriggered={hat:true};
    t('y distingue lo que ya salió (por su marca, no por el id)', ctx.devWhyNot('hat_blown').label==='Ya salió en esta carrera');
    t('todas las entradas tienen conds y chance', ids.every(id=>Array.isArray(C[id].conds)&&C[id].conds.length&&typeof C[id].chance==='function'));
  }

  // Carga única: tres formatos y tope de tamaño
  {
    setG({money:111});
    const st=T.serializableState();
    ctx.atob=b=>Buffer.from(b,'base64').toString('binary');
    const b64=T.SAVE_VERSION+'::'+Buffer.from(JSON.stringify({...st,money:333}),'utf8').toString('base64');
    let ok=true;
    try{
      ctx.devLoadState(JSON.stringify({_devExport:1,build:97,state:{...st,money:222}}),'t');ok=ok&&T.getG().money===222;
      ctx.devLoadState(JSON.stringify({...st,money:444}),'t');ok=ok&&T.getG().money===444;
      ctx.devLoadState(b64,'t');ok=ok&&T.getG().money===333;
    }catch(e){ok=false;}
    let rechaza=false;
    try{ctx.devLoadState(' '.repeat(T.MAX_IMPORT_CHARS+1),'t');}catch(e){rechaza=/grande/.test(e.message);}
    t('devLoadState acepta el export del panel, el estado crudo y el texto del juego', ok);
    t('y rechaza un texto mayor que MAX_IMPORT_CHARS', rechaza);
    ctx.atob=_atob;
  }

  ctx.render=_render;ctx.showToast=_toast;ctx.Math=_M;
}

console.log('\n── v98 · CR-81 · las precarreras no cambian la partida al pintarse ──');
{
  const _render=ctx.render,_toast=ctx.showToast;
  const pinta=domStub(ctx);
  ctx.render=()=>{};ctx.showToast=()=>{};
  const foto=()=>{const g={...T.getG()};delete g._raceResult;return JSON.stringify(g);};
  setG({gameMode:'medio',money:500,gelsCarried:2,selectedRaces:T.RACES_DB.slice(0,3).map(r=>({...r})),currentRaceIdx:0,screen:'preRacePrep'});
  const antes=foto();
  pinta(()=>ctx.renderPreRace());
  t('pintar preRace sin haber preparado la carrera no toca nada', foto()===antes);
  ctx.goPreRace();
  const g=T.getG();
  t('goPreRace prepara la carrera (rivales, clima, condición del día, geles cobrados)', g.screen==='preRace'&&g.rivals.length>0&&g.dayConditionGenerated&&g.money<500, g.money);
  const tras=foto();
  pinta(()=>ctx.renderPreRace());pinta(()=>ctx.renderPreRace());
  t('y repintarla tampoco cambia nada', foto()===tras);
  t('ningún botón lleva a preRace a mano', !['race.js','render-clasico.js'].some(f=>/onclick="G\.screen='preRace'/.test(src[f])));
  const a=T.COACH_ATHLETE_POOL[0];
  setG({gameMode:'coach',coachAthlete:{...a,currentStats:{...a.baseStats}},coachSelectedRaces:T.RACES_DB.slice(0,2),coachRaceIdx:0,coachDayCondition:null});
  const antesC=foto();
  pinta(()=>ctx.renderCoachPreRace());
  t('pintar la precarrera de Entrenador no sortea la condición del día', foto()===antesC&&T.getG().coachDayCondition===null);
  ctx.doCoachStartRace();
  const dc=T.getG().coachDayCondition;
  t('la sortea doCoachStartRace, y una vez', !!dc&&(ctx.doCoachStartRace(),T.getG().coachDayCondition===dc));
  ctx.render=_render;ctx.showToast=_toast;
}

console.log('\n── v101 · Opinar: lo que se manda al formulario ──');
t('sin nada escrito no se envía', T.opinionCuerpo({'entry.1':'  '},{version:'v101'})===null);
{
  const c=T.opinionCuerpo({'entry.1':' hola ','entry.2':''},{version:'v101',modo:'Clásico · Difícil',momento:''});
  t('solo van las preguntas escritas, sin espacios', c.includes('entry.1=hola')&&!c.includes('entry.2='));
  t('con los datos del juego que haya', c.includes(T.OPINION_CAMPOS.version+'=v101')&&c.includes(encodeURIComponent('Clásico · Difícil'))&&!c.includes(T.OPINION_CAMPOS.momento+'='));
  t('y pageHistory, o Google no la da por terminada', c.endsWith('pageHistory='+encodeURIComponent('0,1')));
}
t('Clásico lleva la dificultad', T.opinionModo({gameMode:'dificil'})==='Clásico · Difícil');
t('Carrera de Vida, con su fase', T.opinionModo({gameMode:'medio',carreraVida:true,lifecyclePhase:'overlap'})==='Clásico · Medio · Carrera de Vida (solapamiento)');
t('Canicross cuenta su temporada', T.opinionMomento({gameMode:'canicross',cnSeason:4,year:1},'canicrossHub')==='Temporada 4 · pantalla canicrossHub');
t('Clásico, con el mes de la carrera', T.opinionMomento({gameMode:'medio',year:3,selectedRaces:[{month:5}],currentRaceIdx:0,careerEnded:true},null)==='Temporada 3 · May · carrera terminada');

console.log('\n── Canicross, rediseño paso 1 · G.dog → G.dogs[] ──');
{
  const g=setG({gameMode:'canicross',canicrossMode:true});
  t('una partida nueva no tiene perros', Array.isArray(g.dogs)&&g.dogs.length===0&&g.activeDogId===null&&T.cnActiveDog()===null);
  t('y nace con la revisión actual de Canicross', g.cnRev===T.CN_REV);
  const a=T.cnAddDog(T.cnInitDog('Txuri','husky'));
  const b=T.cnAddDog(T.cnInitDog('Beltza','mestizo'));
  t('cada perro lleva su id, sin repetir', a.id===1&&b.id===2&&g.cnNextDogId===3);
  t('el último dado de alta es el que compite', T.cnActiveDog()===b&&T.cnDogById(1)===a&&T.cnDogs().length===2);
  b.retired=true;
  t('retirado sigue siendo el activo, como antes seguía en G.dog', T.cnActiveDog()===b);
  g.activeDogId=1;a.peakBond=55;
  const logro=T.ACHIEVEMENTS.find(x=>x.id==='cn_bond_50');
  t('los logros leen el perro activo', logro.check()===true);
  g.activeDogId=2;b.peakBond=10;
  t('…y no otro de la lista', logro.check()===false);
  t('el patrón de modos: Canicross registra rutas y estado', !!T.screenRoutes().canicrossHub&&'dogs' in T.freshState()&&'cnRev' in T.freshState());
  t('el código ya no usa G.dog', !/\bG\.dog\b/.test(Object.values(src).join('\n').replace(/\/\/.*$/gm,'')));
}
{
  const vieja={gameMode:'canicross',canicrossMode:true,screen:'canicrossHub',cnSeason:2,
    dog:{name:'Txuri',bond:40,commands:{left:true,hold:false,forward:true}}};
  const m=T.migrateState(vieja);
  t('una partida de Canicross de antes va a «canicrossAntigua»', m.screen==='canicrossAntigua');
  t('sin G.dog y sin perros inventados', !('dog' in m)&&Array.isArray(m.dogs)&&m.dogs.length===0);
  t('y guarda su revisión vieja: autoguardar no la cuela', m.cnRev===0);
  const clasica=T.migrateState({gameMode:'medio',screen:'training',dog:null});
  t('una de Clásico de antes no se toca', clasica.screen==='training'&&clasica.cnRev===T.CN_REV&&!('dog' in clasica));
  const nueva=T.migrateState({gameMode:'canicross',canicrossMode:true,screen:'canicrossHub',cnRev:T.CN_REV,
    dogs:[{id:1,name:'Txuri'},null],activeDogId:1});
  t('una de Canicross de ahora carga con sus perros', nueva.screen==='canicrossHub'&&nueva.dogs.length===1&&nueva.dogs[0].name==='Txuri');
  const perro={id:1,name:'Txuri'};
  t('la lista se copia, no se comparte', T.migrateState({gameMode:'canicross',cnRev:T.CN_REV,dogs:[perro]}).dogs[0]!==perro);
  const pintaCn=domStub(ctx);   // el último domStub manda: el de arriba ya no es el #main
  const html=pintaCn(()=>{setG({...vieja,screen:'canicrossAntigua',cnRev:0,runner:{...T.freshState().runner,name:'Iñigo'}});ctx.render();});
  t('«canicrossAntigua» se pinta y ofrece las dos salidas', html.includes('antes del rediseño')&&html.includes('cnAntiguaNueva()')&&html.includes('cnAntiguaVolver()'), html.slice(0,80));
  t('…sin colores sueltos', !/#[0-9a-fA-F]{3,6}\b/.test(html));
}

console.log('\n── Canicross, rediseño paso 2 · reloj por mes y carreras fijas ──');
{
  const _r=ctx.render,_t=ctx.showToast,_a=ctx.autoSave,_st=ctx.setTimeout;const avisos=[];
  ctx.render=()=>{};ctx.autoSave=()=>{};ctx.setTimeout=f=>f();ctx.showToast=m=>avisos.push(m);
  const g=setG({gameMode:'canicross',canicrossMode:true,cnMoney:1000,cnMonthIdx:0,cnHoursPlan:{solo:10,perro:0,juntos:20,descanso:10}});
  T.cnAddDog(T.cnInitDog('Txuri','husky'));
  ctx.cnAdvanceWeek();
  t('B5: el primer «Avanzar» lleva a noviembre', T.cnMonth()===11, T.cnMonth());
  t('…y el aviso dice el mes que acaba y el que empieza', avisos.some(a=>a.startsWith('Octubre completado')&&a.includes('ahora noviembre')), avisos.join(' | '));
  t('se cobra la manutención una vez por mes', g.cnMoney<1000&&g.cnMoney>=1000-200, g.cnMoney);
  ctx.cnAdvanceWeek();
  t('cada «Avanzar» es un mes entero', T.cnMonth()===12);
  for(let i=0;i<4;i++)ctx.cnAdvanceWeek();
  t('tras marzo la temporada termina', T.cnSeasonOver()&&g.cnMonthIdx===6);
  const antes=g.cnMoney;ctx.cnAdvanceWeek();
  t('y ya no se puede avanzar más ni se cobra otro mes', g.cnMonthIdx===6&&g.cnMoney===antes);
  // B4
  g.cnSelectedRaces=[];avisos.length=0;
  ctx.cnToggleRace('cn_copa');ctx.cnToggleRace('cn_moncayo');
  t('B4: no se eligen dos carreras del mismo mes', g.cnSelectedRaces.length===1&&avisos.some(a=>a.includes('una carrera por mes')), avisos.join(' | '));
  ['cn_otono','cn_forestal','cn_tramuntana','cn_guadarrama','cn_benasque'].forEach(id=>ctx.cnToggleRace(id));
  t('una por mes deja llegar a seis', g.cnSelectedRaces.length===6);
  ctx.setTimeout=_st;ctx.render=_r;ctx.showToast=_t;ctx.autoSave=_a;
}
{
  const R=T.CANICROSS_RACES;
  t('12 carreras, dos por mes de octubre a marzo', R.length===12&&T.CN_MONTHS.every(m=>R.filter(r=>r.month===m).length===2));
  t('cada una con su perfil fijo y los km cuadran', R.every(r=>Array.isArray(r.segs)&&r.segs.length>=4&&Math.abs(r.segs.reduce((a,s)=>a+s.km,0)-r.km)<0.01));
  t('cada tramo con tipo coherente con su desnivel y superficie',
    R.every(r=>r.segs.every(s=>['flat','climb','descent'].includes(s.type)&&['pista','tierra','piedra','hierba','barro','nieve'].includes(s.surface)
      &&(s.type!=='climb'||s.gain>0)&&(s.type!=='descent'||s.gain<0)&&s.name)));
  t('refPace y tempBase en todas', R.every(r=>r.refPace>150&&r.refPace<400&&typeof r.tempBase==='number'));
  t('el generador aleatorio de tramos ya no existe', !/cnGenerateSegs|CN_SEG_NAMES/.test(src['canicross.js'].replace(/\/\/.*$/gm,'')));
  t('§0.4: ninguna pantalla da el cumpleaños ni rellena los meses al pintarse',
    !/cnCheckBirthday\(\)/.test(src['canicross-render.js'])
    &&!/G\.cnOpenSeasonMonths=/.test(src['canicross-render.js']));
}

console.log('\n── Canicross, rediseño paso 3 · nivel de equipo y rivales persistentes ──');
{
  t('§10.1 cnPerfFactor crece y no satura', T.cnPerfFactor(100)>T.cnPerfFactor(90)&&T.cnPerfFactor(90)>T.cnPerfFactor(40)&&Math.abs(T.cnPerfFactor(40)-1)<1e-9);
  const g=setG({gameMode:'canicross',canicrossMode:true});
  t('§10.2 nivel 0 sin perro', T.cnTeamLevel()===0);
  const d=T.cnAddDog(T.cnInitDog('Txuri','husky'));
  const l1=T.cnTeamLevel();
  d.speed=100;d.stamina=100;d.age=4;Object.keys(g.runner.stats).forEach(k=>g.runner.stats[k]=100);
  const l2=T.cnTeamLevel();
  t('§10.2 nivel entre 0 y 100 con perro nuevo y al máximo', l1>0&&l1<=100&&l2<=100&&l2>l1, l1.toFixed(1)+' / '+l2.toFixed(1));
  let ok=true;for(let v=0;v<=100;v++){const m=T.cnDogCapMult(v);if(T.cnDogCapMult(v+1)>m)ok=false;}
  t('§10.3 el techo del perro nunca crece con el valor', ok&&T.cnDogCapMult(50)===1);
  let v=50;for(let s=0;s<10;s++)for(let w=0;w<24;w++)v=Math.min(100,v+T.cnDogGain(v,3));
  t('§10.4 diez temporadas entrenando no llevan al perro a 100', v<100, v);
  t('las ganancias son enteras', [55,70,80,90].every(x=>Number.isInteger(T.cnDogGain(x,2))));
  // §10.10 · regresión directa de §2.2: el tier hace la carrera más difícil
  const media=tier=>{let s=0,n=0;for(let k=0;k<40;k++){g.cnSeasonShift={};T.cnGenerateRivals({id:'x',tier}).forEach(r=>{s+=r.level;n++;});}return s/n;};
  const m1=media(1),m4=media(4);
  t('§10.10 los rivales del tier 4 tienen más nivel que los del tier 1', m4>m1+15, m1.toFixed(1)+' → '+m4.toFixed(1));
  // B2 · el mismo rival, la misma edad en dos carreras del mismo tier
  const a=T.cnGenerateRivals({id:'cn_guadarrama',tier:1}),b=T.cnGenerateRivals({id:'cn_volcanic',tier:1});
  const comunes=a.filter(x=>b.some(y=>y.id===x.id));
  t('B2: el mismo rival repite y con la misma edad', comunes.length>=5&&comunes.every(x=>b.find(y=>y.id===x.id).age===x.age), comunes.length);
  t('los equipos con nombre van a todas las carreras de su tier', T.CN_RIVAL_TEAMS.filter(x=>x.tiers.includes(1)).every(x=>a.some(y=>y.id===x.id)));
  const r0=a[0];
  t('cada rival lleva un parcial por tramo', r0.splits.length===T.CANICROSS_RACES.find(x=>x.id==='cn_guadarrama').segs.length&&T.cnRivalTime(r0)>0);
  t('quien abandona no te gana', T.cnRivalTime({splits:[100,100],incident:{seg:0,type:'abandona',loss:0}})===Infinity);
  const st=T.cnRival('r_aguirre',1),edad=st.age,perro=st.dogAge;
  T.cnAgeRivals();
  t('entre temporadas el rival cumple un año y su perro también', st.age===edad+1&&st.dogAge===perro+1);
  st.dogAge=9;st.level=60;T.cnAgeRivals();
  t('cuando su perro se retira, vuelve con uno joven y peor', st.dogAge===2&&st.level<60&&st.newDog===true);
  t('los equipos con nombre: tiers y nivel dentro del rango de su tier (content § 10.8)',
    T.CN_RIVAL_TEAMS.length===22&&T.CN_RIVAL_TEAMS.every(x=>x.tiers.length&&x.tiers.every(tr=>x.level>=T.CN_TIER_LEVELS[tr].min&&x.level<=T.CN_TIER_LEVELS[tr].max)));
}

console.log('\n── Canicross, rediseño paso 4 · conducta, sincronía y diálogo ──');
{
  const B=T.CN_BEHAVIOURS;
  t('content §10.4: 14 conductas de salida y 18 de tramo', B.filter(b=>b.when==='pre').length>=14&&B.filter(b=>b.when==='seg').length>=18);
  t('content §10.4: el juego describe, no concluye', B.every(b=>!/parece|cansad|quiere|está (contento|triste|nervioso)/i.test(b.text)), B.filter(b=>/parece|cansad|quiere/i.test(b.text)).map(b=>b.id).join());
  t('las tres intenciones salen pedidas por varias frases', ['conservar','mantener','apretar'].every(w=>B.filter(b=>b.when==='seg'&&b.wants===w).length>=3));
  t('content §10.5: seis comandos con etiqueta y descripción', T.CN_COMMANDS.length===6&&T.CN_COMMANDS.every(c=>c.label&&c.desc));
  t('ids de conducta únicos', new Set(B.map(b=>b.id)).size===B.length);
  const _r=ctx.render,_t=ctx.showToast,_a=ctx.autoSave,_st=ctx.setTimeout,_M=ctx.Math;
  ctx.render=()=>{};ctx.autoSave=()=>{};ctx.setTimeout=f=>f();ctx.showToast=()=>{};
  const g=setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:1});
  const d=T.cnAddDog(T.cnInitDog('Txuri','husky'));
  t('el perro nace con estado oculto, 1-2 rasgos y seis comandos a 0', d.mood===60&&d.fatigue===0&&d.temperament.length>=1&&d.temperament.length<=2
    &&d.temperament.every(x=>T.CN_TEMPERAMENTS.includes(x))&&T.CN_COMMANDS.every(c=>d.commands[c.id]===0));
  t('y sin horas en ningún comando', Object.values(d.cmdHours).every(h=>h===0));
  d.bond=50;d.temperament=['estoico'];
  const race=T.CANICROSS_RACES.find(r=>r.id==='cn_guadarrama');
  g.cnSelectedRaces=[{...race}];
  ctx.cnStartRace(0);
  const rs=g.cnRaceState;rs.morning=null;d.condition=null;   // la mañana de carrera (paso 5) es azar: fuera
  t('la carrera empieza con sincronía 40 + vínculo/2 y una conducta', rs.sync===65&&rs.behaviour&&rs.preBehaviour, rs.sync);
  // Coincidir sube la sincronía; no coincidir la baja
  rs.behaviour={id:'clavado',wants:'mantener'};
  ctx.cnDecide('mantener','');
  t('coincidir con lo que pide el perro sube la sincronía', rs.sync===73, rs.sync);
  if(rs.pendingEvent)rs.pendingEvent=null;
  rs.paceChosen=false;rs.behaviour={id:'clavado',wants:'mantener'};
  ctx.cnDecide('apretar','');
  t('ir a otra cosa sin orden la baja', rs.sync===61, rs.sync);
  // Orden fallida peor que ninguna: forzamos que no obedezca
  d.commands.forward=1;
  ctx.Math=Object.assign(Object.create(Math),{random:()=>0.99});
  const sAntes=rs.sync;rs.paceChosen=false;rs.pendingEvent=null;rs.behaviour={id:'clavado',wants:'mantener'};
  ctx.cnDecide('apretar','forward');
  t('una orden que no sale es peor que no dar orden (−10)', rs.sync===sAntes-10, rs.sync);
  ctx.Math=_M;
  t('obediencia entre 0,15 y 0,95', [0,100].every(b=>{d.bond=b;const p=T.cnObedience(d,rs,'forward');return p>=0.15&&p<=0.95;}));
  // B1 · una carrera entera apretando deja fatiga y quita salud
  setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:1});
  const d2=T.cnAddDog(T.cnInitDog('Beltza','malinois'));d2.bond=60;
  T.getG().cnSelectedRaces=[{...race}];
  ctx.cnStartRace(0);
  let k=0;while(T.getG().cnRaceState&&!T.getG().cnRaceState.done&&k<30){k++;const r2=T.getG().cnRaceState;
    if(r2.morning){ctx.cnMorningChoice(r2.morning.type==='condicion'?'salir':'volver');continue;}
    if(r2.pendingEvent){ctx.cnMakeDecision(0);continue;} ctx.cnDecide('apretar','');}
  t('B1: una carrera apretando deja fatiga en el perro y le quita salud', d2.fatigue>0&&d2.health<100, d2.fatigue+' / '+d2.health);
  t('y el cuaderno apunta lo que ha visto', Object.keys(T.getG().cnNotebook||{}).length>0);
  ctx.setTimeout=_st;ctx.render=_r;ctx.showToast=_t;ctx.autoSave=_a;
}

console.log('\n── Canicross, rediseño paso 5 · temperatura, clima y salud cotidiana ──');
{
  const _r=ctx.render,_t=ctx.showToast,_a=ctx.autoSave,_st=ctx.setTimeout,_M=ctx.Math;
  ctx.render=()=>{};ctx.autoSave=()=>{};ctx.setTimeout=f=>f();ctx.showToast=()=>{};
  const husky={breed:'husky',temperament:[]},mal={breed:'malinois',temperament:[]},viz={breed:'vizsla',temperament:[]};
  t('a 12 °C el husky sufre y el malinois no', T.cnTempPen(husky,12)>0&&T.cnTempPen(mal,12)===0);
  t('a −6 °C el vizsla sufre más que el mestizo', T.cnTempPen(viz,-6)>T.cnTempPen({breed:'mestizo',temperament:[]},-6));
  t('friolero desplaza el confort +4 °C', T.cnComfort({breed:'malinois',temperament:['friolero']}).max===18);
  // §10.7: por encima de 16 °C la carrera se suspende y no se puede correr
  const g=setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:1,cnSeasonWinter:'suave'});
  const d=T.cnAddDog(T.cnInitDog('Txuri','husky'));d.bond=50;
  const otono=T.CANICROSS_RACES.find(r=>r.id==='cn_otono');
  g.cnSelectedRaces=[{...otono}];
  ctx.Math=Object.assign(Object.create(Math),{random:()=>0.99});
  ctx.cnStartRace(0);
  ctx.Math=_M;
  t('§10.7 con más de 16 °C la prueba se suspende', g.cnRaceState.tempReal>T.CN_HEAT_CANCEL&&g.cnRaceState.morning.type==='calor', g.cnRaceState.tempReal);
  t('…cuenta como resuelta, se pierde la inscripción y no se puede iniciar', T.cnDoneIds().includes('cn_otono')&&g.cnMoney===500-otono.cost);
  ctx.cnDecide('mantener','');
  t('…y no deja correr ningún tramo', !g.cnRaceState.paceChosen&&!g.cnRaceState.time);
  ctx.cnMorningChoice('volver');
  t('volver deja la carrera cerrada', g.cnRaceState===null&&g.screen==='canicrossHub');
  // El perro se niega: vínculo bajo, ánimo bajo y algo serio
  setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:1,cnSeasonWinter:'normal'});
  const d2=T.cnAddDog(T.cnInitDog('Beltza','malinois'));d2.bond=22;d2.mood=0;d2.condition={id:'gastro',daysLeft:5,severity:2};
  T.getG().cnSelectedRaces=[{...T.CANICROSS_RACES.find(r=>r.id==='cn_guadarrama')}];
  ctx.Math=Object.assign(Object.create(Math),{random:()=>0.5});
  ctx.cnStartRace(0);ctx.Math=_M;
  t('con descuido acumulado el perro no se levanta', T.getG().cnRaceState&&T.getG().cnRaceState.morning&&T.getG().cnRaceState.morning.type==='negativa', JSON.stringify(T.getG().cnRaceState&&{m:T.getG().cnRaceState.morning,mood:T.getG().cnRaceState.mood,s:T.getG().screen}));
  // Forzar: −8 de vínculo siempre
  setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:1,cnSeasonWinter:'normal'});
  const d3=T.cnAddDog(T.cnInitDog('Kala','mestizo'));d3.bond=60;d3.condition={id:'tos',daysLeft:8,severity:1};
  T.getG().cnSelectedRaces=[{...T.CANICROSS_RACES.find(r=>r.id==='cn_guadarrama')}];
  ctx.cnStartRace(0);
  const m=T.getG().cnRaceState.morning;
  t('con una condición toca decidir en la mañana de la carrera', m&&m.type==='condicion');
  ctx.cnMorningChoice('forzar');
  t('forzar cuesta €35 y 8 de vínculo, siempre', d3.bond===52&&T.getG().cnMoney===465&&T.getG().cnRaceState.forced===true);
  // La condición se pasa con los días
  const d4={condition:null,sex:'hembra',mood:60};T.cnGiveCondition(d4,1);
  T.cnTickCondition(d4,30);
  t('una condición se cura sola con el tiempo', d4.condition===null);
  t('el celo solo le sale a una hembra', !T.CN_CONDITIONS.find(c=>c.id==='celo').onlyFemale===false);
  // La lluvia convierte la tierra en barro un tramo después
  const rs={segs:[{surface:'tierra'},{surface:'tierra'},{surface:'pista'}],weatherTimeline:['lluvia','lluvia','lluvia'],tempReal:5};
  t('tras la lluvia, la tierra es barro; la pista sigue', T.cnSegSurface(rs,0)==='tierra'&&T.cnSegSurface(rs,1)==='barro'&&T.cnSegSurface(rs,2)==='pista');
  ctx.setTimeout=_st;ctx.render=_r;ctx.showToast=_t;ctx.autoSave=_a;
}

console.log('\n── Canicross, rediseño paso 6 · horas, equipación y economía ──');
{
  const _r=ctx.render,_t=ctx.showToast,_a=ctx.autoSave,_st=ctx.setTimeout;
  ctx.render=()=>{};ctx.autoSave=()=>{};ctx.setTimeout=f=>f();ctx.showToast=()=>{};
  const g=setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:1,cnMonthIdx:0});
  const d=T.cnAddDog(T.cnInitDog('Txuri','husky'));d.bond=40;d.temperament=['estoico'];
  for(let k=0;k<30;k++)ctx.cnSetHours('juntos',2);
  ctx.cnSetHours('descanso',10);
  t('§10.6 el reparto nunca pasa de las horas del mes', T.cnHoursUsed()===g.cnHoursTotal&&g.cnHoursPlan.juntos===40&&g.cnHoursPlan.descanso===0, JSON.stringify(g.cnHoursPlan));
  g.cnHoursPlan={solo:0,perro:10,juntos:20,descanso:10};g.cnHoursCmd='hold';
  const b0=d.bond;
  T.cnApplyMonthHours();
  t('las horas van al comando elegido (perro ×1, juntos ×1,5)', d.cmdHours.hold===40&&d.commands.hold===2, d.cmdHours.hold+' h · nivel '+d.commands.hold);
  t('y juntos sube el vínculo', d.bond>b0, b0+' → '+d.bond);
  const b1=d.bond;g.cnHoursPlan={solo:40,perro:0,juntos:0,descanso:0};
  T.cnApplyMonthHours();
  t('un mes solo, sin el perro, le cuesta vínculo', d.bond<b1, b1+' → '+d.bond);
  t('niveles de comando a 10, 25 y 50 h', T.CN_CMD_LEVEL_HOURS.join()==='10,25,50');
  // Equipación contextual: el X-Back gana en llano largo y pierde control en bajada
  g.cnEquipped={harness:'h_xback',line:'l_medium',belt:'b_basic'};
  const [tf,sf]=T.cnEquipSeg({km:12},{type:'flat'},1,d),[td,sd]=T.cnEquipSeg({km:12},{type:'descent'},2,d);
  t('X-Back: −4 % en llano largo, −5 de sincronía en bajada', tf===0.96&&sf===0&&td===1&&sd===-5);
  // Economía: sin suelo, patrocinio y estrechez
  g.followers=2000;
  t('patrocinio de 120 + 0,15 por seguidor', T.cnSponsorIncome()===420);
  g.followers=100000;
  t('…con tope de €700', T.cnSponsorIncome()===700);
  g.cnMoney=-170;g.cnHoursPlan={solo:0,perro:0,juntos:20,descanso:20};g.cnMonthIdx=1;
  ctx.cnAdvanceWeek();
  t('el dinero puede bajar de cero y por debajo de −€200 sale la estrechez', g.cnMoney<-200&&g.screen==='canicrossQuiebra', g.cnMoney+' · '+g.screen);
  g.cnOwned.harness.push('h_xback');const antes=g.cnMoney;
  ctx.cnBrokeChoice('vender');
  t('vender la equipación devuelve la mitad y deja lo básico', g.cnMoney===antes+60&&g.cnOwned.harness.join()==='h_basic');
  ctx.cnAdvanceWeek();
  t('la estrechez sale una vez por temporada', g.screen!=='canicrossQuiebra');
  t('B6: ni cnVacationPlanned ni cnVacationThisSeason existen', !('cnVacationPlanned' in T.freshState())&&!('cnVacationThisSeason' in T.freshState()));
  ctx.setTimeout=_st;ctx.render=_r;ctx.showToast=_t;ctx.autoSave=_a;
}

console.log('\n── Canicross, rediseño paso 7 · cuaderno, circuito, retiro y epílogo ──');
{
  const _r=ctx.render,_t=ctx.showToast,_a=ctx.autoSave,_st=ctx.setTimeout;
  ctx.render=()=>{};ctx.autoSave=()=>{};ctx.setTimeout=f=>f();ctx.showToast=()=>{};
  const g=setG({gameMode:'canicross',canicrossMode:true,cnMoney:500,cnSeason:3});
  const mk=(o)=>Object.assign(T.cnAddDog(T.cnInitDog('X','malinois')),o);
  t('destino: muy querido y sano, se queda en casa', T.cnDestiny(mk({peakBond:80,health:70,age:9}),false)==='casa');
  t('querido, se va con una familia', T.cnDestiny(mk({peakBond:50,health:70,age:9}),false)==='familia');
  t('gastado o forzado dos veces, retiro frío', T.cnDestiny(mk({peakBond:90,health:30}),false)==='frio'&&T.cnDestiny(mk({peakBond:90,health:90,forcedRaces:2}),false)==='frio');
  t('deportivo solo si lo dejas tú estando él capaz', T.cnDestiny(mk({peakBond:90,health:90,age:4}),true)==='deportivo'&&T.cnDestiny(mk({peakBond:90,health:90,age:4}),false)==='casa');
  const dep=mk({name:'Kira',peakBond:60,health:90,age:4,speed:70,stamina:70});
  T.cnRetireDogAs(dep,true);
  t('el deportivo aparece entre los rivales', g.cnRivals['dog_'+dep.id]&&g.cnRivals['dog_'+dep.id].exDog);
  const tier=g.cnRivals['dog_'+dep.id].tiers[0];
  t('…y corre en su tier', T.cnGenerateRivals({id:'x',tier}).some(r=>r.id==='dog_'+dep.id));
  const casa=mk({peakBond:80,health:80,age:9});T.cnRetireDogAs(casa,false);
  t('el de casa queda con status casa', casa.status==='casa'&&T.cnHomeDogs().includes(casa));
  // §10.9: G.dogs mantiene el retirado en casa tras adoptar otro
  T.cnAddDog(T.cnInitDog('Nuevo','husky'));
  t('§10.9 el retirado sigue en G.dogs con status casa tras adoptar otro', g.dogs.includes(casa)&&casa.status==='casa'&&T.cnActiveDog().name==='Nuevo');
  // Circuito
  g.cnCircuitPoints=25;g.cnCircuitTable={r_aguirre:18,r_lasa:15};
  t('clasificación del circuito ordenada, contigo dentro', T.cnCircuitStanding()[0].me&&T.cnCircuitStanding()[1].id==='r_aguirre');
  const age=g.runner.age;
  ctx.cnDoSeasonTransition();
  t('ganar el circuito cuenta al cerrar la temporada y la tabla se reinicia', g.cnCircuitWins===1&&g.cnCircuitPoints===0&&Object.keys(g.cnCircuitTable).length===0);
  t('el corredor envejece un año por temporada', g.runner.age===age+1);
  // Señas y pantallas
  g.screen='canicrossHub';
  t('la franja del compañero sale en el hub sin números del perro', /En forma|Algo le pasa|De baja/.test(T.cnCompanionStrip())&&!/\d{2}/.test(T.cnCompanionStrip().replace(/<[^>]+>/g,'').replace(/[\d.]+ [\d.]+/g,'')));
  t('el gráfico de dos líneas se pinta con tokens', /var\(--acc\)/.test(T.cnSyncGraph(80))&&!/#[0-9a-f]{3,6}/i.test(T.cnSyncGraph(20)));
  g.cnNotebook={clavado:{seen:5,ctx:[{temp:3,terrain:'flat',season:1}],out:[{chose:'mantener',result:'good'}],note:''}};
  const pinta=domStub(ctx);
  t('el cuaderno con ≥4 vistas enseña la correlación, sin conclusión', pinta(()=>T.renderCnNotebook()).includes('Las 1 veces que elegiste mantener'));
  t('el epílogo cuenta a todos los perros', pinta(()=>T.renderCnEpilogo()).includes('Nuevo'));
  ctx.setTimeout=_st;ctx.render=_r;ctx.showToast=_t;ctx.autoSave=_a;
}

console.log('\n── Canicross, rediseño paso 8 · calibración ──');
{
  const g=setG({gameMode:'canicross',canicrossMode:true,cnRivals:{r_aguirre:{name:'x',level:10,age:1,dogAge:1,style:'regular'}},cnSeasonShift:{1:3}});
  const antes=JSON.stringify({r:g.cnRivals,s:g.cnSeasonShift});
  const c40=T.cnCalibrate(40,60),c80=T.cnCalibrate(80,60);
  t('la calibración no cambia la partida', JSON.stringify({r:g.cnRivals,s:g.cnSeasonShift})===antes);
  t('da los cuatro tiers con porcentajes', [1,2,3,4].every(k=>c40[k]&&c40[k].win>=0&&c40[k].win<=100&&c40[k].campo>0));
  t('más nivel, mejor puesto medio en cada tier', [1,2,3,4].every(k=>c80[k].media<=c40[k].media));
  t('con el mismo nivel el tier 4 es más duro que el 1', c40[4].media/c40[4].campo>c40[1].media/c40[1].campo);
}

console.log('\n── Backyard (paso 5 del orden, reto suelto) ──');
{
  setG({gameMode:'backyard'});
  T.byStart({corredor:'veterano',dificultad:'nacional'});
  let b=T.getG().by;
  t('la tirada nace en la campana, con el campo del evento', b.phase==='bell'&&b.rivals.length===T.BY_EVENTOS.nacional.n-1&&b.lap===0);
  t('los cuatro corredores pregenerados, uno por arquetipo', new Set(T.BY_CORREDORES.map(c=>c.arq)).size===4);
  T.bySalir('medio');T.byEntrarCorral();
  t('descanso = 60 minutos menos la vuelta', b.corral===Math.floor(60-b.lastLap)&&b.lap===1);
  const antes=b.corral;T.byHacer('gel');
  t('cada acción descuenta su tiempo de la cuenta atrás', b.corral===antes-1);
  b.corral=4;
  t('una acción que no cabe no se hace', T.byHacer('pies')===false&&b.corral===4);
  b.inv.llamada=1;b.corral=10;T.byPalanca('llamada');
  t('llamar a casa se gasta', b.inv.llamada===0&&T.byPalanca('llamada')===false);
  // Al bajar de 20 se materializan los nombres, inventados y de la tabla
  b.rivals.forEach((r,i)=>{if(i>=15)r.out=true;});
  b.cap=0;b.rivals.forEach(r=>{if(!r.out)r.cap=999;});
  T.byCampanaRivales();
  t('con 20 o menos, el pelotón tiene nombre', T.byVivos().every(r=>r.name&&T.BY_NOMBRES.some(([n])=>n===r.name)));
  // No llegar a la campana
  b.piernas=0;b.energia=0;b.lucidez=0;b.pies=3;
  t('sin cuerpo, la vuelta no entra en la hora', T.byTiempoPrevisto('vivo')>=60);
  const r=T.bySalir('suave');
  t('no llegar a la campana es DNF', r==='end'&&b.result.kind==='dnf'&&/campana/.test(b.result.why));
  // La vuelta en solitario: cae el último rival y el juego no te da la victoria
  setG({gameMode:'backyard'});T.byStart({corredor:'liebre',dificultad:'local'});b=T.getG().by;
  b.rivals.forEach(r=>{r.out=true;});b.lap=10;
  T.byALaLineaLogica();
  t('cuando no sale nadie más, la campana te pregunta igual', T.byVivos().length===0&&b.solo===true&&b.phase==='bell'&&!b.result);
  T.bySalir('medio');
  t('completar la vuelta en solitario es ganar', b.result&&b.result.kind==='gana'&&b.result.laps===11);
  // La rutina se para cuando ya no cabe
  setG({gameMode:'backyard'});T.byStart({corredor:'metronomo',dificultad:'local'});b=T.getG().by;
  b.rivals.forEach(r=>{r.cap=999;r.terq=1;});
  T.bySalir('medio');T.byEntrarCorral();T.byHacer('siesta');T.byHacer('pies');T.byFijarRutina();
  b.piernas=30;b.energia=30;b.phase='bell';
  const fin=T.byEncadenar();
  t('la rutina se para y dice por qué', (fin==='corral'||fin==='bell'||fin==='end')&&(b.aviso||b.result));
  t('nombres solo en constantes: las figuras del formato no van en los textos',
    !/Txomin|Arrizabal|Marangoni/.test(src['backyard.js'].split('// ── Utilidades')[1])&&!/Txomin|Arrizabal|Marangoni/.test(src['backyard-render.js']));
  t('el Backyard no guarda en una ranura de partida', /G\.gameMode==='backyard'\)\{G\._saveSlot=null;/.test(src['render-core.js']));
  t('la noche del Backyard solo existe en sus pantallas', (setG({screen:'workSetup',by:b}),T.byNocheAhora()===false));
}

console.log('\n── Ultra (paso 5 del orden, capas ultra sobre race.js) ──');
{
  const race=T.ULTRA_RACES[0],tr=T.ultraTramos(race);
  t('cada bloque genera sus tramos y acaba en avituallamiento (salvo la meta)',
    race.bloques.every((b,i)=>{const de=tr.filter(x=>x.bloque===i);return de.length>=2&&de[de.length-1].aid===(b.fin!=='meta');}));
  t('los tramos suman la distancia de la carrera', Math.abs(tr.reduce((a,x)=>a+x.km,0)-race.km)<0.01);
  t('motor compartido: la capa ultra resuelve los tramos con calcPaceCosts y checkSegInjury de race.js',
    /calcPaceCosts\(p,s,G\.paceLog\)/.test(src['ultra.js'])&&/checkSegInjury\(/.test(src['ultra.js'])&&!/function calcPaceCosts/.test(src['ultra.js']));
  setG({gameMode:'ultra'});
  T.ultraStart({carrera:'macizo',corredor:'rodador',repuesto:'mochila'});
  let g=T.getG(),c=g.ut.carrera;
  t('la carrera corre sobre el motor de Clásico, con su estado dentro de G.ut', g.selectedRaces[0].ultra===true&&c.lucidez===100&&g.seg===0);
  const r=T.ultraCorrerBloque('steady');
  t('un bloque avanza el reloj y para en el avituallamiento', r==='avituallamiento'&&g.time>0&&c.bloque===1);
  const m0=T.ultraMargen(),t0=g.time;T.ultraParar('comer');
  t('parar suma al reloj y el margen baja', g.time===t0+180&&T.ultraMargen()<m0);
  t('no se come dos veces en el mismo avituallamiento', T.ultraParar('comer')===false);
  // Barrera horaria: llegar tarde es DNF por barrera, no abandono
  while(c.bloque<5)T.ultraCorrerBloque('steady');
  g.time+=12*3600;
  T.ultraCorrerBloque('steady');
  t('llegar tarde a la barrera es DNF por barrera', c.fin&&c.fin.kind==='dnf'&&c.fin.motivo==='barrera'&&c.fin.km===42);
  // Retirarse
  setG({gameMode:'ultra'});T.ultraStart({carrera:'macizo',corredor:'veterano',repuesto:'bolsa'});g=T.getG();c=g.ut.carrera;
  T.ultraCorrerBloque('steady');T.ultraRetirarse();
  t('retirarse en un avituallamiento deja el km', c.fin.motivo==='abandono'&&c.fin.km===7);
  // Una carrera entera termina
  setG({gameMode:'ultra'});T.ultraStart({carrera:'macizo',corredor:'montanero',repuesto:'mochila'});g=T.getG();c=g.ut.carrera;
  let e='',n=0;while(e!=='fin'&&n++<30){if(c.enBolsa){c.enBolsa=false;}T.ultraParar('beber');T.ultraParar('comer');e=T.ultraCorrerBloque('steady');}
  t('la carrera acaba (meta o DNF) y nunca se queda a medias', !!c.fin&&n<30);
  t('nombres inventados en las carreras ultra', !T.ULTRA_RACES.some(x=>/Aneto|Transvulcania|Pirineu|UTMB/i.test(x.name)));
}

console.log('\n── Ultratrail · la carcasa del modo (paso 5a) ──');
{
  // Las cinco carreras iniciales: bloques seguidos que suman su km y su desnivel
  const ini=['tresvalles','collado','macizo','branas','millas'];
  t('las cinco carreras con las que empieza el modo existen', ini.every(id=>T.ULTRA_RACES.some(r=>r.id===id)));
  t('los bloques de cada carrera van seguidos y acaban en su km', T.ULTRA_RACES.every(r=>r.bloques.every((b,i)=>i===0?b.km[0]===0:b.km[0]===r.bloques[i-1].km[1])&&r.bloques[r.bloques.length-1].km[1]===r.km&&r.bloques[r.bloques.length-1].fin==='meta'));
  t('el desnivel declarado cuadra con los bloques (salvo redondeo)', T.ULTRA_RACES.every(r=>Math.abs(r.bloques.reduce((a,b)=>a+b.dplus,0)-r.dplus)<=60));
  t('las de día no tienen bolsa de vida; las de noche sí', T.ULTRA_RACES.every(r=>r.noches?r.bloques.some(b=>b.fin==='bolsa_vida'):!r.bloques.some(b=>b.fin==='bolsa_vida')));
  // Reglas de aparición (§ 3)
  t('bienal: un año sí y otro no', T.utAparece({aparicion:'bienal',paridad:0},2)&&!T.utAparece({aparicion:'bienal',paridad:0},3));
  t('emergente: aparece a partir de su año', !T.utAparece({aparicion:'emergente',desde:4},3)&&T.utAparece({aparicion:'emergente',desde:4},4));
  setG({});T.utNueva({nombre:'Ane',perfil:'montanero',edad:29});let g=T.getG(),u=g.ut;
  t('partida nueva: modo, corredor y edad', g.gameMode==='ultratrail'&&g.runner.name==='Ane'&&g.runner.age===29&&u.temporada===1&&u.semana===1);
  t('el corredor debuta por debajo del de la carrera suelta', g.runner.stats.subida===T.ULTRA_CORREDORES.find(c=>c.id==='montanero').stats.subida-6);
  t('rotativa: la sede cambia de un año a otro', T.utCalendario(1).find(x=>x.id==='branas').sede!==T.utCalendario(2).find(x=>x.id==='branas').sede);
  t('la grande no se cancela nunca', Array.from({length:60},(_,i)=>T.utCalendario(i+1)).every(c=>!c.find(x=>x.id==='millas').cancelada));
  u.calendario.forEach(x=>{x.cancelada=false;});
  // Inscribirse cuesta la inscripción; sin dinero para inscripción y viaje, no se puede
  const d0=u.dinero;
  t('inscribirse descuenta la inscripción', T.utInscribirse('macizo')&&u.dinero===d0-T.ULTRA_RACES.find(r=>r.id==='macizo').inscripcion);
  t('no se inscribe dos veces', T.utInscribirse('macizo')===false);
  const din=u.dinero;u.dinero=10;
  t('sin dinero, no te puedes inscribir (y dice por qué)', /Te faltan/.test(T.utNoPuedeInscribirse('branas')||''));
  u.dinero=din;
  t('ir a verla no cobra nada hasta que llega la semana', T.utApuntarse('collado','ver')&&u.dinero===din);
  // El ciclo: tres fases hasta el objetivo, y el botón avanza una fase entera
  let ci=T.utCiclo();
  t('el ciclo hacia el Macizo tiene base, específico y afinado', ci.fase==='base'&&ci.fases.map(f=>f.id).join()==='base,especifico,afinado'&&ci.fases[2].hasta===29);
  const finBase=ci.fases[0].hasta;
  let r=T.utAvanzar();
  t('el botón avanza la fase entera', r==='ok'&&u.semana===finBase);
  r=T.utAvanzar();   // la fase específica pasa por la semana 17, la del Collado
  t('ir a verla se resuelve de paso (se para en la fase, no en la visita)', r==='ok'&&u.semana===ci.fases[1].hasta&&u.planes.find(p=>p.id==='collado').hecho&&u.visitas.length===1);
  t('el sueldo entra y el viaje se paga', u.movimientos.some(m=>m.v>0)&&u.movimientos.some(m=>/Viaje a Maratón del Collado/.test(m.txt)));
  let vueltas=0;while(r!=='carrera'&&vueltas++<10)r=T.utAvanzar();
  t('se llega a la semana del objetivo y toca correr', r==='carrera'&&u.semana===29&&T.utObjetivoHoy()?.id==='macizo');
  // La carrera, con tu corredor (no con uno de los de la suelta)
  T.ultraStart({carrera:'macizo',repuesto:'bolsa'});g=T.getG();
  t('en el modo corre tu corredor y la carcasa sigue ahí', g.runner.name==='Ane'&&g.ut.temporada===1&&!!g.ut.carrera&&g.ut.planes.length>0);
  const c=g.ut.carrera;let e='',n=0;
  while(e!=='fin'&&n++<40){T.ultraParar('beber');T.ultraParar('comer');if(c.enBolsa){if(T.ultraBateriaEnBolsa(c))T.ultraParar('bateria');c.enBolsa=false;}c.paradaUsada=[];e=T.ultraCorrerBloque('steady');}
  t('la carrera del modo acaba', !!c.fin);
  T.utCerrarCarrera();u=T.getG().ut;
  t('al volver: resultado apuntado, recuperación y la carrera fuera', u.historial.length===1&&u.recuperaHasta>u.semana+1&&u.carrera===null&&T.utCiclo().fase==='recuperacion');
  t('la recuperación de un 100K terminado es de 3-4 semanas', u.historial[0].kind!=='finisher'||[3,4].includes(u.recuperaHasta-u.semana-1));
  // Hasta el final del año
  n=0;r='';while(r!=='temporada'&&n++<40)r=T.utAvanzar();
  t('el año se cierra en la semana 52', r==='temporada'&&u.semana===T.UT_SEMANAS+1);
  T.utNuevaTemporada();g=T.getG();
  t('temporada nueva: un año más, calendario nuevo y planes a cero', g.ut.temporada===2&&g.year===2&&g.runner.age===30&&g.ut.semana===1&&g.ut.planes.length===0&&g.ut.historial.length===1);
  // Grandes por año (§ 15)
  g.ut.dinero=99999;g.ut.calendario.forEach(x=>{x.cancelada=false;});
  T.utInscribirse('macizo');T.utInscribirse('branas');
  t('la grande no se inscribe directamente: va por sorteo', T.utInscribirse('millas')===false&&/sorteo/.test(T.utNoPuedeInscribirse('millas')));
  g.ut.planes.push({id:'millas',tipo:'correr',hecho:false});   // como si hubiera salido en el sorteo
  t('el solape avisa (no impide) si una cae en la recuperación de otra', !!T.utSolape('branas'));
  t('la exigencia de las 100 Millas es mayor que la del Collado en todo menos la térmica', ['base','encaje','estomago','nocturna'].every(k=>T.utExigencia(T.ULTRA_RACES.find(r=>r.id==='millas'))[k]>T.utExigencia(T.ULTRA_RACES.find(r=>r.id==='collado'))[k]));
  // Guardar y cargar: el saneado conserva la carcasa
  const sano=T.sanitizeState(T.serializableState());
  t('el saneado del guardado conserva G.ut', sano.ut.temporada===2&&sano.ut.planes.length===3&&Array.isArray(sano.ut.historial));
  t('la ranura enseña temporada y edad, no un ranking', /Temporada 2 · 30 años/.test(T.slotLabel({ts:Date.now(),state:sano}).linea||''));
  t('Ultratrail guarda en ranura (la suelta no)', /G\.gameMode==='ultratrail'\)\{G\.screen=G\.ut\?'utHub':'utNueva'/.test(src['render-core.js']));
  // El sueño obligatorio de las 100 Millas
  setG({gameMode:'ultra'});T.ultraStart({carrera:'millas',corredor:'rodador',repuesto:'bolsa'});const cm=T.getG().ut.carrera;
  t('en las de dos noches se puede dormir en el avituallamiento; en las de una, no', T.ultraAvitualla(cm).some(a=>a.id==='dormir')&&!T.ultraAvitualla({noches:1}).some(a=>a.id==='dormir'));
  cm.lucidez=5;cm.bloque=8;T.getG().seg=T.getG().selectedRaces[0].segs.findIndex(s=>s.bloque===8);T.getG().time=26*3600;
  T.ultraCorrerBloque('steady');
  t('con la lucidez hundida no se sigue sin dormir', cm.sueno===true||!!cm.fin);
  if(cm.sueno){T.ultraParar('dormir');t('dormir te deja seguir', cm.sueno===false&&cm.lucidez>=30);}
}

console.log('\n── Ultratrail · preparaciones, fases y recuperación (paso 5b) ──');
{
  const nueva=()=>{setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});const g=T.getG();g.ut.dinero=9999;g.ut.calendario.forEach(x=>{x.cancelada=false;});return g;};
  let g=nueva(),u=g.ut;
  t('la partida empieza con las preparaciones de su perfil y sin carga', u.prep.base===T.UT_PREP_INICIAL.veterano.base&&u.carga===0&&Array.isArray(u.secuelas));
  t('la nutrición de Clásico se disuelve en Estómago', g.runner.stats.nutricion===u.prep.estomago);
  T.utInscribirse('macizo');
  t('el semáforo compara con lo que pide la carrera', T.utSemaforo(T.ULTRA_RACES.find(r=>r.id==='macizo')).every(x=>['mas','ojo','menos'].includes(x.color)&&x.pide>0));
  // Una fase de base: el plan elegido sube lo suyo y carga
  let b0=u.prep.base,n0=u.prep.nocturna;
  T.utHacerFase('tranquilo','normal',null);
  t('la fase de base sube la base y la carga', u.prep.base>b0+3&&u.carga>0&&u.semana>1);
  t('lo que no entrenas baja un poco', u.prep.nocturna<n0);
  // Volumen alto carga más que suave
  g=nueva();T.utInscribirse('macizo');T.utHacerFase('cuestas','alto',null);const cAlto=T.getG().ut.carga;
  g=nueva();T.utInscribirse('macizo');T.utHacerFase('cuestas','suave',null);const cSuave=T.getG().ut.carga;
  t('volumen alto carga más que suave', cAlto>cSuave);
  // Con la carga por encima de 70 el cuerpo absorbe menos
  u=T.getG().ut;u.carga=90;
  t('con carga alta se absorbe menos', T.utAbsorbe()<1&&(u.carga=50,T.utAbsorbe()===1));
  // El plan que cuesta dinero no se hace sin dinero
  g=nueva();u=g.ut;T.utInscribirse('macizo');T.utHacerFase('tranquilo','normal',null);u.dinero=10;
  t('la concentración en altura no se hace sin dinero', T.utHacerFase('calor','normal',null)==='sin_dinero');
  // Lo que enseña el planificador es lo que pasa (sin tirada ni lesión)
  {const ci=T.utCiclo(),n=ci.actual.hasta-u.semana,sim=T.utSimularFase(ci.fase,'mixto','normal',n),e0=u.prep.encaje;
   u.carga=0;const sim0=T.utSimularFase(ci.fase,'mixto','normal',n);T.utHacerFase('mixto','normal',null);
   t('la previsión del plan coincide con la fase hecha', Math.abs((u.prep.encaje-e0)-sim0.prep.encaje)<0.01&&Math.abs(u.carga-sim0.carga)<0.01&&!!sim);}
  // Afinar baja la carga
  u.dinero=9999;u.carga=50;const cAntes=u.carga;
  T.utHacerFase('afinar','normal',null);
  t('afinar baja la carga antes de la carrera', u.carga<cAntes&&T.utCiclo().fase==='carrera');
  // La tirada larga suma (o da un mal paso, con carga)
  g=nueva();u=g.ut;T.utInscribirse('macizo');
  t('toca tirada larga en una fase de base larga', T.utTocaTirada());
  const e0=u.prep.estomago,c0=u.carga;T.utHacerFase('tranquilo','suave','nutricion');
  const ultima=u.diario[u.diario.length-1].txt;
  t('la tirada larga deja huella (estómago o un mal paso), y lo cuenta', /Tirada larga probando la comida/.test(ultima)?u.prep.estomago>e0:/mal paso/.test(ultima)&&c0>=0);
  // El déficit va al motor: corto de preparación, positivo; sobrado, negativo
  const mac=T.ULTRA_RACES.find(r=>r.id==='macizo');
  u.prep={base:10,encaje:10,estomago:10,nocturna:10,termica:10};const dCorto=T.utDeficit(mac);
  u.prep={base:100,encaje:100,estomago:100,nocturna:100,termica:100};const dSobra=T.utDeficit(mac);
  t('el déficit dice lo que falta (y se acota)', dCorto.base>0&&dSobra.base<0&&dSobra.base>=-0.15&&dCorto.encaje<=0.6);
  // Recuperación: tres salidas
  g=nueva();u=g.ut;u.recuperaHasta=9;
  T.utRecuperar('reposo');
  t('reposo total recupera antes que lo que tocaba', u.semana<9&&u.semana>=6);
  g=nueva();u=g.ut;u.recuperaHasta=9;const pb=u.prep.encaje;T.utRecuperar('cruzado');
  t('el cruzado mantiene las preparaciones', u.semana===9&&Math.abs(u.prep.encaje-pb)<0.01);
  let secuela=0,ya=0;
  for(let i=0;i<80;i++){g=nueva();u=g.ut;u.recuperaHasta=5;T.utRecuperar('volver');if(u.secuelas.length)secuela++;else if(u.semana===1&&u.recuperaHasta===1)ya++;}
  t('volver antes a veces deja secuela permanente y a veces sale bien', secuela>0&&ya>0);
  // Lo que deja la carrera (§ 11): sube con las horas, termines o no
  g=nueva();u=g.ut;T.utInscribirse('collado');
  while(T.utCiclo().fase!=='carrera'){const ci=T.utCiclo();if(ci.fase==='libre')break;T.utHacerFase(T.UT_PLANES[ci.fase][0].id,'normal',null);}
  T.ultraStart({carrera:'collado',repuesto:'sin'});const cc=T.getG().ut.carrera;
  let e='',n=0;while(e!=='fin'&&n++<20){T.ultraParar('beber');T.ultraParar('comer');cc.paradaUsada=[];e=T.ultraCorrerBloque('steady');}
  const enc0=u.prep.encaje,carga0=u.carga;T.utCerrarCarrera();u=T.getG().ut;
  t('la carrera sube preparaciones y deja carga', u.prep.encaje>enc0&&u.carga>carga0);
}

console.log('\n── Ultratrail · puntos, índice, piedras y sorteo (paso 5c) ──');
{
  const R_=id=>T.ULTRA_RACES.find(r=>r.id===id);
  t('puntos de dificultad como ITRA: km + D+/100, de 2 a 6', T.utPuntos(R_('tresvalles'))===2&&T.utPuntos(R_('macizo'))===5&&T.utPuntos(R_('millas'))===6);
  t('la curva del sorteo: 25 piedras ≈ 50 %, nunca el 100 %', Math.abs(T.utProbSorteo(25)-0.5)<0.01&&T.utProbSorteo(500)<1&&T.utProbSorteo(0)===0);
  const nueva=()=>{setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});const g=T.getG();g.ut.dinero=9999;g.ut.calendario.forEach(x=>{x.cancelada=false;});return g;};
  let g=nueva(),u=g.ut;
  u.piedras={saldo:7,ultima:1};
  t('las piedras están activas dos años y luego se duermen', T.utPiedrasActivas()===7&&(u.temporada=3,T.utPiedrasActivas()===0)&&/dormidas/.test(T.utFraseSorteo()));
  u.temporada=1;
  t('la frase del sorteo enseña lo que falta, no solo el número', /Terminar un 100 km te daría 2 más/.test(T.utFraseSorteo()));
  // Índice: mejores de los últimos 36 meses; caduca sin nada en 24
  u.historial=[{t:1,tipo:'100k',indice:600},{t:1,tipo:'preparacion',indice:700}];
  t('el índice combina los mejores resultados', T.utIndice().valido&&T.utIndice().valor>600&&T.utIndice().valor<700&&T.utIndice('100k').valor===600);
  u.temporada=4;
  t('sin resultados en dos años, el índice no vale', !T.utIndice().valido);
  // Sorteo: solicitar en enero; con suerte, dentro y las piedras a cero; inscrito
  g=nueva();u=g.ut;u.piedras={saldo:999,ultima:1};
  t('se solicita en enero', T.utSolicitarSorteo()&&u.sorteo.estado==='solicitado'&&!!T.utNoPuedeSolicitar());
  T.utResolverSorteo();
  t('si te toca: dentro, piedras a cero e inscrito', u.sorteo.estado==='dentro'&&u.piedras.saldo===0&&u.planes.some(p=>p.id==='millas'&&p.tipo==='correr'));
  // Sin piedras: lista de espera y fuera; las piedras no se pierden
  g=nueva();u=g.ut;u.piedras={saldo:0,ultima:null};T.utSolicitarSorteo();T.utResolverSorteo();
  t('sin suerte, a la lista de espera', u.sorteo.estado==='espera');
  T.utListaEspera();
  t('la lista de espera tampoco llega: fuera', u.sorteo.estado==='fuera');
  // Puertas laterales: índice y voluntariado no gastan piedras
  g=nueva();u=g.ut;u.piedras={saldo:5,ultima:1};u.historial=[{t:1,tipo:'100k',indice:850}];T.utSolicitarSorteo();T.utResolverSorteo();
  t('vía del índice: dorsal de cortesía sin gastar piedras', u.sorteo.estado==='dentro'&&u.sorteo.via==='indice'&&u.piedras.saldo===5);
  g=nueva();u=g.ut;u.creditoVoluntario=[{id:'millas',t:1}];T.utSolicitarSorteo();T.utResolverSorteo();
  t('de voluntario el año antes: dorsal reservado', u.sorteo.estado==='dentro'&&u.sorteo.via==='voluntario'&&u.creditoVoluntario.length===0);
  // Si te toca y no puedes pagar, pierdes la mitad
  g=nueva();u=g.ut;u.piedras={saldo:999,ultima:1};u.dinero=0;T.utSolicitarSorteo();T.utResolverSorteo();
  t('si te toca y no confirmas, pierdes la mitad de las piedras', u.sorteo.estado==='fuera'&&u.piedras.saldo===499);
  // Al pasar la semana 4, el sorteo se resuelve solo
  g=nueva();u=g.ut;u.piedras={saldo:999,ultima:1};T.utSolicitarSorteo();T.utAvanzar();
  t('el sorteo se resuelve al pasar enero', u.sorteo.estado!=='solicitado');
  // La cuenta pendiente: al cerrar el año sin entrar, queda apuntado
  g=nueva();u=g.ut;T.utSolicitarSorteo();u.sorteo.estado='fuera';T.utNuevaTemporada();
  t('cada año sin entrar queda en la cuenta pendiente', u.sorteos.length===1&&u.sorteos[0].entro===false&&u.sorteo===null);
}

console.log('\n── Ultratrail · trabajo, material, variantes y reconocimiento (paso 5d) ──');
{
  const R_=id=>T.ULTRA_RACES.find(r=>r.id===id);
  const nueva=()=>{setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});const g=T.getG();g.ut.dinero=9999;g.ut.calendario.forEach(x=>{x.cancelada=false;});return g;};
  let g=nueva(),u=g.ut;
  t('se empieza en jornada completa y la reducida no llega hasta el año 4', u.escalon==='completa'&&!T.utEscalonesPosibles().includes('reducida'));
  u.temporada=3;
  t('al cerrar el año 3, ya se puede pedir la reducida', T.utEscalonesPosibles().includes('reducida'));
  T.utNuevaTemporada('reducida');
  t('la reducida da más horas', u.escalon==='reducida'&&T.utEscalon().horas>T.UT_ESCALONES.completa.horas);
  u.dinero=-50;
  t('un año en números rojos te devuelve a jornada completa', !T.utEscalonesPosibles().includes('reducida'));
  u.dinero=9999;u.historial=[{t:u.temporada,tipo:'100k',indice:700,kind:'finisher'},{t:u.temporada,tipo:'100k',indice:700,kind:'finisher'}];
  t('con índice y dos terminadas en el año, sale el sponsor de material', T.utEscalonesPosibles().includes('material'));
  // Material: comprar, gratis con sponsor; zapatillas que se gastan
  g=nueva();u=g.ut;const d0=u.dinero;
  t('comprar el frontal bueno cuesta y ya lo tienes', T.utComprar('frontal')&&u.material.frontal&&u.dinero===d0-160&&T.utNoPuedeComprar('frontal')==='Ya lo tienes');
  u.escalon='material';const d1=u.dinero;T.utComprar('bastones');
  t('con sponsor de material, gratis', u.material.bastones&&u.dinero===d1);
  u.escalon='completa';
  t('las de noche piden chaqueta; las de día no', T.utChaquetaObligatoria(R_('macizo'))&&!T.utChaquetaObligatoria(R_('collado')));
  T.ultraStart({carrera:'macizo',repuesto:'bolsa',bastones:true,chaqueta:false});let c=T.getG().ut.carrera;
  t('en carrera: frontal bueno de 12 h y bastones; sin chaqueta, controles al azar', c.frontal.horas===12&&c.material.bastones&&!c.material.chaqueta&&c.controles.length>=1);
  t('los controles caen en avituallamientos, nunca en meta', T.ultraControles(R_('macizo')).every(i=>R_('macizo').bloques[i].fin!=='meta'));
  // Variantes de recorrido
  const alt=T.utRaceVariante(R_('macizo'),'alternativo'),cor=T.utRaceVariante(R_('macizo'),'acortado');
  t('el recorrido alternativo quita desnivel (y no toca el dato del calendario)', alt.dplus<R_('macizo').bloques.reduce((a,b)=>a+b.dplus,0)&&R_('macizo').bloques[1].dplus===800);
  t('el acortado termina antes, en meta, y vale menos puntos', cor.km<105&&cor.bloques[cor.bloques.length-1].fin==='meta'&&T.utPuntos(cor)<T.utPuntos(R_('macizo')));
  // La víspera decide una vez
  g=nueva();u=g.ut;T.utInscribirse('collado');u.semana=17;T.utVispera();const v=u.vispera;T.utVispera();
  t('la variante se decide una vez, la víspera', !!v&&u.vispera===v&&['completo','alternativo'].includes(v.variante));
  // Reconocimiento por sectores
  g=nueva();u=g.ut;const mac=R_('macizo');
  t('se empieza sin conocer nada', T.utSectores(mac).every(sec=>T.utReco('macizo',sec)===0));
  T.utReconocerSector('macizo','el circo');
  t('una salida de reconocimiento: el sector a nivel 2', T.utReco('macizo','el circo')===2&&u.dinero<9999);
  T.utFinDeSemanaReco('macizo',1);
  t('un fin de semana: media carrera reconocida y carga', T.utReco('macizo','el collado')===2&&u.carga>=15);
  Object.keys(u.prep).forEach(k=>{u.prep[k]=90;});u.carga=0;   // que llegue de día al final
  T.ultraStart({carrera:'macizo',repuesto:'bolsa'});c=T.getG().ut.carrera;
  t('la carrera lleva lo que conoces de cada sector', c.reco['el circo']===2&&c.reco['las crestas']===undefined);
  let e='',n=0;while(e!=='fin'&&n++<30){T.ultraParar('beber');T.ultraParar('comer');if(c.enBolsa){c.enBolsa=false;}c.paradaUsada=[];e=T.ultraCorrerBloque('steady');}
  T.utCerrarCarrera();
  t('lo corrido de día se conoce (3); lo de noche, al menos visto', (T.utSectores(mac).some(sec=>T.utReco('macizo',sec)===3)||(c.fin.km||0)<=42)&&T.utReco('macizo','el valle')>=1);
  for(let i=0;i<40;i++)T.utRecoDecae();
  t('se olvida despacio, pero lo corrido de día nunca vuelve a 0', T.utSectores(mac).filter(sec=>(u.recoSuelo.macizo||{})[sec]).every(sec=>T.utReco('macizo',sec)>=1));
  // Zapatillas: se gastan con carreras y tiradas
  t('las zapatillas suman kilómetros', u.material.zapatillasKm>250);
}

console.log('\n── Ultratrail · el Backyard en el calendario (paso 6) ──');
{
  const nueva=()=>{setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});const g=T.getG();g.ut.dinero=9999;g.ut.calendario.forEach(x=>{x.cancelada=false;});return g;};
  let g=nueva(),u=g.ut;
  t('cada año hay invitación al backyard en otoño', u.calendario.some(x=>x.backyard&&x.semana===T.UT_BACKYARD.semana));
  t('aceptarla no ocupa plaza de objetivo', T.utAceptarBackyard()&&T.utNoPuedeBackyard()==='Ya has aceptado'&&!u.planes.some(p=>p.tipo==='correr'));
  t('el corredor del backyard sale de tus preparaciones', (()=>{const a=T.utBackyardCorredor();u.prep.encaje+=40;const b=T.utBackyardCorredor();return b.st.res>a.st.res&&a.name==='Ane'&&a.base===u.prep.base;})());
  let n=0,r='';while(r!=='backyard'&&n++<40)r=T.utAvanzar();
  t('el tiempo se para en la semana del backyard', r==='backyard'&&u.semana===T.UT_BACKYARD.semana&&T.utBackyardHoy()&&T.utCiclo().fase==='backyard');
  t('se corre con tu corredor, sin tocar la tirada suelta', T.utEmpezarBackyard()&&T.getG().by.ut===true&&T.getG().by.name==='Ane');
  const b=T.getG().by;for(let i=0;i<12;i++){T.byALaLineaLogica();if(T.bySalir('medio')==='end')break;T.byEntrarCorral();}
  if(!b.result)T.byNoSalgo();
  const laps=b.result.laps,sem0=u.semana,vet0=u.veterania||0;
  T.utCerrarBackyard();
  t('al volver: sin piedras, recuperación por vueltas y veteranía', u.piedras.saldo===0&&u.recuperaHasta===sem0+1+Math.max(1,Math.ceil(laps/10))&&u.veterania>vet0&&T.getG().by===null);
  t('queda en el historial como backyard', u.historial.some(h=>h.id==='backyard'&&h.laps===laps));
}

console.log('\n── Ultratrail · arco de vida y epílogos (paso 7) ──');
{
  const nueva=()=>{setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});const g=T.getG();g.ut.dinero=9999;return g;};
  let g=nueva(),u=g.ut;
  T.utSumarVeterania(20);const v1=u.veterania;T.utSumarVeterania(20);
  t('la veteranía crece y cada vez cuesta más', v1>0&&u.veterania-v1<v1&&u.veterania<=100);
  g.runner.age=40;const vel=g.runner.stats.velocidad,sub=g.runner.stats.subida;T.utEnvejecer();
  t('con los años baja lo físico', g.runner.stats.velocidad<vel&&g.runner.stats.subida<sub);
  t('a los 30 no salta el final', T.utEpilogoDisparado()===null);
  g.runner.age=T.UT_EDAD_FINAL;
  t('a los 50 llega igual (red de seguridad)', T.utEpilogoDisparado()==='edad');
  g.runner.age=44;u.temporada=12;u.semanasRecupera={12:24};u.historial=[];
  t('índice bajo y más de 20 semanas de recuperación al año: final', T.utEpilogoDisparado()==='cuerpo');
  u.historial=[{t:12,tipo:'100k',indice:700,kind:'finisher',id:'macizo'}];
  t('con buen índice, todavía no', T.utEpilogoDisparado()===null);
  // La cuenta pendiente: la identifica el juego
  u.historial=[{t:3,id:'branas',name:'Travesía de las Brañas',kind:'dnf',motivo:'barrera',km:70}];
  t('la cuenta pendiente es la barrera que te comió', T.utCuentaPendiente()?.id==='branas');
  u.historial.push({t:5,id:'branas',kind:'finisher'});
  t('si luego la terminaste, ya no está pendiente', T.utCuentaPendiente()===null);
  u.sorteos=[1,2,3].map(t=>({t,id:'millas',entro:false}));
  t('tres años sin entrar en la grande también es cuenta pendiente', T.utCuentaPendiente()?.id==='millas');
  t('el proyecto personal siempre está; montar, solo si te has dejado ver', T.utEpilogos().some(e=>e.id==='proyecto')&&!T.utEpilogos().some(e=>e.id==='montar'));
  // Cuenta pendiente: una última carrera
  T.utElegirEpilogo('cuenta');T.ultraStart({carrera:u.final.id,repuesto:'bolsa'});const c=T.getG().ut.carrera;
  let e='',n=0;while(e!=='fin'&&n++<40){T.ultraParar('beber');T.ultraParar('comer');if(c.enBolsa)c.enBolsa=false;if(c.sueno)T.ultraParar('dormir');c.paradaUsada=[];e=T.ultraCorrerBloque('steady');}
  T.utCerrarCuenta();
  t('la cuenta pendiente se corre y cierra la carrera deportiva', u.final.hecho&&typeof u.final.resultado.ok==='boolean'&&u.retirado);
  // Montar tu propia carrera
  g=nueva();u=g.ut;u.visitas=[{t:1,id:'macizo',tipo:'voluntario'},{t:2,id:'branas',tipo:'voluntario'}];
  ['el valle','las crestas','el hayedo','el circo','el glaciar','el collado'].forEach(sec=>{(u.reco.macizo=u.reco.macizo||{})[sec]=2;});
  t('con voluntariado y reconocimientos, se puede montar', T.utPuedeMontar()&&T.utEpilogos().some(e=>e.id==='montar'));
  const dis={nombre:'Ultra <b>del</b> Circo',sectores:['macizo|el circo','macizo|el glaciar','macizo|el collado'],mes:9,barreras:'normales',avitu:'normales',dorsales:400};
  const r=T.utCarreraPropia(dis);
  t('tu carrera se monta con tus sectores (y sin HTML en el nombre)', r&&r.bloques.length>=4&&r.bloques[0].km[0]===0&&r.bloques[r.bloques.length-1].fin==='meta'&&!/[<>]/.test(r.name));
  T.utElegirEpilogo('montar');T.utMontarCarrera(dis);
  t('se corre en un párrafo: inscritos, finishers y si habrá segunda', u.final.hecho&&u.final.resultado.inscritos>0&&u.final.resultado.finishers<=u.final.resultado.inscritos&&typeof u.final.resultado.segunda==='boolean');
  // Proyecto personal por etapas
  g=nueva();u=g.ut;T.utElegirEpilogo('proyecto');T.utEmpezarProyecto('cimas');
  let st='sigue';n=0;while(st==='sigue'&&n++<10)st=T.utEtapa('normal','refugio');
  t('el proyecto por etapas acaba: lo hiciste o no', ['hecho','no'].includes(st)&&u.final.hecho&&u.retirado);
  t('el resumen de la vida cuenta lo que hiciste', T.utResumenVida().temporadas===1);
  t('la ranura dice que la carrera deportiva está cerrada', /cerrada/.test(T.slotLabel({ts:Date.now(),state:T.sanitizeState(T.serializableState())}).linea));
}

console.log('\n── Nombres reales fuera (v107, PUB-04) ──');
{
  const vivos=Object.keys(src).filter(f=>f!=='save.js').map(f=>src[f]).join('\n');
  t('ninguna carrera ni marca real en los datos ni en los textos', !/Zegama|Aizkorri|Transvulcania|UTMB|Buff Epic|Pirineu|Suunto|Salomon|Clif Bar|Polar Elite|Garmont|Canfranc|Aneto|Chamonix/.test(vivos));
  const viejo={runner:{name:'X',stats:{}},year:2,money:10,careerHistory:[{name:'Zegama-Aizkorri',pos:1,year:1}],personalBests:{'Buff Epic Trail':3600},seasonDiary:['Ganas la Zegama-Aizkorri con Salomon']};
  const m=T.migrateState(viejo);
  t('una partida vieja carga con los nombres nuevos (historial, récords y textos)', m.careerHistory[0].name==='Maratón de Harrigorri'&&m.personalBests['Gran Trail de los Lagos']===3600&&m.seasonDiary[0]==='Ganas la Maratón de Harrigorri con Sendero');
}

console.log('\n── Ultratrail · lo que no entraba (otras carreras, logros, opciones, parte) ──');
{
  const R_=id=>T.ULTRA_RACES.find(r=>r.id===id);
  t('las ocho carreras del calendario existen', ['tresvalles','collado','leire','macizo','branas','hielo','millas','costa'].every(id=>!!R_(id)));
  const cal=t_=>T.utCalendario(t_).map(x=>x.id);
  t('Leire, los años pares; la Costa, los impares', cal(2).includes('leire')&&!cal(3).includes('leire')&&cal(3).includes('costa')&&!cal(2).includes('costa'));
  t('el Hielo aparece en el año 4', !cal(3).includes('hielo')&&cal(4).includes('hielo'));
  t('la Costa es de 100 millas sin sorteo', R_('costa').tipo==='100m'&&!R_('costa').major&&R_('costa').noches===2);
  // Logros: los del modo están, ninguno sale al empezar y se ganan jugando
  const ach=T.ACHIEVEMENTS.filter(a=>a.mode==='ut');
  t('hay logros de Ultratrail y Backyard', ach.length>=15&&ach.some(a=>a.id.startsWith('by_')));
  setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});let g=T.getG();
  t('ninguno sale al empezar una partida', ach.every(a=>!a.check()));
  g.ut.historial.push({t:1,id:'collado',tipo:'preparacion',kind:'finisher'});
  T.checkAndUnlockAchievements();
  t('terminar el primer ultra da «Otra vida»', g.unlockedAchievements.includes('ut_first'));
  // Alucinaciones en pantalla: solo con la opción, de noche y la cabeza ida; y avisadas
  setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30,alucina:'diario'});
  T.ultraStart({carrera:'macizo',repuesto:'bolsa'});g=T.getG();let c=g.ut.carrera;T.ultraCorrerBloque('steady');c.lucidez=5;
  t('en el grado «diario», la pantalla no miente', !/👁/.test(T.utCabecera()));
  g.ut.opciones.alucina='pantalla';c.alucina='pantalla';const h1=T.utCabecera(),h2=T.utCabecera();
  t('con la opción, de noche y sin cabeza: el 👁 avisa', /👁/.test(h1)&&c.noches>0);
  t('lo que miente no parpadea al redibujar', h1===h2);
  t('en el grado «pantalla», nada de fantasmas', !T.ultraAvitualla(c).some(a=>a.id==='fantasma'));
  c.alucina='todas';c.lucidez=5;
  t('grado 3: un avituallamiento que no está, y cuesta tiempo', T.ultraAvitualla(c).some(a=>a.id==='fantasma')&&(()=>{const t0=g.time;T.ultraParar('fantasma');return g.time===t0+360;})());
  c.lucidez=50;
  t('con la cabeza bien, no hay alucinaciones', T.ultraGradoAlucina(c)===0);
  setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});
  t('por defecto, en pantalla (decidido el 2026-10-31)', T.getG().ut.opciones.alucina==='pantalla');
  // Modo tenso: el corral corre solo
  setG({gameMode:'backyard'});T.byStart({corredor:'metronomo',dificultad:'local',tenso:true});g=T.getG();g.by.corral=5;g.screen='byCorral';
  T.byTensoTick();
  t('modo tenso: cada segundo, un minuto menos de corral', g.by.tenso&&g.by.corral===4);
  setG({gameMode:'backyard'});T.byStart({corredor:'metronomo',dificultad:'local'});
  t('por defecto, sin modo tenso', T.getG().by.tenso===false);
  // Faroleo: si te sentaste a la vista y coló, el rival no te farolea
  g=T.getG();g.by.rivals.forEach((r,i)=>{r.out=i>0;});g.by.farol.sentado={id:g.by.rivals[0].id,cuela:true};
  const an=g.by.animo;for(let i=0;i<50;i++)T.byFarolRival();
  t('si tu farol coló, el rival no te lo devuelve', g.by.animo===an);
  // El parte
  t('el parte de invierno trae frío; el de verano, calor a veces', ['frio','lluvia','nublado'].includes(T.ultraSortearTiempo(1))&&Array.from({length:60},()=>T.ultraSortearTiempo(7)).includes('calor'));
  setG({});T.utNueva({nombre:'Ane',perfil:'veterano',edad:30});g=T.getG();g.ut.vispera={id:'macizo',t:1,variante:'completo',tiempo:'calor'};
  T.ultraStart({carrera:'macizo',repuesto:'bolsa'});
  t('con calor, el motor de race.js gasta más agua (soleado)', g.ut.carrera.tiempo==='calor'&&g.weather==='soleado');
  g.ut.vispera={id:'macizo',t:1,variante:'alternativo',tiempo:'tormenta'};T.ultraStart({carrera:'macizo',repuesto:'bolsa'});
  t('la tormenta llega con el recorrido alternativo', g.ut.carrera.tiempo==='tormenta'&&g.ut.carrera.variante==='alternativo');
  // § 13 y § 14: el perfil antes de salir y los que se retiran, por su nombre
  setG({gameMode:'ultra'});T.ultraStart({carrera:'macizo',corredor:'rodador',repuesto:'bolsa'});const cr=T.getG().ut.carrera;
  t('una docena de rivales con nombre inventado', cr.rivales.filter(x=>x.name).length===12);
  let n=0;while(!cr.fin&&n++<20){T.ultraParar('beber');T.ultraParar('comer');cr.enBolsa=false;cr.paradaUsada=[];T.ultraCorrerBloque('steady');}
  t('se cuenta por su nombre quién se retira', cr.rivales.filter(x=>x.out&&x.name).length===0||cr.log.some(l=>/se retira en el km|se queda en la barrera/.test(l.t))||cr.log.length>=40);
  const perfil=T.utPerfilHTML(T.ULTRA_RACES.find(r=>r.id==='macizo'));
  t('el perfil de salida lleva noche sombreada y barreras con su hora', /<svg/.test(perfil)&&/<rect/.test(perfil)&&/08:00/.test(perfil));
  t('el sector duro del Macizo es uno de sus bloques', T.ULTRA_RACES.find(r=>r.id==='macizo').bloques.some(b=>b.sector===T.utSectorDuro(T.ULTRA_RACES.find(r=>r.id==='macizo'))));
  t('Ultratrail guarda la carrera a medias en cada bloque', /utGuardarCarrera\(\);render\(\)/.test(src['ultra-render.js']));
  t('y en cada parada, al salir de la bolsa y en el corral del backyard', /window\.utParar=id=>\{ultraParar\(id\);utGuardarCarrera\(\)/.test(src['ultra-render.js'])&&/byGuardar\(\);   \/\/ dejarlo a medias/.test(src['backyard.js']));
}

t.done('TODO OK');
