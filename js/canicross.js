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

const CN_PACES=[
  {id:'suave',   label:'Suave',         desc:'Conserváis energía juntos',      timeMult:1.18, energyCost:5,  dogCost:4,  bondMod:2 },
  {id:'ritmo',   label:'Ritmo conjunto',desc:'Equilibrado — buena sincronía',  timeMult:1.00, energyCost:10, dogCost:8,  bondMod:0 },
  {id:'apretar', label:'Apretar',       desc:'Rápido, el perro va al límite',  timeMult:0.90, energyCost:17, dogCost:14, bondMod:-2},
  {id:'atope',   label:'A tope',        desc:'Máximo esfuerzo — riesgo real',  timeMult:0.82, energyCost:25, dogCost:21, bondMod:-5},
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
    commands:{left:false,hold:false,forward:false},
  };
}

function cnComputeDogStats(){
  const results=G.cnRaceResults||[];
  const finished=results.filter(r=>!r.dnf);
  return{
    victories:finished.filter(r=>r.pos===1).length,
    podiums:finished.filter(r=>r.pos&&r.pos<=3).length,
    bestTime:finished.length>0?Math.min(...finished.map(r=>r.time)):null,
  };
}
function cnGetEquipMods(){
  const eq=G.equipment||{};
  const harness=(CANICROSS_EQUIPMENT.dogHarness||[]).find(e=>e.id===eq.dogHarness)||{};
  const belt=(CANICROSS_EQUIPMENT.humanBelt||[]).find(e=>e.id===eq.humanBelt)||{};
  const line=(CANICROSS_EQUIPMENT.line||[]).find(e=>e.id===eq.line)||{};
  return{speedMod:harness.speedMod||0,staminaMod:harness.staminaMod||0,injuryRisk:belt.injuryRiskMod||0,jerkMod:line.jerkMod||0};
}

function cnCanRace(){
  const d=cnActiveDog();
  if(!d||d.retired)return false;
  if(d.injury&&d.injuryRaces>0)return false;
  if(d.bond<cnRaceThreshold())return false; // T142 (v91): el umbral vivía aquí y en cnRaceThreshold()
  return true;
}

function cnRaceThreshold(){return(G.cnSeason||1)===1?20:30;}

function cnNextCommand(){
  if(!cnActiveDog())return null;
  const c=cnActiveDog().commands;
  if(!c.left)return 'left';
  if(!c.hold)return 'hold';
  if(!c.forward)return 'forward';
  return null;
}

function cnCommandLabel(id){return{left:'Izquierda',hold:'Aguanta',forward:'Adelante'}[id]||id;}

function cnCommandsList(){
  if(!cnActiveDog())return[];
  const c=cnActiveDog().commands||{};
  return[{id:'left',label:'Izquierda',learned:c.left},{id:'hold',label:'Aguanta',learned:c.hold},{id:'forward',label:'Adelante',learned:c.forward}];
}

function cnDogAgeLabel(){
  const y=cnActiveDog()?cnActiveDog().age:0;
  return y===1?'1 año':y+' años';
}

function cnMonthlyDogCost(){
  let c=40;
  if(G.cnDogFoodPremium)c+=30;
  if(G.cnDogSupplements)c+=25;
  return c;
}

// ── RELOJ (rediseño, paso 2 · TG-Diseno-Canicross § 4.12) ───────────────────
// Antes, G.cnWeek y una tabla de semanas → mes (cnCurrentMonth). Dos fallos salieron de ahí:
// el primer «Avanzar» que no cambiaba de mes (B5, BUG-17) y marzo, que no terminaba nunca
// (CR-75). Ahora el mes es G.cnMonthIdx (0 = octubre … 5 = marzo; 6 = temporada terminada)
// y G.cnMonthWeek las semanas ya gastadas dentro del mes (vacaciones: de una en una).
function cnMonth(){return CN_MONTHS[Math.max(0,Math.min(5,Number(G.cnMonthIdx)||0))];}
function cnSeasonOver(){return (Number(G.cnMonthIdx)||0)>=6;}
// Cierra el mes: cobra la manutención del perro y pasa al siguiente (tras marzo, a 6).
function cnEndMonth(){
  const cost=cnMonthlyDogCost();
  G.cnMoney=Math.max(0,(G.cnMoney||0)-cost);
  G.cnMonthIdx=Math.min(6,(Number(G.cnMonthIdx)||0)+1);G.cnMonthWeek=0;
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

function cnGenerateRivals(race){
  const n=(race.tier||1)*4+Math.floor(Math.random()*4)+3;
  const base={1:360,2:390,3:415,4:440}[race.tier||1]||390;
  // T117 (v92): sort(()=>Math.random()-0.5) no da una permutación uniforme.
  // shuffle() de render-core.js ya es Fisher-Yates. Da igual el orden de carga:
  // esto se llama en partida, no al evaluar el fichero.
  const pool=shuffle([...CN_RIVAL_NAMES]).slice(0,Math.min(n,CN_RIVAL_NAMES.length));
  while(pool.length<n)pool.push('Equipo #'+(pool.length+1));
  return pool.map(name=>{
    const skill=0.80+Math.random()*0.40;
    // Realistic age distribution: mostly 25-50
    const age=Math.round(18+Math.random()*45);
    return{name,estimatedTime:Math.round(base/skill*(race.km||8)),age};
  });
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
    rs.time=Math.max(1,Math.min(...rs.rivals.map(r=>r.estimatedTime))-60);
  }

  const totalBond=rs.bondDelta||0;
  const prevBond=d.bond||0;
  d.bond=Math.max(0,Math.min(100,d.bond+totalBond));
  d.peakBond=Math.max(d.peakBond||0,d.bond);
  // Bond recovery tracking
  if(prevBond<30)G._cnBondMinReached=true;
  if(G._cnBondMinReached&&d.bond>70)G._cnBondRecovered=true;

  let totalTime=Math.round((rs.time||0)+(rs.timePenalty||0));
  const rivals=rs.rivals||[];
  const pos=Math.max(1,rivals.filter(r=>r.estimatedTime<totalTime).length+1);
  const myAge=G.runner.age||28;
  const myCat=cnGetCategory(myAge);
  const catRivals=rivals.filter(r=>cnGetCategory(r.age||30).id===myCat.id);
  const catPos=Math.max(1,catRivals.filter(r=>r.estimatedTime<totalTime).length+1);

  // T07 (v82): race es `||{}` en la línea 235, así que race.prize puede ser
  // undefined. Sin el ||0, una 1.ª posición con la carrera fuera de rango metía
  // undefined en cnMoney y todos los importes del modo pasaban a NaN para
  // siempre. race.cost sí lo llevaba (línea 272): aquí se había olvidado.
  const rPrize=race.prize||0;
  const prize=rs.retired?0:(pos===1?rPrize:pos===2?Math.round(rPrize*0.6):pos===3?Math.round(rPrize*0.4):0);

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
  G.cnMoney=Math.max(0,(G.cnMoney||0)-(race.cost||0));
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
    catPos,
  });

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
  G.cnTrainingBlock=null;G.cnMonthIdx=0;G.cnMonthWeek=0;
  G.cnVacationDays=15;G.cnVacationUsed=0;G.cnVacationThisSeason=0;G.cnOpenMonths=[];G.cnOpenSeasonMonths=[...CN_MONTHS];
  G.cnTrainAdrainSessions={left:0,hold:0,forward:0};
  G.equipment={dogHarness:'basic_harness',humanBelt:'basic_belt',line:'soft_line'};
  G.cnOwnedEquipment={dogHarness:['basic_harness'],humanBelt:['basic_belt'],line:['soft_line']};
  G.cnDogFoodPremium=false;G.cnDogSupplements=false;
  G.cnVetHistory=[];G.cnBirthdayToastShown={};G.cnRaceState=null;
  G.dogs=[];G.activeDogId=null;G.cnNextDogId=1;G.cnRev=CN_REV;G._cnDogBreed=null;G._cnDogName=null;
  G.screen='canicrossCreateDog';
  render();
};

