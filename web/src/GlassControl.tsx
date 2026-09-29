import {useEffect,useState} from 'react';
import {Droplets} from 'lucide-react';

export default function GlassControl(){
 const [clear,setClear]=useState(()=>{try{return localStorage.getItem('braille-glass')!=='solid';}catch{return true;}});
 useEffect(()=>{document.documentElement.dataset.glass=clear?'clear':'solid';try{localStorage.setItem('braille-glass',clear?'clear':'solid');}catch{/* Appearance remains usable without storage. */}},[clear]);
 return <button className="icon-button glass-toggle" aria-label="მინის ეფექტი" aria-pressed={clear} title={clear?'გამჭვირვალობის შემცირება':'მინის ეფექტის ჩართვა'} onClick={()=>setClear(value=>!value)}><Droplets size={18}/></button>;
}
