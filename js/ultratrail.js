// ══════════════════════════════════════
//  ULTRATRAIL — la carcasa del modo (paso 5 de TG-Diseno-Ultratrail-Backyard)
// ══════════════════════════════════════
// Una carrera deportiva de ultrafondista: temporadas de 52 semanas, un calendario con reglas de
// aparición (§ 3), tres botones por carrera —correrla, ir a verla, ser voluntario— (§ 4), el
// ciclo hacia cada objetivo en tres fases con una decisión por fase (§ 6) y el dinero (§ 9).
// La carrera se corre con ultra.js, que a su vez corre sobre el motor de race.js (§ 2).
// Por tramos (2026-10-30): 5a esqueleto · 5b preparaciones, carga, tirada larga, ganancias por
// horas y recuperación (§ 6, 10, 11) · 5c puntos, índice, piedras y sorteo (§ 8) · 5d escalón
// laboral, material, variantes de recorrido y reconocimiento por sectores (§ 5, 9, 12).
// Estado: G.ut (§ 31), con la carrera en curso en G.ut.carrera. Pantallas en ultratrail-render.js.

// ── Datos ──────────────────────────────
// Sube cuando cambie la forma de G.ut (como CN_REV en Canicross).
const UT_REV=1;
const UT_SEMANAS=52;
// Grandes (100K y 100M) por temporada (§ 15): 4 los diez primeros años, luego 3 y luego 2.
function utMaxGrandes(t){return t<=10?4:t<=14?3:2;}
// Semanas de recuperación de partida (decisión del 2026-10-30): 50K 1-2, 100K 3-4, 100M 5-6.
// Crecen con la edad y con las secuelas (utSemanasRecupera).
const UT_RECUPERA={preparacion:[1,2],'100k':[3,4],'100m':[5,6]};
const UT_TIPO_LABEL={preparacion:'Preparación','100k':'100 km','100m':'100 millas'};
// Escalón laboral (§ 9): el recurso escaso son las HORAS. Un campo que multiplica las horas de
// entreno; sobrante: lo que queda al mes para el deporte después de vivir. Se sube despacio y la
// mayoría de partidas no pasan del segundo. Reglas en utEscalonesPosibles.
const UT_ESCALONES={
  completa:   {label:'Jornada completa',  horas:8, sobrante:200,desc:'Cuarenta horas. Entrenas de noche y los fines de semana.'},
  reducida:   {label:'Jornada reducida',  horas:13,sobrante:60, desc:'Cuatro días: más horas para entrenar, menos sueldo. Un año en números rojos te devuelve a jornada completa.'},
  material:   {label:'Sponsor de material',horas:13,sobrante:120,viajes:true,materialGratis:true,desc:'Jornada reducida y una marca que te da el material y paga los viajes. Si el índice cae, se va.'},
  profesional:{label:'Profesional',       horas:22,sobrante:380,viajes:true,materialGratis:true,desc:'Vives de correr. Si el índice cae, se acaba.'},
};
const UT_REDUCIDA_DESDE=4;      // la jornada reducida, a partir del año 4 (§ 9)
// Material (§ 12): armario, no tienda. Cada pieza tiene su efecto en carrera (ultra.js).
const UT_MATERIAL=[
  {id:'frontal', label:'Frontal bueno',       precio:160,desc:'Doce horas de luz en vez de siete: la noche entera sin cambiar de batería.'},
  {id:'bastones',label:'Bastones',            precio:90, desc:'Las subidas largas cuestan menos. En lo llano, estorban un poco.'},
  {id:'chaqueta',label:'Chaqueta de membrana',precio:120,desc:'Material obligatorio en las de noche: sin ella no pasas el control de salida. Abriga de madrugada.'},
  {id:'zapatillas',label:'Zapatillas nuevas', precio:140,desc:'Duran unos 600 km de carreras y tiradas largas. Gastadas, las piernas sufren más.'},
];
const UT_ZAPAS_VIDA=600;
// Variantes de recorrido (§ 3): se decide la víspera. El alternativo quita desnivel de arriba
// (tu preparación de altura sirve menos); el acortado corta en una barrera. Valen menos puntos
// y quedan con asterisco.
const UT_VARIANTES={completo:'Recorrido completo',alternativo:'Recorrido alternativo por mal tiempo',acortado:'Recorrido acortado'};
// Reconocimiento por sectores (§ 5): 0 desconocido · 1 visto · 2 reconocido · 3 corrido.
const UT_RECO_NIVEL=['Desconocido','Visto','Reconocido','Corrido'];
const UT_DINERO_INICIAL=600;
const UT_PROB_CANCELA=0.06;   // permisos o meteorología (§ 3); la grande no se cancela
const UT_MOTIVOS_CANCELA=['el parque no ha dado el permiso','la organización no llega con los voluntarios',
  'un incendio en el monte cerró los accesos','se cae el patrocinador principal'];
// Los perfiles de partida: los tres corredores de la carrera suelta, de debutantes (28-32 años,
// § 15: «no vienes de nada, vienes de otra vida»).
const UT_PERFILES=ULTRA_CORREDORES.map(c=>({id:c.id,label:{rodador:'Rodador',montanero:'Montañero',veterano:'Cabeza fría'}[c.id],
  desc:c.desc,stats:Object.fromEntries(Object.entries(c.stats).map(([k,v])=>[k,v-6]))}));
const UT_EDADES=[28,29,30,31,32];
// Lo que pasa cuando vas a ver una carrera o de voluntario (§ 4): por ahora, una línea de diario.
// El nivel 1 de reconocimiento (5d) y los dorsales de voluntario (5c) leen G.ut.visitas.
const UT_VISITA_TXT={
  ver:['Pasas la noche en el avituallamiento de arriba viendo frontales. Apuntas dónde se para la gente.',
       'Ves llegar a los primeros. Ninguno corre: andan rápido y no paran.',
       'Un corredor veterano te cuenta dónde se rompe la carrera. Lo apuntas.'],
  voluntario:['Doce horas sirviendo caldo. La organización te da las gracias por tu nombre.',
       'Te toca la baliza del cruce malo. Ves a tres despistarse antes de que llegues tú.',
       'Montas y desmontas el avituallamiento. Te dicen que el año que viene cuentan contigo.'],
};

// ── Preparaciones (§ 6) ────────────────
// «No entrenas números abstractos. Entrenas contra una forma concreta de romperte.» Cinco, de 0 a
// 100; la nutrición de Clásico se disuelve en Estómago (en el modo, stats.nutricion la refleja).
const UT_PREPS=[['base','Base aeróbica'],['encaje','Encaje muscular'],['estomago','Estómago'],['nocturna','Nocturna'],['termica','Térmica']];
const UT_PREP_INICIAL={
  rodador:  {base:35,encaje:25,estomago:30,nocturna:15,termica:25},
  montanero:{base:35,encaje:20,estomago:20,nocturna:20,termica:30},
  veterano: {base:40,encaje:30,estomago:40,nocturna:25,termica:25},
};
// Lo que se pierde por semana sin entrenarla: la base, lentísimo (§ 6).
const UT_PREP_PIERDE={base:0.04,encaje:0.12,estomago:0.12,nocturna:0.15,termica:0.2};
// Un plan por fase (§ 6, una decisión por fase). gana: lo que sube cada 6 semanas a volumen
// normal; carga: lo que suma por semana. El afinado no tiene volumen: es bajar.
const UT_PLANES={
  base:[
    {id:'tranquilo',label:'Kilómetros tranquilos',desc:'Mucho fondo, poco desnivel. La base sube sin que te enteres.',gana:{base:5},carga:4},
    {id:'cuestas',  label:'Fondo con desnivel',  desc:'Las largas por el monte. Cansan más.',gana:{base:4,encaje:3},carga:6},
    {id:'comida',   label:'Tiradas comiendo',     desc:'Cada larga, comiendo lo de carrera.',gana:{base:4,estomago:3},carga:5},
    {id:'nocturnas',label:'Fondo y alguna noche', desc:'Una salida a la semana con frontal.',gana:{base:4,nocturna:3},carga:5},
  ],
  especifico:[
    {id:'bajadas', label:'Bajadas largas',       desc:'Series de descenso y tiradas con mucha bajada.',gana:{encaje:6,base:1},carga:7},
    {id:'noches',  label:'Bloque de noches',     desc:'Entrenos de madrugada: la cabeza se acostumbra.',gana:{nocturna:6,base:1},carga:6},
    {id:'estomago',label:'Comer corriendo',      desc:'Practicas la comida de carrera a ritmo.',gana:{estomago:6,base:1},carga:5},
    {id:'calor',   label:'Calor y altura',       desc:'Una concentración en altura. Cuesta dinero.',gana:{termica:7,base:1},carga:5,coste:250},
    {id:'mixto',   label:'Un poco de todo',      desc:'Sin foco: sube todo un poco.',gana:{encaje:3,nocturna:2,estomago:2,base:1},carga:6},
  ],
  afinado:[
    {id:'afinar',label:'Afinar de verdad',desc:'Bajas el volumen y llegas fresco. Lo construido se queda.',gana:{},carga:-9},
    {id:'seguir',label:'Seguir cargando', desc:'No quieres perder nada. Llegas con las piernas cargadas.',gana:{base:1,encaje:1},carga:3},
    {id:'parar', label:'Parar del todo',  desc:'Descanso casi total. Llegas nuevo, pero algo se pierde.',gana:{},carga:-14,pierdeX:2},
  ],
};
const UT_VOLUMEN={suave:{label:'Suave',mult:0.7,carga:0.6},normal:{label:'Normal',mult:1,carga:1},alto:{label:'Alto',mult:1.3,carga:1.6}};
// La tirada larga (§ 6): una por fase de base o específico, con decisión. Pago concreto en una
// preparación y en la mental; riesgo pequeño de tirón (carga de golpe).
const UT_TIRADA=[
  {id:'solo',      label:'Solo, a tu ritmo',          desc:'Cinco horas contigo mismo.',               gana:{base:2},mental:1,riesgo:0.04},
  {id:'acompanado',label:'Acompañado',                desc:'Se hace corta. Le copias cómo come.',       gana:{base:1,estomago:1},mental:2,riesgo:0.03},
  {id:'noche',     label:'De noche',                  desc:'Sales a las diez con el frontal.',          gana:{nocturna:3},mental:1,riesgo:0.07},
  {id:'mochila',   label:'Con la mochila cargada',    desc:'El peso de carrera, todo el día.',          gana:{encaje:3},mental:0,riesgo:0.08},
  {id:'nutricion', label:'Probando la comida de carrera',desc:'Lo que vas a comer el día de la carrera.',gana:{estomago:3},mental:0,riesgo:0.03},
];
// Recuperación cruzada (§ 10): no es un bloqueo, es una decisión con tres salidas.
const UT_RECUPERACION=[
  {id:'reposo', label:'Reposo total',    desc:'Te recuperas antes, pero las preparaciones bajan.',semanas:0.75,pierdeX:1.6,carga:-9},
  {id:'cruzado',label:'Bici, natación y yoga',desc:'No te hace mejor: evita que se caiga lo construido.',semanas:1,pierdeX:0,carga:-6},
  {id:'volver', label:'Volver a entrenar ya',desc:'Las preparaciones suben, pero si el cuerpo no estaba, la secuela no se va nunca.',semanas:0,pierdeX:0,carga:0,riesgo:0.35},
];

