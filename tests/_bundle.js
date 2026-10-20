// Banco de pruebas compartido por smoke.js y content.js.
//
// Concatena los once .js en UN solo ámbito, igual que hace el navegador (son
// scripts clásicos, no módulos), con stubs de DOM. Ojo: los `const`/`let` de
// nivel raíz NO se cuelgan del objeto global en un contexto `vm`, así que hay
// que pedir explícitamente los nombres que se quieren usar — el footer los
// expone uno a uno. Si se te olvida uno, `T.loQueSea` sale `undefined` y las
// comprobaciones pasan por vacías en vez de por correctas.
const fs=require('fs'), vm=require('vm'), path=require('path');

// El MISMO orden que index.html. Antes no lo era —render.js iba aquí antes que
// coach/club/canicross y en el navegador después— y eso es justo lo que hace
// que un test pase y el navegador reviente. Corregido con T53 (v92).
const FILES=['constants.js','state.js','save.js','race.js','coach.js','club.js','canicross.js',
  'render-core.js','render-clasico.js','render-temporada.js','devmode.js'];
const JS_DIR=path.join(__dirname,'..','js');

// Fuente de cada fichero, por si un test quiere inspeccionar el texto (T47 lo
// hace: busca `G.campo` dentro de los check() de los logros).
function sources(){
  const out={};
  for(const f of FILES) out[f]=fs.readFileSync(path.join(JS_DIR,f),'utf8');
  return out;
}

// names: lista de identificadores de nivel raíz a exponer.
// Devuelve {T, ctx, src} — T tiene además setG/getG para manipular el estado.
function build(names){
  const ctx={console,Math,JSON,Object,Array,Number,String,Boolean,Date,isNaN,parseInt,parseFloat,RegExp,Set,Map,
    structuredClone,TextEncoder,TextDecoder,Uint8Array,atob,btoa,Infinity,NaN,
    setTimeout:()=>{},clearTimeout:()=>{},setInterval:()=>{},clearInterval:()=>{},requestAnimationFrame:()=>{},
    localStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},
    document:{getElementById:()=>null,querySelector:()=>null,body:{}},
    alert:()=>{},confirm:()=>true,navigator:{},location:{search:''},getComputedStyle:()=>({}),
  };
  ctx.window=ctx; ctx.globalThis=ctx;
  vm.createContext(ctx);
  const s=sources();
  const src=FILES.map(f=>'\n//#### '+f+'\n'+s[f]).join('\n')
    +'\n;globalThis.__t={setG:v=>{G=v},getG:()=>G,'+names.join(',')+'};';
  vm.runInContext(src, ctx, {filename:'bundle.js'});
  return {T:ctx.__t, ctx, src:s};
}

// DOM lo bastante real como para que una pantalla se pinte entera y se pueda
// leer el HTML resultante. Sirve para lo que ni el linter ni content.js ven:
// interfaz que se calcula y nunca se interpola (el caso de zegamaBadge en v92).
function domStub(ctx){
  const nodo=()=>({_h:'',set innerHTML(v){this._h=v},get innerHTML(){return this._h},
    textContent:'',className:'',value:'',checked:false,scrollTop:0,offsetWidth:1,
    style:new Proxy({},{get:()=>'',set:()=>true}),
    classList:{add(){},remove(){},contains:()=>false,toggle(){}},
    querySelectorAll:()=>[],querySelector:()=>null,appendChild(){},removeChild(){},
    addEventListener(){},focus(){},getAttribute:()=>null,setAttribute(){},remove(){},
    getAnimations:()=>[],insertAdjacentHTML(){},closest:()=>null});
  const principal=nodo();
  ctx.document.getElementById=id=>id==='main'?principal:nodo();
  ctx.document.querySelector=()=>nodo();
  ctx.document.querySelectorAll=()=>[];
  ctx.document.createElement=()=>nodo();
  ctx.document.body=nodo();
  // Pinta una pantalla y devuelve su HTML.
  return (fn)=>{ principal._h=''; fn(); return principal._h; };
}

// Marcador de comprobaciones compartido: mismo formato de salida en los dos tests.
function scorer(){
  const st={pass:0,fail:0};
  const t=(name,cond,extra='')=>{
    if(cond){st.pass++;console.log('  ✓ '+name);}
    else {st.fail++;console.log('  ✗ '+name+(extra!==''?'  → '+extra:''));}
  };
  t.done=titulo=>{
    console.log('\n'+(st.fail===0?'✅ '+titulo:'❌ FALLOS: '+st.fail)+'  ('+st.pass+' comprobaciones pasadas)');
    process.exit(st.fail?1:0);
  };
  t.state=st;
  return t;
}

module.exports={build,sources,scorer,domStub,FILES};
