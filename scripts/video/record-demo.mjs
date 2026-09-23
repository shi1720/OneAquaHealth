#!/usr/bin/env node
/** Genuine browser walkthrough. Run `node scripts/video/record-demo.mjs --rehearse` first. */
import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const rehearsal = process.argv.includes('--rehearse');
const origin = process.env.RILL_VIDEO_URL || 'http://localhost:5173';
const output = resolve('output/video');
const frames = join(output, 'frames');
const assets = join(output, 'caption-assets');
for (const directory of [output, frames, assets]) await mkdir(directory, { recursive: true });
await writeFile(
  join(output, 'voiceover-timed.md'),
  await readFile(new URL('./voiceover-timed.md', import.meta.url), 'utf8'),
);
const note =
  'Demo observation: bottles and wrappers beside the stream. Observed from the public path; nothing touched.';
const totalSeconds = 238;
const scenes = [
  [
    0,
    15,
    'THE COORDINATION GAP',
    'A useful stream report deserves a clear next step.\nWhat should a team check when it has just two hours?',
  ],
  [
    15,
    28,
    'AN ISOLATED DEMONSTRATION',
    'Six fictional monitoring sites. Synthetic observations.\nA private workspace for trying the complete workflow.',
  ],
  [
    28,
    36,
    '1 · RECORD THE PLACE',
    'Choose a monitored site and record the observation time.\nThe guidance keeps volunteers on safe public paths.',
  ],
  [
    36,
    45,
    '2 · DESCRIBE WHAT YOU NOTICED',
    'Report visible litter, clarity, and movement.\nNo one needs to guess the cause.',
  ],
  [
    45,
    57,
    '3 · KEEP THE UNCERTAINTY',
    'A short field note and an honest confidence choice.\nPhotos are optional support for human review.',
  ],
  [
    57,
    64,
    '4 · SUBMIT A USEFUL REPORT',
    'Review the details, then submit.\nEvery report in this workspace remains labelled as demonstration data.',
  ],
  [
    64,
    78,
    'PRIORITY IS NOT A DIAGNOSIS',
    'Verification priority and evidence strength are separate.\nThis is a rule-based attention score, not a water-safety assessment.',
  ],
  [
    78,
    90,
    'SHOW THE REASONS',
    'The score exposes its factors and the next question to answer.\nIndependent-looking accounts are not verified independent identities.',
  ],
  [
    90,
    100,
    'ONE STREAM · CONNECTED LIVES',
    'Habitat, animals, and people remain part of the same decision.\nVisual reports cannot identify pathogens or certify safe water.',
  ],
  [
    100,
    110,
    'THE NEXT TWO HOURS',
    'Build a field plan from the time the team actually has.\nEach visit includes an access allowance and observation time.',
  ],
  [
    110,
    118,
    'LESS TIME · A DIFFERENT CHOICE',
    'Reducing the budget changes the selected work.\nThe planner chooses across distinct eligible sites.',
  ],
  [
    118,
    126,
    'A REAL TRADEOFF',
    'At 120 minutes, three visits fit. Another concern must wait.\nThe selection maximizes the stated priority policy, not ecological outcomes.',
  ],
  [
    126,
    134,
    'DEFERRALS ARE EXPLAINED',
    'Restricted sites and serious signs do not become volunteer visits.\nThe coordinator still confirms permissions and safe access.',
  ],
  [
    134,
    140,
    'TURN A PLAN INTO RESPONSIBILITY',
    'Commit the reviewed plan.\nEach selected visit becomes a task with an owner and a due date.',
  ],
  [
    140,
    150,
    'HUMAN REVIEW',
    'The coordinator records a judgment before advancing the case.\nThe original evidence and the decision stay connected.',
  ],
  [
    150,
    160,
    'RECORD WHAT HAPPENED',
    'A task is completed with a written result.\nThis fictional verification is explicitly labelled as a demo.',
  ],
  [
    160,
    168,
    'ACTION IS NOT PROOF OF IMPROVEMENT',
    'A response can be recorded, but resolution remains blocked.\nA completed recheck must provide the next piece of evidence.',
  ],
  [
    168,
    180,
    'FOLLOW THROUGH WITH A RECHECK',
    'Assign the follow-up and record its findings.\nA recheck does not certify water quality or contact safety.',
  ],
  [
    180,
    190,
    'A DOCUMENTED LOOP, CLOSED',
    'A coordinator can now resolve the observation.\nReport, review, action, and recheck form an accountable record.',
  ],
  [
    190,
    199,
    'THE DECISIONS BEHIND THE CASE',
    'Authorship, time, and historical decision snapshots remain visible.\nThe complete retained audit trail can be exported.',
  ],
  [
    199,
    213,
    'EVIDENCE THAT CAN TRAVEL',
    'JSON, CSV, GeoJSON, and an experimental FHIR R4 mapping.\nEnvironmental Locations, Observations, Tasks, and Provenance — no Patients.',
  ],
  [
    213,
    222,
    'MEASURE FOLLOW-THROUGH',
    'Count documented reviews, completed work, rechecks, and closed loops.\nThese workflow measures are not claims of improved water quality.',
  ],
  [
    222,
    238,
    'A PRACTICAL PATH TO A PILOT',
    'Proposed customer: the monitoring coordinator. Volunteers contribute free.\nValidate time saved and documented follow-through before making impact claims.',
  ],
];
function srtTime(seconds) {
  const milliseconds = Math.round(seconds * 1000);
  return `${String(Math.floor(milliseconds / 3600000)).padStart(2, '0')}:${String(Math.floor(milliseconds / 60000) % 60).padStart(2, '0')}:${String(Math.floor(milliseconds / 1000) % 60).padStart(2, '0')},${String(milliseconds % 1000).padStart(3, '0')}`;
}
await writeFile(
  join(output, 'rill-demo-captions.srt'),
  scenes
    .map(
      ([start, end, title, caption], index) =>
        `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${title}\n${caption}\n`,
    )
    .join('\n'),
);
const endCard = `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;background:#204b3c;color:#f2f3dd;font-family:Arial,sans-serif;width:1440px;height:900px;padding:84px 100px;overflow:hidden}.eyebrow{font-size:16px;letter-spacing:3px;color:#d1e596;text-transform:uppercase}.wordmark{font-size:84px;font-weight:700;letter-spacing:-7px;margin:38px 0 14px}.wordmark span{color:#d1e596}h1{font-size:64px;letter-spacing:-3px;line-height:1.13;font-weight:500;max-width:1100px;margin:24px 0}em{font-family:Georgia,serif;color:#d1e596;font-weight:400}.pilot{margin-top:34px;font-size:21px;line-height:1.65;color:#dce7d5;max-width:1040px}.tag{display:inline-block;border:1px solid #729572;padding:10px 16px;font-size:13px;letter-spacing:1.2px;color:#d1e596;margin-bottom:12px}.footer{position:absolute;bottom:70px;left:100px;right:100px;border-top:1px solid #50795d;padding-top:24px;display:flex;justify-content:space-between;font-size:16px;line-height:1.7}.credit{font-weight:700;color:#f2f3dd}.repo{color:#d1e596}</style></head><body><div class="eyebrow">OneAquaHealth IEEE Global Hackathon 2026 · Track 2</div><div class="wordmark">rill<span>.</span></div><h1>Every observation.<br/>A better <em>next step.</em></h1><div class="pilot"><span class="tag">PROPOSED PILOT · NOT YET FIELD-VALIDATED</span><br/>A coordination workspace for river groups and monitoring programmes.<br/>Volunteers contribute free. A proposed managed subscription supports the team.</div><div class="footer"><div><span class="credit">Shivam Gupta</span><br/>Citizen evidence → human decisions → documented follow-through</div><div class="repo">github.com/shi1720/OneAquaHealth<br/>Transparent rules · No paid AI key required</div></div></body></html>`;
await writeFile(join(output, 'end-card.html'), endCard);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  locale: 'en-GB',
  timezoneId: 'Europe/Lisbon',
  reducedMotion: 'reduce',
  acceptDownloads: true,
  ...(rehearsal
    ? {}
    : { recordVideo: { dir: join(output, 'raw'), size: { width: 1440, height: 900 } } }),
});
const createdAt = Date.now();
const page = await context.newPage();
page.setDefaultTimeout(12_000);
const exceptions = [];
page.on('pageerror', (error) => exceptions.push(error.message));
await page.goto(origin, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await context.addInitScript(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const pointer = document.createElement('div');
    pointer.id = 'recording-pointer';
    pointer.style.cssText =
      'position:fixed;left:-100px;top:-100px;width:20px;height:20px;border:2px solid #c4dc88;border-radius:50%;box-shadow:0 0 0 3px #204b3c66;background:#ffffff66;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483647;transition:width .15s,height .15s;';
    document.body.appendChild(pointer);
    document.addEventListener('mousemove', (event) => {
      pointer.style.left = `${event.clientX}px`;
      pointer.style.top = `${event.clientY}px`;
    });
  });
});
// The cursor is a recording aid only; application data and interface content are never fabricated.
await page.evaluate(() => {
  const pointer = document.createElement('div');
  pointer.id = 'recording-pointer';
  pointer.style.cssText =
    'position:fixed;left:-100px;top:-100px;width:20px;height:20px;border:2px solid #c4dc88;border-radius:50%;box-shadow:0 0 0 3px #204b3c66;background:#ffffff66;transform:translate(-50%,-50%);pointer-events:none;z-index:2147483647';
  document.body.appendChild(pointer);
  document.addEventListener('mousemove', (event) => {
    pointer.style.left = `${event.clientX}px`;
    pointer.style.top = `${event.clientY}px`;
  });
});
const started = Date.now();
const leadSeconds = (started - createdAt) / 1000;
const timings = [];
let pointer = { x: 1000, y: 700 };
async function waitTo(seconds) {
  if (!rehearsal) {
    const remaining = seconds * 1000 - (Date.now() - started);
    if (remaining > 0) await page.waitForTimeout(remaining);
  }
}
async function click(locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('Target has no visible bounding box');
  const next = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.move(next.x, next.y, { steps: rehearsal ? 1 : 20 });
  if (!rehearsal) await page.waitForTimeout(230);
  await locator.click();
  pointer = next;
  if (!rehearsal) await page.waitForTimeout(250);
}
async function type(locator, text) {
  await locator.scrollIntoViewIfNeeded();
  await locator.fill('');
  await locator.pressSequentially(text, { delay: rehearsal ? 0 : 25 });
}
async function shot(name, at, action) {
  await waitTo(at);
  console.log(`${rehearsal ? 'Rehearsal' : 'Recording'} ${at}s · ${name}`);
  timings.push({ name, plannedStart: at, actualStart: (Date.now() - started) / 1000 });
  if (action) await action();
}
async function frame(name) {
  await page.screenshot({ path: join(frames, `${name}.png`) });
}
const button = (name, exact = true) => page.getByRole('button', { name, exact });
let exportedBundle;
try {
  await shot('Landing: a next step for each observation', 0, () => frame('01-landing'));
  await shot('Open an isolated demonstration workspace', 15, async () => {
    await click(button('Explore the live demo'));
    await expect(page.getByRole('heading', { name: 'Your catchment, connected.' })).toBeVisible();
    await frame('02-overview');
  });
  await shot('Choose a safe monitoring location', 28, async () => {
    await click(button('New observation'));
    await expect(page.getByText(/Your last draft was restored/)).toHaveCount(0);
    await click(
      button('Riverside playground Fictional small tributary near a family recreation area.'),
    );
  });
  await shot('Describe visible litter without guessing a cause', 36, async () => {
    await click(button('Continue'));
    await click(button('Litter'));
    await page.getByLabel('Water clarity').selectOption('unsure');
    await page.getByLabel('Water movement').selectOption('steady');
    await frame('03-observation');
  });
  await shot('Keep the note and uncertainty', 45, async () => {
    await click(button('Continue'));
    await type(page.getByRole('textbox', { name: 'Your field note' }), note);
    await page.getByLabel('How certain are you about what you observed?').selectOption('unsure');
  });
  await shot('Review and submit the observation', 57, async () => {
    await click(button('Continue'));
    await frame('04-review-summary');
    await waitTo(61);
    await click(button('Submit observation'));
    await expect(page.getByRole('status')).toContainText('Observation recorded');
  });
  await shot('Open the explained evidence', 64, async () => {
    await click(button('Observations'));
    await page
      .getByPlaceholder('Search observations, places, people…')
      .fill('Demo observation: bottles');
    await click(page.locator('.observation-row'));
    await expect(page.getByRole('heading', { name: 'Litter', exact: true })).toBeVisible();
    await frame('05-evidence');
  });
  await shot('Read the priority factors', 78, async () => {
    await page.locator('.reason-list').scrollIntoViewIfNeeded();
    await frame('06-reasons');
  });
  await shot('Connect environment, animals, and people', 90, async () => {
    await page.locator('.one-health-cards').scrollIntoViewIfNeeded();
    await frame('07-one-health');
  });
  await shot('Build a two-hour field plan', 100, async () => {
    await click(button('Close dialog'));
    await click(button('Field planner'));
    await expect(button('Assign this plan')).toBeEnabled();
    await frame('08-plan-120');
  });
  await shot('Compare a smaller budget', 110, async () => {
    await click(button('1 hour'));
    await expect(page.getByText('60 minutes', { exact: true })).toBeVisible();
    await expect(button('Assign this plan')).toBeEnabled();
  });
  await shot('Return to 120 minutes and three visits', 118, async () => {
    await click(button('2 hours'));
    await expect(page.getByText('120 minutes', { exact: true })).toBeVisible();
    await expect(page.locator('.plan-items .plan-item')).toHaveCount(3);
    await frame('09-three-visits');
  });
  await shot('Show the explicitly deferred work', 126, async () => {
    await page.locator('.deferred-panel').scrollIntoViewIfNeeded();
    await frame('10-deferred');
  });
  await shot('Commit the plan to tracked responsibilities', 134, async () => {
    await click(button('Assign this plan'));
    await expect(page.getByRole('heading', { name: 'A next step with an owner' })).toBeVisible();
    await frame('11-assigned-tasks');
  });
  await shot('Record the human review', 140, async () => {
    await click(page.locator('.task-list-row').filter({ hasText: 'Riverside playground' }));
    await click(button(/Response & recheck/, false));
    await type(
      page.getByRole('textbox', { name: 'Coordinator’s decision note' }),
      'Demo scenario: visual litter report reviewed. Coordinate a safe response under local procedures.',
    );
    await click(button('Mark as reviewed'));
    await expect(button('Mark action underway')).toBeVisible();
  });
  await shot('Complete the fictional verification task', 150, async () => {
    await click(button('Start task'));
    await type(
      page.getByRole('textbox', { name: 'What did you find?' }),
      'Demo verification: visible litter confirmed from the public path. No entry to the water and no materials handled.',
    );
    await click(button('Complete task'));
  });
  await shot('Record the action and show the recheck gate', 160, async () => {
    await type(
      page.getByRole('textbox', { name: 'Coordinator’s decision note' }),
      'Demo scenario: a qualified response has been coordinated. A fresh recheck is required before closure.',
    );
    await click(button('Mark action underway'));
    await expect(button('Resolve after recheck')).toBeDisabled();
    await frame('12-recheck-gate');
  });
  await shot('Assign and complete a follow-up recheck', 168, async () => {
    await page.getByLabel('Type of work').selectOption('recheck');
    await click(button('Create task'));
    await click(button('Start task'));
    await type(
      page.getByRole('textbox', { name: 'What did you find?' }),
      'Demo recheck: visible litter is no longer present in this fictional scenario. Water quality and contact safety remain unknown.',
    );
    await click(button('Complete task'));
  });
  await shot('Resolve with documented follow-up evidence', 180, async () => {
    await type(
      page.getByRole('textbox', { name: 'Coordinator’s decision note' }),
      'Demo closure: the completed recheck records changed visible conditions. This does not certify water safety.',
    );
    await click(button('Resolve after recheck'));
    await expect(page.getByRole('heading', { name: 'A documented loop, closed.' })).toBeVisible();
    await frame('13-loop-closed');
  });
  await shot('Inspect the connected audit trail', 190, async () => {
    await click(button('Decision trail'));
    await frame('14-decision-trail');
  });
  await shot('Export actual environmental evidence', 199, async () => {
    await click(button('Close dialog'));
    await click(button('Impact & evidence'));
    await click(button(/Data & interoperability/, false));
    await click(button(/FHIR R4 Experimental environmental mapping/, false));
    await frame('15-export');
    await waitTo(206);
    const pending = page.waitForEvent('download');
    await click(page.getByRole('link', { name: 'Download FHIR bundle' }));
    const download = await pending;
    exportedBundle = join(output, 'demo-fhir-bundle.json');
    await download.saveAs(exportedBundle);
    const bundle = JSON.parse(await readFile(exportedBundle, 'utf8'));
    if (
      bundle.resourceType !== 'Bundle' ||
      bundle.entry.some((entry) => entry.resource.resourceType === 'Patient')
    )
      throw new Error('Unexpected environmental export content');
  });
  await shot('Show completed follow-through in the workspace', 213, async () => {
    await click(button(/The full picture/, false));
    await page
      .getByRole('heading', { name: 'Progress you can account for' })
      .scrollIntoViewIfNeeded();
    await expect(page.getByText('Loops closed', { exact: true })).toBeVisible();
    await frame('16-follow-through');
  });
  await shot('Proposed pilot and creator credit', 222, async () => {
    await page.goto(pathToFileURL(join(output, 'end-card.html')).href);
    await frame('17-end-card');
  });
  await waitTo(totalSeconds);
  if (exceptions.length) throw new Error(`Browser exceptions: ${exceptions.join('; ')}`);
  // Capture resulting state independently from the recorded interface for reproducible verification.
  const proof = await context.request.get(`${origin}/api/workspace`);
  const workspace = await proof.json();
  const report = workspace.observations.find((observation) => observation.notes === note);
  if (!report || report.status !== 'resolved')
    throw new Error('The demonstrated report was not truly resolved.');
  const tasks = workspace.tasks.filter((task) => task.observationId === report.id);
  if (tasks.filter((task) => task.status === 'completed').length !== 2)
    throw new Error('Both demonstrated verification and recheck must be completed.');
  await writeFile(
    join(output, rehearsal ? 'rehearsal-proof.json' : 'recording-proof.json'),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        origin,
        synthetic: true,
        observationId: report.id,
        status: report.status,
        tasks: tasks.map(({ id, kind, status, result }) => ({ id, kind, status, result })),
        ...(rehearsal ? {} : { bundle: 'demo-fhir-bundle.json' }),
        browserErrors: exceptions,
      },
      null,
      2,
    ),
  );
  const deletion = await context.request.delete(`${origin}/api/account`, {
    headers: { Origin: origin },
    data: {},
  });
  if (!deletion.ok()) throw new Error('Could not remove the temporary demonstration workspace.');
  const video = page.video();
  await page.close();
  await context.close();
  if (rehearsal) {
    console.log(
      'Rehearsal passed: real submit → plan → task → review/action → recheck → resolved → export.',
    );
    await browser.close();
    process.exit(0);
  }
  const rawPath = await video.path();
  await writeFile(
    join(output, 'timing.json'),
    JSON.stringify(
      {
        origin,
        width: 1440,
        height: 900,
        durationSeconds: totalSeconds,
        videoLeadSeconds: leadSeconds,
        rawPath,
        scenes: timings,
        captions: scenes.map(([start, end, title, caption]) => ({ start, end, title, caption })),
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(`Recorded genuine UI footage: ${rawPath}`);
  console.log('Run node scripts/video/render-demo.mjs to produce the final MP4 files.');
} catch (error) {
  await page.screenshot({ path: join(frames, 'failure.png') }).catch(() => {});
  await writeFile(join(output, 'failure.txt'), String(error));
  await context.close();
  await browser.close();
  throw error;
}
