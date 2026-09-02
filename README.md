# Study Helper

A Microsoft Edge extension that detects questions on Seneca Learning and provides optional AI-powered hints, explanations and answers.

## Current version: 3.9.0

### What's new in 3.9
- Reworked activity detection to isolate the real Seneca question card before analysing it.
- More reliable multiple-choice detection for button, radio and checkbox-style answers.
- Better grouping of answer controls using position and size similarity.
- Fixed gap-fill detection where inputs and the question text share the same DOM subtree.
- Added support for multiple text gaps, textboxes, contenteditable fields and native selects.
- Improved extraction of questions split across several elements or lines.
- Stronger filtering of Seneca navigation, toolbar controls and unrelated page inputs.
- Added confidence scoring so weak detections are less likely to appear.
- Improved image, graph, diagram, SVG and canvas detection.
- Keeps the visible-tab screenshot fallback for difficult visual questions.
- Hardened handling of stale extension contexts after an extension reload.
- Improved diagnostic logging for detection evidence and visual capture.

### AI providers
Study Helper supports:
1. Groq
2. Gemini
3. OpenRouter

Provider fallback is automatic when a configured provider fails. For visual questions, use a vision-capable model with your chosen provider.

### Diagnostics
Open the extension popup and expand **Diagnostics & Logging**. You can:
- See how many events have been logged.
- Export logs as `study-helper-logs.json`.
- Clear the diagnostic log.

Logs include detection events, panel actions, visual capture, AI request status, provider errors/retries and successful responses. API keys are never logged.

### Important behaviour
Study Helper provides assistance but keeps control of the actual Seneca work with the user. It does not click answer choices, type into homework fields, reveal answers, continue lessons or submit work.

## Install / update on Microsoft Edge
1. Download or clone this repository.
2. Open `edge://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the project folder.
5. After an update, click the extension's reload button, close the old Seneca tab and open Seneca again.

## AI setup
Open the extension popup and add at least one provider API key and model name. Configure a second provider if you want fallback coverage.

## Automatic updates
If you use the included `update.bat`, it now looks for Git in common Windows installation locations instead of requiring Git to already be on PATH. The first run connects the folder to the repository; later runs fetch and reset to the latest `main` version.

## Rapid Mode
Enable **Rapid Mode** to automatically request an answer when a new question is detected.
