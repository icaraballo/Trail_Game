// ══════════════════════════════════════
//  BACKYARD — lógica del reto suelto (paso 3 de TG-Diseno-Ultratrail-Backyard)
// ══════════════════════════════════════
// Bucle de 6,706 km cada hora en punto; quien no está en la línea al sonar la campana, fuera.
// Gana el único que completa una vuelta más que todos los demás; el resto son DNF. La idea de
// la que cuelga todo (§ 17): descanso = 60 minutos − tu vuelta. Correr rápido no da ventaja,
// da minutos, y las piernas se gastan antes.
//
// Patrón de modos (TG-Arquitectura-Global): lógica aquí, pantallas en backyard-render.js. El
// estado vive entero en G.by (§ 31). La tirada en curso se guarda en su propia clave
// (LS 'by_run'), no en una ranura de partida, una vez por vuelta al entrar al corral (§ 18).
// Los récords por dificultad, en LS 'by_records'.
//
// Nombres: inventados (decidido el 2026-10-30) y solo en constantes (§ 30).

// ── Datos ──────────────────────────────
const BY_ORGANIZADOR='Txomin Arregi';          // quien toca el cencerro (el papel de Laz Lake)
const BY_LUGAR='la borda de Arrizabal';        // el patio donde se corre (el papel de Big's)
const BY_LEYENDAS=[                            // el muro de récords del formato
  {name:'Ivo Marangoni',laps:123},
  {name:'Anselmo Prieto',laps:119},
  {name:'Hugo Lindqvist',laps:108},
];
const BY_KM_VUELTA=6.706;

// Dificultad diegética (§ 24): no eliges un ajuste, eliges a qué backyard te apuntas.
// cap = vueltas que aguanta un rival (media y dispersión); serios = rivales de más; monstruo =
// probabilidad de que haya uno que se va muy lejos.
const BY_EVENTOS={
  local:        {label:'Local',        n:30, cap:[15,5],  serios:2, monstruo:0,    suele:'20-30 vueltas'},
  nacional:     {label:'Nacional',     n:50, cap:[26,7],  serios:4, monstruo:0.2,  suele:'35-50 vueltas'},
  internacional:{label:'Internacional',n:75, cap:[38,9], serios:6, monstruo:0.35, suele:'50-70 vueltas'},
  mundial:      {label:'Mundial',      n:100,cap:[52,12], serios:8, monstruo:0.5,  suele:'70-100 vueltas'},
};

// Los cuatro corredores pregenerados del reto (§ 18), uno por arquetipo (§ 21). res = cuánto
// aguantan las piernas · vel = ritmo · est = estómago · mente = lucidez y ánimo.
const BY_CORREDORES=[
  {id:'liebre',    arq:'liebre',    name:'Ane Goikoetxea', flag:'🇪🇸', st:{res:45,vel:82,est:55,mente:50},
   desc:'Rápida. Le sobra descanso al principio y se rompe pronto.'},
  {id:'metronomo', arq:'metronomo', name:'Pau Rovira',     flag:'🇪🇸', st:{res:66,vel:60,est:66,mente:60},
   desc:'Idéntico cada vuelta, hasta que un día no sale.'},
  {id:'veterano',  arq:'veterano',  name:'Josu Arrieta',   flag:'🇪🇸', st:{res:86,vel:40,est:72,mente:72},
   desc:'Lento y sostenible. Aburre, y dura.'},
  {id:'mental',    arq:'mental',    name:'Leire Mendia',   flag:'🇪🇸', st:{res:60,vel:55,est:58,mente:88},
   desc:'Aguanta mientras haya gente. Sola, se le hace cuesta arriba.'},
];
const BY_ARQ_LABEL={liebre:'Liebre',metronomo:'Metrónomo',veterano:'Veterano',mental:'Mental'};

