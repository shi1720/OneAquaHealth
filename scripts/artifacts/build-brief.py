"""Build the four-page Rill product brief with ReportLab.

Uses genuine application screenshots when available. Pass --require-screenshots
for a release build. All financial figures are explicitly unvalidated assumptions.
"""
from __future__ import annotations

import argparse
import os
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.utils import ImageReader

ROOT = Path(os.environ.get('RILL_WORKSPACE', Path.cwd()))
RUNTIME = Path(os.environ.get('RILL_RUNTIME', '/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies'))
FONTS = RUNTIME / 'native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype'
for alias, filename in [('Sans', 'NotoSans-Regular.ttf'), ('SansBold', 'NotoSans-Bold.ttf'), ('Serif', 'Caladea-Regular.ttf'), ('SerifBold', 'Caladea-Bold.ttf')]:
    pdfmetrics.registerFont(TTFont(alias, str(FONTS / filename)))
pdfmetrics.registerFontFamily('Sans', normal='Sans', bold='SansBold', italic='Sans', boldItalic='SansBold')
pdfmetrics.registerFontFamily('Serif', normal='Serif', bold='SerifBold', italic='Serif', boldItalic='SerifBold')

P = argparse.ArgumentParser()
P.add_argument('--require-screenshots', action='store_true')
P.add_argument('--output', default='output/pdf/rill-product-brief-v1.1.0.pdf')
args = P.parse_args()
OUTPUT = ROOT / args.output
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
ASSETS = ROOT / 'output/assets'

W, H = 595.2756, 841.8898
M, R = 48, 547.2756
CW = R - M
C = {'forest':'#214b3c', 'cream':'#f5f6f1', 'lime':'#ddecad', 'orange':'#c88b56', 'muted':'#667369', 'pale':'#b8c9bf'}
cv = canvas.Canvas(str(OUTPUT), pagesize=(W,H))
cv.setTitle('Rill - The next useful check')
cv.setAuthor('Shivam Gupta')
cv.setSubject('OneAquaHealth Track 2 product brief and proposed pilot')

def color(value):
    return colors.HexColor(C.get(value, value))

def text(value, x, y, size=11, font='Sans', ink='forest'):
    cv.setFillColor(color(ink))
    cv.setFont(font, size)
    cv.drawString(x, H-y-size, value)

def para(value, x, y, w, size=11, leading=None, ink='forest', font='Sans'):
    style = ParagraphStyle('p', fontName=font, fontSize=size, leading=leading or size*1.45,
                           textColor=color(ink), alignment=TA_LEFT, spaceAfter=0,
                           allowWidows=0, allowOrphans=0)
    p = Paragraph(value, style)
    _, h = p.wrap(w, 1000)
    if y+h > 780:
        raise ValueError(f'Content overflows page: {value[:60]} at {y+h}')
    p.drawOn(cv,x,H-y-h)
    return y+h

def rule(y, ink='pale'):
    cv.setStrokeColor(color(ink))
    cv.setLineWidth(0.65)
    cv.line(M,H-y,R,H-y)

def page(n, title=None, dark=False):
    cv.setFillColor(color('forest' if dark else 'cream'))
    cv.rect(0,0,W,H,stroke=0,fill=1)
    text('Rill', M, 31, 15, 'SansBold', 'lime' if dark else 'forest')
    text('ONEAQUAHEALTH 2026', 350, 34, 8.5, 'Sans', 'pale' if dark else 'muted')
    text(f'{n:02d}', R-13, 794, 9, 'Sans', 'pale' if dark else 'muted')
    text('Shivam Gupta · Project creator', M, 794, 8.5, 'Sans', 'pale' if dark else 'muted')
    if title:
        para(title,M,82,CW,34,38,font='Serif')

def link(label, url, y, x=M, w=CW, ink='muted', size=8):
    return para(f'<a href="{url}" color="{C[ink]}">{label}</a>',x,y,w,size,size*1.35,ink)

def screenshot(filename, x, y, maxw, maxh):
    file = ASSETS / filename
    if not file.exists():
        if args.require_screenshots:
            raise FileNotFoundError(f'Actual app screenshot required: {file}')
        para('Product demonstration',x,y+70,maxw,26,32,font='Serif')
        para('A release build includes the actual application screen here.',x,y+117,maxw,11,16,ink='muted')
        return maxh
    img = ImageReader(str(file))
    iw,ih = img.getSize()
    scale = min(maxw/iw,maxh/ih)
    dw,dh = iw*scale,ih*scale
    cv.drawImage(img,x+(maxw-dw)/2,H-y-dh,width=dw,height=dh,mask='auto')
    return dh

