import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {DEVICE_PARTS, type DevicePartId} from './deviceParts';
export type Preset='iso'|'front'|'top'|'closeup';
type Options={explorer?:boolean;onPick?:(id:DevicePartId)=>void;onProject?:(id:DevicePartId,x:number,y:number,visible:boolean)=>void};
export function createDeviceScene(canvas:HTMLCanvasElement,options:Options={}){
 const explorer=!!options.explorer;
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.setClearColor(explorer?0x101e2b:0xeef2f1);renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(36,1,.1,100);
 const controls=new OrbitControls(camera,canvas);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=30;controls.target.set(0,.1,0);
 scene.add(new THREE.HemisphereLight(0xffffff,explorer?0x476a87:0x63766e,2.6));
 const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(5,9,7);light.castShadow=true;light.shadow.mapSize.set(2048,2048);scene.add(light);
 const rim=new THREE.DirectionalLight(0x71ffe0,explorer?1.2:0);rim.position.set(-4,3,-5);scene.add(rim);
 const material=(color:number,metalness=.25)=>new THREE.MeshStandardMaterial({color,metalness,roughness:.33});
 const shell=material(0x899a9e,.6),metal=material(0xbcc6c8,.75),dark=material(0x34494d,.4),tip=material(explorer?0x65ead3:0x107f70,.35);
 const groups={} as Record<DevicePartId,THREE.Group>;
 DEVICE_PARTS.forEach(part=>{const group=new THREE.Group();group.userData.part=part.id;groups[part.id]=group;scene.add(group);});
 const pickables:THREE.Mesh[]=[];
 function add(geometry:THREE.BufferGeometry,mat:THREE.MeshStandardMaterial,parent:THREE.Group,x:number,y:number,z:number){
  const mesh=new THREE.Mesh(geometry,mat.clone());mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.part=parent.userData.part;parent.add(mesh);pickables.push(mesh);return mesh;
 }
 function box(w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.MeshStandardMaterial,parent:THREE.Group){return add(new THREE.BoxGeometry(w,h,d),mat,parent,x,y,z);}
 const enclosure=groups.shell;
 box(2.8,5,.12,0,0,-.78,shell,enclosure);box(.13,5,1.6,-1.45,0,0,shell,enclosure);box(.13,5,1.6,1.45,0,0,shell,enclosure);box(2.8,.14,1.6,0,-2.43,0,shell,enclosure);
 const shape=new THREE.Shape();shape.moveTo(-1.4,-.8);shape.lineTo(1.4,-.8);shape.lineTo(1.4,.8);shape.lineTo(-1.4,.8);shape.closePath();
 const positions=[[-.23,-.42],[-.23,0],[-.23,.42],[.23,-.42],[.23,0],[.23,.42]];
 positions.forEach(([x,z])=>{const hole=new THREE.Path();hole.absarc(x,-z,.105,0,Math.PI*2,true);shape.holes.push(hole);});
 const top=add(new THREE.ExtrudeGeometry(shape,{depth:.10,bevelEnabled:false}),shell,groups.surface,0,2.37,0);top.rotation.x=-Math.PI/2;
 const supports=[box(2.7,.10,1.3,0,1.2,0,metal,groups.supports),box(2.7,.10,1.3,0,-.85,0,metal,groups.supports)];
 const pins:THREE.Mesh[]=[],stems:THREE.Mesh[]=[],pistons:THREE.Mesh[]=[];
 positions.forEach(([x,z],i)=>{
  const pin=add(new THREE.CylinderGeometry(.085,.085,1.35,24),tip,groups.pins,x,1.73,z);pin.userData.dot=i+1;pins.push(pin);
  const columnX=(i%3-1)*.86,columnZ=i<3?.39:-.39;
  add(new THREE.CylinderGeometry(.28,.28,1.15,24),metal,groups.drives,columnX,-.1,columnZ);
  stems.push(add(new THREE.CylinderGeometry(.07,.07,.8,16),dark,groups.links,columnX,.85,columnZ));
  pistons.push(add(new THREE.CylinderGeometry(.16,.16,.18,24),tip,groups.drives,columnX,.57,columnZ));
  box(.62,.73,.55,columnX,-1.46,columnZ,dark,groups.drives);
 });
 if(explorer)scene.fog=new THREE.Fog(0x101e2b,18,44);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),material(explorer?0x101e2b:0xe1e8e5,0));floor.material.roughness=1;floor.rotation.x=-Math.PI/2;floor.position.y=-2.55;floor.receiveShadow=true;scene.add(floor);
 const grid=new THREE.GridHelper(40,40,0x2c5363,0x213543);grid.position.y=-2.54;grid.visible=explorer;scene.add(grid);
 const offsets:Record<DevicePartId,THREE.Vector3>={shell:new THREE.Vector3(-2.9,0,-.6),surface:new THREE.Vector3(.7,2.15,0),pins:new THREE.Vector3(.7,1.05,0),supports:new THREE.Vector3(.7,.25,0),links:new THREE.Vector3(3.3,.65,0),drives:new THREE.Vector3(3.3,0,0)};
 const anchors:Record<DevicePartId,THREE.Vector3>={shell:new THREE.Vector3(-1.5,1.2,0),surface:new THREE.Vector3(1.3,2.42,0),pins:new THREE.Vector3(.4,2.1,.42),supports:new THREE.Vector3(-1.35,1.2,0),links:new THREE.Vector3(1,.95,0),drives:new THREE.Vector3(1.2,-1,0)};
 const zero=new THREE.Vector3();let mask=0,cutaway=false,disposed=false,animate=true,exploded=false,selected:DevicePartId|null=null,demoPhase=-1,demoDot=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 let cameraGoal:THREE.Vector3|null=null,targetGoal:THREE.Vector3|null=null,currentView:Preset='iso';
 function preset(view:Preset){currentView=view;cameraGoal=null;targetGoal=null;camera.up.set(0,1,0);controls.target.set(0,0,0);
  if(view==='iso')camera.position.set(6,5.8,9);
  if(view==='front')camera.position.set(0,1,11);
  if(view==='top'){camera.position.set(0,11,0);camera.up.set(0,0,-1);controls.target.set(0,2,0);}
  if(view==='closeup'){camera.position.set(2,5,3.4);controls.target.set(0,2,0);}
  if(exploded&&view!=='closeup')frameExploded(true);else controls.update();
 }
 function frameExploded(immediate=false){
  camera.up.set(0,1,0);const center=new THREE.Vector3(.55,1,0),direction=currentView==='front'?new THREE.Vector3(0,.1,1):currentView==='top'?new THREE.Vector3(0,1,.001):new THREE.Vector3(.24,.48,1);
  if(currentView==='top')camera.up.set(0,0,-1);
  const distance=15/Math.min(1,Math.max(.4,camera.aspect));
  cameraGoal=center.clone().add(direction.normalize().multiplyScalar(distance));targetGoal=center;
  if(immediate||reduced){camera.position.copy(cameraGoal);controls.target.copy(center);cameraGoal=null;targetGoal=null;controls.update();}
 }
 function resize(){const w=canvas.clientWidth||800,h=canvas.clientHeight||600;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(exploded)frameExploded(true);}
 function render(){if(disposed)return;const ease=reduced||!animate?1:.12;
  DEVICE_PARTS.forEach(part=>{
   const group=groups[part.id];group.position.lerp(exploded?offsets[part.id]:zero,ease);
   group.children.forEach(child=>{if(child instanceof THREE.Mesh){const mat=child.material as THREE.MeshStandardMaterial;mat.emissive.set(part.id===selected?part.color:0x000000);mat.emissiveIntensity=part.id===selected?.20:0;}});
  });
  const operating=demoPhase===1;
  pins.forEach((pin,i)=>{const raised=demoPhase>=0&&selected==='pins'?operating&&i===demoDot:!!(mask&(1<<i));pin.position.y=THREE.MathUtils.lerp(pin.position.y,1.73+(raised?.22:0),ease);if(selected==='pins'&&i===demoDot)(pin.material as THREE.MeshStandardMaterial).emissiveIntensity=.6;});
  stems.forEach((stem,i)=>{stem.position.y=THREE.MathUtils.lerp(stem.position.y,.85+(operating&&selected==='links'?.25:0),ease);pistons[i].position.y=THREE.MathUtils.lerp(pistons[i].position.y,.57+(operating&&selected==='drives'?.3:0),ease);});
  if(demoPhase>=0){
   if(selected==='shell')(enclosure.children[demoPhase%3] as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>).material.emissiveIntensity=.65;
   if(selected==='surface')top.material.emissiveIntensity=.15+demoPhase*.2;
   if(selected==='supports')supports[demoPhase%2].material.emissiveIntensity=.65;
  }
  if(cameraGoal&&targetGoal){camera.position.lerp(cameraGoal,ease);controls.target.lerp(targetGoal,ease);if(camera.position.distanceTo(cameraGoal)<.01){cameraGoal=null;targetGoal=null;}}
  controls.update();renderer.render(scene,camera);
  if(options.onProject){DEVICE_PARTS.forEach(part=>{const point=groups[part.id].localToWorld(anchors[part.id].clone()).project(camera);options.onProject!(part.id,(point.x+1)*canvas.clientWidth/2,(-point.y+1)*canvas.clientHeight/2,exploded&&groups[part.id].visible&&point.z<1);});}
 }
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let downX=0,downY=0,pressed=false;
 function pointerDown(event:PointerEvent){pressed=true;downX=event.clientX;downY=event.clientY;cameraGoal=null;targetGoal=null;}
 function hit(event:PointerEvent){const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickables).find(item=>item.object.parent?.visible);}
 function pointerUp(event:PointerEvent){if(!pressed)return;pressed=false;if(event.button!==0||Math.hypot(event.clientX-downX,event.clientY-downY)>6)return;const item=hit(event);if(item)options.onPick?.(item.object.userData.part as DevicePartId);}
 function pointerMove(event:PointerEvent){if(explorer)canvas.style.cursor=hit(event)?'pointer':'grab';}
 function pointerCancel(){pressed=false;}
 if(explorer){canvas.addEventListener('pointerdown',pointerDown);canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointermove',pointerMove);canvas.addEventListener('pointercancel',pointerCancel);}
 preset('iso');resize();renderer.setAnimationLoop(render);
 return {
  setMask:(value:number)=>{mask=value;},setCutaway:(value:boolean)=>{cutaway=value;enclosure.visible=!value;},setRotate:(value:boolean)=>{controls.autoRotate=value;},
  setExploded:(value:boolean)=>{exploded=value;demoPhase=-1;if(value){cutaway=false;enclosure.visible=true;frameExploded();}else preset('iso');},
  selectPart:(id:DevicePartId|null)=>{selected=id;demoPhase=-1;},setDemo:(phase:number,dot=0)=>{demoPhase=phase;demoDot=dot;},
  preset,resize,rotate:(r:number)=>{cameraGoal=null;targetGoal=null;const offset=camera.position.clone().sub(controls.target);offset.applyAxisAngle(new THREE.Vector3(0,1,0),r);camera.position.copy(controls.target.clone().add(offset));controls.update();},zoom:(factor:number)=>{cameraGoal=null;targetGoal=null;camera.position.sub(controls.target).multiplyScalar(factor).add(controls.target);controls.update();},
  capture:(view:Preset,cut=false)=>{
   const saved={exploded,selected,demoPhase,position:camera.position.clone(),target:controls.target.clone(),up:camera.up.clone(),currentView};
   exploded=false;selected=null;demoPhase=-1;preset(view);enclosure.visible=!cut;animate=false;
   const original=renderer.getSize(new THREE.Vector2());renderer.setPixelRatio(1);renderer.setSize(1600,1600,false);camera.aspect=1;camera.updateProjectionMatrix();render();
   const output=document.createElement('canvas');output.width=1600;output.height=1600;const ctx=output.getContext('2d')!;ctx.drawImage(canvas,0,0);ctx.fillStyle='#143d37';ctx.fillRect(0,1480,1600,120);ctx.fillStyle='#ffffff';ctx.font='30px "Noto Sans Georgian", sans-serif';ctx.fillText('სქემატური 3D მოდელი — CAD სურათების მიხედვით',50,1530);ctx.font='23px "Noto Sans Georgian", sans-serif';ctx.fillText('პროგრამული სიმულაცია · საილუსტრაციო გეომეტრია',50,1570);const url=output.toDataURL('image/png');
   exploded=saved.exploded;selected=saved.selected;demoPhase=saved.demoPhase;currentView=saved.currentView;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(original.x,original.y,false);enclosure.visible=!cutaway;resize();cameraGoal=null;targetGoal=null;camera.position.copy(saved.position);controls.target.copy(saved.target);camera.up.copy(saved.up);render();animate=true;return url;
  },
  dispose:()=>{disposed=true;renderer.setAnimationLoop(null);controls.dispose();canvas.removeEventListener('pointerdown',pointerDown);canvas.removeEventListener('pointerup',pointerUp);canvas.removeEventListener('pointermove',pointerMove);canvas.removeEventListener('pointercancel',pointerCancel);scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){o.geometry.dispose();const mats=Array.isArray(o.material)?o.material:[o.material];mats.forEach(m=>m.dispose());}});[shell,metal,dark,tip].forEach(mat=>mat.dispose());renderer.dispose();}
 };
}