// Rivales: anónimos hasta que quedan 20 (§ 21); entonces se materializan con nombre de aquí.
const BY_NOMBRES=[
  ['Iker Salaberria','🇪🇸'],['Marta Oller','🇪🇸'],['Tomás Ibarguren','🇪🇸'],['Nerea Lasa','🇪🇸'],
  ['Joan Puigcercós','🇪🇸'],['Elena Vilches','🇪🇸'],['Gorka Uriarte','🇪🇸'],['Sara Benavent','🇪🇸'],
  ['Lucas Ferrand','🇫🇷'],['Camille Roux','🇫🇷'],['Matteo Brambilla','🇮🇹'],['Giulia Sereni','🇮🇹'],
  ['Jonas Albrecht','🇩🇪'],['Lena Vogt','🇩🇪'],['Rui Carvalho','🇵🇹'],['Inês Moura','🇵🇹'],
  ['Erik Halvorsen','🇳🇴'],['Ingrid Solberg','🇳🇴'],['Tom Whitfield','🇬🇧'],['Kate Ormsby','🇬🇧'],
  ['Dani Arrieta','🇪🇸'],['Olaia Etxabe','🇪🇸'],['Sergi Pujadas','🇪🇸'],['Carla Maestre','🇪🇸'],
];
const BY_BIO={
  liebre:['Sale como si hubiera premio por llegar antes.','Hace las vueltas en 46 y se tumba al sol.'],
  metronomo:['Cada vuelta en 52:30, al segundo.','Come lo mismo, a la misma hora, en la misma silla.'],
  veterano:['Lleva quince backyards. No ha ganado ninguno.','Camina las cuestas desde la primera vuelta.'],
  mental:['Habla con todo el mundo en el corral.','Dice que viene a ver cuánto aguanta la cabeza.'],
};

// Esfuerzo de la vuelta: minutos de base y lo que cuesta.
const BY_ESFUERZO={
  suave:{label:'Suave', base:54, piernas:1.2, energia:6},
  medio:{label:'Medio', base:50, piernas:1.8, energia:7},
  vivo: {label:'Vivo',  base:45, piernas:3.0, energia:9},
};

// El corral (§ 18): cada acción descuenta minutos de la cuenta atrás.
const BY_ACCIONES=[
  {id:'comer',    label:'Comer sólido',             min:5},
  {id:'gel',      label:'Gel',                      min:1},
  {id:'pies',     label:'Calcetines y pies',        min:6},
  {id:'estirar',  label:'Estirar / masaje',         min:6},
  {id:'siesta',   label:'Microsiesta',              min:8},
  {id:'sentarse', label:'Sentarse sin hacer nada',  min:3},
  {id:'equipo',   label:'Hablar con el equipo',     min:2},
];
// Palancas contra la agonía (§ 19), de uso limitado.
const BY_PALANCAS={
  musica:  {label:'Música',               usos:2, min:0},
  cafeina: {label:'Cafeína',              usos:3, min:1},
  llamada: {label:'Llamar a casa',        usos:1, min:4},
  ropa:    {label:'Ropa limpia entera',   usos:2, min:8},
};
const BY_PIES=['Pies bien','Rozaduras','Ampollas','Pies destrozados'];
const BY_ALUCINACIONES=[
  'Un perro en la cuneta resulta ser una piedra. Otra vez.',
  'Alguien te llama por tu nombre desde el bosque. No hay nadie.',
  'Las cintas del recorrido se mueven solas.',
  'Juras que esta vuelta ya la habías corrido.',
];