window.doCreateDog=()=>{
  const nm=document.getElementById('dogname');
  const name=(nm?nm.value:'').trim();
  if(!name){showToast('Ponle nombre al perro primero');return;}
  if(!G._cnDogBreed){showToast('Elige una raza');return;}
  if(!G._cnAdoptionOrigin){showToast('Elige cómo llegó el perro a ti');return;}
  cnAddDog(cnInitDog(name,G._cnDogBreed));
  // Apply adoption origin bond
  const origin=CN_ADOPTION_ORIGINS.find(o=>o.id===G._cnAdoptionOrigin);
  if(origin){
    cnActiveDog().bond=origin.bondStart;
    cnActiveDog().peakBond=origin.bondStart;
    cnActiveDog().adoptionOrigin=G._cnAdoptionOrigin;
    if(G._cnAdoptionOrigin==='retirado')cnActiveDog().commands.forward=true;
  }
  G.cnPreseasonDone=[];
  G._cnDogBreed=null;G._cnDogName=null;G._cnAdoptionOrigin=null;
  G.activeTab='game';G.screen='canicrossPreseason';
  autoSave();
  showToast('¡'+esc(cnActiveDog().name)+' se une a tu equipo! 🐕');
  render();
};

window.cnSelectBreed=breed=>{G._cnDogBreed=breed;const nm=document.getElementById('dogname');if(nm)G._cnDogName=nm.value;render();};
window.cnSelectTraining=id=>{G.cnTrainingBlock=id;render();};

window.cnConfirmTraining=()=>{
  if(!G.cnTrainingBlock){showToast('Elige un bloque de entrenamiento');return;}
  G.screen='canicrossCalendarSetup';render();
};

window.cnChangeVacDays=delta=>{
  const used=G.cnVacationUsed||0;
  const total=G.cnVacationDays||15;
  const planned=G.cnVacationPlanned||0;
  const next=Math.max(0,Math.min(total-used,planned+delta));
  G.cnVacationPlanned=next;render();
};

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

window.cnAdvanceRestWeek=()=>{
  const daysLeft=(G.cnVacationDays||0)-(G.cnVacationUsed||0);
  if(daysLeft<=0){showToast('Sin días de vacaciones disponibles');return;}
  const d=cnActiveDog();
  const days=Math.min(7,daysLeft);
  const healthBonus=Math.round(days*1.2);
  const bondBonus=Math.round(days*0.6);
  const mentalBonus=Math.round(days*0.8);
  if(d){
    d.health=Math.min(100,(d.health||100)+healthBonus);
    d.bond=Math.min(100,(d.bond||0)+bondBonus);
    d.peakBond=Math.max(d.peakBond||0,d.bond);
  }
  if(G.runner?.stats?.mental!==undefined)bumpStat(G.runner,'mental',mentalBonus);
  G.cnVacationUsed=(G.cnVacationUsed||0)+days;
  // Una semana de las cuatro del mes; con la cuarta, el mes se cierra.
  G.cnMonthWeek=(Number(G.cnMonthWeek)||0)+1;
  if(G.cnMonthWeek>=4){
    const cost=cnEndMonth();
    showToast('Gastos del perro: -€'+cost+'/mes');
  }
  autoSave();render();
  setTimeout(()=>showToast(days+'d de vacaciones — '+esc(d?.name||'el perro')+' descansa ✓'),150);
};

