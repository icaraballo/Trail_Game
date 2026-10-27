// ══════════════════════════════════════════════════════════════════
//  MODO CANICROSS
// ══════════════════════════════════════════════════════════════════

const CN_BREED_MODS={
  husky:   {speed:-5,  stamina:15, bondDecayPerWeek:0, label:'Husky Siberiano', desc:'Resistencia larga distancia. Débil en calor.'},
  vizsla:  {speed:15,  stamina:-10,bondDecayPerWeek:0, label:'Vizsla',          desc:'Velocidad en tramos cortos. Se agota rápido.'},
  malinois:{speed:10,  stamina:5,  bondDecayPerWeek:3, label:'Malinois',        desc:'Intensidad y recuperación rápida. Necesita más entrenamiento o se estresa.'},
  mestizo: {speed:0,   stamina:0,  bondDecayPerWeek:0, label:'Mestizo',         desc:'Stats equilibrados. Sin pico en nada.'},
};

const CN_EVENTS_POS=[
  {id:'mirada',  text:'[DOG] se gira a mirarte en el km [KM]',                     bondMod:5,  mentalMod:3},
  {id:'ritmo',   text:'Lleváis el mismo ritmo sin esfuerzo',                        bondMod:8,  speedBonus:2},
  {id:'rival',   text:'[DOG] ladra al pasar por delante de un rival',               bondMod:4,  mentalMod:5},
  {id:'cuesta',  text:'[DOG] te arrastra cuesta arriba sin que se lo pidas',        energyBonus:10, bondMod:5},
  {id:'nieve',   text:'[DOG] encuentra un tramo de nieve virgen y enloquece de alegría', bondMod:6, winterOnly:true},
];
const CN_EVENTS_NEG=[
  {id:'olor', text:'[DOG] se para en seco — huele algo, pierdes 15s', timeLoss:15, decision:true,
   options:[{label:'Esperar con calma (+2 vínculo)',bondMod:2,timeLoss:0},{label:'Tirar de él (-4 vínculo)',bondMod:-4,timeLoss:0}]},
  {id:'cojera', text:'[DOG] cojea levemente — ¿sigues o reduces ritmo?', decision:true,
   options:[{label:'Seguir igual (riesgo lesión, -8 vínculo)',bondMod:-8,injuryRisk:true},{label:'Reducir ritmo (+4 vínculo)',bondMod:4,timeLoss:120}]},
  {id:'dessinc', text:'Lleváis 3 km sin sincronía — el arnés tensa constantemente', bondMod:-5},
];
const CN_EVENTS_RARE=[
  {id:'autopilot',    text:'Modo automático — [DOG] anticipa tus movimientos durante 2 tramos', speedBonus:5, energyBonus:8},
  {id:'publico_rare', text:'El público os señala a los dos — alguien grita vuestros dos nombres', mentalMod:10, bondMod:5},
];
const CN_EVENTS_SPECIAL=[
  {id:'ardilla',  text:'🐿️ [DOG] ve una ardilla', timeLoss:10, decision:true,
   options:[{label:'Controlar bien (+3 vínculo)',bondMod:3,timeLoss:0},{label:'Dejarle ir (-5 vínculo)',bondMod:-5,timeLoss:15}]},
  {id:'arroyo',   text:'💧 [DOG] encuentra un arroyo — rehidratación gratuita', hydBonus:10},
  {id:'espectad', text:'🎉 Los espectadores gritan tu nombre y el de [DOG]',   mentalMod:8, bondMod:4},
  {id:'coj_grave',text:'🐾 [DOG] cojea en km [KM] — ¿retiras o continúas despacio?', decision:true,
   options:[{label:'Retirar (sin penalización vínculo)',retire:true,bondMod:2},{label:'Continuar (riesgo lesión grave)',injuryRisk:true,injurySevere:true,bondMod:-3}]},
];

const CN_RIVAL_NAMES=[
  'Elena & Nala','Carlos & Thor','Ana & Kira','Javi & Bolt','Laura & Max',
  'Pedro & Zara','Marta & Rex','Iñaki & Txuri','Sara & Nina','Pol & Ares',
  'Eva & Lola','Tomás & Figo','Noa & Coco','Rubén & Draco','Lidia & Hera',
  'Diego & Rayo','Claudia & Kira','Andrei & Boss','Miriam & Cuco','Sergio & Nyx',
  'Verónica & Ares','Pau & Llamp','Sofía & Koda','Alberto & Zeus',
];

// ── STATE HELPERS ─────────────────────────────────────

// ── PERROS (rediseño, paso 1 · TG-Diseno-Canicross § 3.1) ─────────────────
// Antes había un solo G.dog. Ahora G.dogs[] con un id cada uno, y el que compite es el
// de G.activeDogId (sigue siéndolo al retirarse, como antes seguía en G.dog). Nadie lee
// G.dogs a pelo: estas cuatro funciones son la única entrada.
function cnDogs(){return G.dogs||[];}
function cnActiveDog(){const id=G.activeDogId;return id==null?null:(G.dogs||[]).find(d=>d.id===id)||null;}
function cnHomeDogs(){return (G.dogs||[]).filter(d=>d.status==='casa');}   // retirados que siguen contigo (paso 7)
function cnDogById(id){return (G.dogs||[]).find(d=>d.id===id)||null;}
// Da de alta un perro con su id y lo deja como el que compite.
function cnAddDog(dog){
  if(!Array.isArray(G.dogs))G.dogs=[];
  dog.id=G.cnNextDogId||1;G.cnNextDogId=dog.id+1;
  G.dogs.push(dog);G.activeDogId=dog.id;
  return dog;
}

function cnInitDog(name,breed){
  const m=CN_BREED_MODS[breed]||CN_BREED_MODS.mestizo;
  return{name,breed,age:1,
    speed:Math.min(100,Math.max(0,50+(m.speed||0))),
    stamina:Math.min(100,Math.max(0,50+(m.stamina||0))),
    bond:0,health:100,birthSeason:G.cnSeason||1,
    retired:false,races:0,kmTogether:0,peakBond:0,
    injury:null,injuryRaces:0,
    // Paso 4 (§ 3.2, § 4.1-4.5): estado oculto (nunca se enseña como número), temperamento
    // y seis comandos con dominio 0-3.
    mood:60,fatigue:0,temperament:cnPickTemperament(),
    sex:Math.random()<0.5?'macho':'hembra',condition:null,   // paso 5: la hembra puede tener celo
    commands:{forward:0,hold:0,easy:0,left:0,leaveit:0,water:0},
    cmdHours:{forward:0,hold:0,easy:0,left:0,leaveit:0,water:0},   // paso 6: horas acumuladas por comando
    syncBase:0,   // paso 6: sincronía de base que dejan las horas juntos (se va perdiendo)
  };
}
function cnPickTemperament(){
  const pool=shuffle([...CN_TEMPERAMENTS]);
  return pool.slice(0,Math.random()<0.5?1:2);
}
// Ánimo con 60 por defecto solo si falta: un 0 es un 0 (con || se volvía 60).
function cnMood(v){const n=Number(v);return Number.isFinite(n)?n:60;}
function cnHasTrait(d,t){return !!(d&&Array.isArray(d.temperament)&&d.temperament.includes(t));}

function cnComputeDogStats(){
  const results=G.cnRaceResults||[];
  const finished=results.filter(r=>!r.dnf);
  return{
    victories:finished.filter(r=>r.pos===1).length,
    podiums:finished.filter(r=>r.pos&&r.pos<=3).length,
    bestTime:finished.length>0?Math.min(...finished.map(r=>r.time)):null,
  };
}

function cnCanRace(){
  const d=cnActiveDog();
  if(!d||d.retired)return false;
  if(d.injury&&d.injuryRaces>0)return false;
  if(d.bond<cnRaceThreshold())return false; // T142 (v91): el umbral vivía aquí y en cnRaceThreshold()
  return true;
}

function cnRaceThreshold(){return(G.cnSeason||1)===1?20:30;}

function cnCommandLabel(id){return(CN_COMMANDS.find(k=>k.id===id)||{}).label||id;}
function cnCommandsList(){
  const d=cnActiveDog();if(!d)return[];
  const c=d.commands||{};
  return CN_COMMANDS.map(k=>({id:k.id,label:k.label,desc:k.desc,level:Number(c[k.id])||0,learned:(Number(c[k.id])||0)>=1}));
}

function cnDogAgeLabel(){
  const y=cnActiveDog()?cnActiveDog().age:0;
  return y===1?'1 año':y+' años';
}

// Paso 6: €40 al mes; en estrechez, manutención mínima a €20 (le cuesta salud al perro).
function cnMonthlyDogCost(){return G.cnMinCare?20:40;}

// ── RELOJ (rediseño, paso 2 · TG-Diseno-Canicross § 4.12) ───────────────────
// Antes, G.cnWeek y una tabla de semanas → mes (cnCurrentMonth). Dos fallos salieron de ahí:
// el primer «Avanzar» que no cambiaba de mes (B5, BUG-17) y marzo, que no terminaba nunca
// (CR-75). Ahora el mes es G.cnMonthIdx (0 = octubre … 5 = marzo; 6 = temporada terminada)
// Desde el paso 6 el mes es un reparto de horas: ya no hay semanas sueltas (adiós vacaciones).
function cnMonth(){return CN_MONTHS[Math.max(0,Math.min(5,Number(G.cnMonthIdx)||0))];}
function cnSeasonOver(){return (Number(G.cnMonthIdx)||0)>=6;}
// Cierra el mes: cobra la manutención del perro y pasa al siguiente (tras marzo, a 6).
function cnEndMonth(){
  cnMonthlyCondition();   // paso 5
  const cost=cnMonthlyDogCost();
  G.cnMoney=(G.cnMoney||0)-cost;   // paso 6: sin suelo, la quiebra existe
  if(G.cnMinCare){const d=cnActiveDog();if(d)d.health=Math.max(0,(d.health==null?100:d.health)-5);}
  G.cnMonthIdx=Math.min(6,(Number(G.cnMonthIdx)||0)+1);
  return cost;
}

function cnPickEvent(raceMonth){
  const d=cnActiveDog();if(!d)return null;
  // DEV: fuerza un evento concreto por id, consumido una sola vez, sin tocar
  // las probabilidades reales del resto de jugadores.
  const forcedId=window.devTake?.('cnEvent');
  if(forcedId){
    for(const[pool,eventType]of[[CN_EVENTS_RARE,'rare'],[CN_EVENTS_SPECIAL,'special'],[CN_EVENTS_POS,'pos'],[CN_EVENTS_NEG,'neg']]){
      const found=pool.find(e=>e.id===forcedId);
      if(found)return{...found,eventType};
    }
  }
  if(Math.random()>0.60)return null;
  const isWinter=raceMonth===12||raceMonth===1||raceMonth===2;
  const r=Math.random();
  if(d.bond>=75&&r<0.15)return{...CN_EVENTS_RARE[Math.floor(Math.random()*CN_EVENTS_RARE.length)],eventType:'rare'};
  if(r<0.3){
    const pool=CN_EVENTS_SPECIAL;
    return{...pool[Math.floor(Math.random()*pool.length)],eventType:'special'};
  }
  if(r<0.65){
    const pool=CN_EVENTS_POS.filter(e=>!e.winterOnly||(e.winterOnly&&isWinter));
    if(!pool.length)return null;
    return{...pool[Math.floor(Math.random()*pool.length)],eventType:'pos'};
  }
  return{...CN_EVENTS_NEG[Math.floor(Math.random()*CN_EVENTS_NEG.length)],eventType:'neg'};
}

function cnReplaceVars(text){
  if(!cnActiveDog())return text;
  const km=Math.floor(Math.random()*7)+1;
  return text.replace(/\[DOG\]/g,esc(cnActiveDog().name)).replace(/\[KM\]/g,km);
}

function cnApplyEventAuto(ev,rs){
  if(ev.bondMod)rs.bondDelta=(rs.bondDelta||0)+ev.bondMod;
  if(ev.energyBonus)rs.energyBonus=(rs.energyBonus||0)+ev.energyBonus;
  if(ev.speedBonus)rs.speedBonus=(rs.speedBonus||0)+(typeof ev.speedBonus==='number'?ev.speedBonus:3);
  if(ev.mentalMod)bumpStat(G.runner,'mental',(ev.mentalMod||0));
  if(ev.hydBonus)rs.runnerEnergy=Math.min(100,(rs.runnerEnergy||100)+(ev.hydBonus||0));
  if(ev.timeLoss)rs.timePenalty=(rs.timePenalty||0)+ev.timeLoss;
}

function cnCheckBirthday(){
  const d=cnActiveDog();if(!d)return;
  const key='s'+G.cnSeason;
  if(!G.cnBirthdayToastShown)G.cnBirthdayToastShown={};
  if(G.cnBirthdayToastShown[key])return;
  const age=G.cnSeason-(d.birthSeason||1);
  if(age>0){
    G.cnBirthdayToastShown[key]=true;
    d.bond=Math.min(100,(d.bond||0)+3);
    d.peakBond=Math.max(d.peakBond||0,d.bond);
    setTimeout(()=>showToast('🎂 ¡Cumpleaños de '+esc(d.name)+'! '+age+' año'+(age>1?'s':'')+' juntos · +3 vínculo'),350);
  }
}


const CN_CATEGORIES=[
  {id:'junior',  label:'Junior',      min:0,  max:19},
  {id:'senior',  label:'Senior',      min:20, max:39},
  {id:'vetA',    label:'Veterano A',  min:40, max:49},
  {id:'vetB',    label:'Veterano B',  min:50, max:59},
  {id:'vetC',    label:'Veterano C',  min:60, max:99},
];

function cnGetCategory(age){
  // T120 (v92): una edad negativa no casaba con ninguna categoría y caía en el
  // fallback, que es la categoría del medio. Ahora una edad inválida da la
  // primera categoría, que es la que de verdad le corresponde.
  const a=Number.isFinite(age)?Math.max(0,age):0;
  return CN_CATEGORIES.find(c=>a>=c.min&&a<=c.max)||CN_CATEGORIES[1];
}

// ── TEMPERATURA, CLIMA Y SALUD COTIDIANA (rediseño, paso 5 · § 4.6 y § 4.8) ─────
function cnWinterRoll(){const x=Math.random();G.cnSeasonWinter=x<0.3?'frio':x<0.75?'normal':'suave';}
function cnComfort(d){
  const c=CN_COMFORT[d&&d.breed]||CN_COMFORT.mestizo,sh=cnHasTrait(d,'friolero')?4:0;
  return {min:c.min+sh,max:c.max+sh,heat:c.heat,cold:c.cold};
}
function cnTempDev(d,temp){const c=cnComfort(d);return Math.max(0,temp-c.max,c.min-temp);}
// Multiplicador de tiempo por calor o frío fuera del confort de la raza
function cnTempPen(d,temp){const c=cnComfort(d);return (Math.max(0,temp-c.max)*c.heat+Math.max(0,c.min-temp)*c.cold)*0.015;}
// El tiempo cambia durante la carrera: la lluvia baja 2 °C y, un tramo después, convierte la
// tierra y la hierba en barro; la nieve cubre todo.
function cnRainFrom(rs){return (rs.weatherTimeline||[]).findIndex(w=>w==='lluvia');}
function cnSegTemp(rs,i){const rf=cnRainFrom(rs);return Math.round((rs.tempReal!=null?rs.tempReal:8)-(rf>=0&&i>=rf?2:0));}
function cnSegSurface(rs,i){
  const seg=(rs.segs||[])[i]||{};const w=(rs.weatherTimeline||[])[i];
  if(w==='nieve')return 'nieve';
  const rf=cnRainFrom(rs);
  if(rf>=0&&i>rf&&(seg.surface==='tierra'||seg.surface==='hierba'))return 'barro';
  return seg.surface;
}
function cnWeatherTimeline(n,temp){
  const tl=Array(n).fill('seco');const x=Math.random();
  if(temp<=1&&x<0.35){const k=Math.floor(Math.random()*n);for(let i=k;i<n;i++)tl[i]='nieve';}
  else if(x<0.30){const k=Math.floor(Math.random()*n);for(let i=k;i<n;i++)tl[i]='lluvia';}
  return tl;
}
// Carreras de la temporada ya resueltas: corridas, suspendidas o no corridas.
function cnDoneIds(){
  return [...(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).map(r=>r.raceId),
          ...(G.cnCancelledRaces||[]).filter(r=>r.season===G.cnSeason).map(r=>r.raceId)];
}
function cnCancelled(raceId){return (G.cnCancelledRaces||[]).find(r=>r.raceId===raceId&&r.season===G.cnSeason)||null;}
function cnConditionDef(d){return d&&d.condition?CN_CONDITIONS.find(c=>c.id===d.condition.id)||null:null;}
function cnGiveCondition(d,severity){
  const pool=CN_CONDITIONS.filter(c=>!c.onlyFemale||d.sex==='hembra');
  const c=pool[Math.floor(Math.random()*pool.length)];
  d.condition={id:c.id,daysLeft:c.days[0]+Math.floor(Math.random()*(c.days[1]-c.days[0]+1)),severity:severity||1+Math.floor(Math.random()*2)};
  if(c.mood)d.mood=Math.max(0,cnMood(d.mood)+c.mood);
  return c;
}
function cnTickCondition(d,days){
  if(!d||!d.condition)return;
  d.condition.daysLeft-=days;
  if(d.condition.daysLeft<=0)d.condition=null;
}
// Cada mes puede aparecer algo: más con fatiga, poca salud o invierno frío.
function cnMonthlyCondition(){
  const d=cnActiveDog();if(!d||d.condition||d.retired)return;
  const p=0.08+(Number(d.fatigue)||0)*0.002+((d.health||100)<70?0.05:0)+(G.cnSeasonWinter==='frio'?0.03:0);
  if(Math.random()<p)cnGiveCondition(d);
}

// ── CONDUCTA (rediseño, paso 4 · § 4.1-4.4) ──────────────────────────────
// El estado del perro (ánimo, fatiga, temperamento) no se enseña nunca como número: sale una
// frase de CN_BEHAVIOURS cuyas causas casan con el estado y el contexto, y esa frase dice
// qué intención «pide» el perro. El jugador aprende a leerla; el cuaderno lo apunta.
function cnCauseOk(c,ctx){
  const cmp=(v,expr)=>{const m=/^([<>])(-?\d+)$/.exec(String(expr));if(!m)return true;return m[1]==='>'?v>Number(m[2]):v<Number(m[2]);};
  for(const [k,v] of Object.entries(c)){
    if(k==='wants')continue;
    if(k==='mood'||k==='fatigue'||k==='temp'||k==='tier'){if(!cmp(ctx[k],v))return false;}
    else if(k==='temperament'){if(!ctx.temperament.includes(v))return false;}
    else if(k==='terrain'||k==='surface'){if(ctx[k]!==v)return false;}
    else if(!!ctx[k]!==!!v)return false;
  }
  return true;
}
function cnBehaviourCtx(rs,when){
  const d=cnActiveDog()||{};
  const seg=when==='seg'?(rs.segs||[])[rs.currentSeg]||{}:{};
  const def=CANICROSS_RACES.find(x=>x.id===rs.raceId)||{};
  const myT=(rs.time||0)+(rs.timePenalty||0);
  const rivalNear=when==='seg'&&rs.currentSeg>0&&(rs.rivals||[]).some(r=>Math.abs(cnRivalTime(r,rs.currentSeg)-myT)<15);
  const temperament=Array.isArray(d.temperament)?d.temperament:[];
  return {mood:cnMood(rs.mood!=null?rs.mood:d.mood),fatigue:(Number(d.fatigue)||0)+(rs.fatigueGained||0),
    temp:rs.tempReal!=null?cnSegTemp(rs,rs.currentSeg||0):(def.tempBase!=null?def.tempBase:8),tier:rs.tier||1,temperament,terrain:seg.type,
    surface:when==='seg'?cnSegSurface(rs,rs.currentSeg):seg.surface,
    // estoico: oculta el dolor, sus conductas de lesión salen la mitad de las veces
    injury:!!(d.injury||rs.injuryPending||(d.condition&&d.condition.id==='almohadilla'))&&!(temperament.includes('estoico')&&Math.random()<0.5),
    rivalNear,mismatch:!!rs.lastMismatch,aid:!!seg.aid};
}
function cnPickBehaviour(rs,when){
  const ctx=cnBehaviourCtx(rs,when);
  const cands=[];
  CN_BEHAVIOURS.filter(b=>b.when===when||b.when==='both').forEach(b=>{
    const c=(b.causes||[]).find(c=>cnCauseOk(c,ctx));
    if(c)cands.push({id:b.id,wants:c.wants||b.wants,distraction:!!b.distraction});
  });
  // olfateador: las distracciones salen el doble
  const pool=cands.flatMap(c=>c.distraction&&ctx.temperament.includes('olfateador')?[c,c]:[c]);
  const pick=pool.length?pool[Math.floor(Math.random()*pool.length)]
    :{id:when==='pre'?'pre_tranquilo':'clavado',wants:'mantener',distraction:false};
  return {...pick,temp:ctx.temp,terrain:ctx.terrain||null};
}
function cnBehaviourText(id){
  const b=CN_BEHAVIOURS.find(x=>x.id===id);
  return b?cnReplaceVars(b.text):'';
}
// Cuaderno (§ 4.3): cada conducta vista se apunta con su contexto y, si lo hay, qué hiciste y
// cómo salió. La pantalla del cuaderno llega en el paso 7; los datos se guardan desde ya.
function cnNoteSeen(beh){
  if(!beh||!beh.id)return;
  if(!G.cnNotebook||typeof G.cnNotebook!=='object')G.cnNotebook={};
  const n=G.cnNotebook[beh.id]||(G.cnNotebook[beh.id]={seen:0,ctx:[],out:[],note:''});
  n.seen++;
  n.ctx.push({temp:beh.temp,terrain:beh.terrain,season:G.cnSeason||1});
  if(n.ctx.length>20)n.ctx.shift();
}
function cnNoteOutcome(beh,chose,good){
  const n=G.cnNotebook&&beh&&G.cnNotebook[beh.id];if(!n)return;
  n.out.push({chose,result:good?'good':'bad'});
  if(n.out.length>20)n.out.shift();
}

