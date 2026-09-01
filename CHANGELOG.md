# Changelog

## 3.7.0 — Visual Questions & Detection Reliability

### Fixed
- Improved Seneca question detection for text-entry questions, including cards with only one answer input.
- Expanded question extraction so multi-line and split question text is combined instead of stopping at the first visible fragment.
- Reduced false detections from Seneca navigation, toolbar controls and page chrome.
- Made scanning faster and more responsive when questions change or the page is resized/scrolled.
- Added a stronger confirmation pass before showing the helper panel.
- Improved handling of graph, chart, diagram and image-based questions.

### Added
- Visual detection for questions containing images and graphs.
- Automatic conversion of same-page images/canvas content into AI-readable image data where possible.
- Vision-aware prompts for Gemini and OpenAI-compatible providers.
- Diagnostic event logging for detection, panel actions, AI requests, provider failures/retries and successful responses.
- Log viewer controls in the popup: refresh, export and clear.
- Explicit empty-response handling so a blank provider response is treated as a failure and fallback/retry can run.

### Safety / behaviour
- Study Helper still does not click answers, type into Seneca fields, reveal answers, continue lessons or submit work.
- API keys are never written to diagnostic logs.

## 3.6.0 — Text Input Detection Fix
- Fixed a major detection gap where questions with a single text input were rejected because the detector required at least two answer controls.
- Text inputs are now recognised even when they only expose placeholder text such as “Type your answer here…”.
- Added dedicated single-input activity handling for Seneca free-response questions.
- Detection confirmation now accepts valid text-input questions without requiring two options.
- Improved control discovery to include textarea and contenteditable answer fields.
- Text-input activities now use the same nearby-question extraction system as multiple-choice questions.
- Increased candidate container depth and relaxed false assumptions about answer-control counts.

## 3.5.9 — Full Question Detection & Logging Update
- Improved detection of the complete question text instead of truncating questions to short fragments.
- Improved answer-control clustering so real answer options are preferred over unrelated page controls.
- Added filtering for Seneca toolbar actions and unrelated controls such as reporting, reading text, topic notes and toolbar collapse actions.
- Improved nearby-question extraction around answer groups.
- Reduced inconsistent detection caused by dynamic page rendering and changing DOM wrappers.
- Preserved support for choice, multi-select, ordering, text input and dropdown activities.
- Added clearer repository development logging policy.

## 3.5.3 — Detection Stability Repair
- Repaired question-line extraction edge cases.
- Reduced reliance on large nested container text.
- Added a safer fallback for question text extraction.
- Reworked render confirmation so small DOM changes do not repeatedly reset detection.
- Faster observer and polling checks for dynamically rendered activities.

## 3.5.2 — Detection Consistency
- Improved render timing and question detection consistency.

## 3.5.1 — Active Question Isolation Fix
- Replaced broad ancestor scoring with tight answer-control cluster detection.
- Detects groups of nearby answer controls before choosing a question container.
- Extracts the question from text immediately above the answer group.
- Strongly prefers the smallest valid interactive card instead of page/course wrappers.
- Ignores learning-mode cards, navigation controls, completed-question sections and “scroll down” controls.
- Reduces the chance of combining multiple Seneca questions into one AI request.

## 3.5.0 — Universal Activity Detection & Token Optimisation
- Rebuilt activity detection around interactive controls instead of broad page text.
- Added explicit multi-select and toggle activity classification.
- Added compact activity extraction: type, question, options and instruction.
- Added support for choice, multi-select, text input, dropdown, matching and ordering activities.
- Reduced candidate text limits to avoid sending course/navigation content.
- Added stable activity fingerprints based on type + question + options.
- Improved duplicate suppression for DOM re-renders and MutationObserver noise.
- Reduced output token caps by mode.
- Prompts now send only compact activity data instead of large page containers.
- Improved ordering instructions so exact answer order can be returned clearly.