function cnApplyOneWeekTraining(){
  const block=(CANICROSS_TRAINING_BLOCKS||[]).find(b=>b.id===G.cnTrainingBlock);
  if(!block)return;
  const d=cnActiveDog();
  // statCapMult: mismo techo blando por dificultad que Clásico/Entrenador — el
  // corredor también entrena de verdad en Canicross (CR-34, v74).
  Object.entries(block.runnerMod||{}).forEach(([k,v])=>{
    if(G.runner.stats[k]!==undefined){
      const capM=statCapMult(G.runner.stats[k]);
      G.runner.stats[k]=Math.max(10,Math.min(100,Math.round(G.runner.stats[k]+(v||0)*capM)));
    }
  });
  if(d){
    if(block.dogMod?.speed)d.speed=Math.min(100,(d.speed||50)+(block.dogMod.speed||0));
    if(block.dogMod?.stamina)d.stamina=Math.min(100,(d.stamina||50)+(block.dogMod.stamina||0));
    if(block.dogMod?.health)d.health=Math.min(100,(d.health||100)+(block.dogMod.health||0));
    let bMod=block.bondMod||0;
    if(d.breed==='malinois'&&block.id==='solo')bMod-=CN_BREED_MODS.malinois.bondDecayPerWeek;
    d.bond=Math.max(0,Math.min(100,(d.bond||0)+bMod));
    d.peakBond=Math.max(d.peakBond||0,d.bond);
    if(block.teachCommand){
      const next=cnNextCommand();
      if(next){
        if(!G.cnTrainAdrainSessions)G.cnTrainAdrainSessions={left:0,hold:0,forward:0};
        G.cnTrainAdrainSessions[next]=(G.cnTrainAdrainSessions[next]||0)+1;
        if(G.cnTrainAdrainSessions[next]>=2){
          d.commands[next]=true;G.cnTrainAdrainSessions[next]=0;
          setTimeout(()=>showToast('¡'+esc(d.name)+' aprende "'+cnCommandLabel(next)+'"! ✅'),50);
        }
      }
    }
    if(G.cnDogSupplements)d.stamina=Math.min(100,(d.stamina||50)+1);
  }
}

window.cnAdvanceWeek=()=>{
  if(cnSeasonOver()){showToast('Marzo ya ha terminado: cierra la temporada');return;}
  if(!G.cnTrainingBlock){showToast('Elige un bloque de entrenamiento');return;}
  const doneMonth=cnMonth();   // BUG-17 (v96): el aviso nombra el mes que termina
  // Las semanas que quedan del mes (cuatro, o menos si hubo vacaciones) y se cierra: cada
  // «Avanzar» cambia de mes de verdad (B5).
  for(let w=Number(G.cnMonthWeek)||0;w<4;w++)cnApplyOneWeekTraining();
  cnEndMonth();
  autoSave();render();
  const sig=cnSeasonOver()?'cierra la temporada':'ahora '+CN_MONTH_NAMES[cnMonth()].toLowerCase();
  setTimeout(()=>showToast((CN_MONTH_NAMES[doneMonth]||'Mes')+' completado ✓ · '+sig),150);
};

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
    if(!cmds.left&&!cmds.hold&&!cmds.forward)G._cnRacedWithoutCommands=true;
    if(!(G.cnPreseasonDone||[]).length)G._cnPreseasonNothing=true;
  }
  // Paso 2: el perfil es el de la carrera (constants.js), siempre el mismo. Se busca por id
  // porque G.cnSelectedRaces guarda la copia que se hizo al elegirla.
  const def=CANICROSS_RACES.find(r=>r.id===race.id)||race;
  const segs=(def.segs||[]).map(sg=>({...sg}));
  const numSegs=segs.length;
  const basePace={1:360,2:390,3:415,4:440}[race.tier]||390;
  G.cnRaceState={
    raceId:race.id,raceName:race.name,km:race.km,tier:race.tier,month:race.month,
    numSegs,segs,rivals:cnGenerateRivals(race),basePace,
    currentSeg:0,pendingEvent:null,paceChosen:false,
    time:0,bondDelta:0,energyBonus:0,speedBonus:0,timePenalty:0,
    dogHealth:cnActiveDog().health,dogBond:cnActiveDog().bond,runnerEnergy:100+(G.cnDogFoodPremium?5:0),
    eventLog:[],retired:false,injuryPending:null,done:false,
  };
  G.screen='canicrossPreRace';render();
};

window.cnGoToRace=()=>{G.screen='canicrossSegment';render();};

window.cnNextSegment=()=>{
  const rs=G.cnRaceState;if(!rs)return;
  rs.currentSeg++;
  rs.pendingEvent=null;rs.paceChosen=false;
  if(rs.currentSeg>=rs.numSegs){cnFinishRace();return;}
  render();
};

window.cnMakeDecision=optIdx=>{
  const rs=G.cnRaceState;if(!rs||!rs.pendingEvent)return;
  const ev=rs.pendingEvent;
  const opt=(ev.options||[])[optIdx];if(!opt)return;
  if(opt.bondMod)rs.bondDelta=(rs.bondDelta||0)+opt.bondMod;
  if(opt.timeLoss)rs.timePenalty=(rs.timePenalty||0)+opt.timeLoss;
  if(opt.injuryRisk){
    const mods=cnGetEquipMods();
    let riskChance=Math.max(0,0.4+(mods.injuryRisk/100));
    // jerkMod: hard_line (-5) reduce el riesgo de lesión en eventos un 5%
    if(mods.jerkMod<0)riskChance=Math.max(0,riskChance-0.05);
    if(Math.random()<riskChance)rs.injuryPending=opt.injurySevere?'luxacion':'almohadillas';
  }
  if(opt.retire)rs.retired=true;
  rs.eventLog.push({seg:rs.currentSeg,event:ev,choice:optIdx,resolved:true});
  rs.pendingEvent=null;
  if(rs.retired){cnFinishRace();}
  else if(rs.currentSeg+1>=rs.numSegs){cnFinishRace();}
  else{cnNextSegment();}
};

