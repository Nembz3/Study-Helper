# Changelog

## 3.8.0
- Reworked Seneca activity detection around control groups and their smallest useful card container.
- Improved multiple-choice detection, including radio/button-style choices.
- Added proper multi-gap/text-input detection instead of assuming a single input.
- Added stronger filtering for Seneca navigation, toolbar and page chrome.
- Improved question extraction when text is split across multiple elements.
- Added image, canvas and SVG detection.
- Added a tab-screenshot fallback for visual questions so graphs/diagrams can still reach the AI when an image cannot be fetched directly.
- Added extension-context lifecycle handling to stop stale content scripts cleanly after an extension reload.
- Updated the default Groq model to `openai/gpt-oss-20b`.
- Kept diagnostic logging for detection, visual capture, analysis and provider failures.
