import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(process.env.RILL_WORKSPACE || process.cwd());
const RUNTIME =
  process.env.RILL_RUNTIME ||
  '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const SKILL =
  process.env.RILL_PRESENTATIONS_SKILL ||
  '/Users/shivamgupta/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations';
const BUILD = path.join(ROOT, 'tmp', 'artifacts');
const OUTPUT = path.join(ROOT, 'output', 'presentation');
const ASSETS = path.join(ROOT, 'output', 'assets');
const SUFFIX = process.env.RILL_ARTIFACT_REVISION || 'v1.1.0';
const FINAL_STEM = SUFFIX === 'final' ? 'rill-pitch' : `rill-pitch-${SUFFIX}`;
const PREVIEW = process.env.RILL_DRAFT_ONLY === '1';
const FONTS = ['Noto Sans', 'Caladea'];
process.env.RUNTIME_NODE = path.join(RUNTIME, 'node/bin/node');
process.env.RUNTIME_NODE_MODULES = path.join(RUNTIME, 'node/node_modules');
process.env.RUNTIME_PYTHON = path.join(RUNTIME, 'python/bin/python3');
process.env.RUNTIME_BIN_DIR = path.join(RUNTIME, 'bin/override');

await fs.mkdir(BUILD, { recursive: true });
await fs.mkdir(OUTPUT, { recursive: true });
await fs.mkdir(ASSETS, { recursive: true });
const { Presentation, PresentationFile } = await import(
  pathToFileURL(path.join(RUNTIME, 'node/node_modules/@oai/artifact-tool/dist/artifact_tool.mjs'))
);
const { resolvePresentationFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL, 'container_tools/artifact_tool_utils.mjs'))
);
for (const font of FONTS) resolvePresentationFont({ fontFamily: font });

const C = {
  forest: '#214b3c',
  cream: '#f5f6f1',
  lime: '#ddecad',
  orange: '#c88b56',
  muted: '#667369',
  pale: '#b8c9bf',
};
const deck = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const slides = [];

