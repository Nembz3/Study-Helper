# Changelog

## 3.9.0 — Detection Reliability Overhaul

### Fixed
- Reworked activity detection to reduce false positives from Seneca navigation, toolbars and unrelated page controls.
- Improved multiple-choice detection using control role, geometry, size similarity and grouping rather than proximity alone.
- Added stronger support for radio, checkbox, switch and button-style answer controls.
- Fixed a major gap-fill weakness where question text lived in the same DOM subtree as an input and was previously discarded.
- Added support for multiple text gaps and textbox/contenteditable variants.
- Added native select activity handling.
- Improved question extraction from split text, line-based text and question fragments immediately above answer controls.
- Added stronger confidence scoring before an activity is shown.
- Improved visual detection for images, canvas, SVG and graph/diagram wording.
- Preserved screenshot fallback for visual questions when direct image extraction is unavailable.
- Hardened the extension-context lifecycle so stale content scripts stop cleanly after an extension reload.

### Diagnostics
- Detection logs now include control count, detected type, option count and confidence evidence.
- Visual capture success/failure remains logged without recording API keys.

## 3.8.0 — Seneca Detection & Visual Support
- Reworked Seneca activity detection around control groups and their smallest useful card container.
- Improved multiple-choice detection, including radio/button-style choices.
- Added proper multi-gap/text-input detection instead of assuming a single input.
- Added stronger filtering for Seneca navigation, toolbar and page chrome.
- Improved question extraction when text is split across multiple elements.
- Added image, canvas and SVG detection.
- Added tab-screenshot fallback for visual questions.
- Added extension-context lifecycle handling.
- Updated the default Groq model to `openai/gpt-oss-20b`.
- Kept diagnostic logging for detection, visual capture, analysis and provider failures.