// Los logros del modo (constants.js, mode 'ut') se miran al cerrar cada cosa.
function utLogros(){if(typeof checkAndUnlockAchievements==='function')checkAndUnlockAchievements();}

// ── Arco de vida (§ 15, paso 7 del diseño) ──
// «Físicamente estás mejor a los 30. Como ultrafondista estás mejor a los 40.» Con el pico en
// 36-42: lo físico baja con los cumpleaños y la veteranía, que solo crece corriendo ultras
// largas, lo compensa con efectos concretos en carrera (ultra.js): la lucidez cae más despacio,
// menos error de dosificación, mejor absorción y menos pánico (despistes).
const UT_SECUELAS=['la rodilla de las bajadas','el tendón de Aquiles','la cadera','la espalda baja','el tobillo del esguince viejo','la fascia'];
function utSumarVeterania(v){const u=G.ut;u.veterania=Math.min(100,(u.veterania||0)+Math.max(0,v)*(1-(u.veterania||0)/120));}
function utEnvejecer(){
  const a=G.runner.age,st=G.runner.stats,baja=(k,v)=>{st[k]=Math.max(20,st[k]-v);};
  if(a>=34)baja('velocidad',1);
  if(a>=38){baja('subida',1);baja('bajada',1);}
  if(a>=42){baja('resistencia',1.5);baja('subida',1);baja('velocidad',1);}
  if(a>=45){baja('velocidad',1.5);baja('bajada',1.5);baja('subida',1.5);baja('resistencia',1);}
}
// El detonante del final (§ 16), con doble condición: el índice no llega ni a la grande más pequeña
// Y el cuerpo pide más de 20 semanas al año de recuperación. Red de seguridad: a los 50, llega igual.
const UT_INDICE_GRANDE=560,UT_RECUPERA_TOPE=20,UT_EDAD_FINAL=50;
function utEpilogoDisparado(){
  const u=G.ut,ix=utIndice(),edad=G.runner.age||30;
  if(edad>=UT_EDAD_FINAL)return 'edad';
  const sem=(u.semanasRecupera||{})[u.temporada]||0;
  if((!ix.valido||ix.valor<UT_INDICE_GRANDE)&&sem>UT_RECUPERA_TOPE&&u.temporada>=5)return 'cuerpo';
  return null;
}

// ── Los tres epílogos (§ 16): se desbloquean, no son un menú ──
// Un solo acto: pantalla que dice que ya no vas a volver → elección → una última carrera → final.
// La cuenta pendiente: el juego la identifica solo. Una grande que el sorteo te negó tres años,
// una barrera que te comió y no volviste a pasar, o un abandono.
function utCuentaPendiente(){
  const u=G.ut,h=u.historial;
  const terminadas=new Set(h.filter(x=>x.kind==='finisher').map(x=>x.id));
  const grande=ULTRA_RACES.find(r=>r.major);
  const negada=u.sorteos.filter(x=>x.id===grande.id&&!x.entro).length;
  if(negada>=3&&!terminadas.has(grande.id))return {id:grande.id,txt:`${grande.name}: el sorteo te dijo que no ${negada} años.`};
  const barrera=h.slice().reverse().find(x=>x.kind==='dnf'&&x.motivo==='barrera'&&!terminadas.has(x.id)&&utDef(x.id)?.bloques);
  if(barrera)return {id:barrera.id,txt:`${barrera.name}: la barrera del km ${barrera.km} te comió en la temporada ${barrera.t} y no volviste a pasarla.`};
  const dnf=h.slice().reverse().find(x=>x.kind==='dnf'&&x.id!=='backyard'&&!terminadas.has(x.id)&&utDef(x.id)?.bloques);
  if(dnf)return {id:dnf.id,txt:`${dnf.name}: te quedaste en el km ${dnf.km} en la temporada ${dnf.t}.`};
  return null;
}
// Montar tu propia carrera: si te has dejado ver por el circuito (voluntariado y reconocimientos).
function utSectoresConocidos(){
  const u=G.ut,out=[];
  Object.entries(u.reco||{}).forEach(([id,m])=>{const r=utDef(id);if(!r||!r.bloques)return;
    Object.entries(m).forEach(([sec,n])=>{if(n>=2)out.push({id,sec,race:r.name,bloques:r.bloques.filter(b=>b.sector===sec)});});});
  return out;
}
function utPuedeMontar(){return G.ut.visitas.filter(v=>v.tipo==='voluntario').length>=2&&utSectoresConocidos().length>=6;}
function utEpilogos(){
  const out=[],cp=utCuentaPendiente();
  if(cp)out.push({id:'cuenta',label:'La cuenta pendiente',desc:cp.txt+' Una última vez.'});
  if(utPuedeMontar())out.push({id:'montar',label:'Montar tu propia carrera',desc:'Quince años de reconocimientos se convierten en materia prima: la diseñas tú, con los sectores que conoces.'});
  out.push({id:'proyecto',label:'El proyecto personal',desc:'Sin rivales, sin puesto, sin sorteo. Algo que siempre quisiste hacer.'});
  return out;
}
function utElegirEpilogo(id){
  const u=G.ut;if(!utEpilogos().some(e=>e.id===id))return false;
  u.final={tipo:id,hecho:false,resultado:null};
  if(id==='cuenta'){const cp=utCuentaPendiente();u.final.id=cp.id;u.final.txt=cp.txt;u.vispera={id:cp.id,t:u.temporada,variante:'completo'};}
  return true;
}
// La cuenta pendiente se corre con ultra.js; al volver, se cierra el acto.
function utCerrarCuenta(){
  const u=G.ut,c=u.carrera;if(!u.final||u.final.tipo!=='cuenta'||!c||!c.fin)return false;
  const ok=c.fin.kind==='finisher';
  u.final.hecho=true;
  u.final.resultado={ok,txt:ok?`Meta en ${ultraDur(G.time)}. Esta vez sí.`:`Te quedas en el km ${c.fin.km||0}. Hay cuentas que no se cierran, y también vale.`};
  u.carrera=null;G.selectedRaces=[];
  u.retirado=true;utLogros();
  return true;
}

