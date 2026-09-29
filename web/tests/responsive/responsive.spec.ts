import {test,expect} from '@playwright/test';

const routes=['/','/lab','/learn','/practice','/results','/device','/judges','/engineering','/checks','/instructions','/project'];

test('all eleven routes fit the viewport',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  for(const route of routes){
    await page.goto(route);
    await expect(page.locator('main h1')).toBeVisible();
    await page.evaluate(()=>document.fonts.ready);
    const overflow=await page.evaluate(()=>{
      const width=document.documentElement.clientWidth;
      return {width,scrollWidth:document.documentElement.scrollWidth,
        offenders:Array.from(document.querySelectorAll('main *,header *,footer *'))
          .filter(el=>el.getBoundingClientRect().right>width+2)
          .slice(0,8).map(el=>el.tagName+'.'+el.className)};
    });
    expect(overflow.scrollWidth,`${route}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(overflow.width+1);
  }
  expect(errors).toEqual([]);
});

test('navigation works with touch and keyboard on short screens',async({page})=>{
  await page.goto('/');
  const menu=page.locator('.menu-button');
  if(await menu.isVisible()){
    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded','true');
    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded','false');
    await expect(menu).toBeFocused();
    await menu.click();
    await page.locator('#main-navigation a[href="/judges"]').click();
    await expect(menu).toHaveAttribute('aria-expanded','false');
  }else await page.locator('#main-navigation a[href="/judges"]').click();
  await expect(page).toHaveURL(/\/judges$/);
  await page.setViewportSize({width:568,height:320});
  await menu.click();
  const bounds=await page.locator('#main-navigation').boundingBox();
  expect(bounds!.y+bounds!.height).toBeLessThanOrEqual(320);
  await page.locator('#main-navigation a[href="/results"]').click();
  await expect(page).toHaveURL(/\/results$/);
});

test('long input, readable forms and tap targets work without newer AbortSignal helpers',async({page})=>{
  await page.addInitScript(()=>{
    Object.defineProperty(AbortSignal,'any',{value:undefined,configurable:true});
    Object.defineProperty(AbortSignal,'timeout',{value:undefined,configurable:true});
  });
  await page.goto('/lab');
  await expect(page.locator('.utility-bar')).toContainText('ხმის მოდელი მზადაა');
  await page.getByLabel('ქართული ტექსტი').fill('დედა'.repeat(40));
  await page.getByRole('button',{name:'შემდეგი ასო',exact:true}).click();
  await expect(page.locator('.letter-display')).toContainText('2 / 160');
  const width=await page.evaluate(()=>document.documentElement.clientWidth);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width+1);
  if(width<=900){
    for(const field of await page.locator('textarea,select').all()){
      expect(await field.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
    }
  }
  if(await page.evaluate(()=>matchMedia('(pointer:coarse),(max-width:620px)').matches)){
    for(const selector of ['.player .icon-button','.voice-tools .icon-button','.glass-toggle']){
      for(const button of await page.locator(selector).all()){
        const rect=await button.boundingBox();expect(rect!.width).toBeGreaterThanOrEqual(44);expect(rect!.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test('device exploration and image dialog remain usable',async({page})=>{
  await page.goto('/device');
  await expect(page.locator('.device-explorer')).toBeVisible();
  await expect(page.locator('.explode-button,.device-explorer .fallback').first()).toBeVisible();
  if(await page.locator('.explode-button').isVisible()){
    await page.locator('.explode-button').click();
    await expect(page.locator('.device-explorer')).toHaveAttribute('data-exploded','true');
    const parts=page.locator('.part-index button');
    await expect(parts).toHaveCount(6);
    await parts.last().click();
    await expect(parts.last()).toHaveAttribute('aria-pressed','true');
  }else await expect(page.locator('.device-explorer .fallback .cell')).toBeVisible();
  await page.getByRole('button',{name:'ორიგინალი რენდერები',exact:true}).click();
  await page.getByRole('button',{name:'გადიდება',exact:true}).click();
  const dialog=page.locator('dialog');await expect(dialog).toBeVisible();
  await page.getByRole('button',{name:'რენდერის მოახლოება',exact:true}).click();
  const size=await dialog.boundingBox();
  expect(size!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(size!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await page.getByRole('button',{name:'გალერეის დახურვა',exact:true}).click();
  await expect(dialog).not.toBeVisible();
});