window.cnChoosePace=paceId=>{
  const rs=G.cnRaceState;if(!rs)return;
  const pace=CN_PACES.find(p=>p.id===paceId);if(!pace)return;
  const d=cnActiveDog();
  const seg=rs.segs?.[rs.currentSeg];
  const basePace=rs.basePace||390;
  const kmPerSeg=(rs.km||8)/rs.numSegs;
  const mods=cnGetEquipMods();
  const speedFactor=Math.max(0.7,Math.min(1.3,((d?.speed||50)+mods.speedMod)/50));
  const staminaFactor=Math.max(0.8,((d?.stamina||50)+mods.staminaMod)/100);

  let tm=Math.round(basePace*kmPerSeg*pace.timeMult/speedFactor);
  let ec=pace.energyCost;
  let dc=Math.round(pace.dogCost/staminaFactor);
  let bm=pace.bondMod;

  // jerkMod: hard_line (-5) reduce el coste de salud del perro un 10% en ritmos altos
  if(mods.jerkMod<0&&(paceId==='apretar'||paceId==='atope')){
    dc=Math.round(dc*0.9);
  }

  if(seg?.type==='climb'){tm=Math.round(tm*1.15);ec=Math.round(ec*1.3);dc=Math.round(dc*1.2);}
  if(seg?.type==='descent'){tm=Math.round(tm*0.88);ec=Math.round(ec*0.8);dc=Math.round(dc*0.85);}

  rs.time=(rs.time||0)+tm;
  rs.runnerEnergy=Math.max(0,(rs.runnerEnergy||100)-ec);
  rs.dogHealth=Math.max(0,(rs.dogHealth||100)-dc);
  rs.bondDelta=(rs.bondDelta||0)+bm;

  if(paceId==='atope'&&d?.commands?.forward){
    rs.time=Math.max(0,(rs.time||0)-10);rs.bondDelta=(rs.bondDelta||0)+1;
    setTimeout(()=>showToast(esc(d.name)+' responde "Adelante" ✓ −10s'),50);
  }
  if(paceId==='suave'&&d?.commands?.hold){
    rs.dogHealth=Math.min(100,(rs.dogHealth||100)+4);
    setTimeout(()=>showToast(esc(d.name)+' mantiene el ritmo — "Aguanta" ✓'),50);
  }
  if(seg?.type==='descent'&&d?.commands?.left){
    rs.time=Math.max(0,(rs.time||0)-8);
    rs.dogHealth=Math.min(100,(rs.dogHealth||100)+2);
    setTimeout(()=>showToast(esc(d.name)+' toma las curvas — "Izquierda" ✓ −8s'),50);
  }

  const ev=cnPickEvent(rs.month||1);
  // Evento 'dessinc': si el perro sabe "Izquierda", se convierte en decisión con opción de controlarlo
  if(ev&&ev.id==='dessinc'&&d?.commands?.left){
    ev.decision=true;
    ev.options=[
      {label:'Controlar con "Izquierda" (+2 vínculo, −100s)',bondMod:2,timeLoss:-100},
      {label:'Ignorar y seguir (−5 vínculo)',bondMod:-5,timeLoss:0},
    ];
  }
  if(ev&&!ev.decision){
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

window.cnBuyEquip=(category,id)=>{
  const items=CANICROSS_EQUIPMENT[category]||[];
  const item=items.find(i=>i.id===id);if(!item)return;
  if(!G.cnOwnedEquipment)G.cnOwnedEquipment={dogHarness:['basic_harness'],humanBelt:['basic_belt'],line:['soft_line']};
  if((G.cnOwnedEquipment[category]||[]).includes(id)){showToast('Ya tienes este equipo');return;}
  if((G.cnMoney||0)<item.price){showToast('Sin fondos suficientes');return;}
  G.cnMoney-=item.price;
  G.cnOwnedEquipment[category]=[...(G.cnOwnedEquipment[category]||[]),id];
  G.equipment[category]=id;
  showToast('¡'+item.name+' comprado! 🎒');
  autoSave();render();
};

window.cnSelectEquip=(category,id)=>{
  if(!(G.cnOwnedEquipment[category]||[]).includes(id))return;
  if(!G.equipment)G.equipment={dogHarness:'basic_harness',humanBelt:'basic_belt',line:'soft_line'};
  G.equipment[category]=id;
  render();
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
    if(d.age>=7){
      d.health=Math.max(0,(d.health||100)-5);
      if(d.health<=0){G.screen='canicrossDogDeath';render();return;}
    }
  }
  cnDoSeasonTransition();
};

window.cnDoSeasonTransition=function cnDoSeasonTransition(){
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
  G.cnMonthIdx=0;G.cnMonthWeek=0;G.cnSelectedRaces=[];G.cnCurrentRaceIdx=0;
  G.cnTrainingBlock=null;G.cnVacationUsed=0;G.cnVacationPlanned=0;G.cnVacationDays=15;G.cnOpenMonths=[];
  G.cnTrainAdrainSessions={left:0,hold:0,forward:0};
  G.cnRaceState=null;
  // §0.4 del diseño: el cumpleaños (+3 vínculo) lo daban el hub y la ficha del perro al
  // pintarse. Ahora, aquí, al empezar la temporada: una pantalla no cambia la partida.
  cnCheckBirthday();
  G.activeTab='game';G.screen='canicrossHub';
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
    d.retired=true;G.screen='canicrossDogRetirement';render();
  } else if(opt==='ignore'){
    d.health=Math.max(0,(d.health||100)-5);
    d.bond=Math.max(0,(d.bond||0)-5);
    showToast(esc(d.name)+' nota que no le cuidas. -5 vínculo');
    cnDoSeasonTransition();
  }
};

window.cnRetireDog=()=>{
  if(!cnActiveDog())return;
  cnActiveDog().retired=true;G.screen='canicrossDogRetirement';render();
};

