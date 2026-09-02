# Changelog

## 4.0.0 — Detection & Vision Reliability

### Fixed
- Fixed a major control-classification bug where radio and checkbox inputs could be treated as text fields.
- Improved multiple-choice detection for native radio buttons, checkbox/switch activities, ARIA options and common Seneca answer data attributes.
- Improved answer-label extraction using `aria-labelledby`, associated `<label>` elements and accessible option text.
- Improved gap-fill detection for text, number, telephone, URL, email, textarea and contenteditable fields.
- Kept question extraction independent from the answer control subtree so inline gap-fill sentences are not discarded.
- Added tighter visual-question screenshot cropping so the AI receives the question card rather than the whole browser viewport.
- Added `activeTab` permission to improve Chromium screenshot compatibility.
- Added automatic migration away from retired Gemini 2.0 model IDs.
- Added protection against sending visual questions to text-only Groq models; vision requests can fall through to a configured multimodal provider instead.
- Updated the default Gemini model to stable `gemini-3.6-flash`.

### Diagnostics
- Logs now record model migrations and vision-provider skips.
- Existing detection, visual capture, retry and provider failure logging remains enabled.

### Safety
- Study Helper remains assistive: it does not click answers, type into Seneca fields, reveal answers, continue lessons or submit homework.

## 3.9.0 — Detection Reliability Overhaul

### Fixed
- Reworked activity detection to reduce false positives from Seneca navigation, toolbars and unrelated page controls.
- Improved multiple-choice detection using control role, geometry, size similarity and grouping rather than proximity alone.
- Added stronger support for radio, checkbox, switch and button-style answer controls.
- Fixed a major gap-fill detection weakness where question text lived in the same DOM subtree as an input and was previously discarded.
- Added support for multiple text gaps and textbox/contenteditable variants.
- Added native `<select>` activity handling.
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