// ── NIVEL DE EQUIPO Y RIVALES (rediseño, paso 3 · § 4.7, § 5.1-5.3) ──────────
// Antes el tier no hacía la carrera más difícil: basePace salía en mi tiempo y en el del
// rival y se cancelaba, y la habilidad del rival era la misma en los cuatro tiers (§ 2.2).
// Ahora hay UNA escala de nivel 0-100 para el jugador y para los rivales, y el tiempo sale
// del trazado (refPace) dividido por cnPerfFactor(nivel), que no satura.
function cnPerfFactor(level){return 0.70+0.0075*level;}
function cnAgeCurve(age){
  const a=Number(age)||1;
  return a<=1?0.80:a===2?0.92:a<=5?1.00:a===6?0.95:a===7?0.88:a===8?0.78:a===9?0.66:0.52;
}
// Techo blando del perro: cuanto más alto, menos rinde entrenar (como statCapMult del corredor).
// Desde 97 ya no sube (el máximo de los rivales): un perro no llega a 100 (test 4 de § 10).
function cnDogCapMult(v){return v<60?1.00:v<75?0.65:v<85?0.35:v<92?0.18:v<97?0.07:0;}
// Ganancia entera con el techo aplicado: la parte decimal se gana por sorteo, con la misma
// media, para que las stats del perro sigan siendo números enteros.
function cnDogGain(v,g){
  const x=(g||0)*(g>0?cnDogCapMult(v):1);
  const f=Math.floor(x);
  return f+(Math.random()<x-f?1:0);
}
function cnDogPerf(d){
  const speed=d.speed||0,stamina=d.stamina||0;   // paso 6: la equipación cuenta por tramo, no aquí
  const healM=0.70+0.003*Math.max(0,Math.min(100,d.health==null?100:d.health));
  const forced=G.cnRaceState&&G.cnRaceState.forced&&!G.cnRaceState.done;
  const condM=d.condition&&d.condition.severity&&!forced?(1-0.06*d.condition.severity):1;
  const cdef=forced?null:cnConditionDef(d);
  if(cdef&&cdef.stamina)return ((speed*0.60+(stamina+cdef.stamina)*0.40))*cnAgeCurve(d.age)*healM*condM;
  return (speed*0.60+stamina*0.40)*cnAgeCurve(d.age)*healM*condM;
}
// Frescura del corredor: en carrera baja con la energía (0,75 … 1); fuera de carrera, 1.
function cnRunnerFreshness(){
  const rs=G.cnRaceState;
  if(!rs||rs.done||rs.runnerEnergy==null)return 1;
  return 0.75+0.25*Math.max(0,Math.min(100,rs.runnerEnergy))/100;
}
function cnRunnerPerf(){
  const st=(G.runner&&G.runner.stats)||{};
  const base=(st.resistencia||0)*0.40+(st.velocidad||0)*0.30+(st.subida||0)*0.15+(st.bajada||0)*0.15;
  return base*cnRunnerFreshness();
}
function cnTeamLevel(){
  const d=cnActiveDog();
  if(!d)return 0;
  return Math.max(0,Math.min(100,cnDogPerf(d)*0.55+cnRunnerPerf()*0.45));
}
// Tiempo de un tramo con un nivel y un multiplicador de ritmo dados: el mismo cálculo para
// el jugador y para los rivales.
function cnSegTime(race,seg,level,mult){
  const ref=race.refPace||240;
  return ref*(seg.km||0)*(mult||1)*(CN_TERRAIN_MULT[seg.type]||1)*(CN_SURFACE_MULT[seg.surface]||1)/cnPerfFactor(level);
}

// Rivales persistentes. Los 22 de CN_RIVAL_TEAMS van a todas las carreras de sus tiers; el
// resto del campo son equipos de relleno, también persistentes y atados a un tier
// (id «f<tier>_<n>»), con nombre, edad y nivel fijos (B2: la edad ya no cambia por carrera).
const CN_FILL_HUMANS=['Elena','Carlos','Ana','Javi','Laura','Pedro','Marta','Iñaki','Sara','Pol','Eva','Tomás',
  'Noa','Rubén','Lidia','Diego','Claudia','Andrei','Miriam','Sergio','Verónica','Pau','Sofía','Alberto'];
const CN_FILL_DOGS=['Nala','Thor','Kira','Bolt','Max','Zara','Rex','Txuri','Nina','Ares','Lola','Figo',
  'Coco','Draco','Hera','Rayo','Boss','Cuco','Nyx','Llamp','Koda','Zeus','Mika','Duna'];
function cnRandNormal(){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
function cnRival(id,tier){
  if(!G.cnRivals||typeof G.cnRivals!=='object')G.cnRivals={};
  if(G.cnRivals[id])return G.cnRivals[id];
  const team=CN_RIVAL_TEAMS.find(t=>t.id===id);
  let st;
  if(team){
    st={name:team.human+' · '+team.dog,human:team.human,dog:team.dog,level:team.level,style:team.style,age:team.age,dogAge:team.dogAge,tier:Math.min(...team.tiers)};
  }else{
    const T=CN_TIER_LEVELS[tier]||CN_TIER_LEVELS[1];
    const n=Number(String(id).split('_')[1])||0;
    const human=CN_FILL_HUMANS[(n+tier*7)%CN_FILL_HUMANS.length],dog=CN_FILL_DOGS[(n*5+tier*3)%CN_FILL_DOGS.length];
    const level=Math.round(Math.max(T.min,Math.min(T.max,T.mean+T.sd*cnRandNormal())));
    st={name:human+' · '+dog,human,dog,level,style:['salidor','remontador','tecnico','regular'][(n+tier)%4],
      age:20+Math.floor(Math.random()*36),dogAge:1+Math.floor(Math.random()*7),tier};
  }
  G.cnRivals[id]=st;
  return st;
}
// Desplazamiento de nivel de la temporada por tier (±4): hay temporadas con un campo más duro.
function cnSeasonShift(tier){
  if(!G.cnSeasonShift||typeof G.cnSeasonShift!=='object')G.cnSeasonShift={};
  if(G.cnSeasonShift[tier]==null)G.cnSeasonShift[tier]=Math.round((Math.random()*2-1)*4);
  return G.cnSeasonShift[tier];
}
function cnStyleMult(style,si,n,type){
  if(style==='salidor')return si<2?0.96:si===n-1?1.06:1;
  if(style==='remontador')return si<2?1.04:si>=n-2?0.96:1;
  if(style==='tecnico')return type==='descent'?0.94:type==='flat'?1.04:1;
  return 1;
}
const CN_RIVAL_PUSH=0.92;   // los rivales corren como «Apretar»: «Ritmo conjunto» a igual nivel pierde
function cnGenerateRivals(race){
  const tier=race.tier||1,T=CN_TIER_LEVELS[tier]||CN_TIER_LEVELS[1];
  const def=CANICROSS_RACES.find(r=>r.id===race.id)||race;
  const segs=def.segs||[];
  const named=[...CN_RIVAL_TEAMS.filter(t=>t.tiers.includes(tier)).map(t=>t.id),
    ...Object.keys(G.cnRivals||{}).filter(id=>G.cnRivals[id].exDog&&(G.cnRivals[id].tiers||[]).includes(tier))];   // paso 7
  const want=T.n[0]+Math.floor(Math.random()*(T.n[1]-T.n[0]+1));
  const fillers=shuffle(Array.from({length:Math.max(0,T.n[1]-named.length)},(_,k)=>'f'+tier+'_'+k)).slice(0,Math.max(0,want-named.length));
  const shift=cnSeasonShift(tier);
  // 12 %: un equipo atípico, muy por encima de la media del tier, solo en esta carrera
  const atipico=Math.random()<0.12&&fillers.length?fillers[0]:null;
  return [...named,...fillers].map(id=>{
    const st=cnRival(id,tier);
    const level=Math.max(0,Math.min(100,st.level+shift+(id===atipico?Math.max(0,T.mean+12-st.level):0)));
    const splits=segs.map((sg,si)=>Math.round(cnSegTime(def,sg,level,CN_RIVAL_PUSH*cnStyleMult(st.style,si,segs.length,sg.type))*(0.97+Math.random()*0.06)));
    // Incidentes (patrón de planRivalIncidents de race.js): revienta, problema con el perro o abandona
    let incident=null;
    if(segs.length&&Math.random()<0.08){
      const seg=Math.floor(Math.random()*segs.length),k=Math.random();
      incident=k<0.4?{seg,type:'revienta',loss:90+Math.floor(Math.random()*110)}
              :k<0.8?{seg,type:'perro',loss:40+Math.floor(Math.random()*80)}
              :{seg,type:'abandona',loss:0};
    }
    return {id,name:st.name,level:Math.round(level),style:st.style,age:st.age,splits,incident,exDog:!!st.exDog};
  });
}
// Tiempo de un rival tras `upTo` tramos (todos si se omite); Infinity si ha abandonado antes.
function cnRivalTime(r,upTo){
  const n=upTo==null?(r.splits||[]).length:upTo;
  if(r.incident&&r.incident.type==='abandona'&&r.incident.seg<n)return Infinity;
  let t=0;for(let i=0;i<n;i++)t+=(r.splits||[])[i]||0;
  if(r.incident&&r.incident.type!=='abandona'&&r.incident.seg<n)t+=r.incident.loss;
  return t;
}
// Némesis: el equipo con el que más veces has llegado a menos de 30 s (al menos dos).
function cnNemesisId(){
  let best=null,max=1;
  Object.entries(G.cnNemesis||{}).forEach(([id,c])=>{if(c>max){max=c;best=id;}});
  return best;
}
// Entre temporadas los rivales cumplen años y su perro también: el nivel sigue la edad del
// perro y, cuando le toca retirarse, el equipo vuelve con uno nuevo, más joven y peor.
function cnAgeRivals(){
  Object.values(G.cnRivals||{}).forEach(st=>{
    st.age=(st.age||30)+1;st.dogAge=(st.dogAge||3)+1;
    const delta=st.dogAge<=3?3:st.dogAge<=5?0:st.dogAge<=7?-3:-6;
    st.level=Math.max(5,Math.min(97,(st.level||40)+delta));
    if(st.dogAge>=10){
      const dog=CN_FILL_DOGS[Math.floor(Math.random()*CN_FILL_DOGS.length)];
      st.dog=dog;st.name=st.human+' · '+dog;st.dogAge=2;st.level=Math.max(5,st.level-8);st.newDog=true;
    }else st.newDog=false;
  });
  G.cnSeasonShift={};
}

// ── RACE FINISH ───────────────────────────────────────
function cnFinishRace(){
  const rs=G.cnRaceState;if(!rs)return;
  const d=cnActiveDog();if(!d)return;
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx]||{};
  // Modo desarrollador — "modo dios": fuerza victoria en cualquier carrera de
  // Canicross. Ver js/devmode.js. No afecta a partidas normales.
  if(window.devGod?.('cn')&&rs.rivals&&rs.rivals.length){
    rs.timePenalty=0;
    rs.time=Math.max(1,Math.min(...rs.rivals.map(r=>cnRivalTime(r)).filter(Number.isFinite))-60);
  }

  // Paso 4 (§ 4.4) · B1: la fatiga de la carrera vuelve al perro y le cuesta salud. Antes
  // rs.dogHealth se calculaba tramo a tramo y se tiraba al acabar.
  d.fatigue=Math.max(0,Math.min(100,(Number(d.fatigue)||0)+(rs.fatigueGained||0)-(rs.pack&&rs.pack.recovery?25:0)));
  d.health=Math.max(0,Math.min(100,(d.health==null?100:d.health)-Math.round((rs.fatigueGained||0)*0.12)));
  const totalBond=rs.bondDelta||0;
  const prevBond=d.bond||0;
  d.bond=Math.max(0,Math.min(100,d.bond+totalBond));
  d.peakBond=Math.max(d.peakBond||0,d.bond);
  // Bond recovery tracking
  if(prevBond<30)G._cnBondMinReached=true;
  if(G._cnBondMinReached&&d.bond>70)G._cnBondRecovered=true;

  let totalTime=Math.round((rs.time||0)+(rs.timePenalty||0));
  const rivals=rs.rivals||[];
  const pos=Math.max(1,rivals.filter(r=>cnRivalTime(r)<totalTime).length+1);
  const myAge=G.runner.age||28;
  const myCat=cnGetCategory(myAge);
  const catRivals=rivals.filter(r=>cnGetCategory(r.age||30).id===myCat.id);
  const catPos=Math.max(1,catRivals.filter(r=>cnRivalTime(r)<totalTime).length+1);
  // Némesis (§ 4.7): quien llega a menos de 30 s de ti suma; el que más veces, lo es.
  if(!rs.retired){
    if(!G.cnNemesis||typeof G.cnNemesis!=='object')G.cnNemesis={};
    rivals.forEach(r=>{const t=cnRivalTime(r);if(Number.isFinite(t)&&Math.abs(t-totalTime)<30)G.cnNemesis[r.id]=(G.cnNemesis[r.id]||0)+1;});
  }

  // T07 (v82): race es `||{}` en la línea 235, así que race.prize puede ser
  // undefined. Sin el ||0, una 1.ª posición con la carrera fuera de rango metía
  // undefined en cnMoney y todos los importes del modo pasaban a NaN para
  // siempre. race.cost sí lo llevaba (línea 272): aquí se había olvidado.
  const rPrize=race.prize||0;
  const prize=rs.retired?0:(pos===1?rPrize:pos===2?Math.round(rPrize*0.6):pos===3?Math.round(rPrize*0.4):0);

  // Paso 5: correr con una almohadilla agrietada tiene riesgo alto; si la forzaste, la lesión
  // es un nivel peor. Salir con algo encima puede empeorarlo.
  if(!rs.injuryPending&&d.condition&&d.condition.id==='almohadilla'&&Math.random()<0.4)rs.injuryPending='almohadillas';
  // Paso 6: nieve o piedra sin escarpines, riesgo real de almohadillas
  if(!rs.injuryPending&&!(rs.pack&&rs.pack.booties)&&(rs.segs||[]).some((sg,i)=>['nieve','piedra'].includes(cnSegSurface(rs,i)))&&Math.random()<0.15)rs.injuryPending='almohadillas';
  if(rs.injuryPending&&rs.forced&&rs.injuryPending==='almohadillas')rs.injuryPending='luxacion';
  if(d.condition&&!rs.forced&&Math.random()<0.4){d.condition.severity=Math.min(3,d.condition.severity+1);d.condition.daysLeft+=3;}
  if(rs.injuryPending){
    d.injury=rs.injuryPending;
    d.injuryRaces=rs.injuryPending==='luxacion'?2:1;
    // CR-35 (v74): era Math.max(20,...) — con salud ya por debajo de 20
    // (perro descuidado) esto SUBÍA la salud en vez de bajarla. Floor a 0,
    // igual que el resto de restas de salud del archivo.
    d.health=Math.max(0,(d.health||100)-20);
  }
  // T118 (v92): la inscripción se cobraba DENTRO del if(!rs.retired), así que
  // retirarse salía gratis — y hasta compensaba si la carrera iba mal. Si has
  // tomado la salida, la inscripción está pagada, termines o no. La versión que
  // pedía la ficha (cobrar al inscribirse en el calendario) hace falta también
  // para las carreras a las que te apuntas y no corres, pero eso necesita una
  // vía de devolución al desapuntarse y es otra tarea.
  G.cnMoney=(G.cnMoney||0)-(race.cost||0);   // paso 6: sin suelo
  if(!rs.retired){
    d.races=(d.races||0)+1;
    d.kmTogether=(d.kmTogether||0)+(race.km||0);
    G.cnMoney=(G.cnMoney||0)+prize;
    addFollowers(Math.round((pos<=3?150:pos<=10?80:30)*(race.tier||1)));
  }

  // Last place tracking
  if(!rs.retired&&pos>=rivals.length+1)G._cnLastPlaceCount=(G._cnLastPlaceCount||0)+1;
  // Dog DNF tracking
  if(rs.retired&&rs.injuryPending)G._cnDogDnfCount=(G._cnDogDnfCount||0)+1;
  // Injury comeback tracking
  if(!rs.retired&&pos===1&&G._cnHadInjuryLastRace)G._cnInjuryComeback=true;
  G._cnHadInjuryLastRace=!!(rs.injuryPending);
  if(!G.cnRaceResults)G.cnRaceResults=[];
  G.cnRaceResults.push({
    raceId:race.id,raceName:race.name,season:G.cnSeason||1,
    pos:rs.retired?null:pos,time:totalTime,dnf:!!rs.retired,dnfReason:rs.retired?'abandono':null, // T45 (v89): esta era ya la forma buena; solo se le añade el motivo
    bondDelta:totalBond,prize,km:race.km||0,tier:race.tier||1,
    catPos,temp:rs.tempReal,minSync:rs.minSync==null?Math.round(rs.sync||0):rs.minSync,   // paso 7
  });
  if(!rs.retired){
    if(pos===1&&rs.couldForce&&!rs.forced)G.cnWinNoForce=(G.cnWinNoForce||0)+1;
    // Un perro tuyo, con otro, en el podio contra ti
    const orden=[{me:true,t:totalTime},...rivals.map(r=>({r,t:cnRivalTime(r)}))].filter(x=>Number.isFinite(x.t)).sort((a,b)=>a.t-b.t);
    if(orden.slice(0,3).some(x=>x.r&&x.r.exDog))G.cnExDogPodium=(G.cnExDogPodium||0)+1;
    // Circuito (§ 4.12): las carreras de tier 2+ puntúan 25·18·15·12·10·8·6·4·2·1
    if((race.tier||1)>=2){
      if(!G.cnCircuitTable||typeof G.cnCircuitTable!=='object')G.cnCircuitTable={};
      orden.slice(0,CN_CIRCUIT_POINTS.length).forEach((x,i)=>{
        if(x.me)G.cnCircuitPoints=(G.cnCircuitPoints||0)+CN_CIRCUIT_POINTS[i];
        else G.cnCircuitTable[x.r.id]=(G.cnCircuitTable[x.r.id]||0)+CN_CIRCUIT_POINTS[i];
      });
    }
  }

  rs.finalPos=pos;rs.finalCatPos=catPos;rs.finalCatTotal=catRivals.length+1;rs.finalCat=myCat.label;rs.finalTime=totalTime;rs.finalPrize=prize;rs.done=true;
  checkAndUnlockAchievements();
  autoSave();
  G.screen='canicrossPostRace';
  render();
}

// ── INIT FLOW ─────────────────────────────────────────
window.doStartCanicross=()=>{
  const nm=document.getElementById('rname');if(nm)G.runner.name=nm.value;
  const rn=document.getElementById('runname');if(rn)G.runName=rn.value;
  if(!(G.runner.name||'').trim())G.runner.name='Corredor';
  G.runner.stats=applyAgeToStats({...SPEC_STATS[G.runner.specialty]},G.runner.age||25);
  G.canicrossMode=true;
  G.gameMode='canicross';
  // v96: aquí se ponía _saveSlot=0 si no había ranura, y el primer autoguardado pisaba la
  // ranura 1 sin avisar. Sin ranura no se autoguarda, como en los demás modos.
  G.cnMoney=500;G.cnSeason=1;
  G.cnSelectedRaces=[];G.cnCurrentRaceIdx=0;G.cnRaceResults=[];
  G.cnMonthIdx=0;G.cnOpenMonths=[];G.cnOpenSeasonMonths=[...CN_MONTHS];
  const f=freshState();   // paso 6: horas, equipación y consumibles de inicio
  ['cnHoursTotal','cnHoursPlan','cnHoursCmd','cnOwned','cnEquipped','cnConsumables','cnMinCare','cnBrokeSeason'].forEach(k=>{G[k]=f[k];});
  G.cnVetHistory=[];G.cnBirthdayToastShown={};G.cnRaceState=null;
  G.dogs=[];G.activeDogId=null;G.cnNextDogId=1;G.cnRev=CN_REV;G.cnRivals={};G.cnNemesis={};G.cnSeasonShift={};G.cnNotebook={};G.cnCancelledRaces=[];cnWinterRoll();G._cnDogBreed=null;G._cnDogName=null;
  G.screen='canicrossCreateDog';
  render();
};

window.doCreateDog=()=>{
  const nm=document.getElementById('dogname');
  const name=(nm?nm.value:'').trim();
  if(!name){showToast('Ponle nombre al perro primero');return;}
  if(!G._cnDogBreed){showToast('Elige una raza');return;}
  if(!G._cnAdoptionOrigin){showToast('Elige cómo llegó el perro a ti');return;}
  const prev=cnActiveDog();
  cnAddDog(cnInitDog(name,G._cnDogBreed));
  // Paso 7 (§ 4.3): al cambiar de perro, lo aprendido de la raza se queda; lo del
  // temperamento se olvida, pero tu nota se conserva, marcada con el nombre del anterior.
  if(prev&&G.cnNotebook){
    CN_BEHAVIOURS.filter(b=>(b.causes||[]).some(c=>c.temperament)).forEach(b=>{
      const n=G.cnNotebook[b.id];if(!n)return;
      n.seen=0;n.ctx=[];n.out=[];if(n.note&&!n.about)n.about=prev.name;
    });
  }
  // Apply adoption origin bond
  const origin=CN_ADOPTION_ORIGINS.find(o=>o.id===G._cnAdoptionOrigin);
  if(origin){
    cnActiveDog().bond=origin.bondStart;
    cnActiveDog().peakBond=origin.bondStart;
    cnActiveDog().adoptionOrigin=G._cnAdoptionOrigin;
    if(G._cnAdoptionOrigin==='retirado'){cnActiveDog().commands.forward=1;cnActiveDog().cmdHours.forward=CN_CMD_LEVEL_HOURS[0];}
  }
  G.cnPreseasonDone=[];
  G._cnDogBreed=null;G._cnDogName=null;G._cnAdoptionOrigin=null;
  G.activeTab='game';G.screen='canicrossPreseason';
  autoSave();
  showToast('¡'+esc(cnActiveDog().name)+' se une a tu equipo! 🐕');
  render();
};

