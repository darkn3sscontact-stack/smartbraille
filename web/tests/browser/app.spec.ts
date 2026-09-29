import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
const ready={model_state:'ready',model:'TEST FIXTURE',engine:'faster-whisper',voice_available:false,voice_engine:null,max_audio_seconds:30,device:'cpu',compute_type:'int8',build:'1.0.0',timestamp:new Date().toISOString()};
test('all production deep links and original assets load',async({page,request})=>{
 for(const route of ['/','/lab','/learn','/practice','/results','/device','/engineering','/checks','/judges','/instructions','/project']){const response=await page.goto(route);expect(response?.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();expect(await page.locator('body').innerText()).not.toContain('undefined');}
 for(const asset of ['/assets/device/device-overview-original.jpeg','/assets/device/device-mechanism-original.jpeg','/assets/device/device-top-cell-original.jpeg']){const response=await request.get(asset);expect(response.status()).toBe(200);expect((await response.body()).length).toBeGreaterThan(1000);}
});
test('home uses exact supplied overview; new word converts and unsupported chars are explicit',async({page})=>{await page.goto('/');await expect(page.locator('.hero-device>img')).toHaveAttribute('src','/assets/device/device-overview-original.jpeg');await page.getByLabel('შენი პირველი სიტყვა').fill('ხე');await expect(page.locator('.home-braille .cell')).toHaveCount(2);await page.getByRole('link',{name:'სიტყვის ლაბორატორიაში გახსნა'}).click();await expect(page.getByLabel('ქართული ტექსტი')).toHaveValue('ხე');await expect(page.locator('.current-cell .cell')).toHaveAttribute('aria-label','ბრაილის უჯრა; ამოწეული წერტილები: 1, 2, 5');await page.getByLabel('ქართული ტექსტი').fill('ხე!');await expect(page.getByRole('alert')).toContainText('არ არის მხარდაჭერილი');});
test('word playback advances, pauses and resets',async({page})=>{await page.goto('/lab?text=აბგ');await page.getByRole('button',{name:'დაკვრა',exact:true}).click();await expect(page.locator('.letter-display strong')).toHaveText('ბ',{timeout:2500});await page.getByRole('button',{name:'პაუზა',exact:true}).click();const letter=await page.locator('.letter-display strong').innerText();await page.waitForTimeout(1300);await expect(page.locator('.letter-display strong')).toHaveText(letter);await page.getByRole('button',{name:'სიტყვის თავიდან დაწყება'}).click();await expect(page.locator('.letter-display strong')).toHaveText('ა');});
test('first wrong answer persists; assisted retry and visitor reset are distinct',async({page})=>{
 await page.goto('/practice?trial=1');await page.getByLabel('სავარჯიშო ასოები').fill('ა');await page.getByRole('button',{name:'სესიის დაწყება',exact:true}).click();await expect(page.locator('.exercise')).not.toContainText('სწორი პასუხი');await expect(page.locator('.exercise-pattern')).not.toContainText('ა');await page.getByLabel('შენი პასუხი — შეამოწმე და დაადასტურე').fill('ბ');await page.getByRole('button',{name:'პასუხის დადასტურება'}).click();await expect(page.locator('.feedback h3')).toHaveText('არასწორია');await page.getByRole('button',{name:'ხელახლა ცდა'}).click();await page.getByLabel('შენი პასუხი — შეამოწმე და დაადასტურე').fill('ა');await page.getByRole('button',{name:'პასუხის დადასტურება'}).click();await expect(page.locator('.feedback h3')).toHaveText('სწორია');await page.getByRole('link',{name:'შედეგები',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.locator('.metric').first()).toContainText('50%');await expect(page.locator('.metric').nth(1)).toContainText('0 / 1');
 const downloadPromise=page.waitForEvent('download');await page.getByRole('button',{name:'JSON',exact:true}).click();const dl=await downloadPromise;const data=JSON.parse(await readFile((await dl.path())!,'utf8'));expect(data.attempts.map((a:any)=>a.outcome)).toEqual(['incorrect','correct']);expect(data.attempts[1].assisted).toBe(true);
 await page.getByRole('button',{name:'ახალი ვიზიტორი'}).click();await page.getByRole('link',{name:'შედეგები',exact:true}).click();await expect(page.getByText('პირველი ჩანაწერი წინ არის')).toBeVisible();await page.getByLabel('წინა სესიების ჩვენება').check();await expect(page.locator('tbody tr')).toHaveCount(2);
});
test('build pattern can be completed with keyboard',async({page})=>{await page.goto('/practice?trial=1');await page.getByRole('button',{name:/ააწყვე ნიმუში/}).click();await page.getByLabel('სავარჯიშო ასოები').fill('ა');await page.getByRole('button',{name:'სესიის დაწყება'}).click();await page.getByRole('button',{name:'წერტილი 1',exact:true}).press('1');await expect(page.getByRole('button',{name:'წერტილი 1',exact:true})).toHaveAttribute('aria-pressed','true');await page.getByRole('button',{name:'პასუხის დადასტურება'}).press('Enter');await expect(page.locator('.feedback h3')).toHaveText('სწორია');});
test('real MediaRecorder bytes, mocked ASR; raw and corrected transcripts stay separate',async({page})=>{
 await page.route('**/api/health',r=>r.fulfill({json:ready}));let multipart='';await page.route('**/api/transcribe',async r=>{multipart=r.request().postData()??'';await r.fulfill({json:{raw_transcript:'ბ',state:'ok',engine:'fixture',model:'mocked test ASR',processing_ms:123,processing_started_at:new Date().toISOString(),processing_ended_at:new Date().toISOString()}});});
 await page.goto('/practice?trial=1');await page.getByLabel('სავარჯიშო ასოები').fill('ა');await page.getByLabel('პასუხის შეყვანა').selectOption('voice');await page.getByRole('button',{name:'სესიის დაწყება'}).click();await page.getByRole('button',{name:'სცადე ხმით',exact:true}).click();await expect(page.getByRole('button',{name:'ჩაწერის დასრულება'})).toBeVisible();await page.waitForTimeout(500);await page.getByRole('button',{name:'ჩაწერის დასრულება'}).click();await expect(page.getByTestId('raw-transcript')).toHaveText('ბ');expect(multipart).toContain('name="audio"');expect(multipart).not.toMatch(/name="(?:target|prompt|answer|expected)"/);expect(multipart.length).toBeGreaterThan(500);await page.getByLabel('შენი პასუხი — შეამოწმე და დაადასტურე').fill('ა');await page.getByRole('button',{name:'პასუხის დადასტურება'}).click();await page.getByRole('link',{name:'შედეგები',exact:true}).click();const promise=page.waitForEvent('download');await page.getByRole('button',{name:'JSON',exact:true}).click();const exportData=JSON.parse(await readFile((await (await promise).path())!,'utf8'));expect(exportData.attempts[0]).toMatchObject({rawTranscript:'ბ',answer:'ა',corrected:true,confirmed:true,inputMode:'voice',outcome:'correct'});
});
test('silence is unresolved and never graded incorrect',async({page})=>{await page.route('**/api/health',r=>r.fulfill({json:ready}));await page.route('**/api/transcribe',r=>r.fulfill({json:{raw_transcript:'',state:'no-speech'}}));await page.goto('/practice?trial=1');await page.getByLabel('პასუხის შეყვანა').selectOption('voice');await page.getByRole('button',{name:'სესიის დაწყება'}).click();await page.getByRole('button',{name:'სცადე ხმით',exact:true}).click();await expect(page.getByRole('button',{name:'ჩაწერის დასრულება'})).toBeVisible();await page.waitForTimeout(300);await page.getByRole('button',{name:'ჩაწერის დასრულება'}).click();await expect(page.getByRole('alert')).toContainText('მეტყველება ვერ ამოიცნო');await page.getByRole('link',{name:'შედეგები',exact:true}).click();await expect(page.locator('tbody')).toContainText('ამოცნობა დაუდასტურებელია');await expect(page.locator('.metric').first()).toContainText('დასრულებული პასუხი ჯერ არ არის');});
test('cancellation ignores a later recognition response',async({page})=>{await page.route('**/api/health',r=>r.fulfill({json:ready}));await page.route('**/api/transcribe',async r=>{await new Promise(resolve=>setTimeout(resolve,1000));await r.fulfill({json:{raw_transcript:'დედა',state:'ok'}}).catch(()=>{});});await page.goto('/lab');await page.getByRole('button',{name:'სცადე ხმით',exact:true}).click();await expect(page.getByRole('button',{name:'ჩაწერის დასრულება'})).toBeVisible();await page.waitForTimeout(300);await page.getByRole('button',{name:'ჩაწერის დასრულება'}).click();await page.getByRole('button',{name:'გაუქმება',exact:true}).click();await page.waitForTimeout(1400);await expect(page.getByTestId('raw-transcript')).toHaveCount(0);await expect(page.getByRole('button',{name:'სცადე ხმით',exact:true})).toBeVisible();});
test('missing service preserves typed path',async({page})=>{await page.route('**/api/health',r=>r.abort('failed'));await page.goto('/lab');await page.getByRole('button',{name:'სცადე ხმით',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await page.getByLabel('ქართული ტექსტი').fill('მზე');await expect(page.locator('.word-strip button')).toHaveCount(3);});
test('original lightbox closes on Escape and returns focus; hotspot stays aligned',async({page})=>{await page.goto('/device');await page.getByRole('button',{name:'ორიგინალი რენდერები',exact:true}).click();await page.getByRole('button',{name:'გადიდება',exact:true}).click();await expect(page.locator('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('dialog')).not.toBeVisible();await expect(page.getByRole('button',{name:'გადიდება',exact:true})).toBeFocused();for(const width of [1280,390]){await page.setViewportSize({width,height:900});const img=await page.locator('.hotspot-image img').boundingBox();const spot=await page.locator('.hotspot-image button').first().boundingBox();expect((spot!.x+spot!.width/2-img!.x)/img!.width).toBeCloseTo(.17,2);expect((spot!.y+spot!.height/2-img!.y)/img!.height).toBeCloseTo(.43,2);}await page.getByRole('button',{name:'კორპუსი',exact:true}).press('Enter');await expect(page.locator('.hotspot-list li').first()).toHaveClass('active');});
test('two patterns update the real WebGL scene and canonical 2D state',async({page})=>{await page.goto('/device');await page.getByRole('button',{name:'ინტერაქტიული სიმულაცია'}).click();await expect(page.locator('canvas')).toBeVisible();await page.getByRole('button',{name:'ზედა',exact:true}).click();await page.getByLabel('ასოს არჩევა').selectOption('0');await page.waitForTimeout(200);const down=await page.locator('canvas').screenshot();await page.getByLabel('ასოს არჩევა').selectOption('63');await expect(page.locator('.simulation-controls .cell')).toHaveAttribute('aria-label','ბრაილის უჯრა; ამოწეული წერტილები: 1, 2, 3, 4, 5, 6');await page.waitForTimeout(200);const up=await page.locator('canvas').screenshot();expect(down.equals(up)).toBe(false);});
test('no WebGL uses original image and 2D cell',async({page})=>{await page.goto('/device?noWebGL=1');await page.getByRole('button',{name:'ინტერაქტიული სიმულაცია'}).click();await expect(page.locator('.fallback')).toContainText('3D გრაფიკა მიუწვდომელია');await expect(page.locator('.fallback img')).toBeVisible();await page.getByLabel('ასოს არჩევა').selectOption('3');await expect(page.locator('.fallback .cell')).toHaveAttribute('aria-label','ბრაილის უჯრა; ამოწეული წერტილები: 1, 2');});
test('mobile routes fit without horizontal overflow',async({page})=>{await page.setViewportSize({width:390,height:844});for(const route of ['/','/lab','/practice','/device','/judges','/instructions','/project']){await page.goto(route);await expect(page.locator('h1')).toBeVisible();const dimensions=await page.evaluate(()=>({width:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth}));expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width+1);}await page.goto('/');await expect(page.getByRole('link',{name:'სცადე ხმით',exact:true})).toBeInViewport();});

// Actual MediaRecorder transport and actual local model. Chromium supplies a
// synthetic fake microphone signal, not a live participant's voice.
test('captured fake-microphone bytes reach the real speech service',async({page})=>{
 let capturedBytes=0;
 await page.route('**/api/transcribe',async route=>{
  capturedBytes=route.request().postDataBuffer()?.length??0;
  await route.continue(); // Observe upload only; response comes from the real API.
 });
 await page.goto('/lab');
 const requestPromise=page.waitForResponse(r=>r.url().endsWith('/api/transcribe'));
 await page.getByRole('button',{name:'სცადე ხმით',exact:true}).click();
 await expect(page.getByRole('button',{name:'ჩაწერის დასრულება'})).toBeVisible();
 await page.waitForTimeout(700);
 await page.getByRole('button',{name:'ჩაწერის დასრულება'}).click();
 const response=await requestPromise;
 expect(response.status()).toBe(200);
 const data=await response.json();
 expect(data.engine).toBe('faster-whisper');expect(data.language).toBe('ka');
 expect(['ok','no-speech']).toContain(data.state);
 expect(data.duration_seconds).toBeGreaterThan(0);
 expect(data.processing_ms).toBeGreaterThanOrEqual(0);
 expect(capturedBytes).toBeGreaterThan(500);
});

test('judges guide retains evidence without point values',async({page})=>{
 await page.goto('/judges');
 await expect(page.locator('.criteria-grid article')).toHaveCount(4);
 await expect(page.locator('main')).not.toContainText('ქულ');
 await expect(page.locator('.criteria-grid a')).toHaveCount(4);
});

test('solenoid sound is real local Web Audio, only on rise, and respects mute',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;w.pinAudio=[];w.pinContexts=[];
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){
   if(this.buffer){const samples=this.buffer.getChannelData(0);w.pinAudio.push({duration:this.buffer.duration,peak:Math.max(...samples.map(Math.abs)),finite:samples.every(Number.isFinite)});w.pinContexts.push(this.context);}
   return original.apply(this,args);
  };
 });
 let speechRequests=0;page.on('request',r=>{if(r.url().includes('/api/speak'))speechRequests++;});
 await page.goto('/device');await page.getByRole('button',{name:'ინტერაქტიული სიმულაცია'}).click();
 const sound=page.getByRole('button',{name:'სოლენოიდის ხმა',exact:true});
 await expect(sound).toHaveAttribute('aria-pressed','false');await sound.click();
 await expect(sound).toHaveAttribute('aria-pressed','true');
 const initial=await page.evaluate(()=>(window as any).pinAudio);
 expect(initial).toHaveLength(1);expect(initial[0].duration).toBeLessThan(.12);expect(initial[0].peak).toBeGreaterThan(.01);expect(initial[0].peak).toBeLessThan(1);expect(initial[0].finite).toBe(true);
 await page.getByLabel('ასოს არჩევა').selectOption('0');await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).pinAudio.length)).toBe(1);
 await page.getByLabel('ასოს არჩევა').selectOption('3');await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).pinAudio.length)).toBe(2);
 await page.getByRole('button',{name:'ხმის გამორთვა',exact:true}).click();
 await page.getByLabel('ასოს არჩევა').selectOption('63');await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).pinAudio.length)).toBe(2);
 expect(speechRequests).toBe(0);
 await sound.click();
 expect(await page.evaluate(()=>(window as any).pinContexts.every((c:AudioContext)=>c.state==='closed'))).toBe(true);
});

