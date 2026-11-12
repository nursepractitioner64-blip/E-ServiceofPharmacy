const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');

test('Temperature Check routes use separate views and shared assets', () => {
 const app = read('public/assets/js/app.js');
 assert.match(app, /"temperature-checklist":\s*\{\s*view:\s*"\/views\/temperature-checklist.html"/);
 assert.match(app, /"temperature-entry":\s*\{\s*view:\s*"\/views\/temperature-entry.html"/);
 const blocks = [...app.matchAll(/"temperature-(?:checklist|entry)":\s*\{([^}]+)\}/g)];
 assert.equal(blocks.length,2);
 for(const b of blocks){assert.match(b[1],/temperaturecheck\.client\.js/); assert.match(b[1],/temperaturecheck\.style\.css/);}
});
test('Entry contains form but no dashboard; dashboard contains report but no form',()=>{
 const entry = read('public/views/temperature-entry.html');
 const report = read('public/views/temperature-checklist.html');
 for(const id of ['temperatureForm','tcDate','tcTime','tcType','tcValue','tcUnit','tcRemark','tcSaveBtn','tcFormMessage']) assert.ok(entry.includes(`id="${id}"`),id);
 assert.doesNotMatch(entry,/id="tcReport"/);
 assert.doesNotMatch(report,/id="temperatureForm"/);
 for(const id of ['tcBranchLabel','tcMonth','tcReload','tcPrint','tcReport','tcReportMessage']) assert.ok(report.includes(`id="${id}"`),id);
});
test('Client loads authorized month records, handles failures, and distinguishes 09:00/16:00',()=>{
 const js = read('public/modules/temperaturecheck/temperaturecheck.client.js');
 assert.match(js,/fetch\(`\$\{API\}\?month=/);
 assert.match(js,/credentials: "same-origin"/);
 assert.match(js,/if \(!response\.ok/);
 assert.match(js,/OUT_OF_RANGE/);
 assert.match(js,/"09:00", "16:00"/);
 assert.match(js,/Array\.from\(\{ length: 31 \}/);
 assert.match(js,/tc-morning/);
 assert.match(js,/tc-afternoon/);
});
test('Styles include responsive and print support',()=>{
 const css = read('public/modules/temperaturecheck/temperaturecheck.style.css');
 assert.match(css,/\.tc-summary/);
 assert.match(css,/@media \(max-width: 720px\)/);
 assert.match(css,/@media print/);
});