window.cnSelectBreed=breed=>{G._cnDogBreed=breed;const nm=document.getElementById('dogname');if(nm)G._cnDogName=nm.value;render();};



window.cnToggleSeasonMonth=m=>{
  if(!G.cnOpenSeasonMonths)G.cnOpenSeasonMonths=[];
  const i=G.cnOpenSeasonMonths.indexOf(m);
  if(i>=0)G.cnOpenSeasonMonths.splice(i,1);else G.cnOpenSeasonMonths.push(m);
  render();
};

window.cnToggleMonth=m=>{
  if(!G.cnOpenMonths)G.cnOpenMonths=[];
  const i=G.cnOpenMonths.indexOf(m);
  if(i>=0)G.cnOpenMonths.splice(i,1);else G.cnOpenMonths.push(m);
  render();
};




// ── EL MES: REPARTO DE HORAS (rediseño, paso 6 · § 4.9) ─────────────────────
// Sustituye a los bloques de entreno, a las vacaciones y a «Avanzar» por semanas. Cada mes
// repartes G.cnHoursTotal horas entre tú solo, el perro solo, los dos juntos y descansar; las
// horas del perro y de juntos van a un comando que eliges (niveles a 10, 25 y 50 h).
function cnHoursUsed(){const p=G.cnHoursPlan||{};return ['solo','perro','juntos','descanso'].reduce((a,k)=>a+(Number(p[k])||0),0);}
window.cnSetHours=(k,delta)=>{
  if(!['solo','perro','juntos','descanso'].includes(k))return;
  if(!G.cnHoursPlan||typeof G.cnHoursPlan!=='object')G.cnHoursPlan={solo:0,perro:0,juntos:0,descanso:0};
  const total=Number(G.cnHoursTotal)||CN_HOURS_TOTAL;
  const cur=Number(G.cnHoursPlan[k])||0;
  // §10.6: la suma nunca pasa del total
  G.cnHoursPlan[k]=Math.max(0,Math.min(cur+delta,cur+(total-cnHoursUsed())));
  render();
};
window.cnSetHoursCmd=id=>{if(CN_COMMANDS.some(c=>c.id===id)){G.cnHoursCmd=id;render();}};
function cnCmdLevel(h){return CN_CMD_LEVEL_HOURS.filter(x=>h>=x).length;}
function cnApplyMonthHours(){
  const d=cnActiveDog();const p=G.cnHoursPlan||{};const R=CN_HOURS_RATES;
  const h={solo:Number(p.solo)||0,perro:Number(p.perro)||0,juntos:Number(p.juntos)||0,descanso:Number(p.descanso)||0};
  const st=G.runner&&G.runner.stats;
  const bump=(k,v)=>{if(st&&st[k]!==undefined&&v)st[k]=Math.max(10,Math.min(100,Math.round(st[k]+v*statCapMult(st[k]))));};
  bump('resistencia',h.solo*R.solo.resistencia+h.juntos*R.juntos.resistencia);
  bump('velocidad',h.solo*R.solo.velocidad);
  bump('subida',h.solo*R.solo.subida);bump('bajada',h.solo*R.solo.bajada);
  if(!d)return;
  d.speed=Math.max(0,Math.min(100,(d.speed||50)+cnDogGain(d.speed||50,h.perro*R.perro.speed+h.juntos*R.juntos.speed)));
  d.stamina=Math.max(0,Math.min(100,(d.stamina||50)+cnDogGain(d.stamina||50,h.perro*R.perro.stamina)));
  // Comando elegido: horas del perro ×1, juntos ×1,5; un veterano en casa enseña (+25 %)
  const cmd=CN_COMMANDS.some(c=>c.id===G.cnHoursCmd)?G.cnHoursCmd:'forward';
  if(!d.cmdHours)d.cmdHours={};
  const antes=Number((d.commands||{})[cmd])||0;
  d.cmdHours[cmd]=(Number(d.cmdHours[cmd])||0)+(h.perro*R.perro.cmd+h.juntos*R.juntos.cmd)*(cnHomeDogs().length?1.25:1);
  const lv=Math.min(3,cnCmdLevel(d.cmdHours[cmd]));
  if(!d.commands)d.commands={};
  d.commands[cmd]=Math.max(antes,lv);
  if(d.commands[cmd]>antes)setTimeout(()=>showToast(antes===0?'¡'+esc(d.name)+' aprende «'+cnCommandLabel(cmd)+'»! ✅':esc(d.name)+' domina mejor «'+cnCommandLabel(cmd)+'» (nivel '+d.commands[cmd]+')'),60);
  // Vínculo: lo quita entrenar solo y lo dan las horas juntos y el descanso
  let bond=h.solo*R.solo.bond+h.juntos*R.juntos.bond+h.descanso*R.descanso.bond;
  if(cnHasTrait(d,'pegajoso')&&bond>0)bond*=1.3;
  // Dejar al perro solo tiene precio: menos de 8 h juntos o descansando en el mes
  if(h.juntos+h.descanso<8)bond-=cnHasTrait(d,'pegajoso')?4:2;
  d.bond=Math.max(0,Math.min(100,Math.round((d.bond||0)+bond)));
  d.peakBond=Math.max(d.peakBond||0,d.bond);
  // Fatiga, ánimo, salud y la sincronía de base
  d.fatigue=Math.max(0,Math.min(100,Math.round((Number(d.fatigue)||0)+h.perro*R.perro.fatigue+h.juntos*R.juntos.fatigue+h.descanso*R.descanso.fatigue-10)));
  const moodTarget=45+(d.bond||0)*0.3;
  d.mood=Math.round(Math.max(0,Math.min(100,cnMood(d.mood)*0.5+moodTarget*0.5+h.descanso*R.descanso.mood+(Math.random()*2-1)*10)));
  d.health=Math.max(0,Math.min(100,Math.round((d.health==null?100:d.health)+h.descanso*R.descanso.health)));
  d.syncBase=Math.max(0,Math.min(15,Math.round(((Number(d.syncBase)||0)*0.6+h.juntos*R.juntos.sync)*10)/10));
  cnTickCondition(d,28);
}
window.cnAdvanceWeek=()=>{
  if(cnSeasonOver()){showToast('Marzo ya ha terminado: cierra la temporada');return;}
  if(cnHoursUsed()<=0){showToast('Reparte las horas del mes');G.screen='canicrossTrainingSetup';render();return;}
  const doneMonth=cnMonth();   // BUG-17 (v96): el aviso nombra el mes que termina
  cnApplyMonthHours();
  cnEndMonth();
  if(cnCheckBroke())return;
  autoSave();render();
  const sig=cnSeasonOver()?'cierra la temporada':'ahora '+CN_MONTH_NAMES[cnMonth()].toLowerCase();
  setTimeout(()=>showToast((CN_MONTH_NAMES[doneMonth]||'Mes')+' completado ✓ · '+sig),150);
};
// ── ECONOMÍA (paso 6 · § 4.11) ─────────────────────────────────────────────
function cnSponsorIncome(){return Math.min(CN_SPONSOR_CAP,CN_SPONSOR_BASE+Math.round((G.followers||0)*CN_SPONSOR_PER_FOLLOWER));}
// Por debajo de −€200 sale una vez por temporada la pantalla de estrechez. No hay game over.
function cnCheckBroke(){
  if((G.cnMoney||0)>=CN_BROKE_LINE||G.cnBrokeSeason===G.cnSeason)return false;
  G.cnBrokeSeason=G.cnSeason;G.screen='canicrossQuiebra';autoSave();render();return true;
}
window.cnBrokeChoice=opt=>{
  const done=cnDoneIds();
  if(opt==='inscripciones'){
    const quitadas=(G.cnSelectedRaces||[]).filter(r=>!done.includes(r.id)&&CN_MONTHS.indexOf(r.month)>=(Number(G.cnMonthIdx)||0));
    G.cnSelectedRaces=(G.cnSelectedRaces||[]).filter(r=>!quitadas.includes(r));
    showToast(quitadas.length?'Renuncias a '+quitadas.length+' inscripción(es)':'No quedaban inscripciones');
  }else if(opt==='vender'){
    let total=0;
    ['harness','line','belt'].forEach(cat=>{
      (G.cnOwned[cat]||[]).forEach(id=>{const it=CN_EQUIP[cat].find(x=>x.id===id);if(it&&!it.start)total+=Math.round(it.price/2);});
      G.cnOwned[cat]=CN_EQUIP[cat].filter(x=>x.start).map(x=>x.id);G.cnEquipped[cat]=G.cnOwned[cat][0];
    });
    G.cnMoney=(G.cnMoney||0)+total;
    showToast(total?'Vendes la equipación por €'+total:'No tenías equipación que vender');
  }else if(opt==='minima'){
    G.cnMinCare=true;showToast('Manutención mínima hasta fin de temporada');
  }
  G.screen='canicrossHub';G.activeTab='game';autoSave();render();
};
// ── EQUIPACIÓN Y CONSUMIBLES (paso 6 · § 4.10) ─────────────────────────────
window.cnBuyEquip=(cat,id)=>{
  const it=(CN_EQUIP[cat]||[]).find(x=>x.id===id);if(!it)return;
  if((G.cnOwned[cat]||[]).includes(id)){showToast('Ya lo tienes');return;}
  G.cnMoney=(G.cnMoney||0)-it.price;
  G.cnOwned[cat]=[...(G.cnOwned[cat]||[]),id];
  showToast(it.name+' comprado');autoSave();render();
};
window.cnSelectEquip=(cat,id)=>{
  if(!(G.cnOwned[cat]||[]).includes(id))return;
  G.cnEquipped[cat]=id;render();
};
window.cnBuyConsumable=id=>{
  const c=CN_CONSUMABLES.find(x=>x.id===id);if(!c)return;
  G.cnMoney=(G.cnMoney||0)-c.price;
  G.cnConsumables[id]=(Number(G.cnConsumables[id])||0)+1;
  autoSave();render();
};
// En la precarrera eliges qué consumibles llevas; se gastan al salir.
window.cnTogglePack=id=>{
  const rs=G.cnRaceState;if(!rs)return;
  if(!rs.pack)rs.pack={};
  if(!rs.pack[id]&&!(Number(G.cnConsumables[id])>0)){showToast('No te quedan: cómpralos en Equipo');return;}
  rs.pack[id]=!rs.pack[id];render();
};
// Lo que la equipación hace en un tramo: [tiempo, sincronía]
function cnEquipSeg(rs,seg,si,d){
  const eq=G.cnEquipped||{};const tir=cnHasTrait(d,'tirador');
  let t=1,sy=0;
  if(eq.harness==='h_xback'){if(seg.type==='flat'&&(rs.km||0)>=10)t*=0.96;if(seg.type==='descent')sy-=5;}
  if(eq.harness==='h_freemotion'){if(seg.type==='descent')sy+=6;if(seg.type==='flat')t*=1.03;}
  if(eq.line==='l_short'){if(seg.type==='flat')t*=1.03;if(si===0&&!tir)t*=1.02;}
  if(eq.line==='l_long'){if(seg.type==='flat'&&tir)t*=0.97;if(seg.type==='descent')sy-=4;}
  return [t,sy];
}
// Sincronía de salida que pone la equipación
function cnEquipStartSync(rs,d){
  const eq=G.cnEquipped||{};let sy=0;
  if(eq.belt==='b_hip')sy+=3;
  if(eq.line==='l_short'&&(rs.tier||1)>=3)sy+=5;
  if(eq.line==='l_long'&&cnHasTrait(d,'tirador'))sy-=6;
  return sy;
}

window.cnStartRace=idx=>{
  if(!cnCanRace()){
    const d=cnActiveDog();
    if(!d){showToast('Sin perro asignado');return;}
    if(d.bond<cnRaceThreshold()){showToast('Vínculo insuficiente — necesitas ≥'+cnRaceThreshold()+' para competir (actual: '+d.bond+')');return;}
    if(d.injury&&d.injuryRaces>0){showToast(esc(d.name)+' está de baja ('+d.injuryRaces+' carreras)');return;}
    showToast('El perro no puede correr ahora');return;
  }
  const race=(G.cnSelectedRaces||[])[idx];
  if(!race){showToast('Carrera no disponible');return;}
  G.cnCurrentRaceIdx=idx;
  // Achievement tracking
  if(cnActiveDog()&&cnActiveDog().bond<20)G._cnLowBondRaced=(G._cnLowBondRaced||0)+1;
  if(idx===0){
    const cmds=cnActiveDog()?.commands||{};
    if(CN_COMMANDS.every(k=>!(Number(cmds[k.id])||0)))G._cnRacedWithoutCommands=true;
    if(!(G.cnPreseasonDone||[]).length)G._cnPreseasonNothing=true;
  }
  // Paso 2: el perfil es el de la carrera (constants.js), siempre el mismo. Se busca por id
  // porque G.cnSelectedRaces guarda la copia que se hizo al elegirla.
  const def=CANICROSS_RACES.find(r=>r.id===race.id)||race;
  const segs=(def.segs||[]).map(sg=>({...sg}));
  const numSegs=segs.length;
  const basePace=def.refPace||240;   // queda por compatibilidad con la recompensa de devmode; el tiempo usa refPace
  G.cnRaceState={
    raceId:race.id,raceName:race.name,km:race.km,tier:race.tier,month:race.month,
    numSegs,segs,rivals:cnGenerateRivals(race),basePace,
    currentSeg:0,pendingEvent:null,paceChosen:false,
    time:0,bondDelta:0,energyBonus:0,speedBonus:0,timePenalty:0,
    dogHealth:cnActiveDog().health,dogBond:cnActiveDog().bond,runnerEnergy:100,
    eventLog:[],retired:false,injuryPending:null,done:false,
    // Paso 4: sincronía (la barra central), ánimo del día, fatiga ganada y la conducta.
    sync:0,mood:0,fatigueGained:0,behaviour:null,preBehaviour:null,lastMismatch:false,
  };
  {
    // Paso 5: temperatura real del día y el tiempo tramo a tramo
    const rs=G.cnRaceState;
    rs.tempReal=Math.round((def.tempBase!=null?def.tempBase:8)+(CN_WINTER_SHIFT[G.cnSeasonWinter]||0)+(Math.random()*6-3));
    rs.weatherTimeline=cnWeatherTimeline(segs.length,rs.tempReal);
  }
  {
    const rs=G.cnRaceState,dd=cnActiveDog();
    rs.mood=Math.max(0,Math.min(100,cnMood(dd.mood)+Math.round((Math.random()*2-1)*10)));
    rs.sync=Math.max(0,Math.min(100,Math.round(40+(dd.bond||0)*0.5-(cnHasTrait(dd,'miedoso')&&(race.tier||1)>=3?8:0)+(Number(dd.syncBase)||0)+cnEquipStartSync(rs,dd)+(cnHomeDogs().length?4:0))));   // paso 7: el de casa le calma
    rs.pack={};   // paso 6: consumibles que llevas (se eligen en la precarrera)
    rs.preBehaviour=cnPickBehaviour(rs,'pre');cnNoteSeen(rs.preBehaviour);
    rs.behaviour=cnPickBehaviour(rs,'seg');cnNoteSeen(rs.behaviour);
    // La mañana de la carrera (§ 4.8): por encima de 16 °C se suspende; con algo de salud
    // (o si aparece hoy, más fácil con fatiga y poca salud) toca decidir antes de salir.
    if(rs.tempReal>CN_HEAT_CANCEL){rs.morning={type:'calor'};}
    else{
      if(!dd.condition&&Math.random()<0.04+(Number(dd.fatigue)||0)*0.002+(100-(dd.health==null?100:dd.health))*0.002)cnGiveCondition(dd);
      if(dd.condition){
        // § 4.8 decía vínculo < 15, pero con menos de cnRaceThreshold() (20-30) ni se sale: el
        // perro se niega con un vínculo justo por encima del umbral, ánimo bajo y algo serio.
        rs.morning=((dd.bond||0)<cnRaceThreshold()+5&&(rs.mood||0)<25&&dd.condition.severity>=2)?{type:'negativa'}:{type:'condicion'};
      }
    }
    if(rs.morning&&rs.morning.type!=='condicion'){
      // Suspendida o el perro no se levanta: la inscripción ya está pagada y no se corre.
      G.cnMoney=(G.cnMoney||0)-(race.cost||0);
      if(!Array.isArray(G.cnCancelledRaces))G.cnCancelledRaces=[];
      G.cnCancelledRaces.push({raceId:race.id,season:G.cnSeason,why:rs.morning.type});
    }
    if(rs.morning){G.screen='canicrossRaceMorning';render();return;}
  }
  G.screen='canicrossPreRace';render();
};

window.cnGoToRace=()=>{
  // Paso 6: los consumibles elegidos se gastan al tomar la salida
  const rs=G.cnRaceState;
  if(rs&&rs.pack&&!rs.packUsed){Object.keys(rs.pack).forEach(k=>{if(rs.pack[k])G.cnConsumables[k]=Math.max(0,(Number(G.cnConsumables[k])||0)-1);});rs.packUsed=true;}
  G.screen='canicrossSegment';render();
};

window.cnNextSegment=()=>{
  const rs=G.cnRaceState;if(!rs)return;
  rs.currentSeg++;
  rs.pendingEvent=null;rs.paceChosen=false;
  if(rs.currentSeg>=rs.numSegs){cnFinishRace();return;}
  rs.behaviour=cnPickBehaviour(rs,'seg');cnNoteSeen(rs.behaviour);   // paso 4
  render();
};

window.cnMakeDecision=optIdx=>{
  const rs=G.cnRaceState;if(!rs||!rs.pendingEvent)return;
  const ev=rs.pendingEvent;
  const opt=(ev.options||[])[optIdx];if(!opt)return;
  if(opt.bondMod)rs.bondDelta=(rs.bondDelta||0)+opt.bondMod;
  if(opt.timeLoss)rs.timePenalty=(rs.timePenalty||0)+opt.timeLoss;
  if(opt.injuryRisk){
    let riskChance=0.4;
    if(rs.pack&&rs.pack.booties)riskChance=0.25;   // paso 6: los escarpines protegen las almohadillas
    if(Math.random()<riskChance)rs.injuryPending=opt.injurySevere?'luxacion':'almohadillas';
  }
  if(opt.retire)rs.retired=true;
  rs.eventLog.push({seg:rs.currentSeg,event:ev,choice:optIdx,resolved:true});
  rs.pendingEvent=null;
  if(rs.retired){cnFinishRace();}
  else if(rs.currentSeg+1>=rs.numSegs){cnFinishRace();}
  else{cnNextSegment();}
};

