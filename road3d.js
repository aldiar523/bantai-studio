/* Project BantAI - the welcome road.
 *
 * A scroll-driven 3D view of the contracts at the top of today's review queue: each one is a
 * roadside banner on a Philippine road under construction. Banner size and the coin stack show the
 * budget; the coned-off work zone shows the road length where DPWH states one.
 *
 * Built on three.js r128 (MIT), vendored in vendor/three/. The page must work without it:
 * BantAIRoad.init() returns false when WebGL is unavailable and the caller shows the flat strip.
 *
 * Usage:  BantAIRoad.init({host, spacer, cap, counter, bar, hint, autopilot, cases, onPick})
 *   cases: [{id, name, town, region, budget_m, length_m, colour, reasons[]}]
 */
(function (global) {
'use strict';
var API = {};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
// ===== ROAD (WebGL, three.js) =====
const GAP=170,F0=70,DW=27,RWm=3.65,ZMAX=140;
const TYPES=['Preventive Maintenance','Rehabilitation','Reconstruction','Construction','Widening','Concreting','Upgrading','Repair','Installation','Improvement'];
const titleCase=s=>s.toLowerCase().replace(/\b[a-z]/g,m=>m.toUpperCase());
const shortOf=c=>{const ty=TYPES.find(t=>c.n.toLowerCase().includes(t.toLowerCase()))||c.n.split(' ').slice(0,2).join(' ');const pl=titleCase((c.t||'').replace(/ area$/i,'')).replace(/^Region /,'Region ');return {ty,pl}};
const zoneLenM=c=>Math.min(ZMAX,14+Math.sqrt(c.len)*1.6);
let R3=null, D=[], N=0, MB=1, ML=1, ELS={}, PICK=null;
const fmL=m=>m>=1000?(m/1000).toFixed(1)+' km':Math.round(m)+' m';
const nCoin=c=>Math.max(1,Math.min(12,Math.ceil(c.b/15)));
const money=c=>c.b>=1000?'\u20b1'+(c.b/1000).toFixed(2)+'B':'\u20b1'+(c.b>=100?Math.round(c.b):c.b.toFixed(1))+'M';
const $=sel=>ELS[sel.replace(/[#']/g,'')]||{textContent:'',style:{},dataset:{},setAttribute(){},getBoundingClientRect(){return{top:0,height:1}},offsetHeight:1,offsetTop:0,clientWidth:800,clientHeight:600,addEventListener(){},appendChild(){}};
const ease=f=>f-Math.sin(2*Math.PI*f)/(2*Math.PI)*.85;
function target(){const sp=$('#spacer'),max=sp.offsetHeight-innerHeight,p=Math.max(0,Math.min(1,(scrollY-sp.offsetTop)/max));const t=p*(N-1),k=Math.floor(t),f=t-k;return {p,c:F0-DW+(k+ease(f))*GAP}}
const rnd=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)};
const vn=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,h=(a,b)=>rnd(a*57.3+b*131.7),u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf);return h(xi,yi)*(1-u)*(1-v)+h(xi+1,yi)*u*(1-v)+h(xi,yi+1)*(1-u)*v+h(xi+1,yi+1)*u*v};
function initRoad(){
 const T=THREE,host=$('#gl'),Wd=()=>host.clientWidth,Hd=()=>host.clientHeight;
 const renderer=new T.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(2,devicePixelRatio||1));renderer.setSize(Wd(),Hd());
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;renderer.outputEncoding=T.sRGBEncoding;host.appendChild(renderer.domElement);
 const scene=new T.Scene(),FOGC=0xd6e9f2;scene.fog=new T.Fog(FOGC,90,820);
 const camera=new T.PerspectiveCamera(52,Wd()/Hd(),.1,2500);
 const aniso=renderer.capabilities.getMaxAnisotropy();
 const tex=(w,h,draw,rep,srgb=true)=>{const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');draw(x,w,h);const t=new T.CanvasTexture(c);t.wrapS=t.wrapT=T.RepeatWrapping;if(rep)t.repeat.set(rep[0],rep[1]);t.anisotropy=aniso;if(srgb)t.encoding=T.sRGBEncoding;return t};
 const speck=(x,w,h,n,cols,rmax)=>{for(let i=0;i<n;i++){x.fillStyle=cols[i%cols.length];x.globalAlpha=.12+rnd(i)*.25;x.beginPath();x.arc(rnd(i*3)*w,rnd(i*5+1)*h,.6+rnd(i*7)*rmax,0,7);x.fill()}x.globalAlpha=1};
 // lights
 const hemi=new T.HemisphereLight(0xbcdcff,0x4f6e36,.5);scene.add(hemi);
 const sun=new T.DirectionalLight(0xffeccb,1.75);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);const sc=sun.shadow.camera;sc.left=-55;sc.right=55;sc.top=55;sc.bottom=-55;sc.near=1;sc.far=220;sun.shadow.bias=-.0004;sun.shadow.normalBias=.04;scene.add(sun,sun.target);
 // sky dome
 const sky=new T.Mesh(new T.SphereGeometry(1800,32,16),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{},vertexShader:'varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;void main(){float h=clamp(p.y,0.,1.);vec3 hor=vec3(.84,.92,.96),mid=vec3(.50,.73,.93),top=vec3(.17,.43,.82);vec3 c=mix(hor,mid,smoothstep(0.,.22,h));c=mix(c,top,smoothstep(.2,.9,h));vec3 sd=normalize(vec3(.35,.28,-.9));float s=max(dot(p,sd),0.);c+=vec3(1.,.93,.75)*(pow(s,900.)*2.+pow(s,24.)*.28);gl_FragColor=vec4(c,1.);}'}));scene.add(sky);
 // clouds
 const cloudTex=tex(256,256,(x,w,h)=>{for(let i=0;i<26;i++){const gx=w/2+(rnd(i)-.5)*w*.55,gy=h/2+(rnd(i+40)-.5)*h*.25,r=26+rnd(i+80)*46,g=x.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,w,h)}});
 const clouds=[];for(let i=0;i<18;i++){const s=new T.Sprite(new T.SpriteMaterial({map:cloudTex,transparent:true,depthWrite:false,fog:false,opacity:.9}));s.scale.set(260+rnd(i)*220,90+rnd(i+3)*50,1);s.position.set((rnd(i+9)-.5)*1600,170+rnd(i+11)*120,-rnd(i+13)*1600+200);s.userData.v=.6+rnd(i)*.8;scene.add(s);clouds.push(s)}
 // materials / textures
 const roadL=14.6,RW2=RWm*2;
 const roadTex=tex(512,1024,(x,w,h)=>{x.fillStyle='#b4b7bc';x.fillRect(0,0,w,h);speck(x,w,h,16000,['#8d9096','#cfd1d5','#a0a3a9','#c0c2c6'],.8);for(let k=0;k<7;k++){x.fillStyle='rgba(60,60,60,.06)';x.fillRect(rnd(k)*w*.6,0,rnd(k+3)*40+10,h)}
  x.fillStyle='rgba(55,58,66,.55)';x.fillRect(0,h-3,w,3);x.fillStyle='rgba(55,58,66,.25)';x.fillRect(0,h*.5,w,2);
  const mx=w/2,pxm=w/RW2;x.fillStyle='#f2bd12';x.fillRect(mx-.14*pxm-2.5,0,5,h);x.fillRect(mx+.14*pxm-2.5,0,5,h);x.fillStyle='#f2f2ee';x.fillRect(.28*pxm,0,6,h);x.fillRect(w-.28*pxm-6,0,6,h);speck(x,w,h,2500,['#777'],1)},[1,1]);
 const bumpTex=tex(256,256,(x,w,h)=>{x.fillStyle='#808080';x.fillRect(0,0,w,h);speck(x,w,h,6000,['#fff','#000','#bbb','#444'],.7)},[1,1],false);
 const roadMat=new T.MeshStandardMaterial({map:roadTex,bumpMap:bumpTex,bumpScale:.12,roughness:.92,metalness:0});
 const freshTex=tex(512,512,(x,w,h)=>{x.fillStyle='#d6d8dc';x.fillRect(0,0,w,h);speck(x,w,h,5000,['#bfc1c6','#ececee'],1.2);x.fillStyle='rgba(70,70,76,.4)';x.fillRect(0,h-3,w,3)},[1,1]);
 const freshMat=new T.MeshStandardMaterial({map:freshTex,roughness:.8});
 const sandTex=tex(256,256,(x,w,h)=>{x.fillStyle='#a99a76';x.fillRect(0,0,w,h);speck(x,w,h,4000,['#8a7a58','#c6b78f','#7d6e4e'],1.6)},[1,1]);
 const sandMat=new T.MeshStandardMaterial({map:sandTex,roughness:1});
 const grassTex=tex(512,512,(x,w,h)=>{x.fillStyle='#6fa33f';x.fillRect(0,0,w,h);speck(x,w,h,14000,['#5a8a30','#86b94e','#4c7a28','#9bc760'],2.2)},[1,1]);
 // terrain
 const L=N*GAP+700,TW=1500,gx=150,gz=Math.ceil(L/9);const geo=new T.PlaneGeometry(TW,L,gx,gz);geo.rotateX(-Math.PI/2);const pos=geo.attributes.position,col=new Float32Array(pos.count*3);
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),ax=Math.abs(x);let h=0;const ramp=Math.min(1,Math.max(0,(ax-110)/520));h=ramp*ramp*(vn(x*.006,z*.006)*95+vn(x*.02,z*.02)*18);const near=Math.min(1,Math.max(0,(ax-48)/60));h+=(vn(x*.03,z*.03)-.5)*.6*near;pos.setY(i,ax<48?-.1:Math.max(-.2,h)-.08*(1-near)-.02);
  const paddy=vn(x*.025,z*.012),m=ax<150?.75+paddy*.5:1,hh=Math.min(1,h/70);const r=.6*m*(1-hh)+.3*hh,gg=.78*m*(1-hh)+.44*hh,bb=.4*m*(1-hh)+.3*hh;const gold=ax<150&&paddy>.62?(paddy-.62)*2.2:0;col[i*3]=Math.min(1,r+gold*.35);col[i*3+1]=Math.min(1,gg+gold*.1);col[i*3+2]=bb}
 geo.setAttribute('color',new T.BufferAttribute(col,3));geo.computeVertexNormals();
 const uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,uv.getX(i)*TW/6,uv.getY(i)*L/6);
 const ground=new T.Mesh(geo,new T.MeshStandardMaterial({map:grassTex,vertexColors:true,roughness:1}));ground.position.z=-L/2+300;ground.receiveShadow=true;scene.add(ground);
 // road + shoulders
 const road=new T.Mesh(new T.PlaneGeometry(RW2,L),roadMat);road.rotation.x=-Math.PI/2;road.position.set(0,.02,-L/2+300);roadTex.repeat.set(1,L/roadL);bumpTex.repeat.set(RW2/4,L/4);road.receiveShadow=true;scene.add(road);
 [-1,1].forEach(sd=>{const m=new T.Mesh(new T.PlaneGeometry(2.4,L),sandMat);m.rotation.x=-Math.PI/2;m.position.set(sd*(RWm+1.2),.015,-L/2+300);sandTex.repeat.set(1,L/6);m.receiveShadow=true;scene.add(m)});
 // streaming helper
 const STR=[];const add=(o,d,x,ry,y=0)=>{o.position.set(x,y,-d);if(ry)o.rotation.y=ry;scene.add(o);STR.push({o,d});return o};
 // palm
 const barkTex=tex(64,256,(x,w,h)=>{x.fillStyle='#7d6246';x.fillRect(0,0,w,h);for(let y=0;y<h;y+=12){x.fillStyle='rgba(40,28,16,.55)';x.fillRect(0,y,w,3)}speck(x,w,h,300,['#4b3826'],1)},[1,4]);
 const frondTex=tex(256,64,(x,w,h)=>{x.clearRect(0,0,w,h);x.strokeStyle='#3f8a37';x.lineWidth=4;x.beginPath();x.moveTo(0,h/2);x.lineTo(w,h/2);x.stroke();for(let i=4;i<w-6;i+=5){const len=(h/2-4)*Math.sin(Math.PI*(1-i/w)*.9+.2);x.strokeStyle=i%10?'#6cc257':'#58b04a';x.lineWidth=4;x.beginPath();x.moveTo(i,h/2);x.lineTo(i+10,h/2-len);x.moveTo(i,h/2);x.lineTo(i+10,h/2+len);x.stroke()}},[1,1]);
 const frondMat=new T.MeshStandardMaterial({map:frondTex,alphaTest:.4,side:T.DoubleSide,roughness:.7,emissive:0x1d4a1a,emissiveIntensity:.6});
 const trunkMat=new T.MeshStandardMaterial({map:barkTex,roughness:1});
 function makePalm(seed){const gr=new T.Group(),h=8+rnd(seed)*4.5,lean=(rnd(seed+1)-.5)*1.6;const curve=new T.QuadraticBezierCurve3(new T.Vector3(0,0,0),new T.Vector3(lean*.2,h*.55,0),new T.Vector3(lean,h,0));const tr=new T.Mesh(new T.TubeGeometry(curve,10,.22,8),trunkMat);tr.castShadow=true;gr.add(tr);
  const crown=new T.Group();crown.position.set(lean,h,0);gr.add(crown);for(let i=0;i<11;i++){const fr=new T.Mesh(new T.PlaneGeometry(5.4,1.9),frondMat);fr.geometry.translate(2.7,0,0);fr.rotation.x=-Math.PI/2;const a=i/11*Math.PI*2+rnd(seed+i)*.3;const p=new T.Group();p.rotation.y=a;const pv=new T.Group();pv.rotation.z=-(.25+rnd(seed+i+7)*.5);pv.add(fr);p.add(pv);crown.add(p)}
  gr.userData.crown=crown;gr.userData.ph=rnd(seed)*6;return gr}
 const palms=[];
 // hut
 const thatch=tex(128,128,(x,w,h)=>{x.fillStyle='#b9a35f';x.fillRect(0,0,w,h);for(let i=0;i<200;i++){x.strokeStyle=['#8f7c3f','#d4c07a','#a08d4a'][i%3];x.beginPath();x.moveTo(rnd(i)*w,0);x.lineTo(rnd(i)*w+(rnd(i+9)-.5)*10,h);x.stroke()}},[2,2]);
 const bambooTex=tex(128,128,(x,w,h)=>{x.fillStyle='#a8844f';x.fillRect(0,0,w,h);for(let i=0;i<w;i+=8){x.fillStyle=i%16?'#8c6a3a':'#b7955e';x.fillRect(i,0,5,h)}},[2,1]);
 function makeHut(){const g=new T.Group();const b=new T.Mesh(new T.BoxGeometry(5,2.4,4),new T.MeshStandardMaterial({map:bambooTex,roughness:1}));b.position.y=2.6;b.castShadow=b.receiveShadow=true;g.add(b);[[-2.3,-1.8],[2.3,-1.8],[-2.3,1.8],[2.3,1.8]].forEach(p=>{const s=new T.Mesh(new T.BoxGeometry(.2,1.6,.2),new T.MeshStandardMaterial({color:0x6b4a28}));s.position.set(p[0],.8,p[1]);g.add(s)});
  const r=new T.Mesh(new T.ConeGeometry(4.2,2.8,4),new T.MeshStandardMaterial({map:thatch,roughness:1}));r.rotation.y=Math.PI/4;r.position.y=5.2;r.castShadow=true;g.add(r);return g}
 // utility pole
 function makePole(){const g=new T.Group();const p=new T.Mesh(new T.CylinderGeometry(.11,.16,8.5,8),new T.MeshStandardMaterial({color:0x8e8579,roughness:.9}));p.position.y=4.25;p.castShadow=true;g.add(p);const a=new T.Mesh(new T.BoxGeometry(2.6,.12,.12),new T.MeshStandardMaterial({color:0x5b4b36}));a.position.y=7.8;g.add(a);return g}
 const wireMat=new T.LineBasicMaterial({color:0x2a2e35});
 // cones, barrier, sign
 const coneBody=new T.CylinderGeometry(.06,.22,.7,12),coneBase=new T.BoxGeometry(.5,.04,.5),cMat=new T.MeshStandardMaterial({color:0xff5f12,roughness:.5}),wMat=new T.MeshStandardMaterial({color:0xf5f5f0,roughness:.5});
 function makeCone(){const g=new T.Group();const b=new T.Mesh(coneBody,cMat);b.position.y=.39;b.castShadow=true;g.add(b);const s=new T.Mesh(new T.CylinderGeometry(.115,.15,.14,12),wMat);s.position.y=.42;g.add(s);const p=new T.Mesh(coneBase,new T.MeshStandardMaterial({color:0x222}));p.position.y=.02;g.add(p);return g}
 const stripeTex=tex(256,64,(x,w,h)=>{for(let i=0;i<8;i++){x.fillStyle=i%2?'#f6f6f2':'#ff5f12';x.fillRect(i*w/8,0,w/8,h)}},[1,1]);
 function makeBarrier(){const g=new T.Group();const b=new T.Mesh(new T.BoxGeometry(2.4,.4,.08),new T.MeshStandardMaterial({map:stripeTex,roughness:.5}));b.position.y=.95;b.castShadow=true;g.add(b);const b2=b.clone();b2.position.y=.5;g.add(b2);[-1.1,1.1].forEach(x=>{const l=new T.Mesh(new T.BoxGeometry(.08,1.2,.4),new T.MeshStandardMaterial({color:0x555}));l.position.set(x,.6,0);g.add(l)});return g}
 function makeWarn(){const g=new T.Group();const p=new T.Mesh(new T.CylinderGeometry(.04,.04,2.6,8),new T.MeshStandardMaterial({color:0x666,metalness:.6,roughness:.4}));p.position.y=1.3;g.add(p);const t=tex(256,256,(x,w,h)=>{x.fillStyle='#ffb800';x.fillRect(0,0,w,h);x.strokeStyle='#111';x.lineWidth=10;x.strokeRect(8,8,w-16,h-16);x.fillStyle='#111';x.font='700 56px "DM Sans",Arial,sans-serif';x.textAlign='center';x.fillText('ROAD',w/2,112);x.fillText('WORK',w/2,172);x.font='700 30px "DM Sans",Arial';x.fillText('AHEAD',w/2,214)});const s=new T.Mesh(new T.PlaneGeometry(1.1,1.1),new T.MeshStandardMaterial({map:t,roughness:.5,side:T.DoubleSide}));s.rotation.z=Math.PI/4;s.position.y=2.9;s.castShadow=true;g.add(s);return g}
 // gravel
 function makeGravel(){const m=new T.Mesh(new T.ConeGeometry(2.4,1.8,10),new T.MeshStandardMaterial({color:0x86745a,roughness:1}));m.position.y=.9;m.castShadow=true;const g=new T.Group();g.add(m);return g}
 // worker
 function makeWorker(sd){const g=new T.Group();const v=new T.MeshStandardMaterial({color:0xff6a10,roughness:.8}),dk=new T.MeshStandardMaterial({color:0x2b3140,roughness:.9}),sk=new T.MeshStandardMaterial({color:0xb98560,roughness:.9});const t=new T.Mesh(new T.BoxGeometry(.42,.6,.26),v);t.position.y=1.2;const l1=new T.Mesh(new T.BoxGeometry(.16,.8,.2),dk),l2=l1.clone();l1.position.set(-.1,.4,0);l2.position.set(.1,.4,0);const h=new T.Mesh(new T.SphereGeometry(.15,12,8),sk);h.position.y=1.7;const hh=new T.Mesh(new T.SphereGeometry(.18,12,8,0,7,0,1.5),new T.MeshStandardMaterial({color:0xf5c518,roughness:.5}));hh.position.y=1.74;[t,l1,l2,h,hh].forEach(m=>{m.castShadow=true;g.add(m)});g.userData.ph=sd;return g}
 // excavator
 const yel=new T.MeshStandardMaterial({color:0xf0a90f,roughness:.45,metalness:.35}),dgr=new T.MeshStandardMaterial({color:0x23262c,roughness:.7,metalness:.3}),glass=new T.MeshStandardMaterial({color:0x9ccbe0,roughness:.1,metalness:.6,transparent:true,opacity:.75});
 function makeExc(){const g=new T.Group();[-1.3,1.3].forEach(x=>{const tr=new T.Mesh(new T.BoxGeometry(.9,.9,4.3),dgr);tr.position.set(x,.45,0);tr.castShadow=true;g.add(tr)});const un=new T.Mesh(new T.BoxGeometry(2.4,.5,3.2),dgr);un.position.y=.95;g.add(un);
  const tu=new T.Group();tu.position.y=1.25;g.add(tu);const bd=new T.Mesh(new T.BoxGeometry(2.8,1.3,3.4),yel);bd.position.y=.65;bd.castShadow=true;tu.add(bd);const cw=new T.Mesh(new T.BoxGeometry(2.8,1.1,.9),dgr);cw.position.set(0,.6,-1.9);tu.add(cw);const cab=new T.Mesh(new T.BoxGeometry(1.4,1.5,1.6),yel);cab.position.set(-.55,1.9,.5);cab.castShadow=true;tu.add(cab);const gl=new T.Mesh(new T.BoxGeometry(1.2,1.1,1.62),glass);gl.position.set(-.55,2,.52);tu.add(gl);
  const boom=new T.Group();boom.position.set(.5,1,1.5);tu.add(boom);const bm=new T.Mesh(new T.BoxGeometry(.5,.55,5.4),yel);bm.position.set(0,0,2.5);bm.castShadow=true;boom.add(bm);const stick=new T.Group();stick.position.set(0,0,5.2);boom.add(stick);const sk=new T.Mesh(new T.BoxGeometry(.36,.4,3.4),yel);sk.position.set(0,0,1.6);sk.castShadow=true;stick.add(sk);const bucket=new T.Group();bucket.position.set(0,0,3.3);stick.add(bucket);const bk=new T.Mesh(new T.BoxGeometry(.9,.8,.9),dgr);bk.position.set(0,-.4,.2);bk.castShadow=true;bucket.add(bk);
  g.userData={tu,boom,stick,bucket};return g}
 // jeepney
 const jeepCols=['#2c5fd6','#d2362f','#1f9a5a','#e8a413'];
 function makeJeep(i){const g=new T.Group();const c=jeepCols[i%4];const sideTex=tex(512,128,(x,w,h)=>{x.fillStyle=c;x.fillRect(0,0,w,h);x.fillStyle='#f4f1e6';x.fillRect(0,h*.62,w,10);x.fillStyle='#ffd23a';x.fillRect(0,h*.72,w,6);x.fillStyle='rgba(255,255,255,.85)';for(let k=0;k<5;k++){x.beginPath();x.arc(40+k*100,h*.3,12,0,7);x.fill()}});const bm=new T.MeshStandardMaterial({map:sideTex,roughness:.35,metalness:.45});
  const body=new T.Mesh(new T.BoxGeometry(1.95,1.15,5.4),bm);body.position.set(0,1.1,.3);body.castShadow=true;g.add(body);const hood=new T.Mesh(new T.BoxGeometry(1.8,.8,1.5),bm);hood.position.set(0,.95,-3.0);hood.castShadow=true;g.add(hood);const roof=new T.Mesh(new T.BoxGeometry(1.9,.18,4.6),new T.MeshStandardMaterial({color:0xeeeeea,roughness:.4,metalness:.5}));roof.position.set(0,2.35,.5);roof.castShadow=true;g.add(roof);
  const win=new T.Mesh(new T.BoxGeometry(1.97,.8,4.3),new T.MeshStandardMaterial({color:0x1d2a36,roughness:.15,metalness:.7}));win.position.set(0,1.85,.55);g.add(win);[-.9,.9].forEach(x=>{const p=new T.Mesh(new T.BoxGeometry(.08,1.2,.08),new T.MeshStandardMaterial({color:0xddd,metalness:.8,roughness:.3}));p.position.set(x,1.75,.55-2.1);g.add(p)});
  [[-.95,-2.3],[.95,-2.3],[-.95,2.1],[.95,2.1]].forEach(p=>{const w=new T.Mesh(new T.CylinderGeometry(.42,.42,.3,16),new T.MeshStandardMaterial({color:0x151515,roughness:.9}));w.rotation.z=Math.PI/2;w.position.set(p[0],.42,p[1]);w.castShadow=true;g.add(w)});
  const bump=new T.Mesh(new T.BoxGeometry(1.9,.18,.2),new T.MeshStandardMaterial({color:0xd8d8d8,metalness:.9,roughness:.2}));bump.position.set(0,.55,-3.85);g.add(bump);return g}
 // coin stack
 const coinMat=new T.MeshStandardMaterial({color:0xf2b820,metalness:.9,roughness:.25});
 function makeCoins(n){const g=new T.Group();for(let k=0;k<n;k++){const c=new T.Mesh(new T.CylinderGeometry(.62,.62,.17,28),coinMat);c.position.y=.09+k*.18;c.rotation.y=k*.7;c.castShadow=true;g.add(c)}return g}
 // banners
 const banners=[];const steel=new T.MeshStandardMaterial({color:0x7a808b,metalness:.7,roughness:.35});
 function drawBanner(c){const cvs=document.createElement('canvas');cvs.width=1600;cvs.height=1000;const x=cvs.getContext('2d');const {ty,pl}=shortOf(c);
  x.fillStyle='#fffdf6';x.fillRect(0,0,1600,1000);speck(x,1600,1000,3000,['#d9d2bf'],2);x.strokeStyle='rgba(27,34,48,.9)';x.lineWidth=12;x.strokeRect(22,22,1556,956);
  x.fillStyle='#d1182f';x.fillRect(22,22,1556,96);x.fillStyle='#fff';x.font='600 44px "DM Mono",monospace';x.textBaseline='middle';x.fillText('REQUEST TO LOOK',70,72);x.textAlign='right';x.fillText('CASE '+c.id,1530,72);x.textAlign='left';x.textBaseline='alphabetic';
  x.fillStyle='#10161f';let fs=150;x.font=`700 ${fs}px "DM Sans",Arial,sans-serif`;while(x.measureText(ty).width>1460&&fs>80){fs-=6;x.font=`700 ${fs}px "DM Sans",Arial,sans-serif`}x.fillText(ty,70,265);
  x.fillStyle='#4a5362';fs=96;x.font=`500 ${fs}px "DM Sans",Arial,sans-serif`;while(x.measureText(pl).width>1460&&fs>52){fs-=4;x.font=`500 ${fs}px "DM Sans",Arial,sans-serif`}x.fillText(pl,70,372);
  x.fillStyle='#10161f';x.font='400 300px "Instrument Serif",Georgia,serif';x.fillText(money(c),60,670);
  const bw=Math.max(40,c.len/ML*880);x.fillStyle='#4a5058';x.fillRect(70,740,bw,46);x.strokeStyle='#f5c518';x.setLineDash([22,16]);x.lineWidth=6;x.beginPath();x.moveTo(78,763);x.lineTo(70+bw-8,763);x.stroke();x.setLineDash([]);
  x.fillStyle='#10161f';x.font='600 64px "DM Sans",Arial';x.fillText(fmL(c.len)+' of road',70+bw+28,785);
  const n=nCoin(c);for(let k=0;k<n;k++){x.fillStyle='#f2b820';x.beginPath();x.arc(88+k*58,890,22,0,7);x.fill();x.strokeStyle='#a8740a';x.lineWidth=4;x.stroke()}x.fillStyle='#4a5362';x.font='500 42px "DM Sans",Arial';x.fillText('1 coin = ₱15M',88+n*58+14,904);
  let mx=1330;[['a',c.al||0],['s',c.st||0],['w',c.wk||0]].forEach(([k,v])=>{for(let q=0;q<Math.min(v,4);q++){x.save();x.translate(mx,880);if(k==='a'){x.fillStyle='#d1182f';x.beginPath();x.moveTo(0,-26);x.lineTo(24,22);x.lineTo(-24,22);x.fill()}else if(k==='s'){x.fillStyle='#10161f';x.rotate(Math.PI/4);x.fillRect(-18,-18,36,36)}else{x.strokeStyle='#10161f';x.lineWidth=6;x.rotate(Math.PI/4);x.strokeRect(-17,-17,34,34)}x.restore();mx+=64}});
  const t=new T.CanvasTexture(cvs);t.anisotropy=aniso;t.encoding=T.sRGBEncoding;return t}
 const sideOf=i=>i%2?1:-1;
 // scene population
 for(let k=0;k<Math.ceil((N*GAP+400)/15);k++){const d=k*15+(rnd(k)*6);[-1,1].forEach((sd,j)=>{if(rnd(k*2+j)<.35)return;const p=makePalm(k*2+j);palms.push(p);add(p,d,sd*(RWm+4.5+rnd(k+j)*30),rnd(k)*6)})}
 for(let k=0;k<Math.ceil((N*GAP+400)/95);k++){const sd=k%2?1:-1;add(makeHut(),k*95+30,sd*(RWm+30+rnd(k)*40),sd>0?-.6:.6)}
 const poleList=[];for(let k=0;k<Math.ceil((N*GAP+400)/38);k++){const p=makePole();add(p,k*38,-(RWm+3.6),0);poleList.push(k*38)}
 for(let k=0;k<poleList.length-1;k++){const a=poleList[k],b=poleList[k+1];[-.9,0,.9].forEach(off=>{const cv2=new T.QuadraticBezierCurve3(new T.Vector3(-(RWm+3.6)+off,7.8,-a),new T.Vector3(-(RWm+3.6)+off,6.7,-(a+b)/2),new T.Vector3(-(RWm+3.6)+off,7.8,-b));const ln=new T.Line(new T.BufferGeometry().setFromPoints(cv2.getPoints(12)),wireMat);scene.add(ln);STR.push({o:ln,d:(a+b)/2,span:60})})}
 const workers=[],excs=[],jeeps=[];
 D.forEach((c,i)=>{const d0=F0+i*GAP,sd=sideOf(i),zl=zoneLenM(c);
  const gb=new T.Group();const bw=7.4*(.82+.45*Math.sqrt(c.b/MB)),bh=bw*.625;const tx=drawBanner(c);const panel=new T.Mesh(new T.PlaneGeometry(bw,bh),new T.MeshStandardMaterial({map:tx,roughness:.75}));panel.position.y=1.7+bh/2+.3;panel.castShadow=true;panel.userData.i=i;gb.add(panel);banners.push(panel);
  const frame=new T.Mesh(new T.BoxGeometry(bw+.2,bh+.2,.1),steel);frame.position.set(0,panel.position.y,-.07);gb.add(frame);[-1,1].forEach(q=>{const p=new T.Mesh(new T.CylinderGeometry(.07,.07,panel.position.y,10),steel);p.position.set(q*(bw/2-.5),panel.position.y/2,-.12);p.castShadow=true;gb.add(p)});
  const co=makeCoins(nCoin(c));co.position.set(-sd*(bw/2+1.2),0,1.2);gb.add(co);
  add(gb,d0,sd*(RWm+2.4+bw/2+.6),-sd*.42);
  add(makeWarn(),d0-34,RWm+1.9,0.15);add(makeWarn(),d0-34,-(RWm+1.9),-.15);
  const zc=new T.Mesh(new T.PlaneGeometry(RWm-.5,zl),freshMat);zc.rotation.x=-Math.PI/2;zc.position.set(RWm/2+.1,.035,-(d0+zl/2));freshTex.repeat.set(1,zl/6);zc.receiveShadow=true;scene.add(zc);STR.push({o:zc,d:d0+zl/2,span:zl+60});
  add(makeBarrier(),d0-6,RWm-1.2,0);add(makeBarrier(),d0+zl,RWm-1.2,0);
  for(let z=0;z<=zl;z+=Math.max(4,zl/32)){add(makeCone(),d0+z,RWm-1.15+Math.max(0,(18-z)*.07),0)}
  const ex=makeExc();ex.userData.ph=i;excs.push(ex);add(ex,d0+zl*.5,-sd*(RWm+7.5),-sd*(Math.PI/2)+.2);
  add(makeGravel(),d0+zl*.2,-sd*(RWm+5));
  [.3,.62,.85].forEach((q,j)=>{const w=makeWorker(j+i);workers.push(w);add(w,d0+zl*q,RWm-.4+(j%2)*.5,Math.PI*(j%2))})});
 for(let i=0;i<4;i++){const j=makeJeep(i);jeeps.push({o:j,off:i*85,v:7+i*1.2});j.rotation.y=0;scene.add(j)}
 // pointer + picking
 const ray=new T.Raycaster(),mp=new T.Vector2();let hov=-1;
 host.addEventListener('pointermove',e=>{const r=host.getBoundingClientRect();mp.set(((e.clientX-r.left)/r.width)*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(mp,camera);const h=ray.intersectObjects(banners,false)[0];hov=h?h.object.userData.i:-1;host.style.cursor=hov>=0?'pointer':'default'});
 host.addEventListener('click',()=>{if(hov>=0&&PICK)PICK(D[hov])});
 addEventListener('resize',()=>{if(!R3)return;renderer.setSize(Wd(),Hd());camera.aspect=Wd()/Hd();camera.updateProjectionMatrix()});
 let cam=F0-DW,lx=0,t0=performance.now();const look=new T.Vector3();
 function frame(){
  const Tg=target(),t=(performance.now()-t0)/1000;cam+=(Tg.c-cam)*.07;
  const ci=Math.max(0,Math.min(N-1,Math.round((cam-F0+DW)/GAP))),sd=sideOf(ci);
  const wantX=1.9-sd*.0;lx+=(wantX-lx)*.05;camera.position.set(lx+Math.sin(t*.6)*.08,2.15+Math.sin(t*1.1)*.03,-cam);
  const bannerX=sd*(RWm+2.4+4.2);const near=Math.max(0,1-Math.abs(cam-(F0+ci*GAP-DW))/45);look.set(lx+(bannerX-lx)*.55*near+Math.sin(t*.3)*.3,2.6,-(cam+26));camera.lookAt(look);
  sun.position.set(camera.position.x-35,70,camera.position.z+55);sun.target.position.set(camera.position.x,0,camera.position.z-30);
  STR.forEach(s=>{const r=s.d-cam;s.o.visible=r>-30-(s.span||0)&&r<330+(s.span||0)});
  palms.forEach(p=>{const c=p.userData.crown;if(!p.visible)return;c.children.forEach((q,i)=>{q.children[0].rotation.z=Math.sin(t*1.3+p.userData.ph+i)*.05});c.rotation.y=Math.sin(t*.4+p.userData.ph)*.04});
  excs.forEach(e=>{const u=e.userData,ph=u.ph;u.tu.rotation.y=Math.sin(t*.45+ph)*.5;u.boom.rotation.x=-.5+Math.sin(t*.8+ph)*.14;u.stick.rotation.x=.9+Math.sin(t*1.05+ph)*.28;u.bucket.rotation.x=.4+Math.sin(t*1.4+ph)*.25});
  workers.forEach(w=>{w.position.y=Math.abs(Math.sin(t*2+w.userData.ph))*.04});
  jeeps.forEach(j=>{const span=320;let d=((j.off-t*j.v-cam+60)%span+span)%span+cam-60;j.o.position.set(-1.85,0,-d);j.o.rotation.y=Math.PI*0+0;j.o.visible=true});
  clouds.forEach(c=>{c.position.x+=c.userData.v*.02;if(c.position.x>900)c.position.x=-900;c.position.z=camera.position.z-600-Math.abs(c.position.z%700)});
  banners.forEach((b,i)=>{const hv=i===hov;b.material.emissive.setScalar(hv?.12:0);b.material.emissiveMap=hv?b.material.map:null;b.material.needsUpdate=false});
  renderer.render(scene,camera);
  const c=D[ci],dd=Math.abs(cam-(F0+ci*GAP-DW));$('#rc').textContent=`CASE ${String(ci+1).padStart(2,'0')} / ${N}`;$('#pb').style.width=(Tg.p*100)+'%';$('#rh').style.opacity=Tg.p<.02?1:0;
  const cp=$('#cap');cp.style.opacity=dd<12?1:0;if(cp.dataset.i!==String(ci)){cp.dataset.i=ci;cp.innerHTML=`<b>${esc(shortOf(c).ty)} · ${esc(shortOf(c).pl)}</b><span>${esc(c.r[0]||'Flagged by the rules')}${c.r.length>1?` · +${c.r.length-1} more`:''}</span><em>Click the banner for the file</em>`}
  if(ap){if(Tg.p>=.999){setAp(false)}else scrollBy(0,4.2)}
  requestAnimationFrame(frame)}
 R3={renderer,camera};frame()}
