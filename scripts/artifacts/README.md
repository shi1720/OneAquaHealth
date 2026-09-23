# Rill presentation assets

The eight-slide pitch and four-page product brief use the app's forest, cream, lime and muted-orange palette. Native PowerPoint text remains editable. Sources appear in slide speaker notes and in the brief's linked references. Financial figures are labelled hypotheses.

## Inputs

- `docs/submission.md` and `docs/research/product-research.md` provide the narrative and sources.
- `output/assets/workflow.png` is a genuine app screenshot of the observation list and review statuses.
- `output/assets/planner.png` is a genuine app screenshot of a 120-minute fieldwork plan.
- `prepare-screenshots.py` crops these captures into `workflow-slide.png` and `planner-slide.png` for legibility; it checks source dimensions and does not redraw or alter interface contents.
- Use an isolated synthetic demo workspace for screenshots. Do not include personal credentials or pretend a screenshot proves field validation.
- The deck uses **Caladea** for display headings and **Noto Sans** for body text. Install these fonts to preserve the intended appearance while editing. The PDF embeds the rendered fonts.

## Runtime

The builders use the Codex bundled runtime. In a fresh Codex task, resolve it with `load_workspace_dependencies`, read the PDF and Presentations skills, and run their required artifact-operation markers once immediately before authoring.

The commands below use the runtime path for the machine where these files were created. Override `RILL_RUNTIME` and `RILL_PRESENTATIONS_SKILL` when the bundled paths change. Do not install replacement slide libraries or use the user's desktop LibreOffice.

```sh
export RILL_RUNTIME='/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies'
export RILL_PRESENTATIONS_SKILL='/Users/shivamgupta/.codex/plugins/cache/openai-primary-runtime/presentations/26.904.11930/skills/presentations'
"$RILL_RUNTIME/python/bin/python3" scripts/artifacts/prepare-screenshots.py
"$RILL_RUNTIME/node/bin/node" scripts/artifacts/build-deck.mjs
"$RILL_RUNTIME/python/bin/python3" scripts/artifacts/export-deck-pdf.py output/presentation/rill-pitch-v1.1.0.pptx
"$RILL_RUNTIME/python/bin/python3" scripts/artifacts/build-brief.py --require-screenshots
```

The deck finalizer refuses to overwrite an existing final deck. The default revision is `v1.1.0`. Use `RILL_ARTIFACT_REVISION=v1.1.1` (or a new revision) for the deck after edits; pass the corresponding PPTX to the PDF exporter. Use `--output output/pdf/rill-product-brief-v1.1.1.pdf` for a revised brief. `RILL_DRAFT_ONLY=1` allows missing-screenshot draft layouts, but never deliver those drafts. Release builds fail when either required screenshot is absent.

## Review

1. Check the final eight-slide count and four-page brief count.
2. Check slide text against the final app. Remove claims about any unfinished functionality.
3. Render the PDFs with the bundled Poppler binary and inspect **every** page at full size.
4. Inspect the native PPTX text and sources in its speaker notes. The finalizer checks package integrity, dimensions and editability-related requirements.
5. Verify that no draft screenshot placeholders remain and that synthetic-data disclosures are visible.

```sh
"$RILL_RUNTIME/bin/override/pdftoppm" -scale-to 1600 -png output/pdf/rill-pitch-v1.1.0.pdf tmp/artifacts/deck-review
"$RILL_RUNTIME/bin/override/pdftoppm" -scale-to 1300 -png output/pdf/rill-product-brief-v1.1.0.pdf tmp/artifacts/brief-review
```

Use only this bundled LibreOffice path for conversion:

`/Users/shivamgupta/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override/soffice`

The Artifact Tool preview renderer on this runtime substitutes the Caladea display font. Native PPTX font declarations are correct, and the bundled LibreOffice PDF renders Caladea correctly. Use the PDF render for typography review. Do not claim to have checked the files in Microsoft PowerPoint unless you actually opened them there.

## Final outputs

- `output/presentation/rill-pitch-v1.1.0.pptx`: editable eight-slide pitch.
- `output/pdf/rill-pitch-v1.1.0.pdf`: eight-page pitch export.
- `output/pdf/rill-product-brief-v1.1.0.pdf`: four-page submission brief.

`tmp/artifacts` contains private drafts, layout previews and finalizer receipts. These are not submission deliverables.