test('one sound setting follows navigation, word playback and pattern building',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;w.pinStarts=0;
  const original=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){w.pinStarts++;return original.apply(this,args);};
 });
 await page.goto('/device');await page.getByRole('button',{name:'სოლენოიდის ხმა',exact:true}).click();
 await page.getByRole('link',{name:'სცადე',exact:true}).click();
 await expect(page.getByRole('button',{name:'სოლენოიდის ხმა',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByLabel('ქართული ტექსტი').fill('აბგ');await page.waitForTimeout(150);
 const before=await page.evaluate(()=>(window as any).pinStarts);
 await page.getByRole('button',{name:'დაკვრა',exact:true}).click();
 await page.waitForTimeout(2400);
 expect(await page.evaluate(()=>(window as any).pinStarts)).toBeGreaterThan(before);
 await page.getByRole('link',{name:'ტესტი',exact:true}).click();
 await page.getByRole('button',{name:/ააწყვე ნიმუში/}).click();
 await page.getByRole('button',{name:'სესიის დაწყება',exact:true}).click();
 const beforeBuild=await page.evaluate(()=>(window as any).pinStarts);
 await page.getByRole('button',{name:'წერტილი 1',exact:true}).click();await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).pinStarts)).toBeGreaterThan(beforeBuild);
 await page.getByRole('link',{name:'სცადე',exact:true}).click();
 await page.getByRole('button',{name:'სცადე ხმით',exact:true}).click();
 await expect(page.getByRole('button',{name:'ჩაწერის დასრულება'})).toBeVisible();
 const whileRecording=await page.evaluate(()=>(window as any).pinStarts);
 await page.getByLabel('ქართული ტექსტი').fill('ჰჰჰ');await page.waitForTimeout(150);
 expect(await page.evaluate(()=>(window as any).pinStarts)).toBe(whileRecording);
 await page.getByRole('button',{name:'გაუქმება',exact:true}).click();
});

