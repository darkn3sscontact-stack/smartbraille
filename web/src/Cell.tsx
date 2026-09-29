import {usePinMotion} from './PinSound';
import { DOT_ORDER,dots } from './core';
export default function Cell({mask,interactive=false,onChange,small=false,audible=false}:{mask:number;interactive?:boolean;onChange?:(mask:number)=>void;small?:boolean;audible?:boolean}){
 usePinMotion(mask,audible);
 return <div className={`cell ${small?'small':''}`} role="group" aria-label={`ბრაილის უჯრა; ამოწეული წერტილები: ${dots(mask).join(', ')||'არცერთი'}`}>
 {DOT_ORDER.map(d=>{const active=Boolean(mask&1<<(d-1));return interactive?<button key={d} type="button" className={`dot ${active?'up':''}`} aria-label={`წერტილი ${d}`} aria-pressed={active} onClick={()=>onChange?.(mask^(1<<(d-1)))} onKeyDown={e=>{if(/^[1-6]$/.test(e.key)){e.preventDefault();onChange?.(mask^(1<<(Number(e.key)-1)));}}}>{d}</button>:<span key={d} className={`dot ${active?'up':''}`} aria-hidden="true">{d}</span>;})}
 </div>;
}
