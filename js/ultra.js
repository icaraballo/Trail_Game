// ══════════════════════════════════════
//  ULTRA — capas ultra sobre race.js (paso 4 de TG-Diseno-Ultratrail-Backyard)
// ══════════════════════════════════════
// Condición innegociable del diseño (§ 2): modo separado, MOTOR COMPARTIDO. Esto no es una
// copia de race.js: cada tramo se resuelve con calcPaceCosts() y checkSegInjury() de race.js,
// con las estadísticas del corredor (getEffStat) y G.runner. Encima van las capas ultra:
//   · bloques declarados a mano y tramos generados a partir de ellos (§ 14, modelo híbrido)
//   · reloj de pared (salida a una hora), noche, frontal con batería y repuesto (§ 12)
//   · Lucidez (cuarta barra) y estómago como estado, dentro del objeto de carrera (§ 31)
//   · bolsa de vida con su cronómetro de parada y barreras horarias contra G.time
//   · rivales que se desgastan, abandonan y se quedan en las barreras
// Hasta que exista la carcasa del modo (paso 5), se juega como carrera suelta desde el menú.
// Estado: G.ut.carrera (§ 31). Pantallas en ultra-render.js.

// ── Datos ──────────────────────────────
// Nombres inventados (decidido el 2026-10-30). Bloques: km [desde, hasta], desnivel, tipo
// (subida · bajada · crestas · llano), sector, cómo acaba (avituallamiento · bolsa_vida · meta)
// y barrera {hora: horas desde la salida}.
const ULTRA_RACES=[
  {id:'macizo', name:'Vuelta al Macizo', km:105, dplus:6200, salida:22, cierre:30, month:7,
   tipo:'100k', aparicion:'anual', semana:29, inscripcion:120, viaje:90, noches:1,
   desc:'105 km y 6.200 m+ alrededor del macizo. Sale el viernes a las diez de la noche.',
   bloques:[
     {km:[0,7],    dplus:500, dminus:60,  tipo:'subida',  sector:'el valle',     fin:'avituallamiento'},
     {km:[7,14],   dplus:800, dminus:60,  tipo:'subida',  sector:'el valle',     fin:'avituallamiento'},
     {km:[14,20],  dplus:200, dminus:200, tipo:'crestas', sector:'las crestas',  fin:'avituallamiento'},
     {km:[20,27],  dplus:350, dminus:180, tipo:'crestas', sector:'las crestas',  fin:'avituallamiento'},
     {km:[27,34],  dplus:150, dminus:650, tipo:'bajada',  sector:'el hayedo',    fin:'avituallamiento'},
     {km:[34,42],  dplus:100, dminus:750, tipo:'bajada',  sector:'el hayedo',    fin:'bolsa_vida', barrera:{hora:10}},
     {km:[42,50],  dplus:900, dminus:100, tipo:'subida',  sector:'el circo',     fin:'avituallamiento'},
     {km:[50,57],  dplus:650, dminus:150, tipo:'subida',  sector:'el circo',     fin:'avituallamiento'},
     {km:[57,64],  dplus:450, dminus:600, tipo:'crestas', sector:'el glaciar',   fin:'avituallamiento'},
     {km:[64,71],  dplus:250, dminus:800, tipo:'bajada',  sector:'el glaciar',   fin:'avituallamiento'},
     {km:[71,78],  dplus:750, dminus:200, tipo:'subida',  sector:'el collado',   fin:'avituallamiento', barrera:{hora:19}},
     {km:[78,86],  dplus:600, dminus:700, tipo:'crestas', sector:'el collado',   fin:'avituallamiento'},
     {km:[86,95],  dplus:300, dminus:1100,tipo:'bajada',  sector:'el hayedo',    fin:'avituallamiento'},
     {km:[95,105], dplus:250, dminus:640, tipo:'llano',   sector:'el valle',     fin:'meta'},
   ]},
  // Las otras cuatro de las cinco con las que empieza el modo (decidido el 2026-10-30).
  // Las de preparación salen de día (sin noche ni frontal) y no tienen bolsa de vida.
  {id:'tresvalles', name:'Trail de los Tres Valles', km:42, dplus:2400, salida:8, dia:1, cierre:11, month:10,
   tipo:'preparacion', aparicion:'anual', semana:41, inscripcion:45, viaje:40, noches:0,
   desc:'Maratón de montaña por los tres valles. Sale el sábado a las ocho: no se pisa la noche.',
   bloques:[
     {km:[0,6],   dplus:350, dminus:80,  tipo:'subida',  sector:'el puente',        fin:'avituallamiento'},
     {km:[6,13],  dplus:600, dminus:150, tipo:'subida',  sector:'la sierra',        fin:'avituallamiento'},
     {km:[13,19], dplus:250, dminus:300, tipo:'crestas', sector:'la sierra',        fin:'avituallamiento'},
     {km:[19,26], dplus:150, dminus:700, tipo:'bajada',  sector:'los tres valles',  fin:'avituallamiento', barrera:{hora:6}},
     {km:[26,33], dplus:700, dminus:200, tipo:'subida',  sector:'los tres valles',  fin:'avituallamiento'},
     {km:[33,38], dplus:250, dminus:450, tipo:'crestas', sector:'la cañada',        fin:'avituallamiento'},
     {km:[38,42], dplus:100, dminus:520, tipo:'bajada',  sector:'la cañada',        fin:'meta'},
   ]},
  {id:'collado', name:'Maratón del Collado', km:50, dplus:3000, salida:7, dia:1, cierre:13, month:4,
   tipo:'preparacion', aparicion:'anual', semana:17, inscripcion:55, viaje:50, noches:0,
   desc:'50 km y 3.000 m+ con el collado dos veces. Sale el sábado a las siete, ya de día.',
   bloques:[
     {km:[0,8],   dplus:700, dminus:100, tipo:'subida',  sector:'el pueblo',   fin:'avituallamiento'},
     {km:[8,15],  dplus:650, dminus:150, tipo:'subida',  sector:'el collado',  fin:'avituallamiento'},
     {km:[15,22], dplus:200, dminus:750, tipo:'bajada',  sector:'el collado',  fin:'avituallamiento'},
     {km:[22,30], dplus:300, dminus:300, tipo:'crestas', sector:'la majada',   fin:'avituallamiento', barrera:{hora:7.5}},
     {km:[30,37], dplus:700, dminus:150, tipo:'subida',  sector:'la majada',   fin:'avituallamiento'},
     {km:[37,44], dplus:300, dminus:600, tipo:'crestas', sector:'las peñas',   fin:'avituallamiento'},
     {km:[44,50], dplus:150, dminus:950, tipo:'bajada',  sector:'las peñas',   fin:'meta'},
   ]},
  // Rotativa (§ 3): una plaza que cambia de sede cada año; el trazado es el mismo.
  {id:'branas', name:'Travesía de las Brañas', km:90, dplus:4800, salida:20, cierre:21.5, month:9,
   tipo:'100k', aparicion:'rotativa', sedes:['Valdeoria','Bustarga','Cuaña'], semana:38, inscripcion:100, viaje:110, noches:1,
   desc:'90 km de braña en braña. Sale el viernes a las ocho de la tarde: la noche entera por delante.',
   bloques:[
     {km:[0,8],   dplus:600, dminus:100, tipo:'subida',  sector:'la braña',     fin:'avituallamiento'},
     {km:[8,16],  dplus:500, dminus:300, tipo:'crestas', sector:'la braña',     fin:'avituallamiento'},
     {km:[16,24], dplus:150, dminus:700, tipo:'bajada',  sector:'el hayal',     fin:'avituallamiento'},
     {km:[24,31], dplus:700, dminus:100, tipo:'subida',  sector:'los puertos',  fin:'avituallamiento'},
     {km:[31,38], dplus:300, dminus:400, tipo:'crestas', sector:'los puertos',  fin:'avituallamiento'},
     {km:[38,45], dplus:100, dminus:650, tipo:'bajada',  sector:'el río',       fin:'bolsa_vida', barrera:{hora:10}},
     {km:[45,53], dplus:750, dminus:100, tipo:'subida',  sector:'la sierra',    fin:'avituallamiento'},
     {km:[53,61], dplus:350, dminus:450, tipo:'crestas', sector:'la sierra',    fin:'avituallamiento'},
     {km:[61,70], dplus:200, dminus:800, tipo:'bajada',  sector:'las cabañas',  fin:'avituallamiento', barrera:{hora:15.5}},
     {km:[70,78], dplus:650, dminus:150, tipo:'subida',  sector:'las cabañas',  fin:'avituallamiento'},
     {km:[78,85], dplus:350, dminus:400, tipo:'crestas', sector:'el cordal',    fin:'avituallamiento'},
     {km:[85,90], dplus:150, dminus:650, tipo:'bajada',  sector:'el cordal',    fin:'meta'},
   ]},
  // La grande (§ 8): dos noches, sueño obligatorio y dos bolsas de vida (§ 12, escalera).
  // El sorteo llega con el paso 5c; hasta entonces se inscribe como las demás.
  {id:'millas', name:'Las 100 Millas del Pirineo', km:165, dplus:10000, salida:18, cierre:46, month:8,
   tipo:'100m', aparicion:'anual', major:true, semana:35, inscripcion:320, viaje:180, noches:2,
   desc:'165 km y 10.000 m+. Sale el viernes a las seis de la tarde y se cierra el domingo. Aquí hay que dormir para terminar.',
   bloques:[
     {km:[0,8],     dplus:700,  dminus:100, tipo:'subida',  sector:'el pueblo',        fin:'avituallamiento'},
     {km:[8,15],    dplus:800,  dminus:150, tipo:'subida',  sector:'el puerto',        fin:'avituallamiento'},
     {km:[15,22],   dplus:250,  dminus:600, tipo:'crestas', sector:'el puerto',        fin:'avituallamiento'},
     {km:[22,30],   dplus:150,  dminus:900, tipo:'bajada',  sector:'el ibón',          fin:'avituallamiento'},
     {km:[30,38],   dplus:950,  dminus:100, tipo:'subida',  sector:'el ibón',          fin:'avituallamiento'},
     {km:[38,46],   dplus:400,  dminus:450, tipo:'crestas', sector:'la cresta',        fin:'avituallamiento'},
     {km:[46,55],   dplus:150,  dminus:950, tipo:'bajada',  sector:'la cresta',        fin:'bolsa_vida', barrera:{hora:15}},
     {km:[55,63],   dplus:1000, dminus:100, tipo:'subida',  sector:'el valle alto',    fin:'avituallamiento'},
     {km:[63,70],   dplus:500,  dminus:300, tipo:'crestas', sector:'el valle alto',    fin:'avituallamiento'},
     {km:[70,78],   dplus:200,  dminus:750, tipo:'bajada',  sector:'el refugio',       fin:'avituallamiento'},
     {km:[78,86],   dplus:900,  dminus:150, tipo:'subida',  sector:'el refugio',       fin:'avituallamiento'},
     {km:[86,94],   dplus:450,  dminus:500, tipo:'crestas', sector:'el glaciar',       fin:'avituallamiento'},
     {km:[94,102],  dplus:150,  dminus:950, tipo:'bajada',  sector:'el glaciar',       fin:'avituallamiento'},
     {km:[102,110], dplus:600,  dminus:250, tipo:'subida',  sector:'la frontera',      fin:'bolsa_vida', barrera:{hora:31}},
     {km:[110,118], dplus:800,  dminus:200, tipo:'subida',  sector:'la frontera',      fin:'avituallamiento'},
     {km:[118,125], dplus:300,  dminus:600, tipo:'crestas', sector:'el bosque negro',  fin:'avituallamiento'},
     {km:[125,133], dplus:150,  dminus:800, tipo:'bajada',  sector:'el bosque negro',  fin:'avituallamiento'},
     {km:[133,140], dplus:850,  dminus:100, tipo:'subida',  sector:'el collado',       fin:'avituallamiento', barrera:{hora:38}},
     {km:[140,148], dplus:350,  dminus:450, tipo:'crestas', sector:'el collado',       fin:'avituallamiento'},
     {km:[148,156], dplus:200,  dminus:950, tipo:'bajada',  sector:'la bajada larga',  fin:'avituallamiento'},
     {km:[156,161], dplus:100,  dminus:500, tipo:'bajada',  sector:'la bajada larga',  fin:'avituallamiento'},
     {km:[161,165], dplus:50,   dminus:150, tipo:'llano',   sector:'el pueblo',        fin:'meta'},
   ]},
];
// Los corredores de la carrera suelta: tres perfiles con las seis estadísticas de Clásico.
const ULTRA_CORREDORES=[
  {id:'rodador',   name:'Mikel Aranburu', desc:'Corre bien donde se puede correr. En las subidas largas sufre.',
   stats:{resistencia:62,velocidad:68,subida:50,bajada:58,nutricion:55,mental:55}},
  {id:'montanero', name:'Edurne Lasa',    desc:'Sube como nadie. Baja con miedo y se le cierra el estómago.',
   stats:{resistencia:64,velocidad:50,subida:72,bajada:48,nutricion:48,mental:60}},
  {id:'veterano',  name:'Patxi Olano',    desc:'Ni rápido ni fuerte: sabe comer, dosificar y no perder la cabeza.',
   stats:{resistencia:70,velocidad:48,subida:56,bajada:55,nutricion:70,mental:72}},
];
// Ritmo por bloque: los mismos ritmos de race.js (PACE_COSTS) menos «a tope», que en ultra no
// tiene sentido sostenido.
const ULTRA_RITMOS=['conservar','steady','push'];
// Avituallamiento normal (minutos de parada) y bolsa de vida (§ 14, momento 2).
const ULTRA_AVITUALLA=[
  {id:'beber',   label:'Beber y rellenar bidones', min:1},
  {id:'comer',   label:'Comer algo sólido',        min:3},
  {id:'gel',     label:'Gel',                      min:0},
  {id:'sentarse',label:'Sentarte un momento',      min:3},
];
// Solo en las carreras de dos noches: dormir sin esperar a la bolsa (el sueño obligatorio, § 12).
const ULTRA_SIESTA={id:'dormir',label:'Dormir 20 minutos en una manta',min:20};
const ULTRA_BOLSA=[
  {id:'comer',   label:'Comer caliente',           min:4},
  {id:'calcetines',label:'Calcetines secos',       min:3},
  {id:'pies',    label:'Curarte los pies',         min:6},
  {id:'dormir',  label:'Dormir 20 minutos',        min:20},
  {id:'bateria', label:'Coger la batería de repuesto',min:1},
];
const ULTRA_ESTOMAGO=['Estómago bien','Estómago revuelto','Estómago cerrado'];
// Cuánto gasta cada tramo frente a un tramo de Clásico (calibrado con un jugador automático).
const ULTRA_GASTO={energy:0.62,hydration:0.7,legs:0.36};
const ULTRA_FRONTAL={normal:7,bueno:12};   // horas de luz (§ 12)