test('Georgian speech button plays real neural-service audio without system TTS',async({page})=>{
 await page.addInitScript(()=>{
  (window as any).systemSpeechCalls=0;(window as any).speechBlobBytes=0;
  window.speechSynthesis.speak=()=>{(window as any).systemSpeechCalls++;};
  const create=URL.createObjectURL.bind(URL);
  URL.createObjectURL=(blob:Blob|MediaSource)=>{if(blob instanceof Blob)(window as any).speechBlobBytes=blob.size;return create(blob);};
 });
 await page.goto('/lab');await page.getByLabel('ქართული ტექსტი').fill('დედა და მამა');
 const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/speak'));
 await page.getByRole('button',{name:'შეყვანილი ტექსტის გახმოვანება'}).click();
 const response=await responsePromise;
 expect(response.status()).toBe(200);expect(response.headers()['content-type']).toContain('audio/wav');
 await expect.poll(()=>page.evaluate(()=>(window as any).speechBlobBytes)).toBeGreaterThan(1000);
 expect(await page.evaluate(()=>(window as any).systemSpeechCalls)).toBe(0);
 await page.getByRole('button',{name:'გახმოვანების დასრულება',exact:true}).click();
});

test('Play itself starts audible letter speech, resumes the click context and stops on pause',async({page})=>{
 await page.addInitScript(()=>{
  const w=window as any;w.audioPlaying=0;w.clickContext=null;
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){this.addEventListener('playing',()=>w.audioPlaying++,{once:true});return play.call(this);};
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof start>){w.clickContext=this.context;return start.apply(this,args);};
 });
 const spoken:string[]=[];page.on('request',r=>{if(r.url().endsWith('/api/speak'))spoken.push(r.postDataJSON().text);});
 await page.goto('/lab?text=აბგ');
 await page.getByRole('button',{name:'სოლენოიდის ხმა',exact:true}).click();
 await page.evaluate(async()=>{await (window as any).clickContext.suspend();});
 await page.getByRole('button',{name:'დაკვრა',exact:true}).click();
 await expect.poll(()=>spoken[0]).toBe('ა');
 await expect.poll(()=>page.evaluate(()=>(window as any).audioPlaying)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>(window as any).clickContext.state)).toBe('running');
 await expect.poll(()=>spoken.includes('ბ')).toBe(true);
 await page.getByRole('button',{name:'პაუზა',exact:true}).click();
 const count=spoken.length;await page.waitForTimeout(1200);expect(spoken).toHaveLength(count);
 await page.getByLabel('დაკვრისას ასოების გახმოვანება').uncheck();
 await page.getByRole('button',{name:'დაკვრა',exact:true}).click();await page.waitForTimeout(1200);
 expect(spoken).toHaveLength(count);
});