// «de» + sector, con la contracción: «del circo», «de la foz».
function utDe(sec){return /^el /.test(sec)?'del '+sec.slice(3):'de '+sec;}
// Montar tu propia carrera (§ 16): la diseñas con tus sectores y se corre en un párrafo.
const UT_MONTAR={
  barreras:{generosas:{label:'Generosas',f:1.55,fin:0.88,respeto:-1},normales:{label:'Normales',f:1.3,fin:0.68,respeto:0},duras:{label:'Duras',f:1.15,fin:0.45,respeto:1}},
  avitu:{pocos:{label:'Pocos',fin:-0.08,coste:-1},normales:{label:'Normales',fin:0,coste:0},muchos:{label:'Muchos',fin:0.05,coste:1}},
  dorsales:[150,400,900],
};
function utCarreraPropia({nombre,sectores,mes,barreras,avitu,dorsales}){
  const sel=utSectoresConocidos().filter(x=>sectores.includes(x.id+'|'+x.sec));
  if(sel.length<2)return null;
  let km0=0;const bloques=[];
  sel.forEach(x=>x.bloques.forEach(b=>{const l=b.km[1]-b.km[0];bloques.push({...b,km:[km0,km0+l],fin:'avituallamiento',barrera:undefined});km0+=l;}));
  bloques.forEach(b=>{delete b.barrera;});
  const km=km0,dplus=bloques.reduce((a,b)=>a+b.dplus,0);
  const base=bloques.reduce((a,b)=>a+(b.km[1]-b.km[0])*390+b.dplus*4.8+b.dminus,0)/3600;
  const B=UT_MONTAR.barreras[barreras]||UT_MONTAR.barreras.normales;
  const mid=bloques.findIndex(b=>b.km[1]>=km/2);
  if(mid>=0&&mid<bloques.length-1){
    const hasta=bloques.slice(0,mid+1).reduce((a,b)=>a+(b.km[1]-b.km[0])*390+b.dplus*4.8+b.dminus,0)/3600;
    bloques[mid].barrera={hora:Math.round(hasta*B.f*2)/2};if(km>=80)bloques[mid].fin='bolsa_vida';
  }
  bloques[bloques.length-1].fin='meta';
  const noches=km<60?0:km<130?1:2;
  const limpio=String(nombre||'').replace(/[<>"'`]/g,'').trim().slice(0,40)||`Ultra ${utDe(sel[0].sec)}`;
  return {id:'propia_'+Date.now().toString(36),name:limpio,km,dplus,salida:noches?(km<130?22:18):7,dia:noches?0:1,
    cierre:Math.ceil(base*B.f*1.05),month:mes,tipo:km<60?'preparacion':km<130?'100k':'100m',aparicion:'anual',
    semana:Math.round((mes-0.5)/12*52),inscripcion:80,viaje:80,noches,propia:true,
    desc:`La carrera de ${G.runner.name}: ${sel.map(x=>x.sec).join(', ')}.`,bloques,
    _diseno:{barreras,avitu,dorsales:UT_MONTAR.dorsales.includes(dorsales)?dorsales:400}};
}
// Se corre en un párrafo: inscritos, el tiempo que hizo, finishers, qué dijeron y si habrá segunda.
function utCorrerPropia(r){
  const u=G.ut,d=r._diseno,B=UT_MONTAR.barreras[d.barreras],A=UT_MONTAR.avitu[d.avitu];
  const fama=Math.min(1,(utIndice().valor||400)/900*0.5+u.visitas.length/20+(u.veterania||0)/200);
  const tirón=0.5+utPuntos(r)*0.08+fama*0.4;
  const inscritos=Math.min(d.dorsales,Math.round(d.dorsales*Math.min(1.3,tirón)*(0.8+Math.random()*0.3)));
  const tiempo=['un día de sol','niebla toda la noche','tormenta a media tarde','calor de agosto','frío limpio'][Math.floor(Math.random()*5)];
  const pFin=Math.max(0.15,Math.min(0.95,B.fin+A.fin-utPuntos(r)*0.03+(tiempo.startsWith('tormenta')?-0.1:0)+(Math.random()*0.1-0.05)));
  const finishers=Math.round(inscritos*pFin);
  const lleno=inscritos/d.dorsales;
  const nota=(pFin>=0.5&&pFin<=0.85?1:0)+(lleno>=0.75?1:0)+(A.coste>=0?1:0)+(B.respeto>=0?0.5:0)+(d.dorsales===900&&lleno<0.6?-1:0);
  const segunda=nota>=2.5;
  const dicen=[pFin>0.85?'«Bonita, pero cualquiera la termina.»':pFin<0.4?'«Media salida se quedó en tu barrera. Hay quien no vuelve.»':'«Dura y justa. Así tiene que ser.»',
    A.coste<0?'«Faltaba agua entre el segundo y el tercer avituallamiento.»':'«Los avituallamientos, de diez.»',
    d.dorsales===150?'«Exclusiva: parecía una carrera entre amigos.»':d.dorsales===900&&lleno>0.8?'«Masificada en los senderos estrechos.»':'«Se notaba que la había corrido alguien antes de montarla.»'];
  const conocido=BY_NOMBRES[Math.floor(Math.random()*BY_NOMBRES.length)][0];
  const vol=u.visitas.find(v=>v.tipo==='voluntario');
  return {inscritos,finishers,tiempo,dicen,segunda,puntos:utPuntos(r),
    conocido:vol?`${conocido}, a quien conociste sirviendo caldo en ${utDef(vol.id)?.name||'una carrera'}, se inscribe el primer día.`:null};
}
// Tu carrera entra en el calendario del juego: las próximas partidas de Ultratrail la traen.
function utPropias(){try{const a=JSON.parse(LS.get('ut_propias')||'[]');return Array.isArray(a)?a.filter(r=>r&&Array.isArray(r.bloques)&&r.bloques.length).slice(-3):[];}catch(e){return [];}}
function utMontarCarrera(diseno){
  const u=G.ut,r=utCarreraPropia(diseno);if(!r)return false;
  const res=utCorrerPropia(r);
  if(res.segunda){
    const guardar={...r};delete guardar._diseno;
    const lista=utPropias().concat([guardar]).slice(-3);
    LS.set('ut_propias',JSON.stringify(lista));
  }
  u.final={tipo:'montar',hecho:true,carrera:{name:r.name,km:r.km,dplus:r.dplus},resultado:res};
  u.retirado=true;utLogros();
  return true;
}

// El proyecto personal (§ 16): el motor sin rivales, por etapas. Cada día decides hasta dónde
// llegas y dónde duermes. La pantalla final no dice si ganaste: dice si lo hiciste.
function utProyectos(){
  const u=G.ut,out=[
    {id:'cordillera',label:'La travesía de la cordillera',desc:'De un extremo a otro por las crestas: 190 km y 12.000 m+ en ocho días como mucho.',km:190,dplus:12000,dias:8},
    {id:'cimas',label:'Las cimas de tu valle',desc:'Encadenar las once cumbres que ves desde casa: 95 km y 8.500 m+ en tres días.',km:95,dplus:8500,dias:3},
  ];
  const mejor=u.historial.filter(h=>h.kind==='finisher'&&h.tiempo&&utDef(h.id)?.bloques).sort((a,b)=>b.km-a.km)[0];
  if(mejor)out.push({id:'referencia',label:`El tiempo de referencia en ${mejor.name}`,desc:`Solo, sin dorsal, por el recorrido que conoces: bajar de ${ultraDur(mejor.tiempo*0.97)}.`,race:mejor.id,objetivo:Math.round(mejor.tiempo*0.97),km:utDef(mejor.id).km,dias:1});
  if(u.sorteos.some(x=>!x.entro))out.push({id:'grande',label:'La grande, a tu manera',desc:'El recorrido de Las 100 Millas, sin sorteo y sin reloj: en cuatro días como mucho.',km:165,dplus:10000,dias:4});
  return out;
}
const UT_ETAPA={corta:{label:'Corta',km:22,coste:0.8},normal:{label:'Normal',km:36,coste:1},larga:{label:'Larga',km:52,coste:1.35}};
const UT_DORMIR={refugio:{label:'Refugio',desc:'Cama y comida caliente, pero te desvías tres kilómetros.',rec:1,km:-3},vivac:{label:'Vivac',desc:'Donde caigas. Recuperas menos.',rec:0.6,km:0}};
function utEmpezarProyecto(id){
  const u=G.ut,p=utProyectos().find(x=>x.id===id);if(!p)return false;
  u.final={tipo:'proyecto',hecho:false,proyecto:{...p,hechoKm:0,dia:0,piernas:100,energia:100,animo:85,log:[]}};
  if(p.id==='referencia'){u.vispera={id:p.race,t:u.temporada,variante:'completo'};}
  return true;
}
// Un día de travesía. Devuelve 'sigue', 'hecho' o 'no'.
function utEtapa(etapaId,dormirId){
  const u=G.ut,pr=u.final?.proyecto;if(!pr||u.final.hecho)return 'no';
  const e=UT_ETAPA[etapaId]||UT_ETAPA.normal,dm=UT_DORMIR[dormirId]||UT_DORMIR.vivac,p=u.prep;
  pr.dia++;
  const tiempo=Math.random();
  const desn=pr.dplus/pr.km/100;   // m+ por km, en centenas
  let km=e.km;
  if(tiempo<0.12){km=Math.round(km*0.5);pr.log.push(`Día ${pr.dia}: tormenta en las crestas. Esperas tres horas bajo una roca.`);}
  const falta=(k)=>Math.max(0,(70-p[k])/100);
  pr.piernas=Math.max(0,pr.piernas-km*e.coste*(0.9+desn*0.5)*(1+falta('encaje'))*(1+0.04*(u.secuelas||[]).length)*0.9);
  pr.energia=Math.max(0,pr.energia-km*e.coste*0.8*(1+falta('base'))*(1+falta('estomago')*0.5));
  pr.animo=Math.max(0,Math.min(100,pr.animo-(e.km>40?6:2)+(u.veterania||0)/25));
  pr.hechoKm=Math.min(pr.km,pr.hechoKm+km+dm.km);
  if(pr.piernas<=0||pr.energia<=0){pr.log.push(`Día ${pr.dia}: el cuerpo dice basta en el km ${Math.round(pr.hechoKm)}.`);return utCerrarProyecto(false);}
  if(pr.hechoKm>=pr.km){pr.log.push(`Día ${pr.dia}: llegas. ${pr.km} km.`);return utCerrarProyecto(true);}
  // Dormir: recuperas según dónde y según la cabeza
  const r=dm.rec*(0.7+(u.veterania||0)/300);
  pr.piernas=Math.min(100,pr.piernas+28*r);pr.energia=Math.min(100,pr.energia+40*r);pr.animo=Math.min(100,pr.animo+8*r);
  pr.log.push(`Día ${pr.dia}: ${Math.round(km)} km${tiempo<0.12?' (medio día perdido)':''}. Duermes en ${dm.label.toLowerCase()}. Llevas ${Math.round(pr.hechoKm)} de ${pr.km}.`);
  if(pr.dia>=pr.dias){pr.log.push(`Se acaban los días con ${Math.round(pr.km-pr.hechoKm)} km por delante.`);return utCerrarProyecto(false);}
  return 'sigue';
}
function utDejarProyecto(){return utCerrarProyecto(false,'Lo dejas. No pasa nada: lo intentaste.');}
function utCerrarProyecto(ok,txt){
  const u=G.ut;
  const pr=u.final.proyecto;
  u.final.hecho=true;u.final.resultado={ok,txt:txt||(ok?`${pr.km} km en ${pr.dia} día${pr.dia===1?'':'s'}.`:`Te quedas a ${Math.round(pr.km-pr.hechoKm)} km.`)};
  u.retirado=true;utLogros();
  return ok?'hecho':'no';
}
// El tiempo de referencia se corre con ultra.js, solo (sin rivales).
function utCerrarReferencia(){
  const u=G.ut,c=u.carrera,pr=u.final?.proyecto;if(!pr||pr.id!=='referencia'||!c||!c.fin)return false;
  const ok=c.fin.kind==='finisher'&&G.time<=pr.objetivo;
  u.final.hecho=true;
  u.final.resultado={ok,txt:c.fin.kind!=='finisher'?`Te quedas en el km ${c.fin.km||0}.`:ok?`${ultraDur(G.time)}. Por debajo de ${ultraDur(pr.objetivo)}.`:`${ultraDur(G.time)}. No bajaste de ${ultraDur(pr.objetivo)}.`};
  u.carrera=null;G.selectedRaces=[];u.retirado=true;utLogros();
  return true;
}
// Resumen de toda la carrera deportiva para la pantalla final.
function utResumenVida(){
  const u=G.ut,h=u.historial.filter(x=>x.id!=='backyard');
  const grande=ULTRA_RACES.find(r=>r.major);
  return {temporadas:u.temporada,edad:G.runner.age,ultras:h.length,terminadas:h.filter(x=>x.kind==='finisher').length,
    km:u.historial.reduce((a,x)=>a+(x.km||0),0),grande:h.filter(x=>x.id===grande.id&&x.kind==='finisher').length,
    intentosGrande:h.filter(x=>x.id===grande.id).length,backyards:u.historial.filter(x=>x.id==='backyard').length,
    mejorBackyard:Math.max(0,...u.historial.filter(x=>x.id==='backyard').map(x=>x.laps||0)),
    veterania:Math.round(u.veterania||0),secuelas:(u.secuelas||[]).length};
}

// ── El Backyard dentro de Ultratrail (§ 26, paso 6 del diseño) ──
// Una invitación opcional cada otoño. No ocupa plaza de objetivo ni da piedras; cuesta una semana
// de recuperación por cada diez vueltas y es lo que más veteranía da (decisión del 2026-10-30).
// Se corre con backyard.js y tu corredor: el examen de las cinco preparaciones a la vez.
const UT_BACKYARD={id:'backyard',name:'El Backyard de la borda',tipo:'backyard',semana:44,viaje:60,month:11};
function utBackyardHoy(){const p=utPlan('backyard');return !!(p&&!p.hecho&&p.tipo==='backyard'&&G.ut.semana===UT_BACKYARD.semana);}
function utNoPuedeBackyard(){
  const u=G.ut;
  if(utPlan('backyard'))return utPlan('backyard').hecho?'Ya lo corriste':'Ya has aceptado';
  if(u.semana>=UT_BACKYARD.semana)return 'Ya ha pasado';
  if(!utEscalon().viajes&&u.dinero<UT_BACKYARD.viaje)return `Te faltan ${fmtEur(UT_BACKYARD.viaje-u.dinero)} para el viaje`;
  return null;
}
function utAceptarBackyard(){
  if(utNoPuedeBackyard())return false;
  G.ut.planes.push({id:'backyard',tipo:'backyard',hecho:false});
  utDiario('Aceptas la invitación al backyard de otoño. Una vuelta cada hora hasta que quede uno.');
  return true;
}
// Tus atributos para backyard.js, a partir de tu corredor y tus preparaciones (§ 26): encaje y
// resistencia → piernas; estómago → lo que absorbes en el corral; nocturna y cabeza → lucidez.
function utBackyardCorredor(){
  const st=G.runner.stats,p=G.ut.prep,vet=G.ut.veterania||0;
  const c=v=>Math.max(20,Math.min(95,Math.round(v)));
  return {name:G.runner.name,base:p.base,
    st:{res:c(st.resistencia*0.5+p.encaje*0.5+vet*0.1),vel:c(st.velocidad),est:c(p.estomago+vet*0.05),
      mente:c(st.mental*0.4+p.nocturna*0.4+vet*0.3)}};
}
function utEmpezarBackyard(){
  if(!utBackyardHoy())return false;
  byStart({dificultad:utBackyardDif(),ultra:utBackyardCorredor(),tenso:!!G.ut.opciones?.tenso});
  return true;
}
// Al volver del backyard: sin piedras, con recuperación por vueltas y lo que te deja.
function utCerrarBackyard(){
  const u=G.ut,b=G.by;if(!b||!b.result||!b.ut)return false;
  const p=utPlan('backyard');if(p)p.hecho=true;
  const laps=b.result.laps||0,gana=b.result.kind==='gana';
  u.historial.push({t:u.temporada,id:'backyard',name:`Backyard ${BY_EVENTOS[b.dif].label.toLowerCase()}`,tipo:'backyard',
    kind:gana?'gana':'dnf',motivo:null,pos:null,finishers:null,tiempo:null,km:Math.round(laps*BY_KM_VUELTA),laps,dif:b.dif,
    indice:null,puntos:0,piedras:0,variante:null});
  if(!utEscalon().viajes)utMov('Viaje al backyard',-UT_BACKYARD.viaje);
  // Lo que deja: horas = vueltas. Todo a la vez, y la cabeza más que nada
  const antes={...u.prep},peso={base:0.6,encaje:0.6,estomago:0.6,nocturna:laps>=14?0.6:0.1,termica:0};
  UT_PREPS.forEach(([k])=>utSubirPrep(k,Math.min(6,laps*0.25*peso[k])));
  u.carga=Math.min(100,u.carga+Math.round(laps*1.2));
  const sem=Math.max(1,Math.ceil(laps/10));
  u.recuperaHasta=Math.max(u.recuperaHasta,u.semana+1+sem);u.cicloDesde=u.recuperaHasta;
  u.semanasRecupera=u.semanasRecupera||{};u.semanasRecupera[u.temporada]=(u.semanasRecupera[u.temporada]||0)+sem;
  utSumarVeterania(laps*0.3);
  const sube=UT_PREPS.map(([k,l])=>[l,Math.round(u.prep[k]-antes[k])]).filter(([,v])=>v>0).map(([l,v])=>`${l.toLowerCase()} +${v}`).join(', ');
  utDiario(`Backyard: ${gana?`último en pie con ${laps} vueltas`:`${laps} vueltas`} (${Math.round(laps*BY_KM_VUELTA)} km). ${sem} semana${sem===1?'':'s'} para recuperar.${sube?` Te deja: ${sube}.`:''}`);
  utLogros();
  G.by=null;
  return true;
}
// A qué backyard te invitan (§ 24, dificultad diegética): según tu índice.
function utBackyardDif(){const ix=utIndice();const v=ix.valido?ix.valor:0;return v>=720?'internacional':v>=550?'nacional':'local';}

// ── Puntos, índice, piedras y sorteo (§ 8, modelo real) ──
// Tres sistemas que hacen tres cosas: los puntos dicen lo dura que es una carrera, el índice lo
// bien que corres, y las piedras son boletos para el sorteo de la grande. Sustituyen a G.ranking.
// Puntos de dificultad (tipo ITRA): km + D+/100, por tramos. Solo a quien termina en tiempo.
function utPuntos(r){const e=r.km+r.dplus/100;return e<25?0:e<45?1:e<75?2:e<115?3:e<155?4:e<210?5:6;}
// Piedras por terminar. El modelo real da 50K 2, 100K 3, 100M 4; aquí, con cuatro carreras al año,
// eso metía a cualquiera en la grande cada dos años. Calibrado con el motor (2026-10-30) para
// entrar 3-4 veces en quince años: preparación 1, 100K 2, 100M 3; doble en la grande.
const UT_PIEDRAS={preparacion:1,'100k':2,'100m':3};
// P(entrar) = 1 − e^(−piedras × 0,0277): 25 piedras ≈ 50 %, nunca el 100 %.
function utProbSorteo(piedras){return 1-Math.exp(-piedras*0.0277);}
const UT_SORTEO_PLAZO=3;        // se solicita en enero (semanas 1-3) y se sortea en la 4
const UT_SORTEO_ESPERA=8;       // la lista de espera corre en la semana 8 (§ 8.4, puerta 1)
const UT_INDICE_CORTESIA=720;   // vía del índice: dorsal de cortesía (§ 8.4, puerta 2)

// ── Estado ─────────────────────────────
// _utNueva: borrador de la pantalla de inicio · _utVerPrep: números de las preparaciones a la
// vista · _utFase: el plan elegido para la fase antes de la tirada larga · _utMatVuelta: a qué
// pantalla vuelve el material · _utReco: la carrera que reconoces · _utEscalon: trabajo elegido.
MODE_STATE.ultratrail=()=>({_utNueva:null,_utVerPrep:false,_utFase:null,_utMatVuelta:null,_utReco:null,_utEscalon:null,_utEtapa:null,_utMontar:null});

// Las carreras del juego y las que montaron otras partidas (utPropias, epílogo «montar»).
function utDef(id){return id==='backyard'?UT_BACKYARD:ULTRA_RACES.find(r=>r.id===id)||utPropias().find(r=>r.id===id)||null;}
function utCal(id){return (G.ut?.calendario||[]).find(x=>x.id===id)||null;}
function utPlan(id){return (G.ut?.planes||[]).find(x=>x.id===id)||null;}
function utMov(txt,v){const u=G.ut;u.dinero+=v;u.movimientos.push({t:u.temporada,s:u.semana,txt,v});if(u.movimientos.length>60)u.movimientos.splice(0,u.movimientos.length-60);}
function utDiario(txt){const u=G.ut;u.diario.push({t:u.temporada,s:u.semana,txt});if(u.diario.length>30)u.diario.splice(0,u.diario.length-30);}

// Una partida nueva: corredor, edad y la primera temporada.
function utNueva({nombre,perfil,edad,alucina,tenso}){
  const p=UT_PERFILES.find(x=>x.id===perfil)||UT_PERFILES[0];
  G.gameMode='ultratrail';
  G.runner={...freshState().runner,name:String(nombre||'').trim().slice(0,30)||'Corredor',age:UT_EDADES.includes(edad)?edad:30,stats:{...p.stats}};
  G.year=1;
  G.ut={rev:UT_REV,temporada:1,semana:1,perfil:p.id,dinero:UT_DINERO_INICIAL,escalon:'completa',
    calendario:utCalendario(1),planes:[],historial:[],movimientos:[],diario:[],visitas:[],
    cicloDesde:1,recuperaHasta:1,carrera:null,
    prep:{...(UT_PREP_INICIAL[p.id]||UT_PREP_INICIAL.rodador)},carga:0,secuelas:[],
    piedras:{saldo:0,ultima:null},sorteo:null,sorteos:[],creditoVoluntario:[],
    material:{frontal:false,bastones:false,chaqueta:false,zapatillasKm:250},indices:{},
    reco:{},recoSuelo:{},vispera:null,
    veterania:0,semanasRecupera:{},final:null,retirado:false,
    // Opciones de partida, por defecto apagadas: alucinaciones en pantalla (§ 14) y modo tenso (§ 18)
    opciones:{alucina:ULTRA_ALUCINA[alucina]?alucina:'pantalla',tenso:!!tenso}};
  G.runner.stats.nutricion=G.ut.prep.estomago;
  utDiario('Primera temporada. Tienes trabajo de jornada completa y ganas de saber cuánto aguantas.');
}

// ── Calendario (§ 3) ───────────────────
// Anual: siempre. Bienal: años pares o impares (paridad). Rotativa: la misma plaza, otra sede cada
// año. Emergente: aparece a partir de un año (desde). Y cada una, salvo la grande, puede cancelarse.
function utAparece(r,t){
  if(r.aparicion==='bienal')return t%2===(r.paridad??0);
  if(r.aparicion==='emergente')return t>=(r.desde||4);
  return true;
}
function utCalendario(t){
  return ULTRA_RACES.concat(utPropias()).filter(r=>r.semana&&utAparece(r,t)).map(r=>{
    const cancelada=!r.major&&Math.random()<UT_PROB_CANCELA;
    return {id:r.id,semana:r.semana,sede:r.aparicion==='rotativa'?r.sedes[(t-1)%r.sedes.length]:null,
      cancelada,motivo:cancelada?UT_MOTIVOS_CANCELA[Math.floor(Math.random()*UT_MOTIVOS_CANCELA.length)]:null};
  }).concat([{id:'backyard',semana:UT_BACKYARD.semana,sede:null,cancelada:false,motivo:null,backyard:true}])
    .sort((a,b)=>a.semana-b.semana);
}
// Semana del año → «abr», para las tarjetas.
function utMes(semana){return ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][Math.min(11,Math.floor((semana-1)/52*12))];}

// ── Objetivos ──────────────────────────
function utObjetivos(){
  return (G.ut?.planes||[]).filter(p=>p.tipo==='correr').map(p=>({...p,semana:utCal(p.id)?.semana||0}))
    .sort((a,b)=>a.semana-b.semana);
}
function utObjetivoSiguiente(){return utObjetivos().find(p=>!p.hecho&&p.semana>=G.ut.semana)||null;}
// La carrera de esta semana, si estás inscrito (la lee utPre).
function utObjetivoHoy(){const o=utObjetivoSiguiente();return o&&o.semana===G.ut.semana?utDef(o.id):null;}
function utGrandes(){return utObjetivos().filter(p=>utDef(p.id).tipo!=='preparacion').length;}
// Por qué no te puedes inscribir (o null si puedes). Avisa, no impide, del solape (utSolape).
function utNoPuedeInscribirse(id){
  const u=G.ut,cal=utCal(id),d=utDef(id);
  if(!cal||!d)return 'No se corre este año';
  if(cal.cancelada)return `Cancelada este año: ${cal.motivo}`;
  if(cal.semana<=u.semana)return 'Las inscripciones ya están cerradas';
  if(utPlan(id)?.tipo==='correr')return 'Ya estás inscrito';
  if(d.major)return 'Solo por sorteo: se solicita en enero';
  if(d.tipo!=='preparacion'&&utGrandes()>=utMaxGrandes(u.temporada))return `Ya tienes ${utMaxGrandes(u.temporada)} grandes este año`;
  if(u.dinero<d.inscripcion+d.viaje)return `Te faltan ${fmtEur(d.inscripcion+d.viaje-u.dinero)} para la inscripción y el viaje`;
  return null;
}
function utInscribirse(id){
  if(utNoPuedeInscribirse(id))return false;
  const u=G.ut,d=utDef(id),antes=utObjetivoSiguiente();
  u.planes=u.planes.filter(p=>p.id!==id);   // si ibas a verla, ahora la corres
  u.planes.push({id,tipo:'correr',hecho:false});
  utMov(`Inscripción: ${d.name}`,-d.inscripcion);
  // Si es el primer objetivo a la vista, el ciclo hacia él empieza ahora (o al acabar la recuperación)
  if(!antes)u.cicloDesde=Math.max(u.semana,u.recuperaHasta);
  utLogros();
  utDiario(`Te inscribes en ${d.name}. ${UT_TIPO_LABEL[d.tipo]}, semana ${utCal(id).semana}.`);
  return true;
}
// Ir a verla o de voluntario: se paga el viaje cuando llega la semana.
function utNoPuedeApuntarse(id){
  const u=G.ut,cal=utCal(id),d=utDef(id);
  if(!cal||!d)return 'No se corre este año';
  if(cal.cancelada)return `Cancelada este año: ${cal.motivo}`;
  if(cal.semana<=u.semana)return 'Ya ha pasado';
  if(utPlan(id))return utPlan(id).tipo==='correr'?'Ya estás inscrito':'Ya tienes plan para ese fin de semana';
  if(u.dinero<d.viaje)return `Te faltan ${fmtEur(d.viaje-u.dinero)} para el viaje`;
  return null;
}
function utApuntarse(id,tipo){
  if(!['ver','voluntario'].includes(tipo)||utNoPuedeApuntarse(id))return false;
  G.ut.planes.push({id,tipo,hecho:false});
  return true;
}
// Quitar un plan. La inscripción no se devuelve.
function utQuitarPlan(id){
  const u=G.ut,p=utPlan(id);if(!p||p.hecho)return false;
  u.planes=u.planes.filter(x=>x!==p);
  if(p.tipo==='correr')utDiario(`Anulas la inscripción de ${utDef(id).name}. El dinero no vuelve.`);
  return true;
}
// Aviso de solape (§ 13: avisa, no impide): otro objetivo cae dentro de la recuperación de este.
function utSolape(id){
  const cal=utCal(id),d=utDef(id);if(!cal||!d)return null;
  const [,max]=UT_RECUPERA[d.tipo];
  const otro=utObjetivos().find(p=>p.id!==id&&!p.hecho&&Math.abs(p.semana-cal.semana)<=max);
  if(!otro)return null;
  const o=utDef(otro.id),antes=otro.semana<cal.semana;
  return `${antes?o.name:d.name} te deja ${UT_RECUPERA[(antes?o:d).tipo].join('-')} semanas de recuperación y ${antes?d.name:o.name} llega a las ${Math.abs(otro.semana-cal.semana)}.`;
}

// ── Exigencia de cada carrera (§ 13): los cinco ejes de las preparaciones, de 0 a 100 ──
// Base: distancia. Encaje: metros de bajada. Estómago: horas. Nocturna: horas de noche.
// Térmica: el calor del mes. Contra estos números se pintará el semáforo del 5b.
function utHorasEstimadas(r){return r.bloques.reduce((a,b)=>a+(b.km[1]-b.km[0])*390+b.dplus*4.8+b.dminus,0)/3600*1.05;}
function utHorasNoche(r){
  const h=utHorasEstimadas(r);let n=0;
  for(let t=0;t<h;t+=0.25)if(ultraEsNoche({salida:r.salida},t*3600))n+=0.25;
  return n;
}
function utExigencia(r){
  const dm=r.bloques.reduce((a,b)=>a+b.dminus,0);
  // La grande pide unos 85 en todo: alcanzable en tres o cuatro años bien llevados.
  const calor={6:45,7:55,8:60,9:35}[r.month]??15;
  const c=v=>Math.max(5,Math.min(100,Math.round(v)));
  return {base:c(r.km/165*85),encaje:c(dm/10000*85),estomago:c(utHorasEstimadas(r)/38*85),
    nocturna:r.noches?c(utHorasNoche(r)/20*85):5,termica:c(calor)};
}

// ── El ciclo hacia el próximo objetivo (§ 6) ──
// Desde que acaba la recuperación hasta la semana de la carrera, en tres fases: base ~50 %,
// específico ~35 %, afinado ~15 %. Una decisión por fase: el botón del hub avanza la fase entera.
const UT_FASES=[['base','Base',0.5],['especifico','Específico',0.35],['afinado','Afinado',0.15]];
function utCiclo(){
  const u=G.ut,obj=utObjetivoSiguiente();
  if(utBackyardHoy())return {fase:'backyard',obj};
  if(u.semana<u.recuperaHasta)return {fase:'recuperacion',hasta:u.recuperaHasta,obj};
  if(!obj)return {fase:'libre',obj:null};
  if(obj.semana===u.semana)return {fase:'carrera',obj};
  const desde=Math.min(Math.max(u.cicloDesde,u.recuperaHasta),u.semana),total=obj.semana-desde;
  let ini=desde;
  const fases=UT_FASES.map(([id,label,pct],i)=>{
    const n=i===2?obj.semana-ini:Math.round(total*pct);
    const f={id,label,desde:ini,hasta:ini+n};ini+=n;return f;
  }).filter(f=>f.hasta>f.desde);
  const actual=fases.find(f=>u.semana<f.hasta)||fases[fases.length-1];
  return {fase:actual.id,actual,fases,obj,desde,total};
}

// ── Avanzar el tiempo ──────────────────
// Avanza hasta el final de la fase en curso. Sin objetivo, cuatro semanas. Se para siempre en la
// semana de una carrera a la que vas (correr, ver o voluntario) y al cerrar la temporada.
// Devuelve 'carrera' (toca correr: utPre), 'temporada' (fin de año) u 'ok'.
// Sin objetivo se pasan cuatro semanas de entreno suave (sostiene, no construye). Las fases y la
// recuperación pasan por su pantalla de decisión (utHacerFase, utRecuperar).
function utAvanzar(){
  const u=G.ut,ci=utCiclo();
  if(ci.fase==='carrera'){utVispera();return 'carrera';}
  if(ci.fase==='backyard')return 'backyard';
  if(ci.fase==='libre')return utPasarSemanas(u.semana+4,()=>{utSemanaEntreno({},UT_VOLUMEN.suave,0.6,0.5);});
  if(ci.fase==='recuperacion')return utRecuperar('cruzado');
  return utHacerFase(UT_PLANES[ci.fase][0].id,'normal',null);
}

// ── Entrenar (§ 6) ─────────────────────
// Horas del escalón laboral: con 8 h a la semana se construye a ritmo normal; con más, más
// rápido y con menos carga (§ 9: el recurso escaso son las horas).
function utHorasF(){const h=(UT_ESCALONES[G.ut.escalon]||UT_ESCALONES.completa).horas;return {gana:Math.sqrt(h/8),carga:Math.sqrt(8/h)};}
// Con la carga alta el cuerpo deja de absorber (§ 6, la carga como antagonista).
function utAbsorbe(est=G.ut){const c=est.carga;return c<=70?1:Math.max(0.2,1-(c-70)/40);}
// Cuanto más alta, más cuesta subirla. est: G.ut o una copia (utSimularFase).
function utSubirPrep(k,v,est=G.ut){est.prep[k]=Math.max(0,Math.min(100,est.prep[k]+(v>0?v*(1-est.prep[k]/130):v)));}
// La cuenta de una semana sobre est: lo que el plan sube, lo que se pierde de lo que no entrenas
// y la carga (que baja 3 sola). pierdeX multiplica la pérdida; cargaSemana es lo que suma.
function utSemanaCalc(est,gana,vol,pierdeX,cargaSemana){
  const hf=utHorasF(),ab=utAbsorbe(est);
  UT_PREPS.forEach(([k])=>{
    if(gana[k])utSubirPrep(k,gana[k]/6*vol.mult*hf.gana*ab,est);
    else utSubirPrep(k,-UT_PREP_PIERDE[k]*pierdeX,est);
  });
  est.carga=Math.max(0,Math.min(100,est.carga+(cargaSemana!=null?cargaSemana:0)-3));
}
// Lo que dejaría una fase entera, sin tocar la partida (para el planificador: lo que enseña es
// lo que pasará, salvo la tirada y las lesiones).
function utSimularFase(fase,planId,volId,n){
  const plan=UT_PLANES[fase].find(x=>x.id===planId),vol=fase==='afinado'?UT_VOLUMEN.normal:(UT_VOLUMEN[volId]||UT_VOLUMEN.normal);
  const est={prep:{...G.ut.prep},carga:G.ut.carga};
  for(let i=0;i<n;i++)utSemanaCalc(est,plan.gana,vol,plan.pierdeX||1,plan.carga*vol.carga*utHorasF().carga);
  return {prep:Object.fromEntries(UT_PREPS.map(([k])=>[k,est.prep[k]-G.ut.prep[k]])),carga:est.carga};
}
// Una semana de verdad, sobre la partida.
function utSemanaEntreno(gana,vol,pierdeX=1,cargaSemana=null){
  const u=G.ut;
  utSemanaCalc(u,gana,vol,pierdeX,cargaSemana);
  if(Object.keys(gana).length)u.material.zapatillasKm+=Math.round(15*vol.mult);   // las tiradas largas gastan zapatilla
  G.runner.stats.nutricion=Math.round(u.prep.estomago);
}
// Con la carga al tope, lesión: tres semanas fuera.
function utLesionPorCarga(){
  const u=G.ut;
  if(u.carga<95||Math.random()>0.25)return false;
  u.recuperaHasta=u.semana+3;u.cicloDesde=u.recuperaHasta;u.carga=Math.max(60,u.carga-20);
  utDiario('El tendón dice basta. Tres semanas sin correr: has cargado más de lo que el cuerpo absorbía.');
  return true;
}
// La fase entera con un plan y un volumen (y la tirada larga, si toca). Devuelve como utPasarSemanas.
function utHacerFase(planId,volId,tiradaId){
  const u=G.ut,ci=utCiclo();if(!ci.actual)return 'ok';
  const plan=UT_PLANES[ci.fase].find(x=>x.id===planId)||UT_PLANES[ci.fase][0];
  const vol=ci.fase==='afinado'?UT_VOLUMEN.normal:(UT_VOLUMEN[volId]||UT_VOLUMEN.normal);
  if(plan.coste){if(u.dinero<plan.coste)return 'sin_dinero';utMov(`${plan.label} (concentración)`,-plan.coste);}
  const ini={...u.prep},carga0=u.carga,n=ci.actual.hasta-u.semana,mitad=u.semana+Math.floor(n/2);
  let tiradaTxt='';
  const res=utPasarSemanas(ci.actual.hasta,uu=>{
    if(tiradaId&&uu.semana===mitad)tiradaTxt=utTiradaLarga(tiradaId);
    utSemanaEntreno(plan.gana,vol,plan.pierdeX||1,plan.carga*vol.carga*utHorasF().carga);
    if(utLesionPorCarga())return 'parar';
  });
  const sube=UT_PREPS.map(([k,l])=>[l,Math.round(u.prep[k]-ini[k])]).filter(([,d])=>d!==0).map(([l,d])=>`${l} ${d>0?'+':''}${d}`).join(', ');
  utDiario(`${ci.actual.label}: ${plan.label.toLowerCase()}${ci.fase==='afinado'?'':` (volumen ${vol.label.toLowerCase()})`}. ${sube||'Nada se mueve'}. Carga ${Math.round(carga0)} → ${Math.round(u.carga)}.${tiradaTxt?' '+tiradaTxt:''}`);
  return res==='parar'?'ok':res;
}
// ¿Toca tirada larga en esta fase? Una por fase de base o específico de al menos 3 semanas.
function utTocaTirada(){const ci=utCiclo();return (ci.fase==='base'||ci.fase==='especifico')&&ci.actual.hasta-G.ut.semana>=3;}
function utTiradaLarga(id){
  const u=G.ut,t=UT_TIRADA.find(x=>x.id===id)||UT_TIRADA[0];
  if(Math.random()<t.riesgo*(u.carga>60?2:1)){
    u.carga=Math.min(100,u.carga+12);
    return `En la tirada larga (${t.label.toLowerCase()}) das un mal paso: carga de golpe.`;
  }
  Object.entries(t.gana).forEach(([k,v])=>utSubirPrep(k,v));
  if(t.mental)G.runner.stats.mental=Math.min(100,(G.runner.stats.mental||50)+t.mental);
  return `Tirada larga ${t.label.toLowerCase()}: ${Object.keys(t.gana).map(k=>UT_PREPS.find(p=>p[0]===k)[1].toLowerCase()).join(' y ')} sube${t.mental?', y la cabeza':''}.`;
}

// ── Recuperación (§ 10) ────────────────
function utRecuperar(id){
  const u=G.ut,o=UT_RECUPERACION.find(x=>x.id===id)||UT_RECUPERACION[1];
  if(u.semana>=u.recuperaHasta)return 'ok';
  if(o.id==='volver'){
    const quedaban=u.recuperaHasta-u.semana;
    if(Math.random()<o.riesgo*Math.min(1.5,quedaban/3)){
      const txt=['el tendón de Aquiles','la rodilla de las bajadas','la cintilla','la fascia'][Math.floor(Math.random()*4)];
      u.secuelas.push({t:u.temporada,txt});
      u.recuperaHasta=u.semana+3;u.cicloDesde=u.recuperaHasta;
      utDiario(`Vuelves antes de tiempo y ${txt} se queja. Tres semanas parado, y eso ya no se va del todo.`);
      return utPasarSemanas(u.recuperaHasta,()=>{utSemanaEntreno({},UT_VOLUMEN.normal,1.2,-6);});
    }
    u.recuperaHasta=u.semana;u.cicloDesde=u.semana;
    utDiario(`Vuelves a entrenar ${quedaban} semana${quedaban===1?'':'s'} antes de lo que tocaba. Esta vez el cuerpo aguanta.`);
    return 'ok';
  }
  const hasta=u.semana+Math.max(1,Math.ceil((u.recuperaHasta-u.semana)*o.semanas));
  u.recuperaHasta=hasta;u.cicloDesde=hasta;
  const r=utPasarSemanas(hasta,()=>{utSemanaEntreno({},UT_VOLUMEN.normal,o.pierdeX,o.carga+3);});
  utDiario(`${o.label}: ${o.id==='reposo'?'vuelves antes, con algo menos de lo que tenías':'lo construido se sostiene'}.`);
  return r;
}
// Semanas de recuperación de partida, con edad y secuelas (§ 15, los tres relojes).
function utSemanasRecupera(tipo,ok){
  const [lo,hi]=UT_RECUPERA[tipo],edad=G.runner.age||30;
  const extra=(edad>=38?1:0)+(edad>=42?1:0)+(edad>=45?1:0)+Math.floor((G.ut.secuelas||[]).length/2);
  return (ok?lo+Math.floor(Math.random()*(hi-lo+1)):hi)+extra;
}

// ── Contra el objetivo: el semáforo (§ 7) ──
// Verde si llegas al 90 % de lo que pide la carrera; ámbar desde el 65 %; rojo por debajo.
function utSemaforo(r){
  const ex=utExigencia(r),p=G.ut.prep;
  return UT_PREPS.map(([k,label])=>{const ratio=p[k]/Math.max(1,ex[k]);
    return {k,label,v:Math.round(p[k]),pide:ex[k],color:ratio>=0.9?'mas':ratio>=0.65?'ojo':'menos'};});
}
// Lo que le falta a la carrera para el motor de ultra.js: déficit por eje (−0,15 a 0,6). Positivo
// es que vas corto; negativo, que te sobra.
function utDeficit(r){
  const ex=utExigencia(r),p=G.ut.prep;
  return Object.fromEntries(UT_PREPS.map(([k])=>[k,Math.max(-0.15,Math.min(0.6,(ex[k]-p[k])/100))]));
}
// semana(u): lo que pasa en cada semana (entrenar, recuperar…); si devuelve 'parar', se corta.
function utPasarSemanas(hasta,semana){
  const u=G.ut,trabajo=UT_ESCALONES[u.escalon]||UT_ESCALONES.completa;
  let sueldo=0,n=0,res='ok';
  while(u.semana<Math.min(hasta,UT_SEMANAS+1)){
    if(semana&&semana(u)==='parar'){res='parar';break;}
    u.semana++;n++;
    if(u.semana>UT_SEMANAS){res='temporada';break;}
    sueldo+=trabajo.sobrante*12/UT_SEMANAS;
    // Ir a ver o de voluntario: se resuelve al llegar la semana, sin parar
    u.planes.filter(p=>!p.hecho&&(p.tipo==='ver'||p.tipo==='voluntario')&&utCal(p.id)?.semana===u.semana).forEach(p=>utVisita(p));
    if(u.sorteo&&u.semana===UT_SORTEO_PLAZO+1&&u.sorteo.estado==='solicitado')utResolverSorteo();
    if(u.sorteo&&u.semana===UT_SORTEO_ESPERA&&u.sorteo.estado==='espera')utListaEspera();
    if(utObjetivoHoy()){utVispera();res='carrera';break;}
    if(utBackyardHoy()){res='backyard';break;}
  }
  if(sueldo>0)utMov(`Lo que sobra del sueldo (${n} semana${n===1?'':'s'})`,Math.round(sueldo));
  return res;
}
function utVisita(p){
  const u=G.ut,d=utDef(p.id),pool=UT_VISITA_TXT[p.tipo];
  p.hecho=true;
  if(!utEscalon().viajes)utMov(`Viaje a ${d.name} (${p.tipo==='ver'?'a verla':'de voluntario'})`,-d.viaje);
  // Verla o ir de voluntario: nivel 1 en los sectores accesibles al público (§ 5)
  utSectores(d).forEach((sec,i)=>{if(i%2===0)utSubirReco(d.id,sec,1);});
  u.visitas.push({t:u.temporada,id:p.id,tipo:p.tipo});
  // De voluntario en la grande: dorsal reservado para el año que viene (§ 8.4, puerta 3)
  if(p.tipo==='voluntario'&&d.major)u.creditoVoluntario.push({id:p.id,t:u.temporada+1});
  const txt=pool[Math.floor(Math.random()*pool.length)];
  utDiario(`${d.name}: ${txt.charAt(0).toLowerCase()+txt.slice(1)}`);
  // Evento de contacto (§ 4): hablas con alguien del circuito
  const x=Math.random();
  if(x<0.15){
    const obj=utObjetivoSiguiente(),r=obj?utDef(obj.id):null;
    const peor=r?utSemaforo(r).sort((a,b)=>a.v/a.pide-b.v/b.pide)[0].k:UT_PREPS[Math.floor(Math.random()*5)][0];
    utSubirPrep(peor,2);
    utDiario(`Un corredor de los de siempre te cuenta cómo prepara la ${UT_PREPS.find(p=>p[0]===peor)[1].toLowerCase()}. Lo pruebas: +2.`);
  }else if(x<0.27){G.runner.stats.mental=Math.min(100,(G.runner.stats.mental||50)+1);utDiario('Ver llegar a la última de la carrera, llorando, te recoloca la cabeza. Mental +1.');}
  else if(x<0.35&&utIndice().valido&&utIndice().valor>=600){u.contactoSponsor=true;utDiario('Alguien de una marca de material te pide el teléfono. Quizá llamen.');}
}

// ── La carrera ─────────────────────────
// De la salida se encarga ultraStart() (ultra.js), que en este modo corre con G.runner.
// Al volver: se apunta el resultado, se paga el viaje y empieza la recuperación.
function utCerrarCarrera(){
  const u=G.ut,c=u.carrera;if(!c||!c.fin)return false;
  // d: la carrera tal como se corrió (con su variante); base: la del calendario
  const base=utDef(c.id),d=G.selectedRaces[0]?.id===c.id?{...base,...G.selectedRaces[0]}:base,p=utPlan(c.id),ok=c.fin.kind==='finisher';
  if(p)p.hecho=true;
  // El índice de esta carrera (§ 8.2): tu tiempo frente al del ganador, a la cuarta, para que
  // acercarse arriba cueste: el ganador hace 1000; a un 10 % de él, ~650; a un 20 %, ~400
  const ganador=ok?Math.min(G.time,...c.rivales.filter(x=>!x.out).map(x=>x.time)):null;
  const indice=ok?Math.round(1000*Math.pow(ganador/G.time,4)):null;
  const puntos=ok?utPuntos(d):0;   // la edición corta o alternativa vale menos (§ 3)
  const piedras=ok?UT_PIEDRAS[d.tipo]*(d.major?2:1):0;
  u.historial.push({t:u.temporada,id:c.id,name:d.name,tipo:d.tipo,kind:c.fin.kind,motivo:c.fin.motivo||null,
    pos:c.fin.pos||null,finishers:c.fin.finishers||null,tiempo:ok?G.time:null,km:ok?d.km:(c.fin.km||0),
    indice,puntos,piedras,variante:c.variante&&c.variante!=='completo'?c.variante:null});
  // Lo corrido se conoce (§ 5): de día, nivel 3; de noche, lo pasaste sin enterarte
  (c.sectoresVistos||[]).forEach(x=>{
    utSubirReco(c.id,x.sector,x.noche?1:3);
    if(!x.noche){(u.recoSuelo[c.id]=u.recoSuelo[c.id]||{})[x.sector]=1;}
  });
  u.material.zapatillasKm+=Math.round(ok?d.km:(c.fin.km||0));
  u.vispera=null;
  if(piedras){u.piedras.saldo+=piedras;u.piedras.ultima=u.temporada;}
  if(!utEscalon().viajes)utMov(`Viaje a ${d.name}`,-d.viaje);
  // § 11: el cuerpo aprende de las horas, no del puesto. Toda carrera corrida sube las
  // preparaciones según lo que exige y lo que duró, termines o no. Sobre todo encaje y nocturna.
  const horas=G.time/3600,ex=utExigencia(d),antes={...u.prep};
  const peso={base:0.3,encaje:1,estomago:0.7,nocturna:1,termica:0.4};
  UT_PREPS.forEach(([k])=>utSubirPrep(k,Math.min(6,ex[k]/100*horas*0.3*peso[k])));
  const sube=UT_PREPS.map(([k,l])=>[l,Math.round(u.prep[k]-antes[k])]).filter(([,v])=>v>0).map(([l,v])=>`${l.toLowerCase()} +${v}`).join(', ');
  u.carga=Math.min(100,u.carga+Math.round(horas*1.2));
  G.runner.stats.nutricion=Math.round(u.prep.estomago);
  // El podio da su bonus de estadística como extra (la de Clásico: subida, bajada o resistencia)
  if(ok&&c.fin.pos<=3){const dom=d.dplus/d.km>70?'subida':'resistencia';G.runner.stats[dom]=Math.min(100,G.runner.stats[dom]+(4-c.fin.pos));}
  // Recuperación: la de partida si terminas; si no, en proporción a lo que corriste (mínimo una)
  const sem=ok?utSemanasRecupera(d.tipo,true):Math.max(1,Math.round(utSemanasRecupera(d.tipo,false)*(c.fin.km||0)/d.km));
  u.recuperaHasta=u.semana+1+sem;u.cicloDesde=u.recuperaHasta;
  u.semanasRecupera=u.semanasRecupera||{};u.semanasRecupera[u.temporada]=(u.semanasRecupera[u.temporada]||0)+sem;
  // Veteranía (§ 15): sale de las horas de ultra, y de un abandono se aprende más
  utSumarVeterania(horas*(ok?0.08:0.14));
  // Cada ultra grande deja marca (§ 15, el primer reloj): las 100 millas siempre pueden; los 100 km, desde los 38
  const pSec=d.tipo==='100m'?0.25:d.tipo==='100k'&&(G.runner.age||30)>=38?0.08:0;
  if(Math.random()<pSec){
    const txt=UT_SECUELAS[Math.floor(Math.random()*UT_SECUELAS.length)];
    u.secuelas.push({t:u.temporada,txt});
    utDiario(`${d.name} se cobra algo que no vuelve: ${txt}.`);
  }
  utDiario(ok?`${d.name}: finisher en ${ultraDur(G.time)}, ${c.fin.pos}.º de ${c.fin.finishers}. ${sem} semana${sem===1?'':'s'} para recuperar.`
    :`${d.name}: te quedas en el km ${c.fin.km||0}. ${sem} semana${sem===1?'':'s'} para recuperar.`);
  if(sube)utDiario(`Lo que te deja ${d.name}: ${sube}.`);
  if(ok)utDiario(`${puntos} punto${puntos===1?'':'s'} de dificultad, ${piedras} piedra${piedras===1?'':'s'} y un ${indice} de índice en esta carrera.`);
  u.carrera=null;G.selectedRaces=[];G.seg=0;G.time=0;G.paceLog=[];
  G.runner={...G.runner,energy:100,hydration:100,legs:100};
  utLogros();
  return true;
}

// ── Fin de temporada ───────────────────
function utNuevaTemporada(escalon){
  const u=G.ut;
  u.indices[u.temporada]=utIndice().valido?utIndice().valor:0;
  const pos=utEscalonesPosibles();
  const nuevo=pos.includes(escalon)?escalon:pos.includes(u.escalon)?u.escalon:pos[0];
  if(nuevo!==u.escalon)utDiario(`${UT_ESCALONES[nuevo].label}: ${UT_ESCALONES[nuevo].desc.charAt(0).toLowerCase()+UT_ESCALONES[nuevo].desc.slice(1)}`);
  u.escalon=nuevo;
  utRecoDecae();
  utRecoAvisar();
  // La cuenta pendiente (§ 8.4 y § 16): cada año que pediste la grande y no entraste
  if(u.sorteo&&u.sorteo.estado!=='dentro')u.sorteos.push({t:u.temporada,id:u.sorteo.id,entro:false});
  u.sorteo=null;
  u.temporada++;G.year=u.temporada;
  G.runner={...G.runner,age:(G.runner.age||30)+1};
  utEnvejecer();
  u.semana=1;u.planes=[];u.calendario=utCalendario(u.temporada);
  u.recuperaHasta=Math.max(1,u.recuperaHasta-UT_SEMANAS);u.cicloDesde=u.recuperaHasta;
  utDiario(`Temporada ${u.temporada}. Cumples ${G.runner.age}.`);
  utLogros();
}
// ── Escalón laboral (§ 9) ──────────────
function utEscalon(){return UT_ESCALONES[G.ut?.escalon]||UT_ESCALONES.completa;}
// Los escalones a los que puedes ir al cerrar la temporada. El primero de la lista es el que toca
// si el tuyo deja de valer. Lo pinta utTemporada; lo aplica utNuevaTemporada.
function utEscalonesPosibles(){
  const u=G.ut,t=u.temporada,ix=utIndice(),iv=ix.valido?ix.valor:0;
  const fin=u.historial.filter(h=>h.t===t&&h.kind==='finisher').length;
  const ixAnt=u.indices[t-1]||0;
  const pos=[];
  if(u.escalon==='profesional'&&iv>=700)pos.push('profesional');
  if(iv>=780&&ixAnt>=780&&!pos.includes('profesional'))pos.push('profesional');
  if(['material','profesional'].includes(u.escalon)&&iv>=600)pos.push('material');
  else if(iv>=(u.contactoSponsor?640:680)&&fin>=2)pos.push('material');   // el contacto del § 4 ayuda
  // Un año en números rojos devuelve a jornada completa
  if(t+1>=UT_REDUCIDA_DESDE&&!(u.escalon==='reducida'&&u.dinero<0))pos.push('reducida');
  pos.push('completa');
  return [...new Set(pos)].sort((a,b)=>a===u.escalon?-1:b===u.escalon?1:0);
}

// ── Material (§ 12) ────────────────────
function utTiene(id){const m=G.ut.material;return id==='zapatillas'?m.zapatillasKm<UT_ZAPAS_VIDA:!!m[id];}
function utNoPuedeComprar(id){
  const it=UT_MATERIAL.find(x=>x.id===id);if(!it)return 'No existe';
  if(id!=='zapatillas'&&G.ut.material[id])return 'Ya lo tienes';
  if(!utEscalon().materialGratis&&G.ut.dinero<it.precio)return `Te faltan ${fmtEur(it.precio-G.ut.dinero)}`;
  return null;
}
function utComprar(id){
  if(utNoPuedeComprar(id))return false;
  const it=UT_MATERIAL.find(x=>x.id===id),u=G.ut;
  if(id==='zapatillas')u.material.zapatillasKm=0;else u.material[id]=true;
  if(utEscalon().materialGratis)utDiario(`${it.label}: te lo manda la marca.`);
  else utMov(it.label,-it.precio);
  return true;
}
// ¿Pide la carrera chaqueta? En las de noche, sí (control de salida y en carrera).
function utChaquetaObligatoria(r){return (r.noches||0)>=1;}

// ── La víspera: variante de recorrido (§ 3) ──
// Se decide al llegar la semana de la carrera, una vez. 85 % completo, 10 % alternativo
// (si hay desnivel de arriba que quitar), 5 % acortado (solo las de noche).
function utVispera(){
  const u=G.ut,r=utObjetivoHoy();if(!r)return;
  if(u.vispera&&u.vispera.id===r.id&&u.vispera.t===u.temporada)return;
  const x=Math.random();
  const v=x<0.05&&r.noches?'acortado':x<0.15?'alternativo':'completo';
  // El parte, con la variante: la tormenta trae el recorrido alternativo
  const tiempo=v==='alternativo'?'tormenta':ultraSortearTiempo(r.month);
  u.vispera={id:r.id,t:u.temporada,variante:v,tiempo};
  if(v!=='completo')utDiario(`${r.name}: ${v==='alternativo'?'el parte da tormenta en las crestas. La organización saca el recorrido alternativo.':'la organización acorta la carrera por el tiempo. Vale menos y quedará con asterisco.'}`);
}
// La carrera con su variante: una copia, nunca el dato del calendario.
function utRaceVariante(def,variante){
  if(!variante||variante==='completo')return def;
  const r={...def,bloques:def.bloques.map(b=>({...b}))};
  if(variante==='alternativo'){
    // Por el valle: los dos bloques con más desnivel de arriba pierden casi la mitad
    r.bloques.filter(b=>b.tipo==='crestas'||b.tipo==='subida').sort((a,b)=>b.dplus-a.dplus).slice(0,2)
      .forEach(b=>{b.dplus=Math.round(b.dplus*0.55);b.dminus=Math.round(b.dminus*0.55);b.tipo=b.tipo==='crestas'?'llano':b.tipo;});
  }else if(variante==='acortado'){
    // Se corta en la última barrera o bolsa antes del 75 % de la distancia
    let i=-1;r.bloques.forEach((b,j)=>{if((b.barrera||b.fin==='bolsa_vida')&&b.km[1]<=def.km*0.75)i=j;});
    if(i>=0){
      const corte=r.bloques[i];
      r.cierre=Math.ceil((corte.barrera?.hora||def.cierre*corte.km[1]/def.km)+2);
      r.bloques=r.bloques.slice(0,i+1);corte.fin='meta';delete corte.barrera;
      r.km=corte.km[1];
    }
  }
  r.dplus=r.bloques.reduce((a,b)=>a+b.dplus,0);
  return r;
}

// ── Reconocimiento por sectores (§ 5) ──
function utSectores(r){return [...new Set(r.bloques.map(b=>b.sector))];}
function utReco(id,sector){return (G.ut.reco[id]||{})[sector]||0;}
function utSubirReco(id,sector,nivel){const m=(G.ut.reco[id]=G.ut.reco[id]||{});m[sector]=Math.max(m[sector]||0,nivel);}
function utRecoResumen(r){const s=utSectores(r);return {total:s.length,conocidos:s.filter(x=>utReco(r.id,x)>=2).length,vistos:s.filter(x=>utReco(r.id,x)>=1).length};}
// Decaimiento: lento, más lento en la grande, y con suelo: lo corrido de día nunca vuelve a 0.
function utRecoDecae(){
  const u=G.ut;
  Object.entries(u.reco).forEach(([id,m])=>{
    const k=utDef(id)?.major?0.5:1;
    Object.keys(m).forEach(sec=>{
      const p=[0,0.3,0.3,0.2][m[sec]]*k;
      if(m[sec]>0&&Math.random()<p)m[sec]=Math.max((u.recoSuelo[id]||{})[sec]||0,m[sec]-1);
    });
  });
}
// El sector donde suele romperse la gente (§ 5, nivel 3): el bloque más duro, sin contar el primero.
function utSectorDuro(r){return r.bloques.slice(1).reduce((m,b)=>b.dplus+b.dminus+(b.barrera?400:0)>m.v?{v:b.dplus+b.dminus+(b.barrera?400:0),s:b.sector}:m,{v:-1,s:null}).s;}
// Tras años sin ir, el recorrido ya no es el que recuerdas (§ 5): un aviso cada tres temporadas.
function utRecoAvisar(){
  const u=G.ut;if(u.temporada%3!==0)return;
  Object.keys(u.reco||{}).forEach(id=>{
    const r=utDef(id);if(!r||!r.bloques)return;
    const ultima=Math.max(0,...u.historial.filter(h=>h.id===id).map(h=>h.t),...u.visitas.filter(v=>v.id===id).map(v=>v.t));
    if(ultima&&u.temporada-ultima>=3)utDiario(`Hace ${u.temporada-ultima} años que no pisas ${r.name}: ya no es el recorrido que recuerdas. Quizá toque reconocerla.`);
  });
}
// Salida de reconocimiento: un día y medio viaje; un sector a nivel 2.
function utNoPuedeReconocer(id){
  const d=utDef(id),cal=utCal(id);
  if(!d||!cal)return 'No se corre este año';
  if(G.ut.semana<G.ut.recuperaHasta)return 'Estás recuperando';
  if(!utEscalon().viajes&&G.ut.dinero<Math.round(d.viaje/2))return 'No te llega para el viaje';
  return null;
}
function utReconocerSector(id,sector){
  const d=utDef(id);if(utNoPuedeReconocer(id)||!utSectores(d).includes(sector))return false;
  if(!utEscalon().viajes)utMov(`Reconocer ${sector} (${d.name})`,-Math.round(d.viaje/2));
  G.ut.carga=Math.min(100,G.ut.carga+3);
  utSubirReco(id,sector,2);
  utDiario(`Un día entero por ${sector}. Ya sabes dónde están los cruces.`);
  return true;
}
// Fin de semana de reconocimiento: media carrera (la primera o la segunda mitad), carga alta y
// riesgo de lesión.
function utFinDeSemanaReco(id,mitad){
  const d=utDef(id),u=G.ut;if(utNoPuedeReconocer(id))return false;
  if(!utEscalon().viajes&&u.dinero<d.viaje+60)return false;
  if(!utEscalon().viajes)utMov(`Fin de semana de reconocimiento (${d.name})`,-(d.viaje+60));
  u.carga=Math.min(100,u.carga+15);
  const secs=[...new Set(d.bloques.filter(b=>mitad===0?b.km[1]<=d.km/2+1:b.km[0]>=d.km/2-1).map(b=>b.sector))];
  secs.forEach(sec=>utSubirReco(id,sec,2));
  if(Math.random()<0.06){
    u.recuperaHasta=Math.max(u.recuperaHasta,u.semana+3);u.cicloDesde=u.recuperaHasta;
    utDiario(`Tres días por ${d.name}, cien kilómetros. El último descenso se lleva el tobillo: tres semanas parado.`);
  }else utDiario(`Tres días por ${d.name}: ${secs.join(', ')}. Ya no es un mapa.`);
  return true;
}

// ── Piedras ────────────────────────────
// Nunca caducan, pero solo están activas dos años: sin una nueva en 24 meses, quedan dormidas
// hasta que consigas otra (§ 8.3).
function utPiedrasActivas(){const p=G.ut.piedras;return p.ultima!=null&&G.ut.temporada-p.ultima<=1?p.saldo:0;}
// ── Índice (§ 8.2) ─────────────────────
// Hasta 5 mejores resultados de los últimos 36 meses (tres temporadas), con más peso a lo mejor y
// a lo reciente. Sin ningún resultado en 24 meses, no es válido. Por categoría, igual.
function utIndice(tipo){
  const u=G.ut,t=u.temporada;
  const res=u.historial.filter(h=>h.indice&&h.t>=t-2&&(!tipo||h.tipo===tipo));
  if(!res.some(h=>h.t>=t-1))return {valor:0,valido:false,n:res.length};
  const top=res.map(h=>({v:h.indice*[1,0.95,0.9][t-h.t]})).sort((a,b)=>b.v-a.v).slice(0,5);
  const pesos=[1,0.85,0.7,0.6,0.5];
  const v=top.reduce((a,x,i)=>a+x.v*pesos[i],0)/top.reduce((a,x,i)=>a+pesos[i],0);
  return {valor:Math.round(v),valido:true,n:res.length};
}
// ── Sorteo de la grande (§ 8.4) ────────
function utMajor(){return ULTRA_RACES.find(r=>r.major&&utCal(r.id)&&!utCal(r.id).cancelada)||null;}
function utNoPuedeSolicitar(){
  const u=G.ut,m=utMajor();
  if(!m)return 'No hay sorteo este año';
  if(u.sorteo)return 'Ya lo has solicitado';
  if(u.semana>UT_SORTEO_PLAZO)return 'El plazo se cerró en enero';
  return null;
}
function utSolicitarSorteo(){
  if(utNoPuedeSolicitar())return false;
  G.ut.sorteo={id:utMajor().id,estado:'solicitado',via:null,piedras:utPiedrasActivas()};
  utDiario(`Solicitas plaza en ${utMajor().name}. El sorteo, en la semana ${UT_SORTEO_PLAZO+1}.`);
  return true;
}
// Las tres puertas antes que la lotería: índice y voluntariado no gastan piedras.
function utResolverSorteo(){
  const u=G.ut,s=u.sorteo,d=utDef(s.id);
  const cred=u.creditoVoluntario.findIndex(c=>c.id===s.id&&c.t===u.temporada);
  if(utIndice().valido&&utIndice().valor>=UT_INDICE_CORTESIA)return utDentro('indice',`Tu índice (${utIndice().valor}) te da dorsal de cortesía en ${d.name}. Sin sorteo.`);
  if(cred>=0){u.creditoVoluntario.splice(cred,1);return utDentro('voluntario',`La organización de ${d.name} cumple: dorsal reservado por tu año de voluntario.`);}
  const p=utProbSorteo(utPiedrasActivas());
  if(Math.random()<p)return utDentro('sorteo',`¡Te toca! Tu nombre sale en el sorteo de ${d.name}. Las ${utPiedrasActivas()} piedras se gastan.`,true);
  s.estado='espera';
  utDiario(`No sale tu nombre en el sorteo de ${d.name} (tenías un ${Math.round(p*100)} %). Quedas en lista de espera.`);
}
// Lista de espera (puerta 1): si los seleccionados no confirman, una segunda tirada pequeña.
function utListaEspera(){
  const u=G.ut,s=u.sorteo,d=utDef(s.id),p=utProbSorteo(utPiedrasActivas())*0.25;
  if(Math.random()<p)return utDentro('espera',`Te llaman de la lista de espera de ${d.name}: alguien no ha confirmado. Las piedras se gastan.`,true);
  s.estado='fuera';
  utDiario(`La lista de espera de ${d.name} no llega hasta ti. Las piedras se quedan: el año que viene, más.`);
}
// Dentro: hay que confirmar pagando. Si no puedes, pierdes la mitad de las piedras.
function utDentro(via,txt,gasta){
  const u=G.ut,s=u.sorteo,d=utDef(s.id);
  if(u.dinero<d.inscripcion+d.viaje){
    if(gasta)u.piedras.saldo=Math.floor(u.piedras.saldo/2);
    s.estado='fuera';
    utDiario(`${txt} Pero no te llega para la inscripción y el viaje: no confirmas${gasta?' y pierdes la mitad de las piedras':''}.`);
    return;
  }
  if(gasta)u.piedras.saldo=0;
  s.estado='dentro';s.via=via;
  u.planes=u.planes.filter(p=>p.id!==s.id);
  u.planes.push({id:s.id,tipo:'correr',hecho:false});
  utMov(`Inscripción: ${d.name}`,-d.inscripcion);
  if(!utObjetivos().some(o=>!o.hecho&&o.id!==s.id&&o.semana<utCal(s.id).semana))u.cicloDesde=Math.max(u.semana,u.recuperaHasta);
  u.sorteos.push({t:u.temporada,id:s.id,entro:true,via});
  utDiario(txt);
}
// Lo que te falta, en una frase (§ 28): no enseñes el número, enseña lo que te falta.
function utFraseSorteo(){
  const act=utPiedrasActivas(),p=Math.round(utProbSorteo(act)*100),dorm=G.ut.piedras.saldo-act;
  if(dorm>0&&!act)return `Tus ${dorm} piedras están dormidas: llevas dos años sin terminar ninguna. Termina una carrera y despiertan.`;
  const cien=UT_PIEDRAS['100k'],prep=UT_PIEDRAS.preparacion;
  if(!act)return `Sin piedras no entras en el sorteo. Terminar un 100 km da ${cien}; una de preparación, ${prep}.`;
  return `Con ${act} piedras tus opciones en el sorteo son ${p<15?'bajas':p<35?'pocas':p<60?'reales':'buenas'} (${p} %). Terminar un 100 km te daría ${cien} más.`;
}

function utResumenTemporada(t){
  const h=(G.ut?.historial||[]).filter(x=>x.t===t),ultras=h.filter(x=>x.id!=='backyard');   // el backyard no «se termina»
  return {corridas:ultras.length,finisher:ultras.filter(x=>x.kind==='finisher').length,km:h.reduce((a,x)=>a+(x.km||0),0),
    gasto:(G.ut?.movimientos||[]).filter(m=>m.t===t&&m.v<0).reduce((a,m)=>a+m.v,0),
    ingreso:(G.ut?.movimientos||[]).filter(m=>m.t===t&&m.v>0).reduce((a,m)=>a+m.v,0),h};
}