window.cnNewDogAfterRetirement=()=>{
  if(cnActiveDog()&&!cnActiveDog().retired)cnActiveDog().retired=true;
  G._cnDogBreed=null;G._cnDogName=null;
  delete G._cnDislasiaEvent;
  delete G._cnAgingWarned;
  // Reset dog training sessions
  G.cnTrainAdrainSessions={left:0,hold:0,forward:0};
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
  if(act.teachFirst&&d){d.commands=d.commands||{};if(!d.commands.forward){d.commands.forward=true;showToast(esc(d.name)+' aprende "Adelante" en el entreno ✅');}}
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
  const doneIds=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).map(r=>r.raceId);
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
      const b=(CANICROSS_TRAINING_BLOCKS||[]).find(x=>x.id===G.cnTrainingBlock);
      if(!b)return`<div class="warn" style="margin-bottom:12px">⚠ Sin bloque de entrenamiento. <button class="secondary" onclick="G.screen='canicrossTrainingSetup';render()">Configurar →</button></div>`;
      const warnMalinois=d&&d.breed==='malinois'&&b.id==='solo';
      return`<div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:14px;font-weight:700">🏋️ ${b.label}</div>
          <button class="secondary" style="font-size:12px;padding:3px 10px" onclick="G.screen='canicrossTrainingSetup';render()">Cambiar</button>
        </div>
        <div style="font-size:12px;color:#666;margin-bottom:6px">${b.desc} · ${b.hours}h/sem</div>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${Object.entries(b.runnerMod||{}).filter(([,v])=>v).map(([k,v])=>`<span style="font-size:11px;color:${v>0?'#4a8a2a':'#c0392b'}">corredor ${k} ${v>0?'+'+v:v}</span>`).join('')}
          ${b.dogMod?Object.entries(b.dogMod).filter(([,v])=>v).map(([k,v])=>`<span style="font-size:11px;color:${v>0?'#4a90d9':'#c0392b'}">perro ${k} ${v>0?'+'+v:v}</span>`).join(''):''}
          ${b.bondMod!=null?`<span style="font-size:11px;color:${b.bondMod>=0?'#c07a10':'#c0392b'}">vínculo ${b.bondMod>=0?'+'+b.bondMod:b.bondMod}</span>`:''}
        </div>
        ${warnMalinois?`<div class="warn" style="margin-top:6px;font-size:12px">⚠ Malinois + entreno solo → -${CN_BREED_MODS.malinois.bondDecayPerWeek} vínculo extra</div>`:''}
      </div>`;
    })()}

    ${(()=>{
      const vacLeft=(G.cnVacationDays||15)-(G.cnVacationUsed||0);
      if(vacLeft<=0)return'';
      return`<div class="card" style="margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:14px;font-weight:700">🏖 Vacaciones</div>
          <div style="font-size:12px;color:#888">${vacLeft} / ${G.cnVacationDays||15} días disponibles</div>
        </div>
        <div style="font-size:12px;color:#555;margin-bottom:8px">Usa 7 días: +salud ${d?esc(d.name):'perro'} · +vínculo · +mental</div>
        <button class="secondary" onclick="cnAdvanceRestWeek()">Usar vacaciones (7 días) →</button>
      </div>`;
    })()}

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
            ${done?`<span style="font-size:13px;font-weight:600;color:${result?.dnf?'#c0392b':'#4a8a2a'}">${result?.dnf?'DNF':'#'+(result?.pos||'?')}</span>`
                  :overdue?`<span style="font-size:12px;color:#bbb">⏱</span>`
                  :isCurrent&&race?`<span style="font-size:12px;color:#4a8a2a;font-weight:600">← Ahora</span>`:''}
            ${race?`<span style="font-size:11px;color:#bbb;display:inline-block;transition:transform .2s;transform:${isOpen?'rotate(90deg)':'rotate(0)'}">▶</span>`:''}
          </div>
        </div>
        ${race&&isOpen?`<div style="padding:0 14px 14px;border-top:1px solid #f0ede8">
          <div style="font-size:12px;color:#888;margin:8px 0 6px">${esc(race.location)} · €${race.cost} inscr. · €${race.prize} premio 1º</div>
          ${done?`<div style="font-size:13px;font-weight:600;color:${result?.dnf?'#c0392b':'#4a8a2a'}">${result?.dnf?'DNF — Retirado':'Posición #'+(result?.pos||'?')}${(result?.prize||0)>0?' · +€'+result.prize:''}</div>`
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

    ${isOld?`<div class="warn">🦴 ${esc(d.name)} ya nota el paso del tiempo (${d.age} años). Su rendimiento puede empezar a decrecer.</div>`:''}
    ${d.injury?`<div class="danger">🤕 Lesión: <strong>${{almohadillas:'Almohadillas rozadas',luxacion:'Luxación',golpe_calor:'Golpe de calor'}[d.injury]||d.injury}</strong> · ${d.injuryRaces} carrera(s) de baja<br><span style="font-size:12px;color:#c0392b">Usa el veterinario para reducir la baja</span></div>`:''}
    ${!d.injury&&d.bond<cnRaceThreshold()?`<div class="note">⚡ Vínculo insuficiente para competir. Necesita ≥${cnRaceThreshold()} (actual: <strong>${d.bond}</strong>). Entrena juntos.</div>`:''}

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
    ${(G.cnSeason||1)>1?`<button class="main" style="background:#fef9ec;border-color:#e8c97a;color:#c07a10" data-dn="${esc(d.name)}" onclick="if(confirm('¿Retirar a '+this.dataset.dn+'?'))cnRetireDog()">Retirar a ${esc(d.name)} voluntariamente</button>`:''}
    `:`<div class="note" style="margin-top:8px">${esc(d.name)} está retirado. <button class="secondary" onclick="cnNewDogAfterRetirement()">Adoptar nuevo perro →</button></div>`}
  `;
}

// ── TAB: EQUIPO ───────────────────────────────────────
function renderCnEquipoTab(){
  const el=$main();
  const owned=G.cnOwnedEquipment||{dogHarness:['basic_harness'],humanBelt:['basic_belt'],line:['soft_line']};
  const eq=G.equipment||{dogHarness:'basic_harness',humanBelt:'basic_belt',line:'soft_line'};

  const renderSection=(title,category)=>{
    const items=CANICROSS_EQUIPMENT[category]||[];
    return `<div class="fin-section">
      <div class="fin-title">${title}</div>
      ${items.map(item=>{
        const isOwned=(owned[category]||[]).includes(item.id);
        const isSelected=eq[category]===item.id;
        const canAfford=(G.cnMoney||0)>=item.price;
        return `<div style="display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:1px solid #f5f4f0">
          <div style="flex:1">
            <div style="font-size:14px;font-weight:${isSelected?'600':'400'}">${esc(item.name)}${item.default?' <span style="font-size:11px;color:#888">(inicio)</span>':''}</div>
            <div style="font-size:12px;color:#888">${esc(item.desc)}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:10px">
            ${isOwned?
              `<label style="font-size:13px;display:flex;align-items:center;gap:5px;cursor:pointer"><input type="radio" name="eq-${category}" ${isSelected?'checked':''} onchange="cnSelectEquip('${category}','${item.id}')"> ${isSelected?'En uso':'Usar'}</label>`:
              item.default?'':
              `<button class="secondary" style="${!canAfford?'opacity:0.4;cursor:default':''}" onclick="${canAfford?`cnBuyEquip('${category}','${item.id}')`:'void 0'}">Comprar €${item.price}</button>`}
          </div>
        </div>`;}).join('')}
    </div>`;
  };

  el.innerHTML=`
    <h2>🎒 Equipo</h2>
    <p class="sub">El equipo activo aplica modificadores en carrera</p>
    <div style="background:#f5f4f0;border-radius:8px;padding:9px 14px;margin-bottom:14px">💰 Presupuesto disponible: <strong>€${G.cnMoney||0}</strong></div>
    ${renderSection('Arnés del perro','dogHarness')}
    ${renderSection('Cinturón del corredor','humanBelt')}
    ${renderSection('Línea de tiro','line')}
  `;
}

// ── SETUP: ENTRENAMIENTO + SEMANAS DESCANSO ───────────
function renderCanicrossTrainingSetup(){
  const el=$main();
  const d=cnActiveDog();
  const sel=G.cnTrainingBlock;

  el.innerHTML=`
    <h2>🏋️ Plan de entrenamiento</h2>
    <p class="sub">Temporada ${G.cnSeason||1} · elige un bloque para toda la temporada</p>

    ${d?`<div class="card" style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:14px;font-weight:600">🐕 ${esc(d.name)}</span>
        <span style="font-size:12px;color:#888">Vínculo ${d.bond}/100 · Salud ${d.health}</span>
      </div>
    </div>`:''}

    ${(CANICROSS_TRAINING_BLOCKS||[]).map(b=>{
      const isSel=sel===b.id;
      return`<div class="card ${isSel?'sel':''}" style="margin-bottom:10px;cursor:pointer;${isSel?'border-color:#1a1a1a;box-shadow:0 0 0 2px #1a1a1a18':''}" onclick="cnSelectTraining('${b.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div style="flex:1">
            <div style="font-size:15px;font-weight:700;margin-bottom:2px">${b.label} <span style="font-size:12px;font-weight:400;color:#888">· ${b.hours}h/sem</span>${isSel?`<span style="float:right;color:#4a8a2a;font-size:14px">✓</span>`:''}</div>
            <div style="font-size:13px;color:#666;margin-bottom:8px">${b.desc}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              ${Object.entries(b.runnerMod||{}).filter(([,v])=>v).map(([k,v])=>`<span style="font-size:12px;color:${v>0?'#4a8a2a':'#c0392b'}">Corredor ${k.charAt(0).toUpperCase()+k.slice(1)} ${v>0?'+'+v:v}</span>`).join('')}
              ${b.dogMod?Object.entries(b.dogMod).filter(([,v])=>v).map(([k,v])=>`<span style="font-size:12px;color:${v>0?'#4a90d9':'#c0392b'}">Perro ${k} ${v>0?'+'+v:v}</span>`).join(''):''}
              ${b.bondMod!=null?`<span style="font-size:12px;color:${b.bondMod>=0?'#c07a10':'#c0392b'}">Vínculo ${b.bondMod>=0?'+'+b.bondMod:b.bondMod}</span>`:''}
              ${b.teachCommand?`<span style="font-size:12px;color:#888">🎓 Enseña comandos</span>`:''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('')}

    ${(()=>{
      const total=G.cnVacationDays||15;
      const used=G.cnVacationUsed||0;
      const planned=G.cnVacationPlanned||0;
      const available=total-used;
      const pct=Math.round(used/total*100);
      return`<div class="card" style="margin-top:16px;margin-bottom:20px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <div style="font-size:15px;font-weight:700">🏖 Vacaciones este temporada</div>
          <div style="font-size:12px;color:#888">${used} / ${total} días usados este año</div>
        </div>
        <div style="height:4px;background:#e8e6e0;border-radius:2px;overflow:hidden;margin-bottom:12px">
          <div style="height:100%;width:${pct}%;background:#c07a10;border-radius:2px"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <button class="secondary" style="width:44px;height:44px;font-size:20px;padding:0;text-align:center" onclick="cnChangeVacDays(-1)" ${planned<=0?'disabled':''}>−</button>
          <div style="text-align:center">
            <div style="font-size:32px;font-weight:700;color:${planned>0?'#c07a10':'#aaa'}">${planned}</div>
            <div style="font-size:12px;color:#888">días esta temporada</div>
          </div>
          <button class="secondary" style="width:44px;height:44px;font-size:20px;padding:0;text-align:center" onclick="cnChangeVacDays(1)" ${planned>=available?'disabled':''}>+</button>
        </div>
        <div style="font-size:12px;color:#888">Cada día de vacaciones añade +1.2 salud ${d?esc(d.name):'perro'} · +0.6 vínculo · +0.8 mental corredor. Te quedan ${available} días este año.</div>
      </div>`;
    })()}

    <div class="grid-2" style="margin-top:4px">
      <button class="main" style="margin-top:0;opacity:0.6" onclick="G.screen='canicrossHub';G.activeTab='game';render()">← Volver</button>
      <button class="main" style="margin-top:0;background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnConfirmTraining()">Ver calendario →</button>
    </div>
  `;
}

// ── SETUP: CALENDARIO DE TEMPORADA ────────────────────
function renderCanicrossCalendarSetup(){
  // Reutiliza renderCnCalendarioTab pero con navegación diferente
  const el=$main();
  const sel=G.cnSelectedRaces||[];
  const selIds=sel.map(r=>r.id);
  const MONTHS=[10,11,12,1,2,3];
  const MONTH_NAMES={10:'Octubre',11:'Noviembre',12:'Diciembre',1:'Enero',2:'Febrero',3:'Marzo'};
  const doneIds=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).map(r=>r.raceId);
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
  const doneIds=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).map(r=>r.raceId);
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
      <div class="fin-row"><span>Presupuesto actual</span><span class="plus">€${G.cnMoney||0}</span></div>
      <div class="fin-row"><span>Premios cobrados</span><span class="${prizeTotal>0?'plus':'neutral'}">€${prizeTotal}</span></div>
      <div class="fin-row"><span>Inscripciones</span><span class="minus">-€${inscCost}</span></div>
    </div>

    <div class="fin-section">
      <div class="fin-title">Gastos del perro (mensual)</div>
      <div class="fin-row"><span>Manutención básica</span><span class="minus">-€40/mes</span></div>
      <div class="fin-row">
        <div style="flex:1"><span>Manutención premium</span><div style="font-size:11px;color:#888">+5 energía en carrera</div></div>
        <div style="display:flex;align-items:center;gap:8px"><span class="minus">-€30/mes</span><button class="secondary" style="font-size:12px;flex-shrink:0" onclick="G.cnDogFoodPremium=!G.cnDogFoodPremium;autoSave();render()">${G.cnDogFoodPremium?'✅ Activo':'Activar'}</button></div>
      </div>
      <div class="fin-row">
        <div style="flex:1"><span>Suplementos</span><div style="font-size:11px;color:#888">+1 resistencia/sem perro</div></div>
        <div style="display:flex;align-items:center;gap:8px"><span class="minus">-€25/mes</span><button class="secondary" style="font-size:12px;flex-shrink:0" onclick="G.cnDogSupplements=!G.cnDogSupplements;autoSave();render()">${G.cnDogSupplements?'✅ Activo':'Activar'}</button></div>
      </div>
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
  const segFrac=rs.currentSeg/rs.numSegs;
  const myAge=G.runner.age||28;
  const myCat=cnGetCategory(myAge);

  const all=[
    {name:G.runner.name||'Tú',time:myTime,me:true,age:myAge},
    ...rs.rivals.map(r=>({name:r.name,time:Math.round(r.estimatedTime*segFrac),me:false,age:r.age||30}))
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
  const eq=G.equipment||{};
  const harness=(CANICROSS_EQUIPMENT.dogHarness||[]).find(e=>e.id===eq.dogHarness)||{name:'—'};
  const belt=(CANICROSS_EQUIPMENT.humanBelt||[]).find(e=>e.id===eq.humanBelt)||{name:'—'};
  const line=(CANICROSS_EQUIPMENT.line||[]).find(e=>e.id===eq.line)||{name:'—'};
  const mods=cnGetEquipMods();

  el.innerHTML=`
    <h2>🐕 Pre-carrera</h2>
    <p class="sub">${esc(race.name)} · ${race.km}km · ${esc(race.location)}</p>

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

    <div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">Equipo activo</div>
      <div style="font-size:13px;color:#555;margin-bottom:3px">Arnés: ${esc(harness.name)}</div>
      <div style="font-size:13px;color:#555;margin-bottom:3px">Cinturón: ${esc(belt.name)}</div>
      <div style="font-size:13px;color:#555">Línea: ${esc(line.name)}</div>
      ${mods.speedMod||mods.staminaMod?`<div class="text-ok" style="margin-top:4px">Bonificadores: ${[mods.speedMod?'+'+mods.speedMod+' vel':null,mods.staminaMod?(mods.staminaMod>0?'+':'')+mods.staminaMod+' res':null].filter(Boolean).join(' · ')}</div>`:''}
    </div>

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

    ${G.cnDogFoodPremium?`<div class="note" style="margin-bottom:12px">🥩 Manutención premium: +5 energía en carrera</div>`:''}

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


  const lastLogEntry=rs.eventLog?.length>0&&!ev?rs.eventLog[rs.eventLog.length-1]:null;

  el.innerHTML=`
    <div class="flex-between-center" style="margin-bottom:10px">
      <span style="font-size:12px;color:#999">${esc(race.name)} · Tramo ${rs.currentSeg+1}/${rs.numSegs}${isLastSeg?' · <strong style="color:#c07a10">último</strong>':''}</span>
      <span style="font-size:13px;font-weight:600">${fmt((rs.time||0)+(rs.timePenalty||0))}</span>
    </div>

    <div class="prog-wrap" style="margin-bottom:10px">
      <div class="prog-meta"><span>${kmDone}km hechos</span><span>${kmLeft}km restantes</span></div>
      <div class="prog-track"><div class="prog-fill" style="width:${pct}%"></div></div>
    </div>

    <div class="card" style="margin-bottom:10px">
      ${[['Vínculo',curBond,'#c07a10'],['Salud '+esc(d?.name||'perro'),rs.dogHealth||100,'#e74c3c'],['Energía corredor',rs.runnerEnergy||100,'#4a8a2a']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label" style="color:${v<25?'#c0392b':'#666'}">${l}${v<25?' ⚠':''}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(Math.max(0,v))}%;background:${c}"></div></div><span class="bar-pct">${Math.round(Math.max(0,v))}</span></div>`).join('')}
    </div>

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

    ${!rs.paceChosen&&!ev?`
    <div class="section-label">Elige el ritmo del tramo:</div>
    <div class="pace-grid">
      ${CN_PACES.map(p=>{
        const basePace=rs.basePace||390;
        const kmPerSeg=(rs.km||8)/rs.numSegs;
        const speedFactor=Math.max(0.7,Math.min(1.3,(d?.speed||50)/50));
        let tm=Math.round(basePace*kmPerSeg*p.timeMult/speedFactor);
        if(seg?.type==='climb')tm=Math.round(tm*1.15);
        if(seg?.type==='descent')tm=Math.round(tm*0.88);
        const mins=Math.floor(tm/60);const secs=tm%60;
        const timeStr=mins+'m'+(secs>0?' '+secs+'s':'');
        const dogWarn=p.dogCost>14&&(rs.dogHealth||100)<35?`<div style="font-size:11px;color:#c0392b;margin:3px 0">⚠ ${esc(d?.name||'perro')} al límite</div>`:'';
        const bondBadge=p.bondMod>0?`<span style="font-size:11px;color:#4a8a2a">vínculo +${p.bondMod}</span>`:p.bondMod<0?`<span style="font-size:11px;color:#c07a10">vínculo ${p.bondMod}</span>`:'';
        return`<div class="pace" onclick="cnChoosePace('${p.id}')">
          <div class="pace-label">${p.label}</div>
          <div class="pace-desc">${p.desc}</div>
          ${dogWarn}
          <div class="pace-meta">
            <div style="display:flex;flex-direction:column;gap:2px">${bondBadge}<span style="font-size:11px;color:#aaa">−${p.energyCost} energía · −${p.dogCost} salud</span></div>
            <span>~${timeStr}</span>
          </div>
        </div>`;}).join('')}
    </div>`:''}


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
  const doneIds=(G.cnRaceResults||[]).filter(r=>r.season===G.cnSeason).map(r=>r.raceId);
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
      <div class="fin-row"><span>Presupuesto final</span><span class="${(G.cnMoney||0)>=0?'plus':'minus'}">€${G.cnMoney||0}</span></div>
    </div>

    ${d?`<div class="card" style="margin-bottom:12px">
      <div class="sec-title-sm">🐕 ${esc(d.name)} · Temporada ${G.cnSeason}</div>
      ${[['Vínculo',d.bond,'#c07a10'],['Velocidad',d.speed,'#4a90d9'],['Resistencia',d.stamina,'#4a8a2a'],['Salud',d.health,'#e74c3c']].map(([l,v,c])=>`<div class="bar-row"><span class="bar-label">${l}</span><div class="bar-track" style="flex:1"><div class="bar-fill" style="width:${Math.round(v)}%;background:${c}"></div></div><span class="bar-pct">${Math.round(v)}</span></div>`).join('')}
      <div style="font-size:12px;color:#888;margin-top:8px">Vínculo máximo: ${d.peakBond||0} · Km juntos: ${d.kmTogether||0} · Vínculo ganado esta temporada: ${bondGain>=0?'+':''}${bondGain}</div>
      ${(d.age||1)>=5?`<div class="warn" style="margin-top:8px">🦴 ${esc(d.name)} tendrá ${(d.age||1)+1} años la próxima temporada. Considera su bienestar.</div>`:''}
    </div>`:''}

    <button class="main" style="background:#1a1a1a;color:#fff;border-color:#1a1a1a" onclick="cnEndSeason()">Comenzar temporada ${(G.cnSeason||1)+1} →</button>`;
}

function renderCnDogRetirement(){
  const el=$main();
  const d=cnActiveDog();if(!d)return;
  const seasons=(G.cnSeason||1)-(d.birthSeason||1);

  el.innerHTML=`
    <div style="text-align:center;padding:30px 0 20px">
      <div style="font-size:52px;margin-bottom:12px">🐕</div>
      <h2>Adiós, ${esc(d.name)}</h2>
    </div>
    <div class="card" style="margin-bottom:16px;background:#f8f7f3">
      <p style="font-size:15px;line-height:1.8;color:#444">${esc(d.name)} corrió contigo <strong>${seasons}</strong> temporada${seasons!==1?'s':''}, <strong>${d.races||0}</strong> carrera${(d.races||0)!==1?'s':''} y <strong>${d.kmTogether||0} km</strong> juntos.</p>
      <p style="font-size:14px;color:#666;margin-top:8px">Vínculo máximo alcanzado: <strong>${d.peakBond||0}</strong>.</p>
      <p style="font-size:13px;color:#aaa;margin-top:10px;font-style:italic">"Algunos compañeros se convierten en parte de ti. ${esc(d.name)} siempre lo será."</p>
    </div>
    <button class="main" onclick="cnNewDogAfterRetirement()">Adoptar un nuevo compañero →</button>
    <button class="main" style="margin-top:6px;opacity:0.5" onclick="cnDoSeasonTransition()">Continuar sin perro (categoría individual)</button>`;
}

function renderCnDogDeath(){
  const el=$main();
  const d=cnActiveDog();
  el.innerHTML=`
    <div style="text-align:center;padding:28px 0 18px">
      <div style="font-size:48px;margin-bottom:12px">🕯️</div>
      <h2 style="color:#555">${d?esc(d.name):''}</h2>
    </div>
    <div class="card" style="margin-bottom:16px">
      <p style="font-size:14px;line-height:1.7;color:#555">La salud de ${d?esc(d.name):''} llegó a cero. ${d?esc(d.name):''} ya no está.</p>
      <p style="font-size:13px;color:#888;margin-top:8px">Puedes continuar adoptando un nuevo perro. El vínculo empezará desde cero.</p>
    </div>
    <button class="main" onclick="cnNewDogAfterRetirement()">Adoptar nuevo perro →</button>`;
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
