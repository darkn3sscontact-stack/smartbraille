import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {useSpeech} from './Speech';

function clickBuffer(context:AudioContext,count:number){
 const buffer=context.createBuffer(1,Math.ceil(context.sampleRate*.095),context.sampleRate);
 const samples=buffer.getChannelData(0);
 const strength=.65+.35*Math.sqrt(Math.min(count,6)/6);
 for(let i=0;i<samples.length;i++){
  const t=i/context.sampleRate,attack=Math.min(1,t/.0008);
  const impact=(Math.random()*2-1)*Math.exp(-t/0.006);
  const body=Math.sin(2*Math.PI*185*t)*Math.exp(-t/.018);
  const metal=(Math.sin(2*Math.PI*1350*t)+.35*Math.sin(2*Math.PI*2230*t))*Math.exp(-t/.011);
  samples[i]=strength*attack*(.36*impact+.3*body+.09*metal)*Math.min(1,(.095-t)/.01);
 }
 return buffer;
}

type SoundState={enabled:boolean;error:string;toggle:()=>Promise<void>;resume:()=>void;raise:(count:number)=>void};
const PinSoundContext=createContext<SoundState|null>(null);
export function PinSoundProvider({children}:{children:ReactNode}){
 const [enabled,setEnabled]=useState(false),[error,setError]=useState('');
 const context=useRef<AudioContext|null>(null),source=useRef<AudioBufferSourceNode|null>(null),frame=useRef(0),pending=useRef(0);
 const {muted,micActive}=useSpeech();
 const allowed=useRef(false);allowed.current=enabled&&!muted&&!micActive;
 function stop(){cancelAnimationFrame(frame.current);frame.current=0;pending.current=0;source.current?.stop();source.current=null;}
 function close(){stop();const old=context.current;context.current=null;if(old)void old.close().catch(()=>{});}
 function play(count:number){
  const ctx=context.current;if(!ctx||ctx.state!=='running'||!allowed.current)return;
  source.current?.stop();const node=ctx.createBufferSource(),gain=ctx.createGain();
  node.buffer=clickBuffer(ctx,count);gain.gain.value=.4;
  node.connect(gain);gain.connect(ctx.destination);source.current=node;
  node.onended=()=>{node.disconnect();gain.disconnect();if(source.current===node)source.current=null;};node.start();
 }
 function raise(count:number){
  if(!allowed.current||!count)return;
  pending.current+=count;
  if(!frame.current)frame.current=requestAnimationFrame(()=>{frame.current=0;const count=pending.current;pending.current=0;play(count);});
 }
 useEffect(()=>{if(muted||micActive)stop();},[muted,micActive]);
 useEffect(()=>()=>close(),[]);
 async function toggle(){
  if(enabled){allowed.current=false;setEnabled(false);close();return;}
  if(muted||micActive)return;setError('');
  try{const ctx=context.current??new AudioContext();context.current=ctx;await ctx.resume();if(context.current!==ctx)return;allowed.current=true;setEnabled(true);play(1);}
  catch{close();setEnabled(false);setError('ხმა ვერ ჩაირთო. წერტილების სიმულაცია მუშაობს.');}
 }
 function resume(){
  if(enabled&&!muted&&!micActive&&context.current?.state!=='running')
   void context.current?.resume().catch(()=>setError('ბრაუზერმა ხმა შეაჩერა. გამორთე და ხელახლა ჩართე სოლენოიდის ხმა.'));
 }
 return <PinSoundContext.Provider value={{enabled,error,toggle,resume,raise}}>{children}</PinSoundContext.Provider>;
}

export const usePinAudio=()=>useContext(PinSoundContext);

// Only active demonstration cells opt in. Static history, answer summaries and
// decorative cells stay silent; synchronized 2D/3D views share one source cell.
export function usePinMotion(mask:number,audible:boolean){
 const sound=useContext(PinSoundContext),previous=useRef(audible?0:mask);
 useEffect(()=>{
  const rising=(mask&~previous.current)&63;previous.current=mask;
  if(audible&&rising)sound?.raise(rising.toString(2).replace(/0/g,'').length);
 },[mask,audible,sound]);
}
export default function PinSound(){
 const sound=useContext(PinSoundContext),{muted,micActive}=useSpeech();if(!sound)return null;
 return <div className="pin-sound global-pin-sound"><button className="button subtle" aria-label="სოლენოიდის ხმა" aria-pressed={sound.enabled} disabled={!sound.enabled&&(muted||micActive)} onClick={()=>void sound.toggle()} title="წერტილების ამოწევის ხმა ყველა რეჟიმში">{sound.enabled?<Volume2 size={15}/>:<VolumeX size={15}/>}სოლენოიდის ხმა<span className="pin-state">{sound.enabled?'ჩართულია':'გამორთულია'}</span></button>{sound.error&&<span role="status">{sound.error}</span>}</div>;
}