# Page 1: the story and the scope.
page(1,dark=True)
text('THE FIELDWORK DECISION', M, 113, 10, 'SansBold', 'lime')
para('The next<br/>useful check.',M,158,CW,61,62,'cream','Serif')
para('A citizen reports a stream concern. A coordinator has two hours. Rill helps decide what to check next and keeps the follow-up visible.',M,321,472,17,24,'cream')
text('120',M,455,80,'Serif','lime')
text('minutes available',228,494,20,'Sans','cream')
para('The signature interaction: a reviewable fieldwork plan with reasons for each choice and explicit deferrals.',M,570,470,15,22,'cream')
para('Primary track: Data-to-Insight<br/>For river groups, citizen-science coordinators and research programmes.',M,665,470,11,17,'pale')
link('Try the hosted app: rill-streams.web.app','https://rill-streams.web.app',729,ink='lime',size=11)
cv.showPage()

# Page 2: app evidence plus loop.
page(2,'A visible path after Submit')
para('Rill joins observation, verification, human review and a dated recheck in one workspace.',M,170,CW,13,19)
screenshot('workflow-slide.png',M,222,CW,300)
text('Actual product screen. Synthetic demonstration observations.',M,529,8.5,'Sans','muted')
rule(554)
y=579
for number, heading, body in [
    ('01','A useful observation','Record place, time, visible signs and uncertainty. Preserve the source and notes.'),
    ('02','A responsible decision','Inspect evidence separately from priority. A coordinator reviews and assigns the work.'),
    ('03','A checked outcome','Record the task result, schedule a recheck and keep the conclusion accountable.'),
]:
    text(number,M,y,13,'SansBold','orange')
    text(heading,M+39,y-1,13,'SansBold')
    para(body,M+39,y+23,CW-39,10.5,15)
    y+=66
cv.showPage()

# Page 3: safety, decisions and interoperability.
page(3,'Evidence before confidence')
para('Concern, evidence strength and work priority answer different questions. Rill keeps the distinctions visible.',M,171,CW,13,19)
sections=[
    ('A transparent two-hour plan', 'Versioned deterministic rules choose eligible checks within available minutes and expose the reasons. Restricted sites or serious signs need expert handling. Priority describes work to verify, never contamination probability. Time allowances are estimates. The core needs no trained model or paid AI key.'),
    ('One Health with defined limits', 'Habitat change, animal contact and human use provide context. Appearance cannot establish pathogens or toxins. Citizen tasks stay on accessible public banks. Local advice and qualified judgment determine appropriate follow-up. [1]'),
    ('A usable, inspectable system', 'Firebase Hosting serves the interface; Cloud Run uses PostgreSQL on Cloud SQL. Authenticated workspaces separate coordinator and volunteer roles. Decisions retain the factors and rule version used at review. Resolution requires a completed recheck after action.'),
    ('Environmental data that can leave the app', 'The live OneAquaHealth directory provides names and coordinates only. CSV/JSON imports require explicit site matching. Export JSON, CSV, GeoJSON or experimental FHIR R4 with environmental locations and observations. No patient records or profile-certification claim. [2]'),
]
y=238
for heading,body in sections:
    text(heading,M,y,16,'SerifBold')
    y=para(body,M,y+32,CW,11,16)+29
rule(696)
link('[1] CDC: How to Recognize a Harmful Algal Bloom','https://www.cdc.gov/harmful-algal-blooms/about/how-to-recognize-a-harmful-algal-bloom.html',711)
link('[2] HL7: FHIR R4 Observation. OneAquaHealth maintains an evolving draft IG.','https://hl7.org/fhir/R4/observation.html',729)
link('Implementation and reproducible setup: github.com/shi1720/OneAquaHealth','https://github.com/shi1720/OneAquaHealth',747)
cv.showPage()

# Page 4: business hypothesis and validation plan.
page(4,'A pilot that can prove value')
para('The first buyer hypothesis is a coordinator running an existing river or catchment monitoring programme. Volunteers contribute free.',M,170,CW,13,19)
text('€149',M,247,49,'Serif')
text('proposed per programme / month',M+177,272,12,'Sans')
para('Managed coordination, hosting and support. Pricing has not been tested with customers.',M,316,CW,11,16,'muted')
rule(354)
text('The value and cost hypotheses',M,374,19,'SerifBold')
para('Buyer value: four hours saved at an assumed €40 per hour would free €160 of monthly capacity. Delivery budget: €15 infrastructure + €30 support (45 minutes at €40/hour) + €5 operations = €50 per month. At €149 revenue, €99 remains before development, sales, taxes and fixed overhead. These are assumptions, not measured savings or margins.',M,412,CW,10.5,15)
text('Eight weeks, alongside an existing programme',M,532,19,'SerifBold')
para('Agree local protocols and reviewer responsibilities. Measure coordinator time, assignment delay, documented rechecks and safe coverage against the existing process. Redesign if the extra tool creates more work than it removes.',M,570,CW,10.5,15)
para('<b>Current evidence:</b> a hosted application with a tested workflow and synthetic demonstration observations. No customer, pilot agreement, measured ecological benefit or field-validated prediction is claimed.',M,650,CW,10.5,15)
rule(716)
link('Category context: Cartographer sells environmental monitoring subscriptions.','https://cartographer.io/pricing',733)
link('Complementary ecosystem: OneAquaHealth project solutions.','https://www.oneaquahealth.eu/project-solutions/',751)
cv.showPage()
cv.save()
print(OUTPUT)