// ── Utilidades ─────────────────────────
const byClamp=(v,a=0,b=100)=>Math.max(a,Math.min(b,v));
function byNormal(m,sd){let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return m+sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
// Hora del día al salir a la vuelta n (la 1 sale a las 7:00).
function byHora(n){return (7+n-1)%24;}
function byEsNoche(n){const h=byHora(n);return h>=21||h<7;}
function byVivos(){return (G.by?.rivals||[]).filter(r=>!r.out);}
function byNocheAhora(){
  const b=G.by;if(!b||typeof G.screen!=='string'||!G.screen.startsWith('by'))return false;
  return b.phase!=='end'&&b.phase!=='pre'&&byEsNoche(b.lap+1);
}
function byLog(t){G.by.log.push({lap:G.by.lap,t});if(G.by.log.length>60)G.by.log.splice(0,G.by.log.length-60);}

// ── Estado ─────────────────────────────
MODE_STATE.backyard=()=>({by:null,_byPre:null});   // _byPre: lo elegido en el campamento antes de salir

// Punto de entrada único (§ 26): el reto suelto pasa uno de los cuatro corredores; Ultratrail
// pasa el suyo (ultra: {name, st, base}), arrastrando todo: sus preparaciones son el examen.
function byStart({corredor,dificultad,ultra,tenso}){
  const c=ultra?{id:'tu',name:ultra.name,flag:'',st:{...ultra.st},
      arq:ultra.st.vel>=65?'liebre':ultra.st.res>=72?'veterano':ultra.st.mente>=72?'mental':'metronomo'}
    :BY_CORREDORES.find(x=>x.id===corredor)||BY_CORREDORES[0];
  const ev=BY_EVENTOS[dificultad]||BY_EVENTOS.local;
  // Varianza (§ 25): el campo, el tiempo, el circuito y tu día.
  const rivals=[];
  const arqs=['liebre','metronomo','veterano','mental'];
  for(let i=0;i<ev.n-1;i++){
    const arq=arqs[Math.floor(Math.random()*4)];
    let cap=byNormal(ev.cap[0],ev.cap[1])+(arq==='liebre'?-4:arq==='veterano'?3:0);
    if(i<ev.serios)cap+=ev.cap[1]*1.2;
    rivals.push({id:'r'+i,arq,cap:Math.max(3,cap),terq:0.3+Math.random()*0.5,animo:70,out:false,outLap:0,name:null,flag:null,bio:null});
  }
  if(Math.random()<ev.monstruo){const m=rivals[Math.floor(Math.random()*rivals.length)];m.cap+=ev.cap[1]*2.2;m.terq=0.85;}
  const llueve=Math.random()<0.5;
  const rainFrom=6+Math.floor(Math.random()*35);
  const circuitos=[
    {id:'corrible',label:'Corrible, sin apenas desnivel',base:-0.8,piernas:0.95},
    {id:'tecnico', label:'Técnico, con raíces y una cuesta seria',base:1.2,piernas:1.1},
    {id:'mixto',   label:'Pista y sendero a partes iguales',base:0,piernas:1},
  ];
  const circ=circuitos[Math.floor(Math.random()*3)];
  G.by={
    v:1, dif:dificultad in BY_EVENTOS?dificultad:'local',
    corredor:c.id, arq:c.arq, name:c.name, flag:c.flag, st:{...c.st},
    lap:0, piernas:100, energia:100, lucidez:100, pies:0, animo:70,
    esfuerzo:'medio', lastLap:0, corral:0, corralUsado:[],
    rivals, cayeronUltima:0,
    meteo:{llueve,rainFrom,rainTo:rainFrom+3+Math.floor(Math.random()*8)},
    circ:{...circ,asfaltoNoche:Math.random()<0.4},
    dia:Math.round((Math.random()*2-1)*10)/10,
    inv:Object.fromEntries(Object.entries(BY_PALANCAS).map(([k,p])=>[k,p.usos])),
    musicaHasta:0, cafeDeuda:[], pacto:null,
    farol:{tarde:false,fuerte:false,sentado:null},
    rutina:null, aviso:null, bitacora:null,
    log:[], phase:'bell', result:null, solo:false,
    // Desde Ultratrail: la base aeróbica decide cuántas vueltas antes de que se hunda la energía
    ut:!!ultra, base:ultra?ultra.base:null,
    // «Modo tenso» (§ 18): el corral corre en tiempo real. Opcional; por defecto, no.
    tenso:!!tenso,
  };
  G.by.animo=byClamp(70+G.by.dia*-8);
  byLog(`${BY_ORGANIZADOR} toca el cencerro en ${BY_LUGAR}. ${ev.n} corredores en la línea.`);
  if(G.by.circ.asfaltoNoche)byLog('Este año, como siempre: anillo de monte de día y de asfalto de noche.');
  byGuardar();
}

// ── Guardado propio (§ 18) ─────────────
// Desde Ultratrail, la tirada va dentro de la partida (G.by en la ranura), no en su clave.
function byGuardar(){if(!G.by)return;if(G.by.ut){if(typeof autoSave==='function')autoSave();return;}LS.set('by_run',JSON.stringify(G.by));}
function byTiradaGuardada(){try{const s=JSON.parse(LS.get('by_run')||'null');return s&&s.v===1&&s.phase!=='end'?s:null;}catch(e){return null;}}
function byBorrarTirada(){LS.del('by_run');}
function byRecords(){try{return JSON.parse(LS.get('by_records')||'{}')||{};}catch(e){return {};}}
function byGuardarRecord(){
  const b=G.by,r=byRecords();const prev=r[b.dif];
  if(!prev||b.lap>prev.laps){r[b.dif]={laps:b.lap,corredor:b.name,gano:b.result?.kind==='gana'};LS.set('by_records',JSON.stringify(r));return true;}
  return false;
}

// ── La vuelta ──────────────────────────
// Lo que tardarías hoy con este esfuerzo, sin el azar. La pantalla de campana lo enseña.
function byTiempoPrevisto(esf){
  const b=G.by,e=BY_ESFUERZO[esf]||BY_ESFUERZO.medio,n=b.lap+1,noche=byEsNoche(n);
  let t=e.base-(b.st.vel-50)*0.04+b.circ.base+b.dia;
  if(noche)t+=b.circ.asfaltoNoche?-0.5:1;
  if(b.meteo.llueve&&n>=b.meteo.rainFrom&&n<=b.meteo.rainTo)t+=1.2;
  t+=(100-b.piernas)*0.04+(100-b.energia)*0.03+(100-b.lucidez)*0.02+b.pies*0.8;
  // Por debajo de un umbral el cuerpo no se gasta: se derrumba
  if(b.piernas<25)t+=(25-b.piernas)*0.35;
  if(b.energia<20)t+=(20-b.energia)*0.3;
  if(b.lucidez<15)t+=(15-b.lucidez)*0.25;
  if(b.pacto)t+=1.5;   // correr acompañado: los dos más lentos
  return t;
}

// Corre la vuelta n = lap+1. Devuelve false si no llegaste a la campana.
function byCorrerVuelta(esf){
  const b=G.by,e=BY_ESFUERZO[esf]||BY_ESFUERZO.medio,n=b.lap+1,noche=byEsNoche(n);
  const llueve=b.meteo.llueve&&n>=b.meteo.rainFrom&&n<=b.meteo.rainTo;
  b.esfuerzo=esf;
  let t=byTiempoPrevisto(esf)+(Math.random()*2.4-1.2);
  if(b.lucidez<10&&Math.random()<0.4){t+=4;byLog('Te pasas un desvío. Vuelves sobre tus pasos.');}
  if(noche&&b.lucidez<30)byLog(BY_ALUCINACIONES[Math.floor(Math.random()*BY_ALUCINACIONES.length)]);
  b.lastLap=t;
  // Lo que cuesta
  const res=1.9-b.st.res/100*1.3;   // res 45 → ×1,32 · res 86 → ×0,78
  // El mismo gesto repetido cuesta cada vez más (§ 26, encaje muscular): ×2 hacia la vuelta 60
  let pierna=e.piernas*res*(1+n/160)*b.circ.piernas*(noche&&b.circ.asfaltoNoche?1.2:1)*(b.pies>=2?1.15:1);
  if(b.pacto)pierna*=0.85;
  if(b.farol.fuerte)pierna+=5;
  b.piernas=byClamp(b.piernas-pierna);
  b.energia=byClamp(b.energia-e.energia*(1.3-b.st.est/200)*(b.base!=null?1.25-b.base/200:1));
  b.lucidez=byClamp(b.lucidez-(noche?6*(1.3-b.st.mente/100):1.5)-n*0.015);
  if(Math.random()<0.06+(llueve?0.12:0)+n*0.002)b.pies=Math.min(3,b.pies+1);
  // Ánimo: la noche y la lluvia lo bajan; la compañía lo sostiene
  if(noche&&!b.pacto)b.animo-=2;
  if(llueve)b.animo-=2;
  if(b.pacto)b.animo+=3;
  if(b.musicaHasta>=n)b.animo+=5;
  if(b.arq==='mental'&&byVivos().length<=2)b.animo-=4;
  if(byHora(n)===7&&n>1){b.animo+=12;b.lucidez=byClamp(b.lucidez+8);byLog('Amanece. Hay algo en la luz que te devuelve a la carrera.');}
  if(byHora(n)===21)byLog('Anochece. Se encienden los frontales.');
  if(llueve&&n===b.meteo.rainFrom)byLog('Empieza a llover. El barro va a durar.');
  b.animo=byClamp(b.animo);
  // La cafeína se cobra con intereses
  b.cafeDeuda=b.cafeDeuda.filter(d=>{if(d.lap===n){b.lucidez=byClamp(b.lucidez-12);byLog('El café ya no hace nada. Al contrario.');return false;}return true;});
  b.farol={tarde:false,fuerte:false,sentado:b.farol.sentado};
  if(t>=60){
    b.result={kind:'dnf',laps:b.lap,why:`No llegaste a la campana: vuelta ${n} en ${byMinSeg(t)}.`};
    byLog(`Llegas a la línea en ${byMinSeg(t)}. El cencerro ya ha sonado.`);
    return false;
  }
  b.lap=n;
  byLog(`Vuelta ${n} en ${byMinSeg(t)}.`);
  return true;
}
function byMinSeg(t){const m=Math.floor(t),s=Math.round((t-m)*60);return s===60?`${m+1}:00`:`${m}:${String(s).padStart(2,'0')}`;}

// ── Los rivales en la campana ──────────
// Antes de cada vuelta, cada rival decide si sale. Devuelve los que no salen.
function byCampanaRivales(){
  const b=G.by,n=b.lap+1,vivos=byVivos(),quedan=vivos.length;
  const noche=byEsNoche(n),tardeDia2=n>=33&&n<=37;
  const caen=[];
  vivos.forEach(r=>{
    let h=1/(1+Math.exp(-(n-r.cap)/2.5));
    if(noche)h*=1.3;
    if(tardeDia2)h*=1.25;
    h+=Math.min(0.08,0.5*b.cayeronUltima/Math.max(1,quedan+b.cayeronUltima));   // el contagio es real (§ 21), por proporción del campo
    if(quedan<=4)h*=0.6;                           // nadie quiere ser el penúltimo
    if(r.arq==='mental'&&quedan<=2)h*=1.8;         // se hunde cuando se queda contigo
    if(r.animo<40)h*=1.3;
    if(b.pacto&&b.pacto.id===r.id)h*=0.7;
    if(b.farol.sentado&&b.farol.sentado.id===r.id&&b.farol.sentado.cuela)h*=1.4;
    h*=1-r.terq*0.3;
    if(Math.random()<Math.min(0.95,h))caen.push(r);
  });
  caen.forEach(r=>{r.out=true;r.outLap=b.lap;});
  b.cayeronUltima=caen.length;
  // Los que siguen: el ánimo sube al ver caer gente y baja de noche
  byVivos().forEach(r=>{r.animo=byClamp(r.animo+caen.length*2-(noche?2:0));});
  if(caen.length){b.animo=byClamp(b.animo+Math.min(8,caen.length*2));}
  if(b.pacto&&caen.some(r=>r.id===b.pacto.id)){byLog(`${b.pacto.name} no sale. Se acaba el pacto.`);b.animo=byClamp(b.animo-6);b.pacto=null;}
  b.farol.sentado=null;
  byMaterializar();
  return caen;
}
// Al bajar de 20, el pelotón pasa de número a nombres (§ 21).
function byMaterializar(){
  const vivos=byVivos();
  if(vivos.length>20)return;
  const usados=new Set(G.by.rivals.filter(r=>r.name).map(r=>r.name));
  const libres=shuffle(BY_NOMBRES.filter(([nm])=>!usados.has(nm)));
  vivos.filter(r=>!r.name).forEach((r,i)=>{
    const [nm,fl]=libres[i%libres.length];r.name=nm;r.flag=fl;
    const bios=BY_BIO[r.arq];r.bio=bios[Math.floor(Math.random()*bios.length)];
  });
}
// Si quedan pocos, algún rival te farolea a ti (§ 23): llega a la línea el último y entero.
// Se decide al ir a la línea, después de tu corral: si te sentaste a la vista y coló, el rival
// está convencido de que vas peor y no se molesta; si no coló, te lo devuelve con más ganas.
function byFarolRival(){
  const b=G.by,vivos=byVivos(),s=b.farol.sentado;
  if(vivos.length<1||vivos.length>4)return;
  if(s&&s.cuela)return;
  if(Math.random()>(s?0.3:0.15))return;
  if(b.musicaHasta>=b.lap)return;   // con música no le lees, y tampoco te afecta
  const r=s?vivos.find(x=>x.id===s.id)||vivos[0]:vivos[Math.floor(Math.random()*vivos.length)];
  b.animo=byClamp(b.animo-10);
  byLog(`${r.name||'Alguien'} llega a la línea el último y entero. ${vivos.length===1?'Puede estar mintiendo.':''}`.trim());
}

// ── El corral ──────────────────────────
function byEntrarCorral(){
  const b=G.by;
  b.corral=Math.max(0,Math.floor(60-b.lastLap));
  b.corralUsado=[];
  b.phase='corral';
  byGuardar();
}
function byAccionCabe(min){return G.by.corral>=min;}
// Aplica una acción del corral. Devuelve false si no cabía.
function byHacer(id){
  const b=G.by,a=BY_ACCIONES.find(x=>x.id===id);if(!a||!byAccionCabe(a.min))return false;
  b.corral-=a.min;b.corralUsado.push(id);
  const est=b.st.est/70*Math.max(0.4,1-b.lap/150);   // con las horas, el estómago absorbe menos
  if(id==='comer')b.energia=byClamp(b.energia+22*est);
  if(id==='gel')b.energia=byClamp(b.energia+7);
  if(id==='pies'){b.pies=Math.max(0,b.pies-1);b.animo=byClamp(b.animo+2);}
  if(id==='estirar')b.piernas=byClamp(b.piernas+(b.corralUsado.filter(x=>x==='estirar').length>1?0.3:0.8));
  if(id==='siesta'){b.lucidez=byClamp(b.lucidez+18*Math.max(0.35,1-b.lap/140));b.piernas=byClamp(b.piernas+0.5);}   // la deuda de sueño se acumula
  if(id==='equipo')b.animo=byClamp(b.animo+6);
  if(id==='sentarse'){
    // A partir de cierta fatiga, puede que no te levantes. El juego no lo impide (§ 18).
    const peor=Math.min(b.piernas,b.energia,b.lucidez,b.animo);
    if(Math.random()<byClamp((40-peor)/60,0,0.5)){
      b.result={kind:'dnf',laps:b.lap,why:'Te sentaste. Suena el cencerro y no te levantas.'};
      byLog('Te sientas un momento. Cuando quieres darte cuenta, el cencerro ya ha sonado.');
      return 'silla';
    }
    b.piernas=byClamp(b.piernas+1.5);b.energia=byClamp(b.energia+3);b.lucidez=byClamp(b.lucidez+3);b.animo=byClamp(b.animo+3);
  }
  byGuardar();   // dejarlo a medias en el corral y volver en el mismo minuto
  return true;
}
function byPalanca(id){
  const b=G.by,p=BY_PALANCAS[id];if(!p||!(b.inv[id]>0)||!byAccionCabe(p.min))return false;
  b.inv[id]--;b.corral-=p.min;
  if(id==='musica'){b.musicaHasta=b.lap+3;byLog('Te pones los cascos. El mundo se queda fuera, y los rivales también.');}
  if(id==='cafeina'){b.lucidez=byClamp(b.lucidez+25);b.cafeDeuda.push({lap:b.lap+4});}
  if(id==='llamada'){b.animo=byClamp(b.animo+35);byLog('Llamas a casa. Dos minutos que valen por diez vueltas.');}
  if(id==='ropa'){b.pies=0;b.animo=byClamp(b.animo+15);byLog('Ropa limpia entera. Como si empezaras otra carrera.');}
  byGuardar();
  return true;
}
// Correr acompañado (§ 19): con nombres en el pelotón, pactas con uno.
function byPactar(id){
  const b=G.by,r=byVivos().find(x=>x.id===id&&x.name);if(!r||b.pacto)return false;
  b.pacto={id:r.id,name:r.name,desde:b.lap};
  byLog(`Pactas con ${r.name}: la próxima, juntos y tranquilos.`);
  return true;
}
function byRomperPacto(){
  const b=G.by;if(!b.pacto)return false;
  const r=b.rivals.find(x=>x.id===b.pacto.id);
  if(r)r.animo=byClamp(r.animo-20);
  b.animo=byClamp(b.animo-8);
  byLog(`Rompes el pacto con ${b.pacto.name}. No te mira al salir.`);
  b.pacto=null;
  return true;
}
// Faroleo (§ 23). Capa 1, desde 5 en pie: golpea a todos.
function byFarolTarde(){
  const b=G.by;if(byVivos().length+1<5)return false;
  b.corral=0;b.farol.tarde=true;
  byVivos().forEach(r=>{r.animo=byClamp(r.animo-10);});
  byLog('Te presentas en la línea 40 segundos antes del cencerro, como si no te hiciera falta descansar.');
  return true;
}
function byFarolFuerte(){
  const b=G.by;if(byVivos().length+1<5)return false;
  b.farol.fuerte=true;
  byVivos().forEach(r=>{r.animo=byClamp(r.animo-8);});
  return true;
}
// Capa 2, desde 2: sentarte a la vista para que se confíe.
function byFarolSentado(){
  const b=G.by,v=byVivos();if(v.length!==1||!byAccionCabe(2))return false;
  b.corral-=2;
  const cuela=Math.random()<0.4+b.lucidez/250;
  b.farol.sentado={id:v[0].id,cuela};
  if(!cuela){b.animo=byClamp(b.animo-6);byLog(`${v[0].name} te ve sentado y sonríe. No cuela.`);}
  else{b.farolesColados=(b.farolesColados||0)+1;byLog(`Te dejas caer en la silla, a la vista de ${v[0].name}.`);}
  return true;
}

// ── La campana ─────────────────────────
// Llegas a la línea: los rivales deciden antes que tú si salen. Si no sale nadie más, la
// campana te pregunta igual (§ 22, la vuelta en solitario): el juego no te da la victoria.
function byALaLineaLogica(){
  const b=G.by;
  b.phase='bell';
  byFarolRival();
  const caen=byCampanaRivales();
  if(caen.length)byLog(caen.length===1?`${caen[0].name||'Un corredor'} no sale.`:`${caen.length} corredores no salen.`);
  if(byVivos().length===0&&!b.solo){b.solo=true;byLog('Ya no sale nadie más.');}
  byGuardar();   // en la campana: si lo dejas aquí, vuelves aquí
  return caen;
}
// Sales. Devuelve 'loop' si completaste la vuelta y 'end' si se acabó.
function bySalir(esf){
  const b=G.by;
  if(!byCorrerVuelta(esf)){
    if(b.solo)b.result={kind:'nadie',laps:b.lap,why:'Saliste solo y no llegaste a tiempo. Este año no gana nadie.'};
    return byTerminar();
  }
  if(b.solo){
    b.result={kind:'gana',laps:b.lap,why:`Única vuelta en solitario completada: ${b.lap} vueltas.`};
    return byTerminar();
  }
  b.phase='loop';
  return 'loop';
}
// No sales. Si queda alguien, aún tiene que hacer su vuelta en solitario (§ 22, 7).
function byNoSalgo(){
  const b=G.by,vivos=byVivos();
  let txt=`No sales a la vuelta ${b.lap+1}.`;
  if(vivos.length===1){
    const r=vivos[0],ok=Math.random()<0.75;
    txt+=ok?` ${r.name} sale solo y completa la vuelta: gana con ${b.lap+1}.`:` ${r.name} sale solo y no llega a tiempo. No gana nadie.`;
  }else if(vivos.length===0)txt+=' Nadie más sale. Este año no gana nadie.';
  b.result={kind:'dnf',laps:b.lap,why:txt};
  return byTerminar();
}
function byTerminar(){
  const b=G.by;b.phase='end';
  if(!b.ut){b.record=byGuardarRecord();byBorrarTirada();}   // los récords son del reto suelto
  if(typeof checkAndUnlockAchievements==='function')checkAndUnlockAchievements();
  return 'end';
}

// ── La rutina (§ 20) ───────────────────
// Encadena vueltas con el mismo esfuerzo y las mismas acciones hasta que algo la rompe.
function byFijarRutina(){
  const b=G.by;b.rutina={esfuerzo:b.esfuerzo,acciones:[...b.corralUsado]};
  byLog('Rutina fijada.');
}
function byRutinaMin(){return (G.by.rutina?.acciones||[]).reduce((s,id)=>s+(BY_ACCIONES.find(a=>a.id===id)?.min||0),0);}
function byEncadenar(){
  const b=G.by;if(!b.rutina)return 'bell';
  const ini={lap:b.lap+1,piernas:b.piernas,quedan:byVivos().length};
  const umbrales=[50,30,15];
  const cruza=(a,c)=>umbrales.some(u=>a>=u&&c<u);
  let caidos=[],motivo='',hechas=0;
  while(hechas<20){
    const antes={p:b.piernas,e:b.energia,l:b.lucidez,noche:byEsNoche(b.lap+1),nombres:byVivos().length<=20};
    const logAntes=b.log.length;
    if(hechas>0){
      const caenLinea=byALaLineaLogica();
      if(antes.nombres&&caenLinea.some(x=>x.name)||byVivos().length<=1){caidos.push(...caenLinea);motivo=byVivos().length===0?'Ya no sale nadie más.':byVivos().length===1?'Quedáis dos.':`No sale ${caenLinea.find(x=>x.name).name}.`;break;}
      caidos.push(...caenLinea);
    }
    const r=bySalir(b.rutina.esfuerzo);
    hechas++;
    if(r==='end')return 'end';
    byEntrarCorral();
    const falta=byRutinaMin()-b.corral;
    if(falta>0){motivo=`Tu rutina ya no cabe en la hora. Te faltan ${falta} minuto${falta>1?'s':''}. ¿Qué quitas?`;break;}
    b.rutina.acciones.forEach(id=>byHacer(id));
    if(b.result){byTerminar();return 'end';}
    if(cruza(antes.p,b.piernas)||cruza(antes.e,b.energia)||cruza(antes.l,b.lucidez)){motivo='Algo ha cruzado un umbral.';break;}
    if(antes.noche!==byEsNoche(b.lap+1)){motivo=byEsNoche(b.lap+1)?'Anochece.':'Amanece.';break;}
    if(b.log.slice(logAntes).some(x=>/el último y entero|llover|desvío/.test(x.t))){motivo='Ha pasado algo.';break;}
  }
  const nom=caidos.filter(x=>x.name).map(x=>x.name);
  const caidoTxt=caidos.length?` · cayeron ${nom.length?nom.slice(0,2).join(' y ')+(caidos.length>nom.slice(0,2).length?` y ${caidos.length-nom.slice(0,2).length} más`:''):caidos.length}`:'';
  b.bitacora=`Vueltas ${ini.lap}-${b.lap} · rutina mantenida${caidoTxt} · piernas ${Math.round(ini.piernas)}→${Math.round(b.piernas)}`;
  b.aviso=motivo||null;
  byGuardar();
  return b.phase==='bell'?'bell':'corral';
}
