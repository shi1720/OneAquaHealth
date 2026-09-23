# Final artifact verification

Verified on 23 September 2026 for release 1.1.0, using authentic application captures. Earlier unversioned files are retained as the 1.0 release artifacts; the versioned files below are the current deliverables.

| Artifact                                     | Structure                                           |  Bytes | SHA-256                                                            |
| -------------------------------------------- | --------------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `output/presentation/rill-pitch-v1.1.0.pptx` | 8 slides, 8 speaker-note parts, 89 native text runs | 162250 | `1b34c31b77fe778e5f36ae4181779a767003c384bf7c7e56bf863e76b8bf6b80` |
| `output/pdf/rill-pitch-v1.1.0.pdf`           | 8 pages                                             | 266217 | `bf276f449dd917ec1e451e347a02c1267b985a8b274547eb06490fee0d7b54c0` |
| `output/pdf/rill-product-brief-v1.1.0.pdf`   | 4 pages                                             | 113222 | `1d92c3c14726094d4478449de3147e5bbc8bb9a595855195acb4ef7231775200` |

## Checks performed

- Artifact Tool finalization passed package integrity, geometry, font policy and re-import checks, with zero findings or warnings. The deck uses native editable text with Caladea and Noto Sans font declarations. Screenshots are embedded raster images.
- Converted the final PPTX using bundled headless LibreOffice, then rendered the final PDFs with bundled Poppler. Individually inspected all eight pitch slides and all four brief pages at readable resolution. No clipping, text overlap, missing characters, broken images or blank pages was observed. No native Microsoft PowerPoint execution was performed.
- Checked PDF page counts, native PowerPoint text, eight speaker-note parts, creator attribution and the absence of em dash glyphs, draft screenshot placeholders or pending publication URLs in the final PDFs.
- Both PDFs include the verified hosted application URL, `https://rill-streams.web.app`. Architecture text describes Firebase Hosting, Cloud Run and PostgreSQL on Cloud SQL. Notes distinguish local software checks from field validation and do not claim that the new release's CI run has completed.
- Workflow and planner images are crops of actual application captures. `prepare-screenshots.py` records the crops and checks source dimensions; no interface content was repainted.
- The slides visibly label the demonstration as synthetic and the commercial figures as assumptions. Sources appear in PowerPoint speaker notes and linked brief references. No customer traction, scientific validation, trained assessment model or FHIR certification is claimed.
- The film uses OpenAI cedar synthetic narration, not Shivam Gupta's recorded voice. Final media verification is maintained separately in `output/video/VERIFICATION.md`; the presentation review does not certify the film or its publication.

Private finalizer receipts and rendered pages remain in ignored `tmp/artifacts`. Reproduction instructions are in this directory's README. Install Caladea and Noto Sans before editing the PPTX to preserve typography; the PDF is the stable viewing copy.
