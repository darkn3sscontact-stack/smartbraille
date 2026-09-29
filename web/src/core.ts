import mapping from '../../data/mapping.json';
export const BUILD='1.0.0';
export const REVISION=mapping.revision;
export const LETTERS=mapping.letters as Record<string,number>;
export const ALPHABET=Object.keys(LETTERS);
export const DOT_ORDER=[1,4,2,5,3,6];
export function dots(mask:number){return [1,2,3,4,5,6].filter(d=>Boolean(mask & 1<<(d-1)));}
export function unicode(mask:number){return String.fromCodePoint(0x2800+mask);}
export function normalize(text:string){return text.normalize('NFC').toLocaleLowerCase('ka').replace(/\s+/gu,' ').trim();}
export function convert(text:string){return [...normalize(text)].map(char=>({char,mask:char===' '?0:LETTERS[char]??null}));}
// Global, deterministic answer rule: case/whitespace, terminal ASR punctuation, optional "ასო ". No fuzzy matching.
export function answerText(text:string){return normalize(text).replace(/[.!?。]+$/u,'').replace(/^ასო\s+/u,'').trim();}
export function evaluate(target:string,answer:string){return answerText(target)===answerText(answer);}
export function dictatedDots(text:string):number|null{
  const names:Record<string,string>={'ერთი':'1','ორი':'2','სამი':'3','ოთხი':'4','ხუთი':'5','ექვსი':'6'};
  const tokens=normalize(text).replace(/[.,]/g,' ').split(/\s+/).filter(t=>t&&t!=='და');
  const numbers=tokens.map(t=>names[t]??t);
  if(!numbers.length||numbers.some(t=>! /^[1-6]$/.test(t))) return null;
  return [...new Set(numbers)].reduce((m,n)=>m|1<<(Number(n)-1),0);
}
export type Outcome='correct'|'incorrect'|'skipped'|'cancelled'|'recognition-unresolved'|'technical-failure';
export const OUTCOMES:Record<Outcome,string>={correct:'სწორია',incorrect:'არასწორია',skipped:'გამოტოვებულია',cancelled:'გაუქმებულია','recognition-unresolved':'ამოცნობა დაუდასტურებელია','technical-failure':'ტექნიკური შეფერხება'};
export interface RecognitionEvent {schema:1;raw:string;engine:string;model:string;recordingStartedAt:string;recordingEndedAt:string;processingStartedAt:string;processingEndedAt:string;processingMs:number;state:string}
export interface Session {schema:1;id:string;createdAt:string;build:string;settings?:Record<string,unknown>}
export interface Attempt {schema:1;id:string;sessionId:string;questionId:string;build:string;mappingRevision:string;task:'read'|'build';modality:'visual'|'auditory';target:string;patterns:number[];answer:string;selectedMask:number|null;outcome:Outcome;assisted:boolean;retry:number;inputMode:'typed'|'voice'|'dots';rawTranscript:string|null;corrected:boolean;confirmed:boolean;recognition:RecognitionEvent|null;voiceEngine:string|null;presentedAt:string;submittedAt:string;responseMs:number;asrMs:number;totalMs:number}
export interface TechnicalTestResult {schema:1;id:string;build:string;timestamp:string;name:string;passed:boolean;detail:string}
const KEYS={sessions:'braille.sessions.v1',attempts:'braille.attempts.v1',current:'braille.current.v1',checks:'braille.checks.v1',recognitions:'braille.recognitions.v1'};
export function read<T>(key:string,fallback:T):T{try{return JSON.parse(localStorage.getItem(key)??'null')??fallback;}catch{return fallback;}}
export function sessions(){return read<Session[]>(KEYS.sessions,[]);}
export function attempts(){return read<Attempt[]>(KEYS.attempts,[]);}
export function newSession(){const session:Session={schema:1,id:crypto.randomUUID(),createdAt:new Date().toISOString(),build:BUILD};localStorage.setItem(KEYS.sessions,JSON.stringify([...sessions(),session]));sessionStorage.setItem(KEYS.current,session.id);return session;}
export function currentSession(){const id=sessionStorage.getItem(KEYS.current);return sessions().find(s=>s.id===id)??newSession();}
export function setSettings(settings:Record<string,unknown>){const current=currentSession();localStorage.setItem(KEYS.sessions,JSON.stringify(sessions().map(s=>s.id===current.id?{...s,settings}:s)));}
export function appendAttempt(attempt:Attempt){localStorage.setItem(KEYS.attempts,JSON.stringify([...attempts(),attempt]));}
export function technicalTests(){return read<TechnicalTestResult[]>(KEYS.checks,[]);}
export function appendChecks(rows:TechnicalTestResult[]){localStorage.setItem(KEYS.checks,JSON.stringify([...technicalTests(),...rows]));}
export function clearData(){Object.values(KEYS).forEach(k=>localStorage.removeItem(k));sessionStorage.removeItem(KEYS.current);newSession();}
export function metrics(rows:Attempt[]){
 const completed=rows.filter(a=>a.outcome==='correct'||a.outcome==='incorrect');
 const first=completed.filter((a,i)=>!completed.slice(0,i).some(b=>b.questionId===a.questionId&&b.sessionId===a.sessionId));
 const unassisted=first.filter(a=>!a.assisted);
 const correct=completed.filter(a=>a.outcome==='correct').length;
 return {correct,answered:completed.length,accuracy:completed.length?correct/completed.length:null,firstCorrect:unassisted.filter(a=>a.outcome==='correct').length,firstTotal:unassisted.length,other:rows.length-completed.length};
}
export function csvCell(value:unknown){let s=typeof value==='object'?JSON.stringify(value):String(value??'');if(/^[\s]*[=+@\-\t\r\n]/u.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
export function toCSV(rows:Attempt[]){const keys: (keyof Attempt)[]=['schema','id','sessionId','questionId','build','mappingRevision','task','modality','target','patterns','answer','selectedMask','outcome','assisted','retry','inputMode','rawTranscript','corrected','confirmed','recognition','voiceEngine','presentedAt','submittedAt','responseMs','asrMs','totalMs'];return '\ufeff'+[keys.map(csvCell).join(','),...rows.map(row=>keys.map(k=>csvCell(row[k])).join(','))].join('\r\n');}
export function download(name:string,content:BlobPart,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export const WORDS=['დედა','მამა','ენა','მზე','ცა','ხე','გზა','სახლი','ვარდი','კარი','წიგნი','წყალი'];
export function randomItem<T>(items:T[]){const values=new Uint32Array(1);crypto.getRandomValues(values);return items[values[0]%items.length];}

export interface StoredRecognition {schema:1;id:string;sessionId:string;questionId:string|null;event:RecognitionEvent}
export function recognitions(){return read<StoredRecognition[]>(KEYS.recognitions,[]);}
export function appendRecognition(event:RecognitionEvent,questionId:string|null=null){const row:StoredRecognition={schema:1,id:crypto.randomUUID(),sessionId:currentSession().id,questionId,event};localStorage.setItem(KEYS.recognitions,JSON.stringify([...recognitions(),row]));}
