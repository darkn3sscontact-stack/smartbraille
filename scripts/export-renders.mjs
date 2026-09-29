// Repeatable captures from the same UI and scene used by visitors. Requires local app running.
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {mkdir} from 'node:fs/promises';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(path.join(root,'web/package.json'));
const {chromium}=require('@playwright/test');
const browser=await chromium.launch({args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await page.goto((process.env.TEST_BASE_URL??'http://127.0.0.1:8000')+'/device');
 await page.getByRole('button',{name:'ინტერაქტიული სიმულაცია',exact:true}).click();
 await page.locator('canvas').waitFor();
 await page.getByText('სქემატური რენდერების ჩამოტვირთვა',{exact:true}).click();
 const output=path.join(root,'web/public/assets/device/generated');await mkdir(output,{recursive:true});
 for(const [label,file] of [['საერთო ხედი PNG','device-overview-schematic.png'],['ჭრილი PNG','device-cutaway-schematic.png'],['ზედაპირი PNG','device-cell-closeup-schematic.png']]){
  const promise=page.waitForEvent('download');await page.getByRole('button',{name:label,exact:true}).click();const download=await promise;await download.saveAs(path.join(output,file));console.log(file);
 }
}finally{await browser.close();}