// ── EL DIÁLOGO (paso 4 · § 4.4) ─────────────────────────────────────────
// Sustituye a cnChoosePace(): el perro ha dicho algo (rs.behaviour), tú eliges intención y,
// si quieres, una orden. Se cruza lo que pide el perro con lo que haces.
// Probabilidad de que el perro obedezca una orden (§ 4.4).
function cnObedience(d,rs,cmd){
  const mastery=Number((d.commands||{})[cmd])||0;
  const fatigue=(Number(d.fatigue)||0)+(rs.fatigueGained||0);
  const cond=rs.forced?null:cnConditionDef(d);
  const moodPen=((cond||d.injury)?0.20:0)+(cnMood(rs.mood)<35?0.10:0)-((cond&&cond.obed)||0)
    +0.02*cnTempDev(d,cnSegTemp(rs,rs.currentSeg||0));   // paso 5: −0,02 por grado fuera de confort
  return Math.max(0.15,Math.min(0.95,0.25+(d.bond||0)*0.005+(rs.sync||0)*0.003+mastery*0.15-fatigue*0.004-moodPen-(cnHasTrait(d,'cabezota')?0.15:0)));
}
// ¿Tiene sentido la orden ahora? Las de intención validan la tuya; las de situación, su caso.
function cnCommandFits(cmd,intent,rs,seg){
  const k=CN_COMMANDS.find(x=>x.id===cmd);if(!k)return false;
  if(k.valida)return k.valida===intent;
  if(cmd==='left')return seg&&seg.type==='descent';
  if(cmd==='leaveit')return !!(rs.behaviour&&rs.behaviour.distraction);
  if(cmd==='water')return !!(seg&&seg.aid);
  return false;
}
// Tabla de resolución (§ 4.4): [sincronía, tiempo, vínculo, fatiga]
const CN_CROSS={
  coincide:[8,0.97,1,1.00], coincideOrden:[4,0.98,0,1.00],
  difiere:[-12,1.06,-2,1.15], ordenAcertada:[5,0.99,1,1.08], ordenFallida:[-10,1.08,-3,1.20],
};
window.cnDecide=(intentId,cmd)=>{
  const rs=G.cnRaceState;if(!rs||rs.paceChosen||rs.pendingEvent||rs.morning)return;
  const intent=CN_INTENTS.find(x=>x.id===intentId);if(!intent)return;
  if(cmd===undefined&&typeof document!=='undefined'&&document.querySelector){
    const el=document.querySelector('input[name="cncmd"]:checked');cmd=el?el.value:'';
  }
  const d=cnActiveDog();if(!d)return;
  cmd=cmd&&(Number((d.commands||{})[cmd])||0)>=1?cmd:'';
  const seg=rs.segs?.[rs.currentSeg]||{km:(rs.km||8)/rs.numSegs,type:'flat'};
  const beh=rs.behaviour||{wants:'mantener'};
  // Sin piernas no se sigue al perro que tira: «Apretar» con menos de 40 no cuenta como acierto.
  const coincide=intent.id===beh.wants&&!(intent.id==='apretar'&&(rs.runnerEnergy||0)<40);
  const fits=cmd?cnCommandFits(cmd,intent.id,rs,seg):false;
  const obeys=cmd?Math.random()<cnObedience(d,rs,cmd):false;
  const ok=cmd&&fits&&obeys;
  const caso=coincide?(cmd?'coincideOrden':'coincide'):(cmd?(ok?'ordenAcertada':'ordenFallida'):'difiere');
  let [dSync,tMult,dBond,fMult]=CN_CROSS[caso];
  // Efecto propio de la orden cuando sale bien
  let extraT=1,extraF=1;
  if(ok){
    if(cmd==='forward')extraT=0.96;
    if(cmd==='hold')extraF=0.70;
    if(cmd==='easy')dSync+=6;
    if(cmd==='left'&&seg.type==='descent')extraT=0.94;
    if(cmd==='water')rs.fatigueGained=Math.max(0,(rs.fatigueGained||0)-12);
    if(cmd==='leaveit')rs.skipDistraction=true;
  }
  // cabezota: si el perro tenía razón y no le hiciste caso, la sincronía no baja tanto
  if(caso==='difiere'&&cnHasTrait(d,'cabezota'))dSync=Math.round(dSync/2);
  const syncBefore=rs.sync||0;
  rs.sync=Math.max(0,Math.min(100,syncBefore+dSync));
  rs.minSync=Math.min(rs.minSync==null?100:rs.minSync,rs.sync);   // paso 7: logro «Un solo animal»
  // Tiempo: el del trazado al nivel del equipo, por intención y cruce, entre la sincronía
  const raceDef=CANICROSS_RACES.find(x=>x.id===rs.raceId)||rs;
  const factorSync=0.85+0.003*syncBefore;
  // Paso 5: el suelo de este tramo con su tiempo (barro tras la lluvia, nieve) y el calor o frío
  const segNow={...seg,surface:cnSegSurface(rs,rs.currentSeg)};
  const tempNow=cnSegTemp(rs,rs.currentSeg);
  const snowM=segNow.surface==='nieve'?(d.breed==='husky'?0.95:d.breed==='vizsla'?1.05:1):1;
  // Paso 6: la equipación de hoy y los consumibles (chaleco con calor, abrigo con frío)
  const [eqT,eqSync]=cnEquipSeg(rs,seg,rs.currentSeg,d);
  rs.sync=Math.max(0,Math.min(100,rs.sync+eqSync));
  let tp=cnTempPen(d,tempNow);
  if(rs.pack&&rs.pack.coolvest&&tempNow>cnComfort(d).max)tp*=0.5;
  if(rs.pack&&rs.pack.coat&&tempNow<-4)tp=Math.max(0,tempNow-cnComfort(d).max)*0.015;
  const tm=Math.round(cnSegTime(raceDef,segNow,cnTeamLevel(),intent.time*tMult*extraT*snowM*eqT*(1+tp))/factorSync);
  // Golpe de calor (B3): muy por encima del confort y apretando dos tramos seguidos
  rs.apretarStreak=intent.id==='apretar'?(rs.apretarStreak||0)+1:0;
  if(rs.apretarStreak>=2&&tempNow>cnComfort(d).max+6&&!rs.injuryPending&&Math.random()<0.25)rs.injuryPending='golpe_calor';
  rs.time=(rs.time||0)+tm;
  // Piernas del corredor y fatiga del perro
  const terr=seg.type==='climb'?1.3:seg.type==='descent'?0.8:1;
  rs.runnerEnergy=Math.max(0,(rs.runnerEnergy||100)-Math.round(intent.legs*terr));
  const staminaFactor=Math.max(0.6,(d.stamina||50)/100);
  let f=intent.fatigue/staminaFactor*(seg.type==='climb'?1.2:seg.type==='descent'?0.85:1)*fMult*extraF;
  if(cnHasTrait(d,'tirador'))f*=1.1;
  rs.fatigueGained=Math.round(((rs.fatigueGained||0)+f)*10)/10;
  rs.bondDelta=(rs.bondDelta||0)+dBond;
  rs.lastMismatch=!coincide&&!ok;
  rs.lastCross={caso,intent:intent.id,cmd:cmd||null,obeys,fits};
  cnNoteOutcome(beh,intent.id+(cmd?'+'+cmd:''),coincide||ok);
  // Si el perro ya no puede más, se para: la carrera acaba ahí.
  if((Number(d.fatigue)||0)+rs.fatigueGained>=100){
    rs.retired=true;
    setTimeout(()=>showToast(esc(d.name)+' se para y no quiere seguir'),50);
  }

  const ev=cnPickEvent(rs.month||1);
  // Evento 'dessinc': si el perro sabe "Izquierda", se convierte en decisión con opción de controlarlo
  if(ev&&ev.id==='dessinc'&&(Number(d?.commands?.left)||0)>=1){
    ev.decision=true;
    ev.options=[
      {label:'Controlar con "Izquierda" (+2 vínculo, −100s)',bondMod:2,timeLoss:-100},
      {label:'Ignorar y seguir (−5 vínculo)',bondMod:-5,timeLoss:0},
    ];
  }
  // «Deja» acertada corta la distracción: no hay evento negativo en este tramo
  if(ev&&rs.skipDistraction&&ev.eventType==='neg'){rs.skipDistraction=false;rs.eventLog.push({seg:rs.currentSeg,event:{text:'[DOG] obedece «Deja» y sigue a lo suyo.',eventType:'pos'},resolved:true});}
  else if(ev&&!ev.decision){
    cnApplyEventAuto(ev,rs);
    rs.eventLog.push({seg:rs.currentSeg,event:ev,resolved:true});
  }else if(ev&&ev.decision){
    rs.pendingEvent=ev;
  }
  rs.paceChosen=true;
  if(!rs.pendingEvent){
    if(rs.retired){cnFinishRace();}
    else if(rs.currentSeg+1>=rs.numSegs){cnFinishRace();}
    else{cnNextSegment();}
  } else {
    render();
  }
};

window.cnToggleRace=id=>{
  const race=CANICROSS_RACES.find(r=>r.id===id);if(!race)return;
  const sel=G.cnSelectedRaces||[];
  const idx=sel.findIndex(r=>r.id===id);
  if(idx>=0){G.cnSelectedRaces.splice(idx,1);}
  else{
    // B4: se podían elegir dos del mismo mes y el hub solo enseñaba una; la otra caducaba
    // sin verse. Ahora el selector lo impide y lo dice.
    const mismoMes=sel.find(r=>r.month===race.month);
    if(mismoMes){showToast('Ya tienes «'+mismoMes.name+'» en '+CN_MONTH_NAMES[race.month].toLowerCase()+': una carrera por mes');return;}
    if(sel.length>=6){showToast('Máximo 6 carreras: una por mes');return;}
    G.cnSelectedRaces=[...sel,race];
  }
  render();
};

window.cnConfirmCalendar=()=>{
  if(!(G.cnSelectedRaces||[]).length){showToast('Selecciona al menos una carrera');return;}
  G.cnSelectedRaces=[...G.cnSelectedRaces].sort((a,b)=>a.month-b.month);
  G.activeTab='game';G.screen='canicrossHub';
  autoSave();
  showToast('Calendario confirmado: '+G.cnSelectedRaces.length+' carrera(s)');
  render();
};

window.cnCallVet=type=>{
  const d=cnActiveDog();if(!d)return;
  const cost=type==='complete'?120:50;
  if((G.cnMoney||0)<cost){showToast('Sin fondos suficientes');return;}
  G.cnMoney-=cost;
  if(!G.cnVetHistory)G.cnVetHistory=[];
  G.cnVetHistory.push({type,season:G.cnSeason,cost});
  G._cnVetThisSeason=true;
  if(type==='basic'&&(d.injuryRaces||0)>0){
    d.injuryRaces=Math.ceil(d.injuryRaces/2);
    showToast('Revisión completada — baja reducida a '+d.injuryRaces+' carrera(s)');
  } else if(type==='complete'&&d.injury){
    d.injuryRaces=Math.max(0,(d.injuryRaces||0)-1);
    if(d.injuryRaces===0){d.injury=null;showToast(esc(d.name)+' se recupera ✓');}
    else showToast('Tratamiento en curso — '+d.injuryRaces+' carrera(s) de baja');
  } else {
    showToast('Revisión completada ✓');
  }
  autoSave();render();
};



window.cnEndSeason=()=>{
  const d=cnActiveDog();
  if(d&&!d.retired){
    if((d.injuryRaces||0)>0){d.injuryRaces=Math.max(0,d.injuryRaces-1);if(d.injuryRaces===0)d.injury=null;}
    // Displasia: 8% chance, ages 4-7, once — evaluate BEFORE incrementing age
    if(d.age>=4&&d.age<=7&&!G._cnDislasiaEvent&&Math.random()<0.08){
      G._cnDislasiaEvent=true;G.screen='canicrossDisplasia';render();return;
    }
    d.age=(d.age||1)+1;
    G._cnAgingWarned=d.age>=6;
    // Neglect health decay age 7+
    // Paso 7 (§ 4.13): ya no hay muerte. Con la edad baja la salud y el juego sugiere el retiro.
    if(d.age>=7)d.health=Math.max(1,(d.health||100)-5);
  }
  // Paso 6: el mini-patrocinio de la temporada, ligado a los seguidores
  G.cnMoney=(G.cnMoney||0)+cnSponsorIncome();
  cnDoSeasonTransition();
};

// Clasificación del circuito de la temporada: [{id|me, name, pts}] ordenada.
function cnCircuitStanding(){
  const t=Object.entries(G.cnCircuitTable||{}).map(([id,pts])=>({id,name:(G.cnRivals&&G.cnRivals[id]&&G.cnRivals[id].name)||id,pts}));
  t.push({id:'me',name:G.runner.name||'Tú',pts:G.cnCircuitPoints||0,me:true});
  return t.sort((a,b)=>b.pts-a.pts||(a.me?-1:1));
}
window.cnDoSeasonTransition=function cnDoSeasonTransition(){
  // Paso 7: campeón del circuito y reinicio
  const st=cnCircuitStanding();
  if((G.cnCircuitPoints||0)>0&&st[0]&&st[0].me)G.cnCircuitWins=(G.cnCircuitWins||0)+1;
  G.cnCircuitPoints=0;G.cnCircuitTable={};
  // Paso 7 (§ 4.14): el corredor envejece; desde los 45 pierde algo cada temporada
  G.runner.age=(G.runner.age||25)+1;
  if(G.runner.age>=45&&G.runner.stats){const k=G.runner.age>=55?2:1;Object.keys(G.runner.stats).forEach(s=>{G.runner.stats[s]=Math.max(10,G.runner.stats[s]-k);});}
  cnDogs().forEach(x=>{if(!x.retired)x.seasonsWithYou=(x.seasonsWithYou||0)+1;});
  // ── Achievement tracking: end of cn season ──────────────────
  const thisSeason=G.cnSeason||1;
  const seasonResults=(G.cnRaceResults||[]).filter(r=>r.season===thisSeason);
  // Perfect season check
  if(seasonResults.length>=3&&seasonResults.every(r=>!r.dnf&&r.pos===1)){
    G._cnPerfectSeasons=(G._cnPerfectSeasons||0)+1;
  }
  // Dog healthy streak
  const dogInjuredThisSeason=!!(cnActiveDog()&&cnActiveDog().injury);
  if(!dogInjuredThisSeason){
    G._cnDogHealthyStreak=(G._cnDogHealthyStreak||0)+1;
  } else {
    if(G._cnDogHealthyPrev===false)G._cnDogInjury2Consecutive=true;
    G._cnDogHealthyStreak=0;
  }
  G._cnDogHealthyPrev=!dogInjuredThisSeason;
  // Vet check
  if(!G._cnVetThisSeason)G._cnIgnoredVetSeason=true;
  G._cnVetThisSeason=false;
  // ────────────────────────────────────────────────────────────
  G.cnSeason=(G.cnSeason||1)+1;
  G.cnMonthIdx=0;G.cnSelectedRaces=[];G.cnCurrentRaceIdx=0;G.cnOpenMonths=[];
  G.cnRaceState=null;G.cnMinCare=false;
  G.cnPreseasonDone=[];   // paso 6 (§ 2.3): la pretemporada vuelve cada año
  // §0.4 del diseño: el cumpleaños (+3 vínculo) lo daban el hub y la ficha del perro al
  // pintarse. Ahora, aquí, al empezar la temporada: una pantalla no cambia la partida.
  cnCheckBirthday();
  cnWinterRoll();   // paso 5: cada temporada, su invierno
  cnDogs().forEach(x=>{x.fatigue=Math.max(0,(Number(x.fatigue)||0)-40);});   // paso 4: el verano descansa
  cnAgeRivals();   // paso 3: los rivales cumplen años y su nivel sigue a su perro
  G.activeTab='game';G.screen='canicrossPreseason';
  autoSave();render();
};

window.cnResolveDislasia=opt=>{
  const d=cnActiveDog();if(!d)return;
  if(opt==='treat'){
    if((G.cnMoney||0)<300){showToast('Sin fondos para el tratamiento (€300)');return;}
    G.cnMoney-=300;
    d.speed=Math.round((d.speed||50)*0.85);
    d.stamina=Math.round((d.stamina||50)*0.85);
    showToast('Tratamiento intensivo iniciado 💊');
    cnDoSeasonTransition();
  } else if(opt==='retire'){
    cnRetireDogAs(d,false);G.screen='canicrossDogRetirement';render();
  } else if(opt==='ignore'){
    d.health=Math.max(0,(d.health||100)-5);
    d.bond=Math.max(0,(d.bond||0)-5);
    showToast(esc(d.name)+' nota que no le cuidas. -5 vínculo');
    cnDoSeasonTransition();
  }
};

// ── RETIRO Y DESTINOS (paso 7 · § 4.13) ────────────────────────────────────
// El destino sale de cómo lo has tratado. «Deportivo» solo si lo dejas tú estando él capaz:
// sigue corriendo con otra persona y aparece entre los rivales.
function cnDestiny(d,voluntary){
  const h=d.health==null?100:d.health;
  if(h<40||(d.forcedRaces||0)>=2)return 'frio';
  if(voluntary&&(d.age||1)<=6&&h>=60)return 'deportivo';
  if((d.peakBond||0)>=70&&h>=50)return 'casa';
  if((d.peakBond||0)>=40)return 'familia';
  return 'frio';
}
function cnRetireDogAs(d,voluntary){
  if(!d)return;
  d.retired=true;d.retiredSeason=G.cnSeason||1;
  d.seasonsWithYou=(G.cnSeason||1)-(d.birthSeason||1)+1;
  d.destiny=cnDestiny(d,voluntary);
  d.status=d.destiny==='casa'?'casa':d.destiny==='deportivo'?'deportivo':'adoptado';
  if(d.destiny==='deportivo'){
    const level=Math.round(Math.max(20,Math.min(97,cnDogPerf(d)*0.55+55*0.45)));
    const human=CN_FILL_HUMANS[(d.id*7+3)%CN_FILL_HUMANS.length]+' '+['Ruiz','Ibarra','Sanz','Prats','Lago','Vera'][(d.id||0)%6];
    if(!G.cnRivals||typeof G.cnRivals!=='object')G.cnRivals={};
    G.cnRivals['dog_'+d.id]={name:human+' · '+d.name,human,dog:d.name,level,style:'regular',age:25+((d.id*13)%25),dogAge:d.age||3,
      tier:level<45?1:level<60?2:level<72?3:4,exDog:true,tiers:level<45?[1,2]:level<60?[2,3]:level<72?[3,4]:[4]};
  }
}
window.cnRetireDog=()=>{
  const d=cnActiveDog();if(!d)return;
  cnRetireDogAs(d,true);G.screen='canicrossDogRetirement';autoSave();render();
};
// Tu retiro: lo abre el perro, no lo impone (§ 4.14). Lleva al epílogo.
function cnRunnerCanRetire(){return (G.runner.age||25)>=45&&cnDogs().filter(x=>x.retired).length>=2;}
window.cnRunnerRetire=()=>{G.cnPhase='fin';G.screen='canicrossEpilogo';autoSave();render();};

window.cnNewDogAfterRetirement=()=>{
  if(cnActiveDog()&&!cnActiveDog().retired)cnActiveDog().retired=true;
  G._cnDogBreed=null;G._cnDogName=null;
  delete G._cnDislasiaEvent;
  delete G._cnAgingWarned;
  G.screen='canicrossCreateDog';render();
};

// ══════════════════════════════════════════════════════
//  RENDER — CANICROSS
// ══════════════════════════════════════════════════════

const CN_ADOPTION_ORIGINS=[
  {id:'cachorro', icon:'🐶', label:'Cachorro propio',
   desc:'Lo has criado desde pequeño. El vínculo es frágil al principio pero puede ser el más fuerte.',
   bondStart:5, note:'Vínculo inicial 5'},
  {id:'rescate', icon:'🏠', label:'Rescate / protectora',
   desc:'Lo adoptaste de una protectora. Ya sabe confiar. Llega con historia y con ganas de empezar de nuevo.',
   bondStart:15, note:'Vínculo inicial 15'},
  {id:'retirado', icon:'🏅', label:'De corredor retirado',
   desc:'Su anterior compañero tuvo que dejarlo. Viene entrenado, sabe lo que es una carrera y ya conoce la orden "Adelante".',
   bondStart:25, note:'Vínculo inicial 25 · sabe "Adelante"'},
];

const CN_PRESEASON_ACTS=[
  {id:'salida',  icon:'🌄', label:'Primera salida juntos',
   desc:'Un paseo largo por el monte para conoceros. Sin cronómetro, sin presión. Solo vosotros.',
   bondBonus:8, healthBonus:5, mentalBonus:3},
  {id:'vet',     icon:'🩺', label:'Revisión veterinaria',
   desc:'Chequeo completo antes de la temporada. El perro sale sano, con las vacunas al día y el chip actualizado.',
   healthBonus:12, bondBonus:2},
  {id:'adiest',  icon:'🎓', label:'Adiestramiento básico',
   desc:'Primeras sesiones de órdenes juntos. Aprende a leerte. Tú aprendes a leerle a él.',
   bondBonus:7, teachFirst:true},
  {id:'social',  icon:'👥', label:'Entreno con otros equipos',
   desc:'Os unís a un grupo de canicross. El perro aprende a ignorar distracciones. Vosotros hacéis contactos.',
   bondBonus:5, mentalBonus:6},
];

window.cnSelectOrigin=id=>{G._cnAdoptionOrigin=id;render();};

window.cnDoPreseasonAct=id=>{
  const act=CN_PRESEASON_ACTS.find(a=>a.id===id);if(!act)return;
  if(!G.cnPreseasonDone)G.cnPreseasonDone=[];
  if(G.cnPreseasonDone.includes(id))return;
  const d=cnActiveDog();
  if(act.bondBonus&&d){d.bond=Math.min(100,(d.bond||0)+act.bondBonus);d.peakBond=Math.max(d.peakBond||0,d.bond);}
  if(act.healthBonus&&d)d.health=Math.min(100,(d.health||100)+act.healthBonus);
  if(act.mentalBonus&&G.runner?.stats)bumpStat(G.runner,'mental',act.mentalBonus);
  if(act.teachFirst&&d){d.commands=d.commands||{};if(!(Number(d.commands.forward)||0)){d.commands.forward=1;d.cmdHours=d.cmdHours||{};d.cmdHours.forward=Math.max(d.cmdHours.forward||0,CN_CMD_LEVEL_HOURS[0]);showToast(esc(d.name)+' aprende "Adelante" en el entreno ✅');}}
  G.cnPreseasonDone.push(id);
  autoSave();render();
  setTimeout(()=>showToast(act.label+' completado ✓'),100);
};