function text(slide, value, x, y, w, h, size = 28, opts = {}) {
  const shape = slide.shapes.add({
    geometry: 'textbox',
    position: { left: x, top: y, width: w, height: h },
    fill: 'none',
    line: { fill: 'none', width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: opts.serif ? 'Caladea' : 'Noto Sans',
    fontSize: size,
    color: opts.color || C.forest,
    bold: opts.bold || false,
    autoFit: 'none',
    ...opts.style,
  };
  return shape;
}
function slide(dark = false) {
  const s = deck.slides.add();
  s.background.fill = dark ? C.forest : C.cream;
  slides.push(s);
  text(s, 'Rill', 60, 32, 150, 30, 21, { bold: true, color: dark ? C.lime : C.forest });
  text(s, String(slides.length).padStart(2, '0'), 1150, 654, 70, 26, 17, {
    color: dark ? C.pale : C.muted,
  });
  return s;
}
function notes(s, value) {
  s.speakerNotes.textFrame.setText(value);
}
async function screenshot(s, filename, frame, alt) {
  const file = path.join(ASSETS, filename);
  try {
    const bytes = await fs.readFile(file);
    s.images.add({
      blob: new Uint8Array(bytes),
      contentType: 'image/png',
      alt,
      fit: 'contain',
      position: frame,
    });
  } catch (error) {
    if (!PREVIEW) throw new Error(`Required genuine app screenshot missing: ${file}`);
    text(s, 'Product demonstration', frame.left, frame.top + 95, frame.width, 90, 46, {
      serif: true,
    });
    text(
      s,
      'Screenshot will be inserted after the app build.',
      frame.left,
      frame.top + 190,
      frame.width - 50,
      80,
      24,
      { color: C.muted },
    );
  }
}

{
  const s = slide(true);
  text(s, 'A stream concern.\nTwo hours to act.', 60, 134, 1160, 250, 88, {
    serif: true,
    color: C.cream,
  });
  text(
    s,
    'Rill helps a monitoring team choose its next useful check\nand track what happens afterwards.',
    64,
    438,
    1090,
    100,
    29,
    { color: C.lime },
  );
  text(s, 'Shivam Gupta · Project creator', 64, 608, 850, 36, 23, { color: C.cream });
  notes(
    s,
    'OneAquaHealth IEEE Global Hackathon. Primary Track 2: Data-to-Insight. Rill is a software demonstration. No customer, field validation, or ecological impact is claimed. Creator: Shivam Gupta.',
  );
}
{
  const s = slide();
  text(s, 'The work after a report', 60, 96, 1140, 84, 58, { serif: true });
  text(s, 'Existing tools', 64, 225, 500, 46, 25, { bold: true });
  text(s, 'Citizen observations\nCity dashboards\nRehabilitation guidance', 64, 292, 515, 205, 33);
  text(s, 'The Rill decision', 684, 225, 500, 46, 25, { bold: true });
  text(
    s,
    'Which check comes next?\nWho owns the response?\nWhat did the recheck find?',
    684,
    292,
    535,
    205,
    33,
  );
  text(
    s,
    'OneAquaHealth already offers collection and decision tools. Rill focuses on the fieldwork decision that follows.',
    64,
    563,
    1100,
    74,
    23,
    { color: C.muted },
  );
  text(s, 'Source: oneaquahealth.eu/project-solutions', 64, 666, 1050, 24, 14, { color: C.muted });
  notes(
    s,
    'Source: OneAquaHealth, Project Solutions, accessed 23 September 2026. https://www.oneaquahealth.eu/project-solutions/ . The site lists the Citizen Science App, City Dashboards, Resilience Map, GEOSSIP, and Decision Support System. Competitive context: Cartographer already offers monitoring, QA, and confirmation workflows, https://cartographer.io/ and https://help.cartographer.io/riverfly/recording-a-sample . No worldwide novelty claim.',
  );
}
{
  const s = slide();
  text(s, 'A concern with a visible next step', 60, 92, 1150, 77, 52, { serif: true });
  await screenshot(
    s,
    'workflow-slide.png',
    { left: 60, top: 193, width: 890, height: 450 },
    'Actual Rill observations list, cropped for readability, in a synthetic demonstration workspace',
  );
  text(s, 'Observe', 982, 218, 248, 46, 29, { bold: true });
  text(s, 'Describe the evidence\nand uncertainty.', 982, 270, 248, 100, 23);
  text(s, 'Review', 982, 384, 248, 46, 29, { bold: true });
  text(s, 'Record a human\ndecision and recheck.', 982, 436, 248, 115, 23);
  text(s, 'Synthetic demonstration scenario', 60, 655, 900, 27, 17, { color: C.muted });
  notes(
    s,
    'Screenshot shows the actual Rill application using synthetic seed data. Workflow includes structured observations, distinct evidence and priority labels, coordinator review, tasks, results, and recheck tasks. The demonstration does not constitute environmental findings or fieldwork.',
  );
}
{
  const s = slide();
  text(s, 'The next two hours', 60, 92, 1140, 77, 58, { serif: true });
  await screenshot(
    s,
    'planner-slide.png',
    { left: 60, top: 183, width: 880, height: 463 },
    'Actual Rill planner, cropped to its three selected visits for a 120-minute synthetic scenario',
  );
  text(s, '120', 971, 207, 269, 130, 94, { serif: true });
  text(s, 'minutes available', 981, 343, 251, 46, 22);
  text(
    s,
    'Three visits selected\nEvery choice explained\nOther sites deferred',
    982,
    430,
    265,
    139,
    24,
  );
  text(
    s,
    'Synthetic scenario. Estimates support planning, not optimal walking routes.',
    60,
    653,
    1070,
    38,
    17,
    { color: C.muted },
  );
  notes(
    s,
    'Rill selects verification work within a requested time budget using versioned deterministic rules. Task durations are estimates. Serious signs and unsafe conditions block ordinary volunteer dispatch and require human handling. Priority is an operational heuristic, not a calibrated hazard probability. Scenario and observations are synthetic.',
  );
}
{
  const s = slide(true);
  text(s, 'One Health, with honest uncertainty', 60, 93, 1130, 90, 54, {
    serif: true,
    color: C.cream,
  });
  text(s, 'Habitat', 64, 240, 330, 52, 35, { color: C.lime });
  text(s, 'What changed\nin the stream?', 64, 308, 330, 118, 32, { color: C.cream });
  text(s, 'Animals', 475, 240, 330, 52, 35, { color: C.lime });
  text(s, 'Where could wildlife\nor pets encounter it?', 475, 308, 350, 118, 32, {
    color: C.cream,
  });
  text(s, 'People', 897, 240, 320, 52, 35, { color: C.lime });
  text(s, 'How do people\nuse this place?', 897, 308, 320, 118, 32, { color: C.cream });
  text(
    s,
    'Visual signs justify investigation. Testing and qualified judgment establish what they mean.',
    64,
    507,
    1130,
    84,
    28,
    { color: C.cream },
  );
  text(
    s,
    'Public-bank checks only. Follow local advice and access restrictions.',
    64,
    628,
    1080,
    39,
    21,
    { color: C.pale },
  );
  text(s, 'Source: CDC · How to Recognize a Harmful Algal Bloom', 64, 674, 1050, 24, 14, {
    color: C.pale,
  });
  notes(
    s,
    'Source: CDC, How to Recognize a Harmful Algal Bloom, https://www.cdc.gov/harmful-algal-blooms/about/how-to-recognize-a-harmful-algal-bloom.html . Visual inspection cannot establish whether a bloom is harmful. Rill does not diagnose toxins or pathogens, declare safe swimming water, or infer disease probability. The One Health questions are investigation context rather than proof of causality.',
  );
}
{
  const s = slide();
  text(s, 'A working, inspectable system', 60, 95, 1160, 88, 56, { serif: true });
  const rows = [
    ['Access', 'Authenticated workspaces and coordinator / volunteer roles'],
    ['Evidence', 'Human review, historical decisions and a recheck gate'],
    ['Deployment', 'Cloud Run API with PostgreSQL on Cloud SQL'],
    ['Exchange', 'OAH directory, imports and environmental exports'],
  ];
  rows.forEach(([a, b], i) => {
    text(s, a, 64, 233 + i * 87, 245, 53, 27, { bold: true });
    text(s, b, 339, 235 + i * 87, 840, 70, 26);
  });
  text(s, 'Try rill-streams.web.app · No trained model or paid AI key.', 64, 621, 1090, 42, 24, {
    color: C.muted,
  });
  notes(
    s,
    'Implementation reference: docs/API-CONTRACT.md and the shipped Rill repository, https://github.com/shi1720/OneAquaHealth . Live directory imports provide site names and coordinates only, not water assessments or permission to access a location. CSV/JSON batch import validates records with explicit destination-site matching and preserves synthetic-data boundaries. Full JSON exports contain all retained audit events and historical review snapshots. The hosted origin https://rill-streams.web.app serves Firebase Hosting with a Cloud Run API and PostgreSQL on Cloud SQL. The hosted API lifecycle was verified. Version 1.1 local verification: SQLite and libSQL each passed 86 tests, with four PostgreSQL-only tests skipped in those runs; the dedicated PostgreSQL suite passed 53 tests. Current CI and browser evidence is recorded in docs/qa/verification.md. This is a pilot deployment, not production certification or a field-validated service. FHIR R4 Observation can reference Location: https://hl7.org/fhir/R4/observation.html . Export mapping is experimental and does not claim conformance to the evolving OAH IG. No fictional patients.',
  );
}
{
  const s = slide();
  text(s, 'The coordinator is the first customer', 60, 96, 1155, 84, 53, { serif: true });
  text(s, '€149', 64, 224, 535, 122, 88, { serif: true });
  text(s, 'per programme / month', 66, 350, 540, 44, 26);
  text(s, 'Proposed managed subscription\nVolunteers contribute free', 66, 411, 500, 90, 24);
  text(
    s,
    'Illustrative €50 delivery cost leaves\n€99 before fixed overhead.',
    66,
    507,
    550,
    72,
    21,
    { color: C.muted },
  );
  text(s, 'A value hypothesis', 710, 235, 485, 44, 28, { bold: true });
  text(
    s,
    '4 coordinator hours\n× €40 assumed hourly cost\n= €160 of monthly capacity',
    710,
    306,
    495,
    169,
    29,
  );
  text(
    s,
    'Pilot measures: time per report, assignment delay, completed rechecks, and safe coverage.',
    66,
    591,
    1120,
    60,
    21,
  );
  text(
    s,
    'Pricing and savings are assumptions. No customers or measured savings are claimed.',
    66,
    653,
    1075,
    40,
    17,
    { color: C.muted },
  );
  notes(
    s,
    'Business model hypothesis, not market validation. Illustrative buyer arithmetic: 4 hours/month × €40/hour = €160/month of coordinator capacity. Proposed subscription €149/month. Illustrative monthly delivery costs: allocated infrastructure €15 + support €30 (45 minutes at €40/hour) + operations €5 = €50. Revenue less these assumed costs = €99 before development, acquisition, taxes and other fixed overhead. These are budget assumptions, not actual costs or achieved margins. Sampling and remediation are excluded. Category evidence: Cartographer offers paid environmental-monitoring subscriptions and nonprofit pricing, https://cartographer.io/pricing . Pilot target organisations are prospective, not partners.',
  );
}
{
  const s = slide(true);
  text(s, 'A checked outcome\nfor every useful concern.', 60, 126, 1165, 218, 76, {
    serif: true,
    color: C.cream,
  });
  text(s, 'Seeking one monitoring programme\nfor a supervised pilot.', 64, 424, 1100, 103, 33, {
    color: C.lime,
  });
  text(s, 'Shivam Gupta · Project creator', 64, 580, 1040, 39, 23, { color: C.cream });
  text(s, 'rill-streams.web.app · github.com/shi1720/OneAquaHealth', 64, 634, 1030, 37, 21, {
    color: C.pale,
  });
  notes(
    s,
    'Pilot invitation is prospective and makes no partnership claim. Hosted app: https://rill-streams.web.app . Repository: https://github.com/shi1720/OneAquaHealth . Track 2: Data-to-Insight. Project creator Shivam Gupta. AI-assisted research, design, implementation, and documentation are disclosed in submission material.',
  );
}

const candidate = path.join(BUILD, `rill-pitch-${SUFFIX}-candidate.pptx`);
await (await PresentationFile.exportPptx(deck)).save(candidate);
const previewDir = path.join(BUILD, `slides-${SUFFIX}`);
await fs.mkdir(previewDir, { recursive: true });
for (let i = 0; i < slides.length; i++) {
  const img = await deck.export({ slide: slides[i], format: 'png', scale: 1.25 });
  await fs.writeFile(
    path.join(previewDir, `slide-${i + 1}.png`),
    new Uint8Array(await img.arrayBuffer()),
  );
}
if (!PREVIEW) {
  const final = path.join(OUTPUT, `${FINAL_STEM}.pptx`);
  const result = await finalizePresentation({
    workspaceDir: ROOT,
    candidatePath: candidate,
    finalPath: final,
    pythonExecutable: path.join(RUNTIME, 'python/bin/python3'),
    integrityValidatorPath: path.join(
      SKILL,
      'container_tools/inspect_presentation_package_integrity.py',
    ),
    layoutValidatorPath: path.join(
      SKILL,
      'container_tools/inspect_presentation_layout_geometry.py',
    ),
    layoutArgs: [
      '--expected-slide-size-emu',
      '12192000,6858000',
      '--validate-bullet-geometry',
      '--validate-heading-fit',
    ],
    explicitTotalSlideCount: 8,
    requiredNativeTableOwnerSlides: [],
    requiredNativeChartOwnerSlides: [],
    fontPolicy: { basis: 'design', families: FONTS },
    verifyArtifactToolImport: true,
    receiptPath: path.join(BUILD, `rill-pitch-${SUFFIX}.validation.json`),
  });
  console.log(JSON.stringify({ final, previewDir, result }, null, 2));
} else console.log(JSON.stringify({ candidate, previewDir, draftOnly: true }, null, 2));
