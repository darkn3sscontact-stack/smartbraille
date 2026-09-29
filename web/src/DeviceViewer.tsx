import {useEffect,useRef,useState} from 'react';
import {RotateCcw,ZoomIn,ZoomOut,Download,RotateCw,Layers3,ArrowUpRight,Play,Pause,ArrowRight} from 'lucide-react';
import {createDeviceScene,type Preset} from './scene';
import {DEVICE_PARTS,type DevicePartId} from './deviceParts';
import {usePinAudio} from './PinSound';
import Cell from './Cell';
export default function DeviceViewer({mask=0,explorer=false}:{mask?:number;explorer?:boolean}){
 const canvas=useRef<HTMLCanvasElement>(null),api=useRef<ReturnType<typeof createDeviceScene>|null>(null);
 const labels=useRef<Partial<Record<DevicePartId,HTMLButtonElement|null>>>({});
 const [failed,setFailed]=useState(false),[cut,setCut]=useState(false),[rotating,setRotating]=useState(false),[view,setView]=useState<Preset>('iso');
 const [exploded,setExploded]=useState(false),[selected,setSelected]=useState<DevicePartId>('pins'),[playing,setPlaying]=useState(false),[phase,setPhase]=useState(-1),[dot,setDot]=useState(0);
 const [reduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 const sound=usePinAudio(),soundRef=useRef(sound);soundRef.current=sound;
 const part=DEVICE_PARTS.find(p=>p.id===selected)!;
 function select(id:DevicePartId){setSelected(id);setExploded(true);setCut(false);setRotating(false);setPlaying(false);setPhase(-1);api.current?.setRotate(false);api.current?.setExploded(true);api.current?.selectPart(id);}
 const selectRef=useRef(select);selectRef.current=select;
 useEffect(()=>{
  if(new URLSearchParams(location.search).has('noWebGL')){setFailed(true);return;}
  try{api.current=createDeviceScene(canvas.current!,{explorer,onPick:id=>selectRef.current(id),onProject:(id,x,y,visible)=>{const label=labels.current[id];if(label){label.style.left=`${x}px`;label.style.top=`${y}px`;label.style.visibility=visible?'visible':'hidden';}}});api.current.setMask(mask);
   const observer=new ResizeObserver(()=>api.current?.resize());observer.observe(canvas.current!);
   return()=>{observer.disconnect();api.current?.dispose();api.current=null;};
  }catch{api.current?.dispose();api.current=null;setFailed(true);}
 },[explorer]);
 useEffect(()=>{api.current?.setMask(mask);},[mask]);
 useEffect(()=>{api.current?.setDemo(phase,dot);if(phase===1&&['pins','links','drives'].includes(selected))soundRef.current?.raise(selected==='pins'?1:6);},[phase,dot,selected]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setPhase(p=>(p+1)%3),1100);return()=>clearInterval(timer);},[playing]);
 useEffect(()=>{const stop=()=>{if(document.hidden){setPlaying(false);setPhase(-1);}};document.addEventListener('visibilitychange',stop);return()=>document.removeEventListener('visibilitychange',stop);},[]);
 function preset(p:Preset){setView(p);api.current?.preset(p);}
 function assemble(){setExploded(false);setPlaying(false);setPhase(-1);setCut(false);setRotating(false);setView('iso');api.current?.selectPart(null);api.current?.setExploded(false);api.current?.setCutaway(false);api.current?.setRotate(false);api.current?.preset('iso');}
 function capture(p:Preset,cutaway:boolean,name:string){const url=api.current?.capture(p,cutaway);if(url){const a=document.createElement('a');a.href=url;a.download=name;a.click();}}
 function demo(){sound?.resume();if(reduced){setPhase(p=>(p+1)%3);return;}if(playing){setPlaying(false);setPhase(-1);}else{setPhase(0);setPlaying(true);}}
 return <div className={`viewer ${explorer?'device-explorer':''}`} data-exploded={exploded}>
  <div className="viewer-label"><span className="status-dot"/>{explorer?'SMARTBRAILLE / შიგნიდან':'პროგრამული სიმულაცია'}<span className="viewer-orientation">{explorer?'ინტერაქტიული ანატომია':view==='top'?'ზედა ხედი · 1 4 / 2 5 / 3 6':view==='front'?'წინა ხედი':'სივრცული ხედი'}</span></div>
  <div className="explorer-layout"><div className="explorer-stage">
   {explorer&&!failed&&<div className="anatomy-intro"><span className="anatomy-kicker">შეეხე მოდელს · აღმოაჩინე მექანიზმი</span><h2>{exploded?'ერთი იდეა. ექვსი ნაწილი.':'ნახე, რა ხდება შიგნით.'}</h2><p>{exploded?'აირჩიე ნომერი ან უშუალოდ ნაწილი.':'დააჭირე მოდელს და გაშალე მისი აგებულება.'}</p></div>}
   {failed?<div className="fallback"><Cell mask={mask}/><p>3D გრაფიკა მიუწვდომელია. 2D უჯრა და ორიგინალი რენდერები მუშაობს.</p><img src="/assets/device/device-overview-original.jpeg" alt="მოწყობილობის საერთო ხედი — SolidWorks-ის რენდერი"/></div>:<div className="model-viewport"><canvas ref={canvas} aria-label="მოწყობილობის სქემატური 3D მოდელი; მართვის ღილაკები ქვემოთაა"/>{explorer&&DEVICE_PARTS.map(p=><button key={p.id} ref={el=>{labels.current[p.id]=el;}} className={`part-marker ${selected===p.id?'is-selected':''}`} style={{visibility:'hidden'}} aria-label={`${p.number} — ${p.title}`} aria-pressed={exploded&&selected===p.id} tabIndex={exploded?0:-1} onClick={()=>select(p.id)}>{p.number}</button>)}</div>}
   {explorer&&!failed&&<div className="explosion-actions"><button className="explode-button" aria-expanded={exploded} onClick={()=>exploded?assemble():select('pins')}><Layers3 size={18}/>{exploded?'მოდელის აწყობა':'მოდელის გაშლა'}<ArrowUpRight size={18}/></button><span>გადაათრიე — მოაბრუნე<br/>გაადიდე — ნახე დეტალები</span></div>}
  </div>
  {explorer&&!failed&&<aside className="part-inspector" aria-label="მოდელის ნაწილების გზამკვლევი">
   <div className="part-index-heading"><span>მოწყობილობის ნაწილები</span><span>01 — 06</span></div>
   <div className="part-index" role="group" aria-label="ნაწილების არჩევა">{DEVICE_PARTS.map(p=><button key={p.id} aria-pressed={exploded&&selected===p.id} onClick={()=>select(p.id)}><span>{p.number}</span>{p.title}<ArrowUpRight size={14}/></button>)}</div>
   <div className="part-story" style={{'--part-color':part.color} as React.CSSProperties}>
    <span className="part-eyebrow">{exploded?`ნაწილი ${part.number}`:'დაიწყე აღმოჩენა'}</span><h3>{exploded?part.title:'როგორ იქცევა სიგნალი შეხებად?'}</h3>
    <p className="part-subtitle">{exploded?part.subtitle:'გაშალე. აირჩიე. აამუშავე.'}</p><p>{exploded?part.role:'მოდელსა და მის ნომრებზე დაჭერით გაეცნობი თითოეული ნაწილის დანიშნულებას. შემდეგ ჩართე მისი მუშაობის დემონსტრაცია.'}</p>
    {exploded&&<>{selected==='pins'&&<div className="pin-picker" role="group" aria-label="სადემონსტრაციო წერტილი">{[0,1,2,3,4,5].map(i=><button key={i} aria-label={`წერტილი ${i+1}`} aria-pressed={dot===i} onClick={()=>setDot(i)}>{i+1}</button>)}</div>}
     <button className="part-demo" onClick={demo}>{reduced?<ArrowRight size={17}/>:playing?<Pause size={17}/>:<Play size={17}/>} {reduced?'შემდეგი ნაბიჯი':playing?'ანიმაციის შეჩერება':'მუშაობის ნახვა'}</button>
     {reduced&&phase>=0&&<button className="demo-reset" onClick={()=>setPhase(-1)}>დემონსტრაციის დასრულება</button>}
     <div className="demo-steps" aria-label="მუშაობის ეტაპები">{part.steps.map((step,i)=><div key={step} className={phase===i?'current':''}><span>0{i+1}</span>{step}</div>)}</div>
     <p className="part-detail">{part.detail}</p></>}
   </div>
  </aside>}
  </div>
  {!failed&&<><div className="viewer-controls"><button onClick={()=>preset('iso')} className={view==='iso'?'selected':''}>სივრცული</button><button onClick={()=>preset('front')} className={view==='front'?'selected':''}>წინა</button><button onClick={()=>preset('top')} className={view==='top'?'selected':''}>ზედა</button><button aria-label="ხედის გადატვირთვა" onClick={assemble}><RotateCcw size={16}/></button><button aria-label="მოდელის მოახლოება" onClick={()=>api.current?.zoom(.85)}><ZoomIn size={16}/></button><button aria-label="მოდელის დაშორება" onClick={()=>api.current?.zoom(1.15)}><ZoomOut size={16}/></button><button aria-label="მოდელის მარცხნივ მობრუნება" onClick={()=>api.current?.rotate(-.3)}>↶</button><button aria-label="მოდელის მარჯვნივ მობრუნება" onClick={()=>api.current?.rotate(.3)}>↷</button></div><div className="actions compact"><button className="button subtle" aria-pressed={cut} onClick={()=>{setCut(!cut);api.current?.setCutaway(!cut);}}>{cut?'კორპუსის ჩვენება':'კორპუსის დამალვა'}</button><button className="button subtle" aria-pressed={rotating} onClick={()=>{setRotating(!rotating);api.current?.setRotate(!rotating);}}><RotateCw size={15}/>{rotating?'ბრუნვის შეჩერება':'ავტომატური ბრუნვა'}</button></div><details className="export-controls"><summary>სქემატური რენდერების ჩამოტვირთვა</summary><div className="actions"><button className="button subtle" onClick={()=>capture('iso',false,'device-overview-schematic.png')}><Download size={15}/>საერთო ხედი PNG</button><button className="button subtle" onClick={()=>capture('iso',true,'device-cutaway-schematic.png')}>ჭრილი PNG</button><button className="button subtle" onClick={()=>capture('closeup',false,'device-cell-closeup-schematic.png')}>ზედაპირი PNG</button></div></details></>}
  <small className="viewer-note">სქემატური 3D მოდელი — CAD სურათების მიხედვით. მოძრაობა საილუსტრაციოა; არ ასახავს გაზომილ ძალას ან სიჩქარეს.</small>
 </div>;
}