function renderCnCreateDog(){
  const el=$main();
  const breed=G._cnDogBreed;
  const origin=G._cnAdoptionOrigin;
  const originData=CN_ADOPTION_ORIGINS.find(o=>o.id===origin);
  const bondPreview=originData?originData.bondStart:0;

  el.innerHTML=`
    <h2>🐕 Tu compañero</h2>
    <p class="sub">Elige el perro con el que competirás toda la temporada</p>

    <label class="field-label">Nombre del perro</label>
    <input id="dogname" type="text" placeholder="Ej: Txuri, Luna, Thor..." maxlength="20" value="${esc(G._cnDogName||'')}" style="margin-bottom:18px"/>

    <label class="field-label">¿Cómo llegó a ti?</label>
    <div style="display:grid;gap:8px;margin-bottom:18px">
      ${CN_ADOPTION_ORIGINS.map(o=>`
        <div class="card ${origin===o.id?'sel':''}" style="cursor:pointer;${origin===o.id?'border-color:#1a1a1a':'border-color:#e8e6e0'}" onclick="cnSelectOrigin('${o.id}')">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:24px;flex-shrink:0">${o.icon}</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;margin-bottom:2px">${o.label} ${origin===o.id?'<span style="color:#4a8a2a">✓</span>':''}</div>
              <div style="font-size:12px;color:#666;margin-bottom:4px">${o.desc}</div>
              <div style="font-size:12px;color:#c07a10;font-weight:600">${o.note}</div>
            </div>
          </div>
        </div>`).join('')}
    </div>

    <label class="field-label">Raza</label>
    <div class="grid2" style="margin-bottom:18px">
      ${Object.entries(CN_BREED_MODS).map(([id,m])=>`
        <div class="spec ${breed===id?'sel':''}" onclick="cnSelectBreed('${id}')">
          <div class="spec-label">${m.label}</div>
          <div class="spec-desc" style="margin-bottom:4px">${m.desc}</div>
          <div style="font-size:11px;color:#4a8a2a">${m.speed>0?'+'+m.speed+' vel':m.speed<0?m.speed+' vel':'vel base'} · ${m.stamina>0?'+'+m.stamina+' res':m.stamina<0?m.stamina+' res':'res base'}</div>
          ${m.bondDecayPerWeek>0?`<div style="font-size:11px;color:#c0392b;margin-top:2px">⚠ -${m.bondDecayPerWeek} vínculo/sem sin entreno</div>`:''}
        </div>`).join('')}
    </div>

    ${breed&&origin?(()=>{
      const m=CN_BREED_MODS[breed];
      const spd=50+(m.speed||0);const sta=50+(m.stamina||0);
      return`<div class="card" style="margin-bottom:16px">
        <div class="sec-title-sm">Stats iniciales</div>
        <div class="bar-row"><span class="bar-label">Velocidad</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${spd}%;background:#4a90d9"></div></div><span class="bar-pct">${spd}</span></div>
        <div class="bar-row"><span class="bar-label">Resistencia</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${sta}%;background:#4a8a2a"></div></div><span class="bar-pct">${sta}</span></div>
        <div class="bar-row"><span class="bar-label">Vínculo inicial</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${bondPreview}%;background:#c07a10"></div></div><span class="bar-pct">${bondPreview}</span></div>
        ${origin==='retirado'?`<div style="font-size:12px;color:#4a8a2a;margin-top:6px">🏅 Ya conoce la orden "Adelante"</div>`:''}
      </div>`;
    })():`<div class="hint" style="margin-bottom:16px">Elige origen y raza para ver los stats iniciales</div>`}

    <div class="note" style="margin-bottom:14px">Necesitas <strong>vínculo ≥20</strong> para correr en tu primera temporada. Habrá una pretemporada de septiembre para construirlo.</div>
    <button class="main" onclick="doCreateDog()" ${!breed||!origin?'disabled style="opacity:0.4"':''}>Continuar → Pretemporada</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="G.screen='modeSelect';render()">← Volver al menú</button>`;
  setTimeout(()=>{
    const i=document.getElementById('dogname');
    if(i){i.oninput=e=>{G._cnDogName=e.target.value;};if(G._cnDogName)i.value=G._cnDogName;}
  },0);
}

