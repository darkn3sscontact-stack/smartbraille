import {defineConfig,devices} from '@playwright/test';

export default defineConfig({
  testDir:'tests/responsive',
  timeout:120000,
  workers:2,
  reporter:[['list']],
  use:{
    baseURL:process.env.TEST_BASE_URL??'http://127.0.0.1:8000',
    reducedMotion:'reduce',
    screenshot:'only-on-failure',
    trace:'retain-on-failure',
  },
  projects:[
    {name:'compact-phone',use:{browserName:'chromium',viewport:{width:320,height:568},isMobile:true,hasTouch:true}},
    {name:'android-chrome',use:{...devices['Pixel 7']}},
    {name:'iphone-webkit',use:{...devices['iPhone 13']}},
    {name:'iphone-landscape',use:{...devices['iPhone 13 landscape']}},
    {name:'ipad-webkit',use:{...devices['iPad Mini']}},
    {name:'desktop-chrome',use:{browserName:'chromium',viewport:{width:1440,height:900}}},
    {name:'desktop-firefox',use:{browserName:'firefox',viewport:{width:1366,height:768}}},
    {name:'desktop-webkit',use:{browserName:'webkit',viewport:{width:1280,height:800}}},
  ],
});
