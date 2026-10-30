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
function ultraHoraTxt(c,t){const h=(c.salida+(t??G.time??0)/3600),d=Math.floor(h/24),hh=Math.floor(h%24),mm=Math.floor((h%1)*60);
  return `${['vie','sáb','dom'][d]||''} ${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;}
function ultraDur(s){const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return `${h}h ${String(m).padStart(2,'0')}m`;}
function ultraCarrera(){return G.ut?.carrera||null;}
function ultraNocheAhora(){const c=ultraCarrera();return !!(c&&!c.fin&&typeof G.screen==='string'&&/^ut[A-Z]/.test(G.screen)&&G.screen!=='utPre'&&ultraEsNoche(c));}

// ── Estado ─────────────────────────────
MODE_STATE.ultra=()=>({ut:null,_utPre:null});   // _utPre: lo elegido antes de la salida

// Prepara la carrera sobre el motor de race.js: G.selectedRaces/G.currentRaceIdx/G.runner son
// lo que leen calcPaceCosts() y getEffStat().
function ultraStart({carrera,corredor,repuesto}){
  const def=ULTRA_RACES.find(r=>r.id===carrera)||ULTRA_RACES[0];
  const co=ULTRA_CORREDORES.find(x=>x.id===corredor)||ULTRA_CORREDORES[0];
  const race={...def,ultra:true,tier:'nacional',segs:ultraTramos(def),weather_risk:0.15};
  G.selectedRaces=[race];G.currentRaceIdx=0;G.seg=0;G.time=0;G.paceLog=[];
  G.runner={...G.runner,name:co.name,age:34,stats:{...co.stats},energy:100,hydration:100,legs:100};
  G.weather='nublado';G.startStrategy=null;G.raceEvent='';
  // Rivales con desgaste propio (§ 14): nivel, aguante y si siguen en carrera.
  const rivales=[];
  for(let i=0;i<60;i++)rivales.push({id:'u'+i,mult:0.82+Math.random()*0.42,aguante:0.4+Math.random()*0.6,time:0,out:false,motivo:null,km:0});
  G.ut={carrera:{
    id:race.id,name:race.name,salida:race.salida,cierre:race.cierre,km:race.km,
    corredor:co.id,lucidez:100,estomago:0,pies:0,
    frontal:{horas:ULTRA_FRONTAL.normal,repuesto,repuestoCogido:repuesto==='mochila'},
    bloque:0,ritmo:'steady',parada:0,paradaUsada:[],log:[],rivales,
    enBolsa:false,fin:null,despistes:0,
  }};
  ultraLog(`Salida a las ${race.salida}:00. ${rivales.length+1} frontales en la plaza del pueblo.`);
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
    if(c.pies>=2)mult*=1.04;
    G.time+=Math.round(s.base*mult);
    drain(r,'energy',ec*ULTRA_GASTO.energy*(c.estomago===2?1.3:1));
    drain(r,'hydration',hc*ULTRA_GASTO.hydration);
    drain(r,'legs',lc*ULTRA_GASTO.legs);
    // Lucidez: se va de noche y con las horas (§ 14, momento 3); la mental la frena
    const horas=s.base*mult/3600;
    c.lucidez=Math.max(0,c.lucidez-horas*(noche?7:1.5)*(1.25-sm/100)-horas*G.time/3600*0.08);
    if(p==='push'&&Math.random()<0.10)c.estomago=Math.min(2,c.estomago+1);
    if(Math.random()<0.03*horas*(1+G.time/36000))c.pies=Math.min(3,c.pies+1);
    if(descentFall){drain(r,'legs',12);G.time+=120;ultraLog(`Resbalón en la bajada de ${b.sector}. Las piernas lo notan.`);}
    if(midRaceInjury){
      c.fin={kind:'dnf',motivo:'lesion',km:Math.round(b.km[0]+(G.seg-segs.findIndex(x=>x.bloque===c.bloque)+1)*s.km),
        why:`${INJURY_TYPES[midRaceInjury].label} en ${b.sector}. No se puede seguir.`};
      ultraLog(c.fin.why);G.seg++;return 'fin';
    }
    G.seg++;
  }
  // Despiste de ruta con la cabeza ida (−12 min, § 14)
  if(c.lucidez<30&&Math.random()<0.45){G.time+=720;c.despistes++;ultraLog(`Te pasas un cruce en ${b.sector}. Doce minutos para volver a la cinta.`);}
  if(c.lucidez<25&&ultraEsNoche(c)&&Math.random()<0.5)ultraLog(['Una roca con forma de perro te mira desde la cuneta.','Oyes a alguien detrás. No hay nadie.','Las balizas se mueven cuando no las miras.'][Math.floor(Math.random()*3)]);
  // Amanecer: recuperas lucidez de golpe (§ 14, momento 4)
  const hIni=(c.salida+t0/3600),hFin=(c.salida+G.time/3600);
  for(let h=Math.ceil(hIni);h<=hFin;h++){
    if(h%24===7){c.lucidez=Math.min(100,c.lucidez+25);c.frontal.apagado=true;ultraLog('Amanece. Apagas el frontal y la cabeza vuelve.');}
    if(h%24===22&&h>c.salida){ultraLog('Cae la noche otra vez. Frontal.');c.frontal.apagado=false;}   // la primera noche es la salida
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
  c.bloque++;
  c.enBolsa=b.fin==='bolsa_vida';
  return c.enBolsa?'bolsa':'avituallamiento';
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
  const lista=c.enBolsa?ULTRA_BOLSA:ULTRA_AVITUALLA;
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
  if(id==='dormir'){c.lucidez=Math.min(100,c.lucidez+35);r.legs=Math.min(100,r.legs+4);}
  if(id==='bateria'){if(c.frontal.repuesto!=='bolsa'||c.frontal.repuestoCogido){c.paradaUsada.pop();G.time-=a.min*60;return false;}c.frontal.repuestoCogido=true;}
  return true;
}
function ultraRetirarse(){
  const c=ultraCarrera(),b=G.selectedRaces[0].bloques[c.bloque-1];
  c.fin={kind:'dnf',motivo:'abandono',km:b?b.km[1]:0,why:`Te retiras en el km ${b?b.km[1]:0}. Entregas el dorsal.`};
  return 'fin';
}