// ── PRETEMPORADA ──────────────────────────────────────
function renderCanicrossPreseason(){
  const el=$main();
  const d=cnActiveDog();
  if(!d){G.screen='canicrossHub';render();return;}
  const done=G.cnPreseasonDone||[];
  const allDone=CN_PRESEASON_ACTS.every(a=>done.includes(a.id));
  const bondThreshold=(G.cnSeason||1)===1?20:30;

  el.innerHTML=`
    <h2>🍂 Pretemporada — Septiembre</h2>
    <p class="sub">Antes de que empiece la temporada (Oct–Mar) tienes un mes para preparar a ${esc(d.name)}</p>

    ${d?`<div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:14px;font-weight:700">🐕 ${esc(d.name)}</span>
        <span style="font-size:12px;color:#888">${d.adoptionOrigin==='cachorro'?'🐶 Cachorro propio':d.adoptionOrigin==='rescate'?'🏠 De protectora':d.adoptionOrigin==='retirado'?'🏅 De corredor retirado':''}</span>
      </div>
      <div class="bar-row">
        <span class="bar-label">Vínculo</span>
        <div class="bar-track" style="flex:1">
          <div class="bar-fill" style="width:${d.bond}%;background:#c07a10"></div>
        </div>
        <span class="bar-pct" style="color:${d.bond>=bondThreshold?'#4a8a2a':'#c0392b'}">${d.bond}</span>
      </div>
      <div style="font-size:12px;color:${d.bond>=bondThreshold?'#4a8a2a':'#c07a10'};margin-top:4px">
        ${d.bond>=bondThreshold?`✓ Vínculo suficiente para competir esta temporada`:`Necesitas vínculo ≥${bondThreshold} para competir · faltan ${bondThreshold-d.bond} puntos`}
      </div>
    </div>`:''}

    <div style="font-size:13px;font-weight:600;color:#888;margin-bottom:10px">Actividades de pretemporada</div>
    <div style="display:grid;gap:8px;margin-bottom:20px">
      ${CN_PRESEASON_ACTS.map(a=>{
        const isDone=done.includes(a.id);
        return`<div class="card" style="${isDone?'opacity:0.7;background:#f8fdf8;border-color:#b8ddb8':'cursor:pointer'}" ${!isDone?`onclick="cnDoPreseasonAct('${a.id}')"`:''}">
          <div style="display:flex;align-items:flex-start;gap:10px">
            <span style="font-size:22px;flex-shrink:0">${a.icon}</span>
            <div style="flex:1">
              <div style="font-size:14px;font-weight:700;margin-bottom:2px">${a.label} ${isDone?'<span style="color:#4a8a2a">✓</span>':''}</div>
              <div style="font-size:12px;color:#666;margin-bottom:4px">${a.desc}</div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px">
                ${a.bondBonus?`<span style="color:#c07a10">Vínculo +${a.bondBonus}</span>`:''}
                ${a.healthBonus?`<span style="color:#e74c3c">Salud +${a.healthBonus}</span>`:''}
                ${a.mentalBonus?`<span style="color:#4a90d9">Mental +${a.mentalBonus}</span>`:''}
                ${a.teachFirst?`<span style="color:#4a8a2a">🎓 Enseña "Adelante"</span>`:''}
              </div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>

    ${done.length>0&&!allDone?`<div class="hint" style="margin-bottom:12px">${done.length}/${CN_PRESEASON_ACTS.length} actividades completadas. Puedes continuar cuando quieras.</div>`:''}
    ${allDone?`<div class="note" style="margin-bottom:12px;background:#eaf4ea;border-color:#b8ddb8">✓ Pretemporada completada — ${esc(d.name)} está listo.</div>`:''}

    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="G.screen='canicrossTrainingSetup';render()">
      ${allDone?'Empezar temporada →':'Saltar pretemporada y empezar →'}
    </button>
  `;
}

// ── TAB: CORREDOR ─────────────────────────────────────
function renderCnCorredorTab(){
  const el=$main();
  const d=cnActiveDog();
  const canRace=cnCanRace();
  const races=G.cnSelectedRaces||[];
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const curMonth=cnMonth();
  const MONTHS=CN_MONTHS;
  const MONTH_NAMES=CN_MONTH_NAMES;
  const mIdx=m=>MONTHS.indexOf(m);
  const isPastMonth=m=>mIdx(m)<mIdx(curMonth);
  // v96 (CR-75): una carrera de marzo sin correr —vínculo bajo, perro lesionado o «Saltar
  // este mes»— o una temporada sin carreras dejaban la temporada sin cierre. El reloj nuevo
  // nace con ello: avanzar desde marzo lleva cnMonthIdx a 6 y la temporada se puede cerrar.
  const marchDone=cnSeasonOver();
  const pendingRaces=races.filter(r=>!doneIds.includes(r.id)&&!isPastMonth(r.month)&&!marchDone);
  const allRaceDone=marchDone||(races.length>0&&pendingRaces.length===0);

  el.innerHTML=`
    <div class="flex-between-center" style="margin-bottom:4px">
      <h2>🏃 ${esc(G.runner.name||'Corredor')}</h2>
      <span style="font-size:12px;color:#888">Temporada ${G.cnSeason||1}</span>
    </div>
    <div class="stat-grid" style="margin-bottom:14px">
      <div class="stat"><div class="stat-label">Presupuesto</div><div class="stat-val" style="color:#2d7a2d">€${G.cnMoney||0}</div></div>
      <div class="stat"><div class="stat-label">Mes</div><div class="stat-val">${marchDone?'Terminada':MONTH_NAMES[curMonth]}</div></div>
      <div class="stat"><div class="stat-label">Carreras sel.</div><div class="stat-val">${races.length}</div></div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Stats del corredor</div>
      ${Object.entries(G.runner.stats||{}).slice(0,4).map(([k,v])=>`<div class="bar-row"><span class="bar-label">${k.charAt(0).toUpperCase()+k.slice(1)}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${v}%;background:${v>=70?'#4a8a2a':v>=50?'#4a90d9':'#c07a10'}"></div></div><span class="bar-pct">${v}</span></div>`).join('')}
    </div>

    ${(()=>{
      // Paso 6: el mes es un reparto de horas
      const p=G.cnHoursPlan||{},used=cnHoursUsed(),total=Number(G.cnHoursTotal)||CN_HOURS_TOTAL;
      if(marchDone)return'';
      return`<div class="pz-tarjeta pz" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:baseline"><span class="pz-label">Horas de ${MONTH_NAMES[curMonth].toLowerCase()}</span><span class="pz-num">${used} / ${total} h</span></div>
        <div class="pz-efectos" style="margin:6px 0 8px">${used?['solo','perro','juntos','descanso'].filter(k=>p[k]).map(k=>CN_HOURS_LABEL[k]+' '+p[k]+' h').join(' · ')+' · comando: '+cnCommandLabel(G.cnHoursCmd):'Sin repartir'}</div>
        <button class="pz-btn sec" onclick="G.screen='canicrossTrainingSetup';render()">${used?'Cambiar el reparto':'Repartir las horas'}</button>
      </div>`;
    })()}
    ${(G.cnMoney||0)<CN_BROKE_LINE?`<div class="pz-tarjeta pz"><span class="pz-diag menos">Vas en números rojos: <span class="pz-num">${fmtEur(G.cnMoney||0)}</span></span><button class="pz-btn sec" style="margin-top:8px" onclick="G.screen='canicrossQuiebra';render()">Ver qué hacer</button></div>`:''}

    ${(()=>{
      const raceThisMonth=pendingRaces.find(r=>r.month===curMonth);
      if(raceThisMonth&&canRace){
        const idx=races.indexOf(raceThisMonth);
        return`<button class="main" style="margin-top:4px;margin-bottom:8px;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnStartRace(${idx})">🏁 Correr ${esc(raceThisMonth.name)} →</button>
        <button class="main" style="margin-top:0;margin-bottom:14px;opacity:0.5;font-size:13px" onclick="cnAdvanceWeek()">Saltar este mes sin correr →</button>`;
      }
      const nextM=CN_MONTHS[(Number(G.cnMonthIdx)||0)+1];
      if(marchDone)return'';   // v96: marzo terminado, abajo sale «Cerrar temporada»
      return`<button class="main" style="margin-top:4px;margin-bottom:14px" onclick="cnAdvanceWeek()">${nextM?'Avanzar a '+MONTH_NAMES[nextM]:'Terminar marzo'} →</button>`;
    })()}

    <div class="section-label" style="margin-top:18px">📅 Carreras de temporada</div>
    ${races.length>0?MONTHS.map(m=>{
      const mName=MONTH_NAMES[m];
      const race=races.find(r=>r.month===m);
      const isCurrent=m===curMonth;
      const isPast=mIdx(m)<mIdx(curMonth);
      const isOpen=(G.cnOpenMonths||[]).includes(m);
      const done=race&&doneIds.includes(race.id);
      const result=done?(G.cnRaceResults||[]).find(res=>res.raceId===race.id&&res.season===G.cnSeason):null;
      const overdue=isPast&&race&&!done;
      const idx=race?races.indexOf(race):-1;
      return `<div style="border:1px solid ${isCurrent?'#b8ddb8':'#e8e6e0'};border-radius:10px;margin-bottom:6px;overflow:hidden;${isCurrent?'background:#f8fdf8':'background:#fff'}">
        <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;cursor:${race?'pointer':'default'}" ${race?`onclick="cnToggleMonth(${m})"`:''}">
          <div style="flex:1;min-width:0">
            <span style="font-size:14px;font-weight:600;color:${isCurrent?'#2d7a2d':isPast?'#aaa':'#1a1a1a'}">${mName}</span>
            ${race?`<span style="font-size:12px;color:${isPast&&!done?'#bbb':'#888'};margin-left:6px">· ${esc(race.name)} · ${race.km}km · Tier ${race.tier}</span>`
                  :`<span style="font-size:12px;color:#ccc;margin-left:6px">· Sin carrera</span>`}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;margin-left:8px">
            ${done&&!result?`<span class="pz-efectos">${(cnCancelled(race.id)||{}).why==='calor'?'Suspendida':'No corrió'}</span>`
                  :done?`<span style="font-size:13px;font-weight:600;color:${result?.dnf?'#c0392b':'#4a8a2a'}">${result?.dnf?'DNF':'#'+(result?.pos||'?')}</span>`
                  :overdue?`<span style="font-size:12px;color:#bbb">⏱</span>`
                  :isCurrent&&race?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">← Ahora</span>`:''}
            ${race?`<span style="font-size:11px;color:#bbb;display:inline-block;transition:transform .2s;transform:${isOpen?'rotate(90deg)':'rotate(0)'}">▶</span>`:''}
          </div>
        </div>
        ${race&&isOpen?`<div style="padding:0 14px 14px;border-top:1px solid #f0ede8">
          <div style="font-size:12px;color:#888;margin:8px 0 6px">${esc(race.location)} · €${race.cost} inscr. · €${race.prize} premio 1º</div>
          ${done&&!result?`<div class="pz-efectos">${(cnCancelled(race.id)||{}).why==='calor'?'Suspendida por calor: se perdió la inscripción.':'No corristeis: se perdió la inscripción.'}</div>`
                :done?`<div style="font-size:13px;font-weight:600;color:${result?.dnf?'#c0392b':'#4a8a2a'}">${result?.dnf?'DNF — Retirado':'Posición #'+(result?.pos||'?')}${(result?.prize||0)>0?' · +€'+result.prize:''}</div>`
                :overdue?`<div style="font-size:13px;color:#bbb">⏱ Plazo superado — no se puede correr</div>`
                :canRace?`<button class="main" style="margin-top:6px;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnStartRace(${idx})">Correr ahora →</button>`
                :d&&d.bond<cnRaceThreshold()?`<div class="note" style="margin-top:6px">Vínculo insuficiente (${d.bond}/${cnRaceThreshold()})</div>`
                :`<div class="note" style="margin-top:6px">El perro no puede correr ahora</div>`}
        </div>`:''}
      </div>`;
    }).join('')
    :`<div class="hint">Ve a <strong>📅 Calendario</strong> para seleccionar tus carreras de temporada (oct–mar).</div>`}

    ${allRaceDone?`<button class="main" style="margin-top:12px;border-color:#4a8a2a;color:#2d7a2d" onclick="G.screen='canicrossSeasonBalance';render()">Cerrar temporada ${G.cnSeason} →</button>`:''}

    ${(()=>{
      const RARITY={easy:{c:'#4a8a2a',bg:'#eaf4ea',l:'Fácil'},medium:{c:'#4a90d9',bg:'#e8f0fb',l:'Medio'},hard:{c:'#c07a10',bg:'#fdf0e0',l:'Difícil'},legendary:{c:'#8b2252',bg:'#f8e8f2',l:'Legendario'}};
      const rb=a=>{const r=RARITY[a.rarity]||{c:'#888',bg:'#eee',l:''};return`<span style="font-size:10px;font-weight:700;padding:1px 5px;border-radius:4px;background:${r.bg};color:${r.c}">${r.l}</span>`;};
      const unlocked=G.unlockedAchievements||[];
      const cnAchs=ACHIEVEMENTS.filter(a=>a.mode==='cn');
      const unlockedCn=cnAchs.filter(a=>unlocked.includes(a.id));
      const pendingCn=cnAchs.filter(a=>!unlocked.includes(a.id));
      const recent=unlockedCn.slice(-3).reverse();
      return`
    <div class="card" style="margin-top:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:${recent.length>0?'10px':'0'}">
        <div class="sec-title" style="margin-bottom:0">Logros canicross (${unlockedCn.length}/${cnAchs.length})</div>
        <button class="secondary" style="font-size:11px;padding:3px 10px" onclick="G.screen='achievements';render()">Ver todos →</button>
      </div>
      ${recent.map(ach=>`<div style="padding:7px 0;border-bottom:1px solid #f0ede8;display:flex;align-items:center;gap:8px">
        <span style="font-size:15px">🏆</span>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:1px"><span style="font-size:13px;font-weight:600">${esc(ach.label)}</span>${rb(ach)}</div>
          <div style="font-size:12px;color:#888">${esc(ach.desc)}</div>
        </div>
      </div>`).join('')}
      ${pendingCn.length>0?`<div style="padding:7px 0;opacity:0.5;display:flex;align-items:center;gap:8px">
        <span style="font-size:15px;opacity:0.4">🔒</span>
        <div style="font-size:12px;color:#aaa">Siguiente: <strong>${esc(pendingCn[0].label)}</strong> — ${esc(pendingCn[0].desc)}</div>
      </div>`:''}
    </div>`;
    })()}
  `;
}

// ── TAB: PERRO ────────────────────────────────────────
function renderCnPerroTab(){
  const el=$main();
  const d=cnActiveDog();
  if(!d){el.innerHTML=`<div class="hint">Sin perro. Algo fue mal.</div>`;return;}

  const isOld=d.age>=6;
  const cmds=cnCommandsList();
  const breedInfo=CN_BREED_MODS[d.breed]||CN_BREED_MODS.mestizo;

  el.innerHTML=`
    <h2>🐕 ${esc(d.name)}</h2>
    <p class="sub">${breedInfo.label} · ${cnDogAgeLabel()} · ${d.retired?'<span style="color:#888">Retirado</span>':'<span style="color:#4a8a2a">Activo</span>'}</p>

    ${d.condition?`<div class="pz-tarjeta pz"><div class="pz-label">Estos días</div><div style="font-size:15px">${cnReplaceVars((cnConditionDef(d)||{}).text||'')}</div></div>`:''}
    ${isOld?`<div class="warn">🦴 ${esc(d.name)} ya nota el paso del tiempo (${d.age} años). Su rendimiento puede empezar a decrecer.</div>`:''}
    ${d.injury?`<div class="danger">🤕 Lesión: <strong>${{almohadillas:'Almohadillas rozadas',luxacion:'Luxación',golpe_calor:'Golpe de calor'}[d.injury]||d.injury}</strong> · ${d.injuryRaces} carrera(s) de baja<br><span style="font-size:12px;color:#c0392b">Usa el veterinario para reducir la baja</span></div>`:''}
    ${!d.injury&&d.bond<cnRaceThreshold()?`<div class="note">⚡ Vínculo insuficiente para competir. Necesita ≥${cnRaceThreshold()} (actual: <strong>${d.bond}</strong>). Entrena juntos.</div>`:''}

    <button class="pz-btn sec" style="margin-bottom:12px" onclick="G.screen='canicrossNotebook';render()">Abrir el cuaderno · ${Object.keys(G.cnNotebook||{}).length} conductas</button>
    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Stats</div>
      ${[['Velocidad',d.speed,'#4a90d9'],['Resistencia',d.stamina,'#4a8a2a'],['Vínculo',d.bond,'#c07a10'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Comandos aprendidos</div>
      ${cmds.map(c=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f5f4f0;font-size:14px"><span>${c.label}</span><span>${c.learned?'✅ Aprendido':'❌ Pendiente'}</span></div>`).join('')}
      <div class="text-hint" style="margin-top:6px">${cmds.every(c=>c.learned)?'¡'+esc(d.name)+' conoce todos los comandos! 🌟':'Entrena "Adiestramiento" para enseñar comandos (2 sesiones por comando).'}</div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Historial juntos</div>
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">Carreras</div><div class="stat-val">${d.races||0}</div></div>
        <div class="stat"><div class="stat-label">Km juntos</div><div class="stat-val">${d.kmTogether||0}</div></div>
        <div class="stat"><div class="stat-label">Vínculo máx.</div><div class="stat-val">${d.peakBond||0}</div></div>
        ${(()=>{const s=cnComputeDogStats();return`
        <div class="stat"><div class="stat-label">Victorias</div><div class="stat-val" style="color:#c07a10">${s.victories}</div></div>
        <div class="stat"><div class="stat-label">Podios</div><div class="stat-val">${s.podiums}</div></div>
        <div class="stat"><div class="stat-label">Temporada</div><div class="stat-val">${G.cnSeason||1}</div></div>`;})()}
      </div>
      ${(()=>{const s=cnComputeDogStats();return s.bestTime?`<div style="font-size:12px;color:#888;margin-top:8px;text-align:center">Mejor tiempo: ${fmt(s.bestTime)}</div>`:'';})()}
    </div>

    ${!d.retired?`
    <div class="section-label">Veterinario</div>
    <div class="grid-2" style="margin-bottom:12px">
      <button class="main" style="margin-top:0;font-size:13px;padding:10px 8px" onclick="cnCallVet('basic')" ${(d.injuryRaces||0)<=0?'disabled':''}>Revisión básica<br><span style="font-size:11px;color:#888">€50 · reduce baja</span></button>
      <button class="main" style="margin-top:0;font-size:13px;padding:10px 8px" onclick="cnCallVet('complete')" ${!d.injury?'disabled':''}>Tratamiento completo<br><span style="font-size:11px;color:#888">€120 · cura en 1 carrera</span></button>
    </div>
    ${((d.age||1)>=8||(d.health==null?100:d.health)<35)?`<div class="pz-diag ojo" style="margin:8px 0">${esc(d.name)} tiene ${d.age} años y salud ${d.health}: quizá sea el momento de retirarle.</div>`:''}
    ${(G.cnSeason||1)>1?`<button class="main" style="background:#fef9ec;border-color:#e8c97a;color:#c07a10" data-dn="${esc(d.name)}" onclick="if(confirm('¿Retirar a '+this.dataset.dn+'?'))cnRetireDog()">Retirar a ${esc(d.name)} voluntariamente</button>`:''}
    `:`<div class="note" style="margin-top:8px">${esc(d.name)} está retirado. <button class="secondary" onclick="cnNewDogAfterRetirement()">Adoptar nuevo perro →</button></div>`}
  `;
}

// ── TAB: EQUIPO ───────────────────────────────────────
function renderCnEquipoTab(){
  // Paso 6 (§ 4.10): lo duradero no es mejor, es distinto; los consumibles se gastan.
  const el=$main();
  const sec=(t,cat)=>`<div class="pz-label" style="margin:12px 0 6px">${t}</div><div class="pz-tarjeta">${CN_EQUIP[cat].map(it=>{
    const own=(G.cnOwned[cat]||[]).includes(it.id);
    return`<div class="pz-fila"><span class="pz-fila-txt"><b>${esc(it.name)}</b><div class="pz-efectos">${esc(it.desc)}</div></span>
      ${own?`<span class="pz-efectos">${G.cnEquipped[cat]===it.id?'Puesto':'Tuyo'}</span>`:`<button class="pz-btn sec" style="width:auto;padding:8px 12px" onclick="cnBuyEquip('${cat}','${it.id}')">€${it.price}</button>`}</div>`;}).join('')}</div>`;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-dinero">${icono('equipo')}Dinero · equipación</div>
    <div class="pz-titulo">Equipo</div>
    <p class="pz-sub">Tienes <span class="pz-num">${fmtEur(G.cnMoney||0)}</span>. Lo que llevas se elige antes de cada carrera.</p>
    ${sec('Arneses','harness')}${sec('Líneas','line')}${sec('Cinturones','belt')}
    <div class="pz-label" style="margin:12px 0 6px">Consumibles</div>
    <div class="pz-tarjeta">${CN_CONSUMABLES.map(c=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${c.name}</b> <span class="pz-efectos">· tienes ${Number(G.cnConsumables[c.id])||0}</span><div class="pz-efectos">${esc(c.desc)}</div></span>
      <button class="pz-btn sec" style="width:auto;padding:8px 12px" onclick="cnBuyConsumable('${c.id}')">€${c.price}</button></div>`).join('')}</div>
  </div>`;
}

// ── EL MES: REPARTO DE HORAS (paso 6 · § 4.9) ─────────────────────────────
// Pantalla nueva con las piezas del sistema visual (stepper, opción, fila).
function renderCanicrossTrainingSetup(){
  const el=$main();
  const d=cnActiveDog();
  const p=G.cnHoursPlan||{},total=Number(G.cnHoursTotal)||CN_HOURS_TOTAL,used=cnHoursUsed();
  const R=CN_HOURS_RATES;
  const da={solo:'Tu resistencia y velocidad. El vínculo baja un poco.',perro:'Velocidad y resistencia del perro, y su comando. Le cansa.',
    juntos:'Vínculo, sincronía de salida y comando (rinde ×1,5). Os cansa a los dos.',descanso:'Le baja la fatiga, sube el ánimo y algo de salud.'};
  const cmdRow=c=>{const h=Math.round((d&&d.cmdHours&&d.cmdHours[c.id])||0);const lv=Number((d&&d.commands||{})[c.id])||0;const next=CN_CMD_LEVEL_HOURS[lv];
    return`<button class="pz-opcion${G.cnHoursCmd===c.id?' sel':''}" onclick="cnSetHoursCmd('${c.id}')"><b>${c.label}</b> <span class="pz-efectos">· nivel ${lv}${next?' · '+h+' / '+next+' h':' · dominado'}</span><div class="pz-efectos">${esc(c.desc)}</div></button>`;};
  const pocoJuntos=(Number(p.juntos)||0)+(Number(p.descanso)||0)<8;
  el.innerHTML=`<div class="pz">
    <div class="pz-etiqueta fam-cuerpo">${icono('calendario')}Cuerpo · ${CN_MONTH_NAMES[cnMonth()]||''}</div>
    <div class="pz-titulo">El mes, en horas</div>
    <p class="pz-sub">Tienes ${total} h este mes. Quedan <span class="pz-num">${total-used}</span>.</p>
    <div class="pz-tarjeta">
      ${['solo','perro','juntos','descanso'].map(k=>`<div class="pz-fila"><span class="pz-fila-txt"><b>${CN_HOURS_LABEL[k]}</b><div class="pz-efectos">${da[k]}</div></span>
        <span class="pz-stepper"><button onclick="cnSetHours('${k}',-2)" ${(p[k]||0)<=0?'disabled':''}>−</button><span class="pz-stepper-n">${p[k]||0}</span><button onclick="cnSetHours('${k}',2)" ${used>=total?'disabled':''}>+</button></span></div>`).join('')}
    </div>
    ${pocoJuntos?`<div class="pz-diag ojo" style="margin-bottom:12px">Con menos de 8 h juntos o descansando, ${d?esc(d.name):'el perro'} lo nota: el vínculo baja.</div>`:''}
    <div class="pz-label" style="margin:6px 0">Comando que entrenáis</div>
    ${CN_COMMANDS.map(cmdRow).join('')}
    ${cnHomeDogs().length?`<div class="pz-diag mas">El veterano de casa ayuda: +25 % en el comando.</div>`:''}
    <button class="pz-btn" style="margin-top:12px" onclick="${(G.cnSelectedRaces||[]).length?"G.screen='canicrossHub';G.activeTab='game';render()":"G.screen='canicrossCalendarSetup';render()"}">${(G.cnSelectedRaces||[]).length?'Hecho':'Ver calendario'}</button>
  </div>`;
  void R;
}

// ── SETUP: CALENDARIO DE TEMPORADA ────────────────────
function renderCanicrossCalendarSetup(){
  // Reutiliza renderCnCalendarioTab pero con navegación diferente
  const el=$main();
  const sel=G.cnSelectedRaces||[];
  const selIds=sel.map(r=>r.id);
  const MONTHS=[10,11,12,1,2,3];
  const MONTH_NAMES={10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo'};
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const spent=selIds.reduce((a,id)=>{const r=CANICROSS_RACES.find(x=>x.id===id);return a+(r?.cost||0);},0);
  const budget=G.cnMoney||0;
  const pct=budget>0?Math.min(100,Math.round(spent/budget*100)):0;
  const openMonths=G.cnOpenSeasonMonths||[];   // §0.4 del diseño: ya no se rellena al pintar (lo pone el arranque)
  const tierColor={1:'#4a8a2a',2:'#4a90d9',3:'#c07a10',4:'#c0392b'};
  const tierLabel={1:'Tier 1',2:'Tier 2',3:'Tier 3',4:'Tier 4'};
  const byMonth={};
  CANICROSS_RACES.forEach(r=>{if(!byMonth[r.month])byMonth[r.month]=[];byMonth[r.month].push(r);});
  const raceCard=r=>{
    const isSel=selIds.includes(r.id);const isDone=doneIds.includes(r.id);
    const noMoney=!isSel&&(spent+(r.cost||0)>budget);
    const otro=!isSel&&sel.find(x=>x.month===r.month);   // B4: una por mes
    const maxed=!isSel&&!otro&&selIds.length>=6;
    const clickable=!isDone&&!maxed&&!otro&&!(noMoney&&!isSel);
    return`<div class="race-card ${isSel?'sel':''}" style="${isDone?'opacity:0.55;cursor:default':''}" ${clickable?`onclick="cnToggleRace('${r.id}')"`:''}">
      <div class="flex-between">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span class="card-title">${esc(r.name)}</span>
            <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'#888'}">${tierLabel[r.tier]||''}</span>
          </div>
          <div style="font-size:12px;color:#888">${r.monthName} · ${r.km}km · ${esc(r.location)}</div>
          ${otro?`<div style="font-size:12px;color:var(--ink3);margin-top:2px">Ya tienes «${esc(otro.name)}» este mes</div>`:noMoney&&!isSel&&!maxed?`<div style="font-size:12px;color:#c0392b;margin-top:2px">Sin presupuesto</div>`:maxed&&!isSel?`<div style="font-size:12px;color:#c07a10;margin-top:2px">Máx. 6 carreras</div>`:''}
        </div>
        <div class="right-col">
          <div style="font-size:13px;font-weight:600;color:#4a8a2a">€${r.prize}</div>
          <div style="font-size:12px;color:#aaa">€${r.cost} inscr.</div>
          ${isSel?`<div style="font-size:12px;color:#4a8a2a;font-weight:600;margin-top:2px">✓</div>`:''}
        </div>
      </div>
    </div>`;
  };

  el.innerHTML=`
    <h2>📅 Calendario de temporada</h2>
    <p class="sub">Oct–Mar · una carrera por mes, máx. 6 · ${sel.length} seleccionadas</p>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px">
        <span>Presupuesto de inscripciones</span>
        <span style="font-weight:600;color:${pct>85?'#c0392b':pct>50?'#c07a10':'#888'}">${pct}% (€${spent} / €${budget})</span>
      </div>
      <div style="height:4px;background:#e8e6e0;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>85?'#c0392b':'#4a90d9'};border-radius:2px;transition:width .3s"></div>
      </div>
    </div>
    ${MONTHS.map(m=>{
      const races=byMonth[m]||[];if(!races.length)return'';
      const mName=MONTH_NAMES[m];
      const mSel=races.filter(r=>selIds.includes(r.id)).length;
      const isOpen=openMonths.includes(m);
      return`<div class="quarter-wrap">
        <div class="quarter-toggle ${mSel>0?'has-sel':''}" onclick="cnToggleSeasonMonth(${m})">
          <span style="font-size:14px;font-weight:600;flex:1">${mName} <span style="font-size:12px;font-weight:400;color:#aaa">· ${races.length} carrera${races.length>1?'s':''}</span></span>
          ${mSel>0?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">${mSel} ✓</span>`:''}
          <span style="font-size:12px;color:#aaa;display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
        </div>
        ${isOpen?`<div style="padding:4px 0 8px">${races.map(r=>raceCard(r)).join('')}</div>`:''}
      </div>`;
    }).join('')}
    ${sel.length===0?`<div class="hint" style="margin-top:4px">Sin carreras — puedes empezar igualmente y añadir desde el hub.</div>`:''}
    <div class="grid-2" style="margin-top:16px">
      <button class="main" style="margin-top:0;opacity:0.6" onclick="G.screen='canicrossTrainingSetup';render()">← Entreno</button>
      <button class="main" style="margin-top:0;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnConfirmCalendar()">¡Empezar temporada! →</button>
    </div>
  `;
}

// ── TAB: CALENDARIO ───────────────────────────────────
function renderCnCalendarioTab(){
  const el=$main();
  const sel=G.cnSelectedRaces||[];
  const selIds=sel.map(r=>r.id);
  const MONTHS=[10,11,12,1,2,3];
  const MONTH_NAMES={10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo'};
  const MONTH_SHORT={10:'Oct',11:'Nov',12:'Dic',1:'Ene',2:'Feb',3:'Mar'};
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const spent=selIds.reduce((a,id)=>{const r=CANICROSS_RACES.find(x=>x.id===id);return a+(r?.cost||0);},0);
  const budget=G.cnMoney||0;
  const pct=budget>0?Math.min(100,Math.round(spent/budget*100)):0;
  const openMonths=G.cnOpenSeasonMonths||[];   // §0.4 del diseño: ya no se rellena al pintar (lo pone el arranque)
  const tierColor={1:'#4a8a2a',2:'#4a90d9',3:'#c07a10',4:'#c0392b'};
  const tierLabel={1:'Tier 1',2:'Tier 2',3:'Tier 3',4:'Tier 4'};

  const byMonth={};
  CANICROSS_RACES.forEach(r=>{if(!byMonth[r.month])byMonth[r.month]=[];byMonth[r.month].push(r);});

  const raceCard=r=>{
    const isSel=selIds.includes(r.id);
    const isDone=doneIds.includes(r.id);
    const noMoney=!isSel&&(spent+(r.cost||0)>budget);
    const otro=!isSel&&sel.find(x=>x.month===r.month);   // B4: una por mes
    const maxed=!isSel&&!otro&&selIds.length>=6;
    const clickable=!isDone&&!maxed&&!otro&&!(noMoney&&!isSel);
    return`<div class="race-card ${isSel?'sel':''}" style="${isDone?'opacity:0.55;cursor:default':''}" ${clickable?`onclick="cnToggleRace('${r.id}')"`:''}">
      <div class="flex-between">
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-bottom:2px">
            <span class="card-title">${esc(r.name)}</span>
            <span style="font-size:12px;font-weight:600;padding:1px 6px;border-radius:4px;background:${tierColor[r.tier]||'#888'}22;color:${tierColor[r.tier]||'#888'}">${tierLabel[r.tier]||''}</span>
          </div>
          <div style="font-size:12px;color:#888">${r.monthName} · ${r.km}km · ${esc(r.location)}</div>
          ${isDone?`<div style="font-size:12px;color:#4a8a2a;margin-top:2px">✓ Ya corrida esta temporada</div>`:''}
          ${otro?`<div style="font-size:12px;color:var(--ink3);margin-top:2px">Ya tienes «${esc(otro.name)}» este mes</div>`:''}
          ${maxed&&!isSel?`<div style="font-size:12px;color:#c07a10;margin-top:2px">Máx. 6 carreras alcanzado</div>`:''}
          ${noMoney&&!isSel&&!maxed?`<div style="font-size:12px;color:#c0392b;margin-top:2px">Sin presupuesto</div>`:''}
        </div>
        <div class="right-col">
          <div style="font-size:13px;font-weight:600;color:#4a8a2a">€${r.prize}</div>
          <div style="font-size:12px;color:#aaa">€${r.cost} inscr.</div>
          ${isSel?`<div style="font-size:12px;color:#4a8a2a;font-weight:600;margin-top:2px">✓</div>`:''}
        </div>
      </div>
    </div>`;
  };

  el.innerHTML=`
    <h2>📅 Calendario de temporada</h2>
    <p class="sub">Oct–Mar · una carrera por mes, máx. 6 · ${sel.length} seleccionadas</p>
    <div style="margin-bottom:16px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:#888;margin-bottom:4px">
        <span>Presupuesto de inscripciones</span>
        <span style="font-weight:600;color:${pct>85?'#c0392b':pct>50?'#c07a10':'#888'}">${pct}% (€${spent} / €${budget})</span>
      </div>
      <div style="height:4px;background:#e8e6e0;border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${pct>85?'#c0392b':'#4a90d9'};border-radius:2px;transition:width .3s"></div>
      </div>
    </div>
    ${MONTHS.map(m=>{
      const races=byMonth[m]||[];
      if(!races.length)return'';
      const mName=MONTH_NAMES[m];
      const mShort=MONTH_SHORT[m];
      const mSel=races.filter(r=>selIds.includes(r.id)).length;
      const isOpen=openMonths.includes(m);
      return`<div class="quarter-wrap">
        <div class="quarter-toggle ${mSel>0?'has-sel':''}" onclick="cnToggleSeasonMonth(${m})">
          <span style="font-size:14px;font-weight:600;flex:1">${mName} <span style="font-size:12px;font-weight:400;color:#aaa">· ${mShort}</span></span>
          ${mSel>0?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">${mSel} ✓</span>`:''}
          <span style="font-size:12px;color:#aaa;display:inline-block;transform:${isOpen?'rotate(90deg)':''};transition:transform .2s">▶</span>
        </div>
        ${isOpen?`<div style="padding:4px 0 8px">${races.map(r=>raceCard(r)).join('')}</div>`:''}
      </div>`;}).join('')}
    ${sel.length===0?`<div class="hint" style="margin-top:4px">Sin carreras — puedes continuar igualmente.</div>`:''}
    <div class="grid-2" style="margin-top:16px">
      <button class="main" style="margin-top:0" onclick="G.activeTab='game';render()">← Volver</button>
      <button class="main" style="margin-top:0" onclick="cnConfirmCalendar()">Confirmar →</button>
    </div>
  `;
}

// ── TAB: FINANZAS ─────────────────────────────────────
function renderCnFinanzasTab(){
  const el=$main();
  const prizeTotal=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).reduce((a,r)=>a+(r.prize||0),0);
  const inscCost=(G.cnSelectedRaces||[]).reduce((a,r)=>a+(r.cost||0),0);
  const dogMonthly=cnMonthlyDogCost();
  const seasonResults=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason);

  el.innerHTML=`
    <h2>💰 Finanzas</h2>
    <p class="sub">Temporada ${G.cnSeason||1}</p>

    <div class="fin-section">
      <div class="fin-title">Balance</div>
      <div class="fin-row"><span>Presupuesto actual</span><span class="${(G.cnMoney||0)<0?'minus':'plus'}">${fmtEur(G.cnMoney||0)}</span></div>
      <div class="fin-row"><span>Premios cobrados</span><span class="${prizeTotal>0?'plus':'neutral'}">€${prizeTotal}</span></div>
      <div class="fin-row"><span>Inscripciones</span><span class="minus">-€${inscCost}</span></div>
      <div class="fin-row"><span>Patrocinio al cerrar la temporada</span><span class="plus">+€${cnSponsorIncome()}</span></div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Gastos del perro (mensual)</div>
      <div class="fin-row"><span>Manutención${G.cnMinCare?' mínima':''}</span><span class="minus">-€${cnMonthlyDogCost()}/mes</span></div>
      <div class="fin-row tot"><span>Total/mes perro</span><span class="minus">-€${dogMonthly}/mes</span></div>
    </div>

    ${(G.cnVetHistory||[]).length>0?`
    <div class="fin-section">
      <div class="fin-title">Historial veterinario</div>
      ${G.cnVetHistory.map(v=>`<div class="fin-row"><span>${{basic:'Revisión básica',complete:'Tratamiento completo'}[v.type]||v.type} · T${v.season||1}</span><span class="minus">-€${v.cost}</span></div>`).join('')}
    </div>`:''}

    ${seasonResults.length>0?`
    <div class="fin-section">
      <div class="fin-title">Resultados de la temporada</div>
      ${seasonResults.map(r=>`<div class="fin-row"><span>${esc(r.raceName||'')}</span><span class="${(r.prize||0)>0?'plus':'neutral'}">${r.dnf?'DNF':'#'+(r.pos||'—')}${(r.prize||0)>0?' · +€'+r.prize:''}</span></div>`).join('')}
    </div>`:''}
  `;
}

function cnLiveClassPanel(rs){
  if(!rs||!rs.rivals?.length||rs.currentSeg===0)return'';
  const myTime=(rs.time||0)+(rs.timePenalty||0);
  const myAge=G.runner.age||28;
  const myCat=cnGetCategory(myAge);

  // Paso 3: cada rival lleva sus parciales; quien ha abandonado sale de la tabla.
  const nem=cnNemesisId();
  const all=[
    {name:G.runner.name||'Tú',time:myTime,me:true,age:myAge},
    ...rs.rivals.map(r=>({name:r.name+(r.id===nem?' · némesis':'')+(r.incident&&r.incident.seg<rs.currentSeg&&r.incident.type!=='abandona'?(r.incident.type==='revienta'?' · ha reventado':' · problema con el perro'):''),
      time:cnRivalTime(r,rs.currentSeg),me:false,age:r.age||30})).filter(x=>Number.isFinite(x.time))
  ].sort((a,b)=>a.time-b.time);


  const myPos=all.findIndex(x=>x.me);
  const start=Math.max(0,myPos-2);
  const slice=all.slice(start,Math.min(all.length,start+5));

  // Category ranking
  const catAll=all.filter(r=>cnGetCategory(r.age).id===myCat.id);
  const myCatPos=catAll.findIndex(x=>x.me);
  const catStart=Math.max(0,myCatPos-1);
  const catSlice=catAll.slice(catStart,Math.min(catAll.length,catStart+3));

  return`<div class="live-class" style="margin-bottom:6px">
    <div class="live-class-title">General · ${myPos+1}º de ${all.length}</div>
    ${slice.map((r,i)=>{
      const absPos=start+i;
      const gap=r.me?'—':r.time<myTime?'−'+fmt(myTime-r.time):'+'+fmt(r.time-myTime);
      return`<div class="live-row ${r.me?'me':''}">
        <span class="live-pos" style="color:${absPos===0?'#c07a10':'#bbb'}">${absPos+1}º</span>
        <span class="live-name">${esc(r.name)}${r.me?' ◀':''}</span>
        <span class="live-gap">${gap}</span>
      </div>`;
    }).join('')}
  </div>
  <div class="live-class" style="margin-bottom:10px">
    <div class="live-class-title">${myCat.label} · ${myCatPos+1}º de ${catAll.length}</div>
    ${catSlice.map((r,i)=>{
      const absPos=catStart+i;
      const gap=r.me?'—':r.time<myTime?'−'+fmt(myTime-r.time):'+'+fmt(r.time-myTime);
      return`<div class="live-row ${r.me?'me':''}">
        <span class="live-pos" style="color:${absPos===0?'#c07a10':'#bbb'}">${absPos+1}º</span>
        <span class="live-name">${esc(r.name)}${r.me?' ◀':''}</span>
        <span class="live-gap">${gap}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// ── RACE SCREENS ──────────────────────────────────────
function renderCanicrossPreRace(){
  const el=$main();
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx];
  if(!race){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const d=cnActiveDog();

  const pre=G.cnRaceState&&G.cnRaceState.preBehaviour;   // paso 4: lo que hace el perro en la salida
  el.innerHTML=`
    <h2>🐕 Pre-carrera</h2>
    <p class="sub">${esc(race.name)} · ${race.km}km · ${esc(race.location)}</p>
    ${G.cnRaceState&&G.cnRaceState.tempReal!=null?(()=>{
      // Paso 5: el día, en una tarjeta de estado
      const rs=G.cnRaceState,tl=rs.weatherTimeline||[],cambio=tl.findIndex(w=>w!=='seco');
      const dev=d?cnTempDev(d,rs.tempReal):0;
      return`<div class="pz-tarjeta pz pz-estado">
        <div class="pz-linea"><span class="pz-num" style="font-size:20px">${rs.tempReal} °C</span><span class="pz-efectos">${CN_WINTER_LABEL[G.cnSeasonWinter]||''}</span></div>
        <div class="pz-linea"><span class="pz-efectos">${cambio<0?'Seco toda la carrera':CN_WEATHER_LABEL[tl[cambio]]+' desde el tramo '+(cambio+1)}</span></div>
        ${d&&dev>0?`<div class="pz-linea"><span class="pz-diag ojo">Fuera de lo que mejor lleva un ${(CN_BREED_MODS[d.breed]||{}).label||'perro'} (${cnComfort(d).min} a ${cnComfort(d).max} °C)</span></div>`:''}
        ${G.cnRaceState.forced?`<div class="pz-linea"><span class="pz-diag menos">Hoy corre con un antiinflamatorio</span></div>`:''}
      </div>`;
    })():''}
    ${pre?`<div class="pz-tarjeta pz" style="border-color:var(--acc)"><div class="pz-etiqueta acento">${icono('perro')}En la salida</div><div style="font-size:16px;line-height:1.45">${cnBehaviourText(pre.id)}</div></div>`:''}

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Estado del equipo</div>
      <div class="flex-between-center" style="margin-bottom:6px">
        <span style="font-size:14px">🏃 ${esc(G.runner.name||'Corredor')}</span>
        <span style="color:#4a8a2a;font-size:13px">Listo ✓</span>
      </div>
      ${d?`<div class="flex-between-center">
        <span style="font-size:14px">🐕 ${esc(d.name)}</span>
        <span style="color:${d.bond>=cnRaceThreshold()?'#4a8a2a':'#c0392b'};font-size:13px">Vínculo ${d.bond}/100</span>
      </div>`:''}
    </div>

    ${(()=>{
      // Paso 6: la equipación se elige para esta carrera y los consumibles se gastan al salir
      const eq=G.cnEquipped||{},rs=G.cnRaceState||{},pack=rs.pack||{};
      const sel=cat=>(G.cnOwned[cat]||[]).map(id=>{const it=CN_EQUIP[cat].find(x=>x.id===id)||{};
        return`<button class="pz-opcion${eq[cat]===id?' sel':''}" onclick="cnSelectEquip('${cat}','${id}')"><b>${esc(it.name||id)}</b><div class="pz-efectos">${esc(it.desc||'')}</div></button>`;}).join('');
      return`<div class="pz">
        <div class="pz-label" style="margin:6px 0">Arnés</div>${sel('harness')}
        <div class="pz-label" style="margin:6px 0">Línea</div>${sel('line')}
        <div class="pz-label" style="margin:6px 0">Cinturón</div>${sel('belt')}
        <div class="pz-label" style="margin:10px 0 6px">Llevas</div>
        <div class="pz-tarjeta">${CN_CONSUMABLES.filter(c=>c.id!=='electrolytes').map(c=>{const n=Number(G.cnConsumables[c.id])||0;
          return`<label class="pz-fila" style="cursor:pointer"><input type="checkbox" class="pz-casilla" ${pack[c.id]?'checked':''} ${n||pack[c.id]?'':'disabled'} onchange="cnTogglePack('${c.id}')"><span class="pz-fila-txt"><b>${c.name}</b><div class="pz-efectos">${esc(c.desc)}</div></span><span class="pz-fila-dato">${n}</span></label>`;}).join('')}</div>
      </div>`;
    })()}

    <div class="card" style="margin-bottom:16px">
      <div class="sec-title-sm">Información de la carrera</div>
      <div style="font-size:13px;color:#555">Distancia: ${race.km}km · Tier ${race.tier}</div>
      <div style="font-size:13px;color:#555">Inscripción: €${race.cost} · Premio 1º: €${race.prize}</div>
      ${race.month===12||race.month===1?`<div style="font-size:12px;color:#4a90d9;margin-top:3px">❄️ Carrera invernal — posibles eventos de nieve</div>`:''}
    </div>

    ${(()=>{
      const rs=G.cnRaceState;
      if(!rs?.segs?.length)return'';
      const cnRaceObj={id:'cn_pre',km:rs.km,segs:rs.segs};
      return`<div class="card" style="margin-bottom:16px">
        <div style="font-size:14px;font-weight:600;margin-bottom:2px">${esc(race.name)}</div>
        <div style="font-size:12px;color:#888;margin-bottom:10px">${race.km}km · Tier ${race.tier} · ${esc(race.location)}</div>
        <div id="prof-wrap-cn-pre">${profSvg(cnRaceObj,-1,'preview',0,'cn-pre')}</div>
        <div id="prof-info-cn-pre" data-sel="-1" style="min-height:20px">${profSegInfo(cnRaceObj,null,'preview',0)}</div>
        ${profLeyenda(false)}
        <div style="font-size:12px;color:#888;margin-top:8px">${rs.rivals?.length||0} equipos rivales en carrera</div>
      </div>`;
    })()}


    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnGoToRace()">¡A correr! 🐕 →</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="G.screen='canicrossHub';G.activeTab='game';render()">← Volver</button>`;
  const rs=G.cnRaceState;
  if(rs?.segs?.length){
    const cnRaceObj={id:'cn_pre',km:rs.km,segs:rs.segs};
    attachProfHandlers(cnRaceObj,'cn-pre','preview',0);
  }
}

function renderCanicrossSegment(){
  const el=$main();
  const rs=G.cnRaceState;
  if(!rs||rs.done){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx];
  if(!race){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const d=cnActiveDog();
  const seg=rs.segs?.[rs.currentSeg];
  const kmDone=Math.round((race.km||8)*rs.currentSeg/rs.numSegs*10)/10;
  const kmLeft=Math.round(((race.km||8)-kmDone)*10)/10;
  const pct=Math.round(rs.currentSeg/rs.numSegs*100);
  const isLastSeg=rs.currentSeg+1>=rs.numSegs;
  const ev=rs.pendingEvent;
  const curBond=Math.max(0,Math.min(100,(rs.dogBond||0)+(rs.bondDelta||0)));

  const evBg={pos:'#eaf4ea',neg:'#fef0f0',special:'#fef9ec',rare:'#f0f6ff'}[ev?.eventType]||'#f5f4f0';
  const evBorder={pos:'#b8ddb8',neg:'#f5b8b8',special:'#e8c97a',rare:'#b8d4f0'}[ev?.eventType]||'#e8e6e0';

  // (aquí se calculaban segTypeLabel/Col/Bg — la etiqueta y los colores del tipo
  //  de tramo — y no se pintaban. Borrados en v92: profSegInfo() ya los muestra
  //  más abajo, con las mismas etiquetas y los mismos colores. No era interfaz
  //  que faltase, era un resto de antes de usar profSegInfo.)


  const lastLogEntry=rs.eventLog?.length>0&&!ev&&rs.eventLog[rs.eventLog.length-1].seg===rs.currentSeg-1?rs.eventLog[rs.eventLog.length-1]:null;
  // Paso 4: qué pasó en el tramo anterior, en una línea (sin números del perro)
  const lc=rs.lastCross;
  const crossTxt=lc&&rs.currentSeg>0?({coincide:'Ibais a lo mismo. La línea va tensa y suave.',coincideOrden:'Ibais a lo mismo; la orden sobraba.',
    difiere:'No ibais a lo mismo. La línea da tirones.',ordenAcertada:esc(d?.name||'El perro')+' hace caso a «'+cnCommandLabel(lc.cmd)+'».',
    ordenFallida:esc(d?.name||'El perro')+' no hace caso a «'+cnCommandLabel(lc.cmd)+'». Lo has forzado.'})[lc.caso]:'';

  el.innerHTML=`
    <div class="flex-between-center" style="margin-bottom:10px">
      <span style="font-size:12px;color:#999">${esc(race.name)} · Tramo ${rs.currentSeg+1}/${rs.numSegs}${isLastSeg?' · <strong style="color:#c07a10">último</strong>':''}${rs.tempReal!=null?` · ${cnSegTemp(rs,rs.currentSeg)} °C · ${CN_WEATHER_LABEL[(rs.weatherTimeline||[])[rs.currentSeg]]||''}`:''}</span>
      <span style="font-size:13px;font-weight:600">${fmt((rs.time||0)+(rs.timePenalty||0))}</span>
    </div>

    <div class="prog-wrap" style="margin-bottom:10px">
      <div class="prog-meta"><span>${kmDone}km hechos</span><span>${kmLeft}km restantes</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
    </div>

    ${(()=>{
      // Paso 4: la sincronía es la barra central; sustituye a «Salud» y «Energía» del perro.
      // Lo del perro no se enseña como número: lo dice su conducta, justo debajo.
      const sync=Math.round(rs.sync||0),legs=Math.round(Math.max(0,rs.runnerEnergy||0));
      const cls=v=>v<30?'menos':v<50?'ojo':'';
      return`<div class="pz-tarjeta pz" style="margin-bottom:10px">
        ${cnSyncGraph(sync)}
        <div class="pz-cab-fila" style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px"><span class="pz-label">Sincronía</span><span class="pz-num" style="font-size:22px">${sync}</span></div>
        <div class="pz-barra"><div class="pz-relleno ${cls(sync)}" style="width:${sync}%"></div><div class="pz-umbral" style="left:50%"></div></div>
        <div style="display:flex;justify-content:space-between;margin-top:10px" class="pz-efectos"><span>Tus piernas <span class="pz-num ${legs<40?'pz-ojo':''}">${legs}</span></span><span>Vínculo <span class="pz-num">${curBond}</span></span></div>
      </div>`;
    })()}
    ${rs.behaviour&&!rs.paceChosen&&!ev?`<div class="pz-tarjeta pz" style="margin-bottom:10px;border-color:var(--acc)">
      <div class="pz-etiqueta acento">${icono('perro')}Tramo ${rs.currentSeg+1}</div>
      <div style="font-size:16px;line-height:1.45">${cnBehaviourText(rs.behaviour.id)}</div>
    </div>`:''}

    ${crossTxt?`<div class="pz-diag ${lc.caso==='coincide'||lc.caso==='ordenAcertada'?'mas':lc.caso==='coincideOrden'?'':'menos'}" style="margin:0 2px 10px">${crossTxt}</div>`:''}
    ${cnLiveClassPanel(rs)}

    ${(()=>{
      if(!rs.segs?.length)return'';
      const cnRaceObj={id:'cn_race',km:rs.km,segs:rs.segs};
      return`<div class="card" style="margin-bottom:10px;padding:10px 10px 6px">
        <div id="prof-wrap-cn-race">${profSvg(cnRaceObj,rs.currentSeg,'race',rs.currentSeg,'cn-race')}</div>
        <div id="prof-info-cn-race" data-sel="${rs.currentSeg}" style="min-height:20px">${profSegInfo(cnRaceObj,rs.currentSeg,'race',rs.currentSeg)}</div>
      </div>`;
    })()}

    ${lastLogEntry?(()=>{
      const lev=lastLogEntry.event||{};
      const bg={pos:'#eaf4ea',neg:'#fef0f0',special:'#fef9ec',rare:'#f0f6ff'}[lev.eventType]||'#f5f4f0';
      const border={pos:'#b8ddb8',neg:'#f5b8b8',special:'#e8c97a',rare:'#b8d4f0'}[lev.eventType]||'#e8e6e0';
      const label={pos:'✨ Evento positivo',neg:'⚡ Evento',special:'🌟 Especial',rare:'💫 Raro'}[lev.eventType]||'📍 Evento';
      return`<div style="background:${bg};border:1px solid ${border};border-radius:10px;padding:12px;margin-bottom:10px"><div style="font-size:12px;color:#888;margin-bottom:3px">${label}</div><div style="font-size:14px;font-weight:600">${cnReplaceVars(lev.text||'')}</div></div>`;
    })():''}

    ${ev?`<div style="background:${evBg};border:1px solid ${evBorder};border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:14px;font-weight:600;margin-bottom:10px">${cnReplaceVars(ev.text||'')}</div>
      ${(ev.options||[]).map((opt,i)=>`<button class="main" style="margin-top:6px;font-size:13px" onclick="cnMakeDecision(${i})">${esc(opt.label)}</button>`).join('')}
    </div>`:''}

    ${!rs.paceChosen&&!ev?(()=>{
      // Paso 4: intención (obligatoria) y orden (opcional). La orden se lee al pulsar la intención.
      const raceDef=CANICROSS_RACES.find(x=>x.id===rs.raceId)||rs;
      const lvl=cnTeamLevel();
      const cmds=cnCommandsList().filter(c=>c.level>=1);
      const dots=n=>'●'.repeat(n)+'○'.repeat(3-n);
      return`<div class="pz">
        <div class="pz-label" style="margin:4px 0 6px">Orden (opcional)</div>
        ${cmds.length?`<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px">
          <label class="pz-chip" style="border:1px solid var(--line2);cursor:pointer"><input type="radio" name="cncmd" value="" checked> Ninguna</label>
          ${cmds.map(c=>`<label class="pz-chip" style="border:1px solid var(--line2);cursor:pointer" title="${esc(c.desc)}"><input type="radio" name="cncmd" value="${c.id}"> ${c.label} <span style="color:var(--ink3)">${dots(c.level)}</span></label>`).join('')}
        </div>`:`<div class="pz-sub">${esc(d?.name||'El perro')} aún no conoce ninguna orden: se enseñan con «Adiestramiento».</div>`}
        <div class="pz-label" style="margin-bottom:6px">Intención</div>
        ${CN_INTENTS.map(it=>{
          const tm=Math.round(cnSegTime(raceDef,seg||{km:(rs.km||8)/rs.numSegs,type:'flat'},lvl,it.time)/(0.85+0.003*(rs.sync||0)));
          return`<button class="pz-opcion" onclick="cnDecide('${it.id}')"><b>${it.label}</b> <span class="pz-efectos">· ${it.desc}</span><div class="pz-efectos" style="margin-top:3px">~${fmt(tm)} · piernas −${it.legs}</div></button>`;
        }).join('')}
      </div>`;
    })():''}


    ${(rs.bondDelta||0)!==0?`<div style="font-size:12px;color:#888;text-align:center;margin-top:10px">Vínculo acumulado: <span style="color:${(rs.bondDelta||0)>=0?'#4a8a2a':'#c0392b'};font-weight:600">${(rs.bondDelta||0)>=0?'+':''}${rs.bondDelta||0}</span></div>`:''}
  `;
  if(rs.segs?.length){
    const cnRaceObj={id:'cn_race',km:rs.km,segs:rs.segs};
    attachProfHandlers(cnRaceObj,'cn-race','race',rs.currentSeg);
  }
}

function renderCanicrossPostRace(){
  const el=$main();
  const rs=G.cnRaceState;
  if(!rs||!rs.done){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const d=cnActiveDog();
  const races=G.cnSelectedRaces||[];
  const doneIds=cnDoneIds();   // paso 5: también las suspendidas o no corridas
  const remaining=races.filter(r=>!doneIds.includes(r.id));
  const seasonDone=remaining.length===0;

  el.innerHTML=`
    <h2>🏁 Post-carrera</h2>
    <p class="sub">${esc(rs.raceName||'')}</p>

    <div class="finish-time" style="margin-bottom:14px">
      <div class="label">${rs.retired?'Tiempo al retiro':'Tiempo final'}</div>
      <div class="val">${rs.retired?'DNF':fmt(rs.finalTime||0)}</div>
    </div>

    ${!rs.retired?`<div class="card" style="margin-bottom:12px">
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">General</div><div class="stat-val">#${rs.finalPos||'—'}</div></div>
        <div class="stat"><div class="stat-label">${rs.finalCat||'Categoría'}</div><div class="stat-val" style="color:#4a90d9">#${rs.finalCatPos||'—'}<span style="font-size:11px;color:#aaa"> / ${rs.finalCatTotal||'—'}</span></div></div>
        <div class="stat"><div class="stat-label">Premio</div><div class="stat-val" style="color:${(rs.finalPrize||0)>0?'#2d7a2d':'#1a1a1a'}">€${rs.finalPrize||0}</div></div>
        <div class="stat"><div class="stat-label">Vínculo</div><div class="stat-val" style="color:${(rs.bondDelta||0)>=0?'#4a8a2a':'#c0392b'}">${(rs.bondDelta||0)>=0?'+':''}${rs.bondDelta||0}</div></div>
      </div>
    </div>`:''}

    ${(()=>{
      // Paso 3 (§ 4.7): el némesis tiene línea propia. Pieza nueva: tokens, sin hex.
      const nid=cnNemesisId();const nr=nid&&(rs.rivals||[]).find(x=>x.id===nid);
      if(!nr||rs.retired)return'';
      const t=cnRivalTime(nr);
      const txt=!Number.isFinite(t)?'abandonó':t<(rs.finalTime||0)?'llegó '+fmt((rs.finalTime||0)-t)+' antes que tú':'llegó '+fmt(t-(rs.finalTime||0))+' después que tú';
      return`<div class="pz-tarjeta pz" style="margin-bottom:12px"><div class="pz-label">Tu némesis</div><div class="pz-efectos"><b>${esc(nr.name)}</b> ${txt}.</div></div>`;
    })()}

    ${d?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Estado de ${esc(d.name)} tras la carrera</div>
      ${[['Vínculo',d.bond,'#c07a10'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
      ${d.injury?`<div class="danger" style="margin-top:8px">🤕 Lesión: ${d.injury} · ${d.injuryRaces} carrera(s) de baja</div>`:''}
    </div>`:''}

    ${rs.eventLog&&rs.eventLog.length>0?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Eventos de la carrera</div>
      ${rs.eventLog.slice(-4).map(e=>`<div class="event-box" style="margin-bottom:6px">${cnReplaceVars((e.event||{}).text||'')}</div>`).join('')}
    </div>`:''}

    ${seasonDone?
      `<button class="main" style="border-color:#4a8a2a;color:#2d7a2d" onclick="G.screen='canicrossSeasonBalance';render()">Cerrar temporada ${G.cnSeason} →</button>`:
      `<button class="main" onclick="G.screen='canicrossHub';G.activeTab='game';render()">Continuar temporada →</button>`}`;
}

function renderCnSeasonBalance(){
  const el=$main();
  const results=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason);
  const d=cnActiveDog();
  const totalPrize=results.reduce((a,r)=>a+(r.prize||0),0);
  const wins=results.filter(r=>r.pos===1).length;
  const podiums=results.filter(r=>r.pos&&r.pos<=3).length;
  const bondGain=results.reduce((a,r)=>a+(r.bondDelta||0),0);

  el.innerHTML=`
    <h2>📊 Fin de temporada ${G.cnSeason||1}</h2>
    <p class="sub">${esc(G.runner.name||'Corredor')} &amp; ${d?esc(d.name):'—'}</p>

    <div class="card" style="margin-bottom:12px">
      <div class="stat-grid">
        <div class="stat"><div class="stat-label">Carreras</div><div class="stat-val">${results.length}</div></div>
        <div class="stat"><div class="stat-label">Victorias</div><div class="stat-val">${wins}</div></div>
        <div class="stat"><div class="stat-label">Podios</div><div class="stat-val">${podiums}</div></div>
      </div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Economía</div>
      <div class="fin-row"><span>Premios cobrados</span><span class="plus">+€${totalPrize}</span></div>
      <div class="fin-row"><span>Patrocinio (al empezar la siguiente)</span><span class="plus">+€${cnSponsorIncome()}</span></div>
      <div class="fin-row"><span>Presupuesto final</span><span class="${(G.cnMoney||0)>=0?'plus':'minus'}">€${G.cnMoney||0}</span></div>
    </div>

    ${(()=>{
      // Paso 7: el circuito de la temporada
      const st=cnCircuitStanding();if(!(G.cnCircuitPoints||0)&&st.length<2)return'';
      const yo=st.findIndex(x=>x.me);
      return`<div class="pz-tarjeta pz"><div class="pz-label">Circuito</div>
        ${st.slice(0,3).map((x,i)=>`<div class="pz-fila"><span class="pz-num">${i+1}.º</span><span class="pz-fila-txt">${x.me?'<b>Tú</b>':esc(x.name)}</span><span class="pz-fila-dato">${x.pts} pts</span></div>`).join('')}
        ${yo>2?`<div class="pz-fila"><span class="pz-num">${yo+1}.º</span><span class="pz-fila-txt"><b>Tú</b></span><span class="pz-fila-dato">${st[yo].pts} pts</span></div>`:''}
      </div>`;
    })()}
    ${d?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">🐕 ${esc(d.name)} · Temporada ${G.cnSeason}</div>
      ${[['Vínculo',d.bond,'#c07a10'],['Velocidad',d.speed,'#4a90d9'],['Resistencia',d.stamina,'#4a8a2a'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
      <div style="font-size:12px;color:#888;margin-top:8px">Vínculo máximo: ${d.peakBond||0} · Km juntos: ${d.kmTogether||0} · Vínculo ganado esta temporada: ${bondGain>=0?'+':''}${bondGain}</div>
      ${(d.age||1)>=5?`<div class="warn" style="margin-top:8px">🦴 ${esc(d.name)} tendrá ${(d.age||1)+1} años la próxima temporada. Considera su bienestar.</div>`:''}
    </div>`:''}

    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnEndSeason()">Comenzar temporada ${(G.cnSeason||1)+1} →</button>`;
}

function renderCnDogRetirement(){
  // Paso 7 (§ 4.13-4.14): el retiro dice el destino, y puede abrir el tuyo
  hideChrome();
  const d=cnDogs().slice().reverse().find(x=>x.retired&&x.id===G.activeDogId)||cnActiveDog();if(!d)return;
  const seasons=d.seasonsWithYou||Math.max(1,(G.cnSeason||1)-(d.birthSeason||1)+1);
  const tuyo=cnRunnerCanRetire();
  const proteVieja=cnDogs().find(x=>x.adoptionOrigin==='rescate');
  $main().innerHTML=`<div class="pz">
    <div class="pz-franja cierre"><div class="pz-franja-num" style="font-size:44px">${esc(d.name)}</div>
      <div class="pz-franja-sub">${seasons} temporada${seasons!==1?'s':''} · ${d.races||0} carreras · ${d.kmTogether||0} km juntos</div></div>
    <p class="pz-sub" style="font-size:16px;color:var(--ink)">${cnDestinyText(d)}</p>
    <div class="pz-tarjeta pz-estado"><div class="pz-linea"><span class="pz-efectos">Vínculo más alto: <span class="pz-num">${d.peakBond||0}</span></span></div></div>
    ${tuyo?`<div class="pz-consejo">${icono('corredor')}<div><b>Has acompañado a ${cnDogs().filter(x=>x.retired).length} perros de principio a fin.</b> Sabes leerlos mejor que la mayoría.${proteVieja?' En la protectora de la que sacaste a '+esc(proteVieja.name)+' hay quince que nadie sabe leer.':''}</div></div>`:''}
    <button class="pz-btn" onclick="cnNewDogAfterRetirement()">Buscar un nuevo compañero</button>
    ${tuyo?`<button class="pz-btn sec" onclick="cnRunnerRetire()">Retirarte tú también</button>`:''}
  </div>`;
}


function renderCnDisplasia(){
  const el=$main();
  const d=cnActiveDog();if(!d)return;
  el.innerHTML=`
    <h2>🩺 Diagnóstico veterinario</h2>
    <p class="sub">${esc(d.name)}</p>
    <div class="danger" style="margin-bottom:14px">El veterinario detecta <strong>displasia de cadera</strong> en ${esc(d.name)}. Necesitas tomar una decisión.</div>
    <div class="card work-card" style="cursor:pointer;margin-bottom:8px" onclick="cnResolveDislasia('treat')">
      <div class="card-title">💊 Tratamiento intensivo — €300</div>
      <div class="card-sub">Permite 1-2 temporadas más. Stats -15%.</div>
    </div>
    <div class="card work-card" style="cursor:pointer;margin-bottom:8px" onclick="cnResolveDislasia('retire')">
      <div class="card-title">🐕 Retiro tranquilo</div>
      <div class="card-sub">Una vida plena fuera de la competición. La opción más justa para él.</div>
    </div>
    <div class="card work-card" style="cursor:pointer;border-color:#f5b8b8" onclick="cnResolveDislasia('ignore')">
      <div class="card-title" style="color:#c0392b">⚠ Ignorar y seguir</div>
      <div class="card-sub">1 temporada más. Health -5/mes. El perro nota que no le cuidas (-vínculo).</div>
    </div>`;
}

// ── PARTIDA DE ANTES DEL REDISEÑO ─────────────────────────────────────────
// migrateState() trae aquí una partida de Canicross guardada con una revisión menor que
// CN_REV. No se intenta jugar: el modo se está reescribiendo y su ficha ya avisaba.
// Pantalla nueva: nace con la dirección visual (piezas pz-*, tokens, sin hex).
function renderCnAntigua(){
  hideChrome();
  const nombre=(G.runner&&G.runner.name)?esc(G.runner.name):'';
  $main().innerHTML=`<div class="pz">
    <div class="pz-etiqueta acento">${icono('perro')}Canicross · en obras</div>
    <div class="pz-titulo">Esta partida es de antes del rediseño</div>
    <p class="pz-sub">Canicross se está reescribiendo entero y sus partidas guardadas no pasan a la versión nueva${nombre?` (la de ${nombre} tampoco)`:''}. La ficha del modo lo avisaba.</p>
    <div class="pz-tarjeta pz-estado">
      <div class="pz-linea"><span class="pz-diag">Tus otras partidas y tus logros siguen igual.</span></div>
      <div class="pz-linea"><span class="pz-diag">Esta ranura no se borra sola: si ya no la quieres, bórrala en Partidas.</span></div>
    </div>
    <button class="pz-btn" onclick="cnAntiguaNueva()">Empezar una de Canicross nueva</button>
    <button class="pz-btn sec" onclick="cnAntiguaVolver()">Volver a partidas</button>
  </div>`;
}
// Las dos salidas empiezan de cero y sin ranura (así no se pisa la vieja sin preguntar).
window.cnAntiguaNueva=()=>{G=freshState();G.gameMode='canicross';G.screen='intro';render();};
window.cnAntiguaVolver=()=>{G=freshState();G.screen='saveScreen';render();};

// ── LA MAÑANA DE LA CARRERA (paso 5 · § 4.8) ─────────────────────────────────
// Pantalla nueva con las piezas del sistema visual. Tres casos: suspendida por calor, el
// perro no se levanta (sin decisión) y una condición de salud con cuatro salidas.
function renderCnRaceMorning(){
  hideChrome();
  const rs=G.cnRaceState,d=cnActiveDog();
  if(!rs||!rs.morning||!d){G.screen='canicrossHub';G.activeTab='game';render();return;}
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx]||{};
  const m=rs.morning.type;
  const cab=`<div class="pz-etiqueta acento">${icono('perro')}${esc(race.name||'')} · ${rs.tempReal} °C</div>`;
  let body='';
  if(m==='calor'){
    body=`<div class="pz-titulo">Prueba suspendida por calor</div>
      <p class="pz-sub">Hoy hace ${rs.tempReal} °C. Por encima de ${CN_HEAT_CANCEL} °C la organización suspende la carrera: con ese calor un perro corriendo puede sufrir un golpe de calor. Es una protección para ellos, no un castigo.</p>
      <div class="pz-tarjeta pz-estado"><div class="pz-linea"><span class="pz-diag">La inscripción (€${race.cost||0}) no se devuelve.</span></div></div>
      <button class="pz-btn" onclick="cnMorningChoice('volver')">Volver</button>`;
  }else if(m==='negativa'){
    body=`<div class="pz-titulo">${cnReplaceVars('Le pones el arnés. [DOG] no se levanta.')}</div>
      <p class="pz-sub">Hoy no corréis.</p>
      <button class="pz-btn sec" onclick="cnMorningChoice('volver')">Volver a casa</button>`;
  }else{
    const c=cnConditionDef(d)||{text:''};
    const puedeForzar=(G.cnMoney||0)>=35,puedeCuidar=(G.cnMoney||0)>=15;
    body=`<div class="pz-titulo">La mañana de la carrera</div>
      <p class="pz-sub" style="font-size:16px;color:var(--ink)">${cnReplaceVars(c.text)}</p>
      <button class="pz-opcion" onclick="cnMorningChoice('nocorrer')"><b>No correr</b><div class="pz-efectos">Pierdes la inscripción (€${race.cost||0}). ${esc(d.name)} se recupera normal.</div></button>
      <button class="pz-opcion${puedeCuidar?'':' pz-bloqueado'}" ${puedeCuidar?`onclick="cnMorningChoice('cuidado')"`:''}><b>Cuidarle</b><div class="pz-efectos">Comida blanda, electrolitos, vendaje: €15. Suele aliviar; a veces no basta.</div>${puedeCuidar?'':'<div class="pz-motivo">Te faltan €'+(15-(G.cnMoney||0))+'</div>'}</button>
      <button class="pz-opcion" onclick="cnMorningChoice('salir')"><b>Salir igual</b><div class="pz-efectos">Corréis con lo que tenga. Puede empeorar.</div></button>
      <button class="pz-opcion${puedeForzar?'':' pz-bloqueado'}" ${puedeForzar?`onclick="cnMorningChoice('forzar')"`:''}><b>Forzar</b><div class="pz-efectos">Un antiinflamatorio: €35. Hoy no se le nota, pero <span class="pz-menos">−8</span> de vínculo siempre, y si algo sale mal la lesión es peor.</div>${puedeForzar?'':'<div class="pz-motivo">Te faltan €'+(35-(G.cnMoney||0))+'</div>'}</button>`;
  }
  $main().innerHTML=`<div class="pz">${cab}${body}</div>`;
}
window.cnMorningChoice=opt=>{
  const rs=G.cnRaceState,d=cnActiveDog();if(!rs||!d)return;
  const race=(G.cnSelectedRaces||[])[G.cnCurrentRaceIdx]||{};
  const aCasa=()=>{G.cnRaceState=null;G.screen='canicrossHub';G.activeTab='game';autoSave();render();};
  if(opt==='volver'){aCasa();return;}
  if(opt==='nocorrer'){
    G.cnMoney=(G.cnMoney||0)-(race.cost||0);
    if(!Array.isArray(G.cnCancelledRaces))G.cnCancelledRaces=[];
    G.cnCancelledRaces.push({raceId:race.id,season:G.cnSeason,why:'baja'});
    aCasa();return;
  }
  if(opt==='cuidado'){
    // Paso 6: un sobre de electrolitos; si no te quedan, lo compras ahí mismo
    if(Number(G.cnConsumables.electrolytes)>0)G.cnConsumables.electrolytes--;
    else G.cnMoney=(G.cnMoney||0)-8;
    if(d.condition&&Math.random()<0.6){
      d.condition.severity-=1;
      if(d.condition.severity<=0){d.condition=null;showToast('Funciona: '+esc(d.name)+' está mejor');}
      else showToast('Algo mejor, no del todo');
    }else showToast('Hoy no ha bastado');
  }
  if(opt==='forzar'){
    G.cnMoney=(G.cnMoney||0)-35;rs.forced=true;d.forcedRaces=(d.forcedRaces||0)+1;
    d.bond=Math.max(0,(d.bond||0)-8);   // incondicional: el perro lo nota
  }
  if(opt!=='forzar')rs.couldForce=true;   // paso 7: tuvo algo, pudiste forzar y no lo hiciste
  rs.morning=null;G.screen='canicrossPreRace';render();
};

// ── ESTRECHEZ (paso 6 · § 4.11) ─────────────────────────────────────────────
function renderCnQuiebra(){
  hideChrome();
  $main().innerHTML=`<div class="pz">
    <div class="pz-franja negativo"><div class="pz-franja-num">${fmtEur(G.cnMoney||0)}</div><div class="pz-franja-sub">Por debajo de ${fmtEur(CN_BROKE_LINE)}: así no llegáis a marzo</div></div>
    <p class="pz-sub">No se acaba nada: toca apretarse. Elige una.</p>
    <button class="pz-opcion" onclick="cnBrokeChoice('inscripciones')"><b>Renunciar a las inscripciones que quedan</b><div class="pz-efectos">No pagas las carreras que faltan; tampoco las corres.</div></button>
    <button class="pz-opcion" onclick="cnBrokeChoice('vender')"><b>Vender la equipación</b><div class="pz-efectos">A mitad de precio. Te quedas con lo básico.</div></button>
    <button class="pz-opcion" onclick="cnBrokeChoice('minima')"><b>Manutención mínima</b><div class="pz-efectos">€20 al mes hasta fin de temporada. Al perro le cuesta <span class="pz-menos">−5</span> de salud cada mes.</div></button>
    <button class="pz-btn sec" style="margin-top:8px" onclick="G.screen='canicrossHub';G.activeTab='game';render()">Seguir así</button>
  </div>`;
}

// ── LAS SEÑAS DEL MODO (paso 7 · § 8.2) ─────────────────────────────────────
// 1. Franja del compañero, arriba en las pantallas de Canicross (la pone triggerFade).
function cnCompanionStrip(){
  if(!G.canicrossMode||typeof G.screen!=='string'||!G.screen.startsWith('canicross'))return '';
  if(['canicrossCreateDog','canicrossAntigua','canicrossEpilogo','canicrossDogRetirement'].includes(G.screen))return '';
  const d=cnActiveDog();if(!d||d.retired)return '';
  const m=cnMood(d.mood);
  // cara de ánimo: icono, nunca número
  const boca=m>=60?'M8 14.5c1.2 1.6 2.6 2.3 4 2.3s2.8-.7 4-2.3':m>=35?'M8.5 15.5h7':'M8 16.5c1.2-1.4 2.6-2 4-2s2.8.6 4 2';
  const estado=d.injury?'De baja':d.condition?'Algo le pasa':'En forma';
  const casa=cnHomeDogs()[0];
  return `<div class="cn-franja pz"><svg class="ico" viewBox="0 0 24 24" aria-label="Ánimo"><circle cx="12" cy="12" r="8.5"/><circle cx="9.3" cy="10" r=".6"/><circle cx="14.7" cy="10" r=".6"/><path d="${boca}"/></svg>
    <b>${esc(d.name)}</b><span class="pz-efectos">· ${estado}</span>${casa?`<span class="pz-efectos" style="margin-left:auto">en casa: ${esc(casa.name)}</span>`:''}</div>`;
}
// 2. El gráfico de dos líneas: la cadencia del perro y la tuya; desfasadas y con la línea
// tensa cuando la sincronía baja. No hace falta mirar el número.
function cnSyncGraph(sync){
  const W=300,H=64,ph=(100-sync)*0.018,amp=6;
  const wave=(y,off)=>{let p='';for(let x=0;x<=W;x+=6){const yy=y+Math.sin(x/16+off)*amp;p+=(x?'L':'M')+x+' '+yy.toFixed(1);}return p;};
  const sag=-18*(sync/100);   // de floja (−18) a recta (0)
  const col=sync>=60?'var(--pos)':sync>=35?'var(--avi-bar)':'var(--neg)';
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:${H}px;display:block;margin-bottom:6px" aria-hidden="true">
    <path d="${wave(14,0)}" style="fill:none;stroke:var(--acc);stroke-width:2"/>
    <path d="${wave(50,ph)}" style="fill:none;stroke:var(--ink2);stroke-width:2"/>
    <path d="M136 20 Q ${(150+sag*2).toFixed(1)} ${(32-sag).toFixed(1)} 164 44" style="fill:none;stroke:${col};stroke-width:${sync>=60?1.75:2.75};stroke-linecap:round"/>
  </svg>`;
}
// 3. El cuaderno (§ 4.3): revelación progresiva y la nota del jugador.
window.cnSaveNote=(id,txt)=>{
  if(!G.cnNotebook||!G.cnNotebook[id])return;
  G.cnNotebook[id].note=String(txt||'').slice(0,280);G.cnNotebook[id].about=null;autoSave();
};
function cnNotebookCorrelation(n){
  const ctx=n.ctx||[],out=n.out||[];
  const temps=ctx.map(c=>c.temp).filter(t=>t!=null);
  const ter={climb:0,descent:0,flat:0};ctx.forEach(c=>{if(ter[c.terrain]!=null)ter[c.terrain]++;});
  const parts=[];
  if(temps.length)parts.push(`Las ${ctx.length} veces, entre ${Math.min(...temps)} y ${Math.max(...temps)} °C.`);
  const t=Object.entries(ter).filter(([,v])=>v).map(([k,v])=>v+' en '+({climb:'subida',descent:'bajada',flat:'llano'}[k]));
  if(t.length)parts.push(t.join(', ')+'.');
  ['conservar','mantener','apretar'].forEach(k=>{
    const o=out.filter(x=>String(x.chose).startsWith(k));if(!o.length)return;
    const b=o.filter(x=>x.result==='good').length;
    parts.push(`Las ${o.length} veces que elegiste ${k}: ${b} salió bien, ${o.length-b} no.`);
  });
  return parts.join(' ');
}
function renderCnNotebook(){
  const d=cnActiveDog();
  const ents=Object.entries(G.cnNotebook||{}).filter(([,n])=>n.seen>0||n.note).sort((a,b)=>b[1].seen-a[1].seen);
  $main().innerHTML=`<div class="pz">
    <div class="pz-titulo">El cuaderno${d?' de '+esc(d.name):''}</div>
    <p class="pz-sub">Lo que has visto hacer al perro y cómo salió. El cuaderno no saca conclusiones: las sacas tú.</p>
    <div class="cn-cuaderno">
      ${ents.length?ents.map(([id,n])=>{
        const ctx=n.ctx||[];
        const det=n.seen>=4?`<div class="cn-cuaderno-ctx">${cnNotebookCorrelation(n)}</div>`
          :n.seen>=2?`<div class="cn-cuaderno-ctx">${ctx.map(c=>`T${c.season} · ${c.temp} °C${c.terrain?' · '+({climb:'subida',descent:'bajada',flat:'llano'}[c.terrain]):''}`).join(' — ')}</div>`
          :n.seen===1?`<div class="cn-cuaderno-ctx">Temporada ${(ctx[0]||{}).season||G.cnSeason}</div>`:'';
        return`<div class="cn-cuaderno-entrada"><div>${cnBehaviourText(id)} <span class="cn-cuaderno-ctx">(${n.seen} ${n.seen===1?'vez':'veces'})</span></div>${det}
          ${n.about?`<div class="cn-cuaderno-ctx">Escrito sobre ${esc(n.about)}:</div>`:''}
          <textarea class="cn-cuaderno-nota" maxlength="280" placeholder="Tu nota…" onchange="cnSaveNote('${id}',this.value)">${esc(n.note||'')}</textarea></div>`;
      }).join(''):'<div class="cn-cuaderno-ctx">Aún no has apuntado nada. Corred juntos.</div>'}
    </div>
    <button class="pz-btn sec" style="margin-top:12px" onclick="G.screen='canicrossHub';G.activeTab='runner';render()">Volver</button>
  </div>`;
}
function cnDestinyText(x){return (CN_DESTINY_TEXT[x.destiny]||'').replace(/\[DOG\]/g,esc(x.name));}
// ── EPÍLOGO (paso 7 · § 4.14) ─────────────────────────────────────────────
// Final provisional: todos tus perros y qué fue de cada uno. Bisagra de la Protectora.
function renderCnEpilogo(){
  hideChrome();
  const perros=cnDogs();
  $main().innerHTML=`<div class="pz">
    <div class="pz-franja cierre"><div class="pz-franja-num" style="font-size:40px">${esc(G.runner.name||'Tú')}</div>
      <div class="pz-franja-sub">${G.cnSeason||1} temporadas · ${perros.length} perro${perros.length!==1?'s':''} · ${perros.reduce((a,x)=>a+(x.kmTogether||0),0)} km</div></div>
    ${perros.map(x=>`<div class="pz-tarjeta"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:17px">${esc(x.name)}</b><span class="pz-efectos">${(CN_BREED_MODS[x.breed]||{}).label||''}</span></div>
      <div class="pz-efectos" style="margin:4px 0">${x.seasonsWithYou||1} temporada${(x.seasonsWithYou||1)!==1?'s':''} contigo · ${x.races||0} carreras · ${x.kmTogether||0} km · vínculo más alto ${x.peakBond||0}</div>
      <div>${x.destiny?cnDestinyText(x):esc(x.name)+' sigue contigo.'}</div></div>`).join('')}
    <button class="pz-btn" onclick="backToMainMenu()">Volver al menú</button>
  </div>`;
}

// ── CALIBRACIÓN (rediseño, paso 8 · § 12) ─────────────────────────────────────
// Corre n carreras de cada tier con un equipo de nivel `level` y devuelve la distribución
// de posiciones: lo que hace falta para ajustar CN_TIER_LEVELS contra una tabla y no contra
// una intuición. No toca la partida: deja G.cnRivals y G.cnSeasonShift como estaban.
function cnCalibrate(level,n,intentId,sync){
  const intent=CN_INTENTS.find(x=>x.id===(intentId||'mantener'))||CN_INTENTS[1];
  const fs=0.85+0.003*(sync==null?60:sync);
  const keep=JSON.stringify({r:G.cnRivals||{},s:G.cnSeasonShift||{}});
  const out={};
  try{
    [1,2,3,4].forEach(tier=>{
      const races=CANICROSS_RACES.filter(r=>r.tier===tier);
      const pos=[];let campo=0;
      for(let k=0;k<n;k++){
        const race=races[k%races.length];
        if(k%5===0)G.cnSeasonShift={};   // una «temporada» cada cinco carreras
        const rv=cnGenerateRivals(race);
        const my=race.segs.reduce((a,sg)=>a+cnSegTime(race,sg,level,intent.time),0)/fs;
        pos.push(rv.filter(r=>cnRivalTime(r)<my).length+1);campo+=rv.length+1;
      }
      const pct=f=>Math.round(pos.filter(f).length/pos.length*100);
      out[tier]={win:pct(p=>p===1),podio:pct(p=>p<=3),top5:pct(p=>p<=5),media:Math.round(pos.reduce((a,b)=>a+b,0)/pos.length*10)/10,campo:Math.round(campo/n)};
    });
  }finally{
    const k=JSON.parse(keep);G.cnRivals=k.r;G.cnSeasonShift=k.s;
  }
  return out;
}