// The anatomy uses the real canvas and controls, including keyboard and motion preferences.
test('device anatomy unfolds, explains all six groups, animates and reassembles',async({page})=>{
 await page.goto('/device');const viewer=page.locator('.device-explorer'),canvas=viewer.locator('canvas');
 await expect(canvas).toBeVisible();await page.waitForTimeout(250);const assembled=await canvas.screenshot();
 await page.getByRole('button',{name:'მოდელის გაშლა',exact:true}).press('Enter');
 await expect(viewer).toHaveAttribute('data-exploded','true');await expect(viewer.locator('.part-marker:visible')).toHaveCount(6);
 const unfolded=await canvas.screenshot();expect(unfolded.equals(assembled)).toBe(false);
 const parts=page.getByRole('group',{name:'ნაწილების არჩევა'}).getByRole('button');
 for(let i=0;i<6;i++){
  await parts.nth(i).press('Enter');await expect(parts.nth(i)).toHaveAttribute('aria-pressed','true');
  await expect(viewer.locator('.part-story h3')).not.toBeEmpty();await expect(viewer.locator('.part-detail')).not.toBeEmpty();
  await page.getByRole('button',{name:'შემდეგი ნაბიჯი',exact:true}).click();
  await expect(viewer.locator('.demo-steps .current')).toHaveCount(1);
  const rest=await canvas.screenshot();await page.getByRole('button',{name:'შემდეგი ნაბიჯი',exact:true}).click();
  await expect(viewer.locator('.demo-steps .current span')).toHaveText('02');
  expect((await canvas.screenshot()).equals(rest)).toBe(false);
 }
 await page.getByRole('button',{name:'03 — მოძრავი წერტილები',exact:true}).press('Enter');
 await page.getByRole('button',{name:'წერტილი 6',exact:true}).click();await expect(page.getByRole('button',{name:'წერტილი 6',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'მოდელის აწყობა',exact:true}).press('Enter');await expect(viewer).toHaveAttribute('data-exploded','false');await expect(viewer.locator('.part-marker:visible')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'შემდეგი ნაბიჯი',exact:true})).toHaveCount(0);
});
test('clicking the model unfolds it; dragging only rotates; timed demo stops on reset',async({page})=>{
 await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/device');
 const canvas=page.locator('.device-explorer canvas');await expect(canvas).toBeVisible();await canvas.scrollIntoViewIfNeeded();
 const box=await canvas.boundingBox();const x=box!.x+box!.width/2,y=box!.y+box!.height/2;
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+45,y+10,{steps:5});await page.mouse.up();
 await expect(page.locator('.device-explorer')).toHaveAttribute('data-exploded','false');
 await page.getByRole('button',{name:'ხედის გადატვირთვა',exact:true}).click();await canvas.scrollIntoViewIfNeeded();
 const resetBox=await canvas.boundingBox();await page.mouse.click(resetBox!.x+resetBox!.width/2,resetBox!.y+resetBox!.height/2);
 await expect(page.locator('.device-explorer')).toHaveAttribute('data-exploded','true');
 await page.getByRole('group',{name:'ნაწილების არჩევა'}).getByRole('button',{name:'06 ამძრავების ბლოკი',exact:true}).click();
 await page.getByRole('button',{name:'მუშაობის ნახვა',exact:true}).click();
 await expect(page.locator('.demo-steps .current span')).toHaveText('02',{timeout:2500});
 await page.getByRole('button',{name:'ანიმაციის შეჩერება',exact:true}).click();await expect(page.locator('.demo-steps .current')).toHaveCount(0);
 await page.getByRole('button',{name:'მუშაობის ნახვა',exact:true}).click();await page.getByRole('button',{name:'ხედის გადატვირთვა',exact:true}).click();
 await expect(page.locator('.device-explorer')).toHaveAttribute('data-exploded','false');await expect(page.locator('.demo-steps .current')).toHaveCount(0);
});
test('exploded anatomy fits mobile and exports without destroying exploration state',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/device');await page.getByRole('button',{name:'მოდელის გაშლა',exact:true}).click();
 await expect(page.locator('.part-marker:visible')).toHaveCount(6);
 const bounds=await page.locator('.model-viewport').boundingBox();for(const marker of await page.locator('.part-marker').all()){const box=await marker.boundingBox();expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);expect(box!.x+box!.width).toBeLessThanOrEqual(bounds!.x+bounds!.width);expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);expect(box!.y+box!.height).toBeLessThanOrEqual(bounds!.y+bounds!.height);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
 await page.getByText('სქემატური რენდერების ჩამოტვირთვა',{exact:true}).click();
 const promise=page.waitForEvent('download');await page.getByRole('button',{name:'საერთო ხედი PNG',exact:true}).click();const download=await promise;expect(download.suggestedFilename()).toBe('device-overview-schematic.png');expect((await readFile((await download.path())!)).length).toBeGreaterThan(10000);
 await expect(page.locator('.device-explorer')).toHaveAttribute('data-exploded','true');await expect(page.locator('.part-marker:visible')).toHaveCount(6);
});
