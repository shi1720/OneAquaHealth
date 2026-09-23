# Final artifact verification

Verified on 23 September 2026 from the final application captures.

| Artifact                              | Structure                                           |  Bytes | SHA-256                                                            |
| ------------------------------------- | --------------------------------------------------- | -----: | ------------------------------------------------------------------ |
| `output/presentation/rill-pitch.pptx` | 8 slides, 8 speaker-note parts, 87 native text runs | 161763 | `eb9a902771d679b1a7daa7e02914a8d87dd8f3bd1ce66bb542b7fad739f6261d` |
| `output/pdf/rill-pitch.pdf`           | 8 pages                                             | 257972 | `f091c6cf3a0e69cef53ebb09858b85f789d7ea0d5a2977f113f819800bf6d6bf` |
| `output/pdf/rill-product-brief.pdf`   | 4 pages                                             | 112929 | `772dcbde6a5a1d1500a61689382c1426824fde3ad5bb3f77f8f052f15185f6b0` |

## Checks performed

- Artifact Tool finalization passed package integrity, geometry, font policy and re-import checks, with zero findings or warnings. The deck uses native editable text with Caladea and Noto Sans font declarations. Screenshots are embedded raster images.
- Converted the final PPTX using the **bundled headless LibreOffice**, then rendered the final PDFs with bundled Poppler. Individually inspected all eight pitch slides and all four brief pages. No clipping, text overlap, missing characters, broken images or blank pages was observed. No native Microsoft PowerPoint execution was performed.
- Verified the PDF page counts, eight PowerPoint speaker-note parts, creator attribution and absence of draft screenshot placeholders.
- The workflow and planner images are crops of the real application captures. `prepare-screenshots.py` records exact crops and checks source dimensions; no interface content was repainted.
- The slides visibly label the demonstration as synthetic and the commercial figures as assumptions. Source URLs and implementation limitations are included in PowerPoint speaker notes; the brief has linked references. No deployment URL, customer, field validation, trained model or FHIR certification is claimed.
- `docs/demo-script.md` now points to the word-for-word narration matched to the actual 3:58 film. The film remains silent until Shivam records and mixes that narration.
- Prettier checks passed for the owned Markdown and JavaScript artifact sources.

Private finalizer receipts and page renders remain in ignored `tmp/artifacts`. Reproduction instructions are in this directory's README. Install Caladea and Noto Sans before editing the PPTX to preserve typography; the PDF is the stable viewing copy.