// ── Tramos a partir de los bloques (§ 14, modelo híbrido) ──
// Unos 2,5 km por tramo; base en segundos: 7 min/km + 5 s por metro de subida + 1 s por
// metro de bajada (corredor de 50 a ritmo fijo). calcPaceCosts() la corrige por estadísticas.
function ultraTramos(race){
  const out=[];
  race.bloques.forEach((b,bi)=>{
    const km=b.km[1]-b.km[0],n=Math.max(2,Math.round(km/2.5));
    for(let i=0;i<n;i++){
      const tipo=b.tipo==='subida'?'climb':b.tipo==='bajada'?'descent':b.tipo==='llano'?'flat':['climb','flat','descent'][i%3];
      const kmT=km/n,dp=b.dplus/n,dm=b.dminus/n;
      out.push({name:`${b.sector.charAt(0).toUpperCase()+b.sector.slice(1)} ${i+1}/${n}`,km:kmT,type:tipo,
        gain:Math.round(dp-dm),base:Math.round(kmT*390+dp*4.8+dm*1.0),bloque:bi,
        aid:i===n-1&&b.fin!=='meta'});
    }
  });
  return out;
}

// ── Reloj ──────────────────────────────
function ultraHora(c){return (c.salida+(G.time||0)/3600)%24;}
function ultraEsNoche(c,t){const h=(c.salida+(t??G.time??0)/3600)%24;return h>=21.5||h<7;}
function ultraHoraTxt(c,t){const h=(c.salida+(t??G.time??0)/3600),d=Math.floor(h/24)+(c.dia||0),hh=Math.floor(h%24),mm=Math.floor((h%1)*60);
  return `${['vie','sáb','dom','lun'][d]||''} ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}
function ultraDur(s){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return `${h}h ${String(m).padStart(2,'0')}m`;}
function ultraCarrera(){return G.ut?.carrera||null;}
function ultraNocheAhora(){const c=ultraCarrera();return !!(c&&!c.fin&&typeof G.screen==='string'&&/^ut[A-Z]/.test(G.screen)&&G.screen!=='utPre'&&ultraEsNoche(c));}

// ── Estado ─────────────────────────────
// G.ut es también la carcasa de Ultratrail (ultratrail.js): allí la carrera vive en G.ut.carrera,
// junto al calendario y los objetivos. La carrera suelta solo usa G.ut.carrera.
MODE_STATE.ultra=()=>({ut:null,_utPre:null});   // _utPre: lo elegido antes de la salida

// Prepara la carrera sobre el motor de race.js: G.selectedRaces/G.currentRaceIdx/G.runner son
// lo que leen calcPaceCosts() y getEffStat(). En Ultratrail corre tu corredor (G.runner) y la
// carrera se guarda dentro de la carcasa; suelta, se elige uno de los tres de ULTRA_CORREDORES.
function ultraStart({carrera,corredor,repuesto,bastones,chaqueta}){
  const enModo=G.gameMode==='ultratrail'&&!!G.ut;
  const def0=ULTRA_RACES.find(r=>r.id===carrera)||ULTRA_RACES[0];
  // En el modo, con la variante de recorrido decidida la víspera (ultratrail.js, utVispera)
  const variante=enModo&&G.ut.vispera?.id===def0.id?G.ut.vispera.variante:'completo';
  const def=enModo?utRaceVariante(def0,variante):def0;
  const co=enModo?null:(ULTRA_CORREDORES.find(x=>x.id===corredor)||ULTRA_CORREDORES[0]);
  const race={...def,ultra:true,tier:'nacional',segs:ultraTramos(def),weather_risk:0.15};
  G.selectedRaces=[race];G.currentRaceIdx=0;G.seg=0;G.time=0;G.paceLog=[];
  // En el modo llegas con la carga que traigas: por encima de 40, las piernas salen gastadas (§ 6)
  G.runner=enModo?{...G.runner,energy:100,hydration:100,legs:Math.round(100-Math.max(0,(G.ut.carga||0)-40)*0.6)}
    :{...G.runner,name:co.name,age:34,stats:{...co.stats},energy:100,hydration:100,legs:100};
  if(!def.noches)repuesto='sin';   // de día no hace falta frontal
  G.weather='nublado';G.startStrategy=null;G.raceEvent='';
  // Rivales con desgaste propio (§ 14): nivel, aguante y si siguen en carrera.
  const rivales=[];
  for(let i=0;i<60;i++)rivales.push({id:'u'+i,mult:0.82+Math.random()*0.42,aguante:0.4+Math.random()*0.6,time:0,out:false,motivo:null,km:0});
  const carreraNueva={
    id:race.id,name:race.name,salida:race.salida,dia:race.dia||0,cierre:race.cierre,km:race.km,noches:race.noches??1,
    corredor:co?co.id:null,lucidez:100,estomago:0,pies:0,
    // bolsas: en las de dos noches dejas otra batería en la segunda bolsa de vida (§ 12)
    frontal:{horas:enModo&&G.ut.material?.frontal?ULTRA_FRONTAL.bueno:ULTRA_FRONTAL.normal,repuesto,repuestoCogido:repuesto==='mochila',bolsas:[]},
    bloque:0,ritmo:'steady',parada:0,paradaUsada:[],log:[],rivales,
    enBolsa:false,bolsaN:0,sueno:false,fin:null,despistes:0,
    // Preparaciones contra lo que pide la carrera (ultratrail.js, utDeficit): positivo, vas corto.
    // Y las secuelas, que no se van (§ 15). Fuera del modo, neutro.
    def:enModo?utDeficit(def):{base:0,encaje:0,estomago:0,nocturna:0,termica:0},
    secuelas:enModo?(G.ut.secuelas||[]).length:0,
    // Material (§ 12): bastones y chaqueta si los tienes y los llevas; zapatillas gastadas.
    // Control de material en uno o dos avituallamientos al azar, en las que piden chaqueta.
    material:enModo?{bastones:!!bastones&&G.ut.material.bastones,chaqueta:!!chaqueta&&G.ut.material.chaqueta,
      gastadas:G.ut.material.zapatillasKm>=UT_ZAPAS_VIDA,obligatoria:utChaquetaObligatoria(def)}:null,
    controles:enModo&&utChaquetaObligatoria(def)?ultraControles(def):[],
    // Reconocimiento por sectores (§ 5): lo que conoces de cada uno. Fuera del modo, nada.
    reco:enModo?{...(G.ut.reco[def.id]||{})}:null,sectoresVistos:[],
    variante,
  };
  G.ut=enModo?{...G.ut,carrera:carreraNueva}:{carrera:carreraNueva};
  ultraLog(race.noches?`Salida a las ${race.salida}:00. ${rivales.length+1} frontales en la plaza del pueblo.`
    :`Salida a las ${race.salida}:00. ${rivales.length+1} dorsales en la plaza del pueblo.`);
}
function ultraLog(t){const c=ultraCarrera();c.log.push({bloque:c.bloque,t});if(c.log.length>40)c.log.splice(0,c.log.length-40);}

// ── Un bloque ──────────────────────────
// Se elige ritmo para el bloque entero y se resuelve tramo a tramo con el motor de race.js.
function ultraCorrerBloque(ritmo){
  const c=ultraCarrera(),race=G.selectedRaces[0],segs=race.segs,b=race.bloques[c.bloque];
  if(!b||c.fin)return 'fin';
  c.ritmo=ritmo;c.paradaUsada=[];
  const r=G.runner,t0=G.time;
  const sm=getEffStat('mental');
  const nocheIni=ultraEsNoche(c);
  c.sectoresVistos=c.sectoresVistos||[];c.sectoresVistos.push({sector:b.sector,noche:nocheIni});
  // Lo que conoces del sector (§ 5): sabértelo ahorra; no haberlo pisado nunca cuesta
  const nReco=c.reco?(c.reco[b.sector]||0):null;
  const m=c.material;
  while(G.seg<segs.length&&segs[G.seg].bloque===c.bloque){
    const s=segs[G.seg];
    // Con la lucidez baja, el ritmo elegido se te va de las manos (error de dosificación)
    let p=ritmo;
    if(c.lucidez<35&&p!=='push'&&Math.random()<(35-c.lucidez)/80)p=p==='conservar'?'steady':'push';
    G.paceLog.push(p);
    const {tm,ec,hc,lc,alloutStreak,sb,injuryRiskBase}=calcPaceCosts(p,s,G.paceLog);
    const {descentFall,midRaceInjury}=checkSegInjury(p,s,alloutStreak,sb,injuryRiskBase);
    let mult=tm;
    const noche=ultraEsNoche(c);
    const luz=noche?ultraGastarLuz(c,s.base*tm/3600):true;
    if(noche)mult*=luz?(s.type==='descent'?1.12:1.04):1.5;   // de noche, y sin luz casi no se avanza
    if(c.frontal.repuesto==='mochila'&&c.frontal.repuestoCogido&&!c.frontal.usado)mult*=1.02;   // el repuesto pesa
    if(c.estomago===2)mult*=1.06;
    // Ir corto de preparación también cuesta tiempo (§ 6): la base siempre, el encaje en las
    // bajadas y la nocturna de noche. Ir sobrado da un poco (el déficit baja hasta −0,15).
    const dp=c.def||{};
    mult*=1+(dp.base||0)*0.1+(s.type==='descent'?(dp.encaje||0)*0.25:0)+(noche?(dp.nocturna||0)*0.15:0)+(dp.termica||0)*0.04;
    if(m){
      if(m.bastones)mult*=s.type==='climb'?0.95:s.type==='flat'?1.01:1;   // bastones: subir mejor
      if(m.chaqueta)mult*=1.01;                                          // la chaqueta pesa
    }
    if(nReco!=null)mult*=[1.03,1.01,1,0.98][nReco];
    if(c.pies>=2)mult*=1.04;
    G.time+=Math.round(s.base*mult);
    // Las preparaciones (§ 6): base → energía, encaje → piernas (más en bajada), térmica → agua
    const d=c.def||{};
    // Sin chaqueta, la madrugada se paga (2-6 h): más gasto y la cabeza más lenta
    const frio=m&&!m.chaqueta&&noche&&ultraHora(c)>=2&&ultraHora(c)<6;
    drain(r,'energy',ec*ULTRA_GASTO.energy*(c.estomago===2?1.3:1)*(1+(d.base||0)*0.8)*(frio?1.08:1));
    drain(r,'hydration',hc*ULTRA_GASTO.hydration*(1+(d.termica||0)*0.6));
    drain(r,'legs',lc*ULTRA_GASTO.legs*(1+(d.encaje||0)*(s.type==='descent'?1.3:0.7))*(1+0.03*(c.secuelas||0))*(m&&m.gastadas?1.08:1));
    if(frio)c.lucidez=Math.max(0,c.lucidez-s.base*tm/3600);
    // Lucidez: se va de noche y con las horas (§ 14, momento 3); la mental la frena
    const horas=s.base*mult/3600;
    const deuda=G.time>24*3600?1.8:1;   // segunda noche: el cuerpo pide dormir (§ 12)
    c.lucidez=Math.max(0,c.lucidez-horas*(noche?7*deuda*(1+(d.nocturna||0)*1.2):1.5)*(1.25-sm/100)-horas*G.time/3600*0.08);
    // Estómago (§ 6): sin entrenarlo, se cierra antes
    if(p==='push'&&Math.random()<0.10+Math.max(0,d.estomago||0)*0.15)c.estomago=Math.min(2,c.estomago+1);
    else if(Math.random()<horas*Math.max(0,d.estomago||0)*0.05)c.estomago=Math.min(2,c.estomago+1);
    if(Math.random()<0.03*horas*(1+G.time/36000))c.pies=Math.min(3,c.pies+1);
    if(descentFall){drain(r,'legs',12);G.time+=120;ultraLog(`Resbalón en la bajada de ${b.sector}. Las piernas lo notan.`);}
    if(midRaceInjury){
      c.fin={kind:'dnf',motivo:'lesion',km:Math.round(b.km[0]+(G.seg-segs.findIndex(x=>x.bloque===c.bloque)+1)*s.km),
        why:`${INJURY_TYPES[midRaceInjury].label} en ${b.sector}. No se puede seguir.`};
      ultraLog(c.fin.why);G.seg++;return 'fin';
    }
    G.seg++;
  }
  // Te pierdes justo donde no habías estado (§ 5): de noche, por sector
  if(nReco!=null&&nocheIni&&Math.random()<0.05*[2,1.4,0.8,0.4][nReco]){G.time+=720;c.despistes++;ultraLog(nReco?`Dudas en un cruce de ${b.sector}. Doce minutos.`:`Te pierdes en ${b.sector}: no lo habías pisado nunca. Doce minutos.`);}
  // Despiste de ruta con la cabeza ida (−12 min, § 14)
  if(c.lucidez<30&&Math.random()<0.45){G.time+=720;c.despistes++;ultraLog(`Te pasas un cruce en ${b.sector}. Doce minutos para volver a la cinta.`);}
  if(c.lucidez<25&&ultraEsNoche(c)&&Math.random()<0.5)ultraLog(['Una roca con forma de perro te mira desde la cuneta.','Oyes a alguien detrás. No hay nadie.','Las balizas se mueven cuando no las miras.'][Math.floor(Math.random()*3)]);
  // Amanecer: recuperas lucidez de golpe (§ 14, momento 4)
  const hIni=(c.salida+t0/3600),hFin=(c.salida+G.time/3600);
  for(let h=Math.ceil(hIni);h<=hFin;h++){
    if(h%24===7){c.lucidez=Math.min(100,c.lucidez+25);c.frontal.apagado=true;ultraLog('Amanece. Apagas el frontal y la cabeza vuelve.');}
    if(h%24===22&&h>c.salida&&c.noches){ultraLog(h-c.salida<24&&c.salida<21?'Cae la noche. Frontal.':'Cae la noche otra vez. Frontal.');c.frontal.apagado=false;}   // si sale de noche, la primera es la salida
  }
  ultraLog(`${b.sector.charAt(0).toUpperCase()+b.sector.slice(1)}: km ${b.km[1]} en ${ultraDur(G.time-t0)} (${PACE_COSTS[ritmo].label.toLowerCase()}).`);
  ultraRivalesBloque(t0);
  // Barrera horaria contra G.time (§ 14): el DNF por barrera es el resultado más común
  if(b.barrera&&G.time>b.barrera.hora*3600){
    c.fin={kind:'dnf',motivo:'barrera',km:b.km[1],why:`Llegas al km ${b.km[1]} a las ${ultraHoraTxt(c)}. La barrera cerró a las ${ultraHoraTxt(c,b.barrera.hora*3600)}.`};
    ultraLog(c.fin.why);return 'fin';
  }
  if(b.fin==='meta'){
    if(G.time>c.cierre*3600){c.fin={kind:'dnf',motivo:'barrera',km:b.km[1],why:`Cruzas la meta en ${ultraDur(G.time)}, fuera del cierre de ${c.cierre} h.`};return 'fin';}
    const pos=c.rivales.filter(x=>!x.out&&x.time<G.time).length+1;
    c.fin={kind:'finisher',pos,finishers:c.rivales.filter(x=>!x.out).length+1,why:`Meta en ${ultraDur(G.time)}.`};
    ultraLog(`Meta. ${ultraDur(G.time)}.`);return 'fin';
  }
  // Control de material (§ 12): sin la chaqueta obligatoria, una hora de penalización
  if((c.controles||[]).includes(c.bloque)){
    if(c.material&&!c.material.chaqueta){G.time+=3600;ultraLog(`Control de material en el km ${b.km[1]}: sin chaqueta. Una hora de penalización.`);}
    else ultraLog(`Control de material en el km ${b.km[1]}: todo en orden.`);
  }
  c.bloque++;
  c.enBolsa=b.fin==='bolsa_vida';
  if(c.enBolsa)c.bolsaN++;
  // Sueño obligatorio (§ 12): en las de dos noches, con la lucidez hundida no se sigue sin dormir
  if(c.noches>=2&&c.lucidez<=10&&!c.sueno){c.sueno=true;ultraLog('Te duermes andando. Das dos pasos fuera del sendero sin darte cuenta. Hay que dormir.');}
  return c.enBolsa?'bolsa':'avituallamiento';
}
// Uno o dos avituallamientos al azar con control de material (§ 12).
function ultraControles(def){
  const ids=def.bloques.map((b,i)=>b.fin!=='meta'?i:-1).filter(i=>i>0);
  const out=[];const n=Math.random()<0.5?1:2;
  while(out.length<n&&ids.length)out.push(ids.splice(Math.floor(Math.random()*ids.length),1)[0]);
  return out;
}
// Gasta batería del frontal; devuelve si queda luz.
function ultraGastarLuz(c,horas){
  const f=c.frontal;
  if(f.horas>0){f.horas=Math.max(0,f.horas-horas);if(f.horas===0)ultraLog('El frontal parpadea y se apaga.');return true;}
  if(f.repuestoCogido&&!f.usado){f.usado=true;f.horas=ULTRA_FRONTAL.normal;ultraLog('Cambias a la batería de repuesto a tientas.');return true;}
  return false;
}
// Rivales: se desgastan, abandonan (más de noche y al final) y se quedan en las barreras.
function ultraRivalesBloque(t0){
  const c=ultraCarrera(),race=G.selectedRaces[0],b=race.bloques[c.bloque];
  const blockBase=race.segs.filter(s=>s.bloque===c.bloque).reduce((a,s)=>a+s.base,0);
  const prog=b.km[1]/race.km;
  let caen=0;
  c.rivales.filter(x=>!x.out).forEach(x=>{
    const desgaste=1+(1-x.aguante)*prog*prog*0.6;
    x.time+=Math.round(blockBase*x.mult*desgaste*(0.95+Math.random()*0.1)*(ultraEsNoche(c,x.time)?1.06:1));
    x.km=b.km[1];
    const pDrop=0.006+(1-x.aguante)*prog*0.03+(ultraEsNoche(c,x.time)?0.005:0);
    if(Math.random()<pDrop){x.out=true;x.motivo='abandono';caen++;}
    else if(b.barrera&&x.time>b.barrera.hora*3600){x.out=true;x.motivo='barrera';caen++;}
    else if(b.fin==='meta'&&x.time>c.cierre*3600){x.out=true;x.motivo='barrera';caen++;}
  });
  if(caen)ultraLog(caen===1?'Uno más se retira en este tramo.':`${caen} se retiran en este tramo${b.barrera?', varios por la barrera':''}.`);
}
// Puesto estimado ahora (los que siguen y van por delante en tiempo al mismo km).
function ultraPuesto(){const c=ultraCarrera();return c.rivales.filter(x=>!x.out&&x.time<G.time).length+1;}
function ultraEnPie(){return ultraCarrera().rivales.filter(x=>!x.out).length+1;}

// ── Margen sobre la siguiente barrera ──
// Lo más importante de la pantalla (§ 14): barrera − (ahora + lo que queda hasta ella a ritmo fijo).
function ultraSiguienteBarrera(){
  const c=ultraCarrera(),race=G.selectedRaces[0];
  for(let i=c.bloque;i<race.bloques.length;i++)if(race.bloques[i].barrera)return {i,b:race.bloques[i]};
  return {i:race.bloques.length-1,b:{...race.bloques[race.bloques.length-1],barrera:{hora:c.cierre}}};
}
function ultraMargen(){
  const c=ultraCarrera(),race=G.selectedRaces[0],{i,b}=ultraSiguienteBarrera();
  const pend=race.segs.filter(s=>s.bloque>=c.bloque&&s.bloque<=i).reduce((a,s)=>a+s.base,0);
  const est=pend*ultraFactorRitmo();
  return Math.round((b.barrera.hora*3600-(G.time+est))/60);
}
// Lo que vas tardando frente a la base (para estimar lo que queda)
function ultraFactorRitmo(){
  const race=G.selectedRaces[0],hecho=race.segs.slice(0,G.seg).reduce((a,s)=>a+s.base,0);
  return hecho>0?Math.max(0.8,G.time/hecho):1.05;
}

// ── Paradas ────────────────────────────
// Cada acción suma su tiempo a G.time: el margen sobre la barrera baja mientras decides.
function ultraParar(id){
  const c=ultraCarrera(),r=G.runner;
  const lista=c.enBolsa?ULTRA_BOLSA:ultraAvitualla(c);
  const a=lista.find(x=>x.id===id);if(!a)return false;
  if(c.paradaUsada.includes(id)&&id!=='gel')return false;
  c.paradaUsada.push(id);
  G.time+=a.min*60;
  const abs=[1,0.5,0.15][c.estomago]*(0.7+getEffStat('nutricion')/170);
  if(id==='beber'){r.hydration=Math.min(100,r.hydration+32);if(c.estomago>0&&Math.random()<0.3)c.estomago--;}
  if(id==='comer'){r.energy=Math.min(100,r.energy+(c.enBolsa?40:24)*abs);if(c.enBolsa&&c.estomago>0)c.estomago--;}
  if(id==='gel'){r.energy=Math.min(100,r.energy+10*abs);if(Math.random()<0.15)c.estomago=Math.min(2,c.estomago+1);}
  if(id==='sentarse'){r.legs=Math.min(100,r.legs+3);c.lucidez=Math.min(100,c.lucidez+3);}
  if(id==='calcetines'){c.pies=Math.max(0,c.pies-1);}
  if(id==='pies'){c.pies=0;}
  if(id==='dormir'){c.lucidez=Math.min(100,c.lucidez+35);r.legs=Math.min(100,r.legs+4);c.sueno=false;}
  if(id==='bateria'){if(!ultraBateriaEnBolsa(c)){c.paradaUsada.pop();G.time-=a.min*60;return false;}
    c.frontal.bolsas.push(c.bolsaN);c.frontal.repuestoCogido=true;c.frontal.usado=false;}
  return true;
}
// Lo que hay en el avituallamiento: en las de dos noches, también una manta para dormir.
function ultraAvitualla(c){return c.noches>=2?[...ULTRA_AVITUALLA,ULTRA_SIESTA]:ULTRA_AVITUALLA;}
// ¿Hay batería esperando en esta bolsa? La del repuesto, en la primera; en las de dos noches,
// otra en la segunda (la dejaste preparada).
function ultraBateriaEnBolsa(c){
  const f=c.frontal;if(!c.enBolsa||(f.bolsas||[]).includes(c.bolsaN))return false;
  return (c.bolsaN===1&&f.repuesto==='bolsa')||(c.bolsaN===2&&c.noches>=2);
}
function ultraRetirarse(){
  const c=ultraCarrera(),b=G.selectedRaces[0].bloques[c.bloque-1];
  c.fin={kind:'dnf',motivo:'abandono',km:b?b.km[1]:0,why:`Te retiras en el km ${b?b.km[1]:0}. Entregas el dorsal.`};
  return 'fin';
}