let ap=false;function setAp(v){ap=v;const b=ELS.ap;if(b){b.setAttribute('aria-pressed',v);b.textContent=v?'Pause':'Drive me through'}}
addEventListener('wheel',()=>{if(ap)setAp(false)},{passive:true});
addEventListener('touchstart',()=>{if(ap)setAp(false)},{passive:true});

API.init = function (o) {
  try {
    if (!global.THREE) return false;
    var probe = document.createElement('canvas');
    if (!(probe.getContext('webgl') || probe.getContext('experimental-webgl'))) return false;
  } catch (e) { return false; }
  var cases = (o.cases || []).filter(function (c) { return c && c.name; }).slice(0, 16);
  if (!cases.length) return false;
  D = cases.map(function (c) {
    return {id: c.id, n: c.name, t: c.town || c.region || '', b: c.budget_m || 1,
            len: c.length_m || 220, r: c.reasons || [], s: c.stage || '', c: c.colour || 'Red',
            al: c.colour === 'Red' ? 1 : 0, st: 1, wk: 0};
  });
  N = D.length;
  MB = Math.max.apply(null, D.map(function (c) { return c.b; })) || 1;
  ML = Math.max.apply(null, D.map(function (c) { return c.len; })) || 1;
  ELS = {gl: o.host, spacer: o.spacer, cap: o.cap, rc: o.counter, pb: o.bar, rh: o.hint, ap: o.autopilot};
  PICK = o.onPick || null;
  if (o.autopilot) o.autopilot.onclick = function () { setAp(!ap); };
  try { initRoad(); } catch (e) { if (global.console) console.warn('road: ' + e.message); return false; }
  return true;
};
API.cases = function () { return D; };
global.BantAIRoad = API;
})(window);
