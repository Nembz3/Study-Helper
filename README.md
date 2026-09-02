# Study Helper

A Microsoft Edge extension that detects questions on Seneca Learning and provides optional AI-powered hints, explanations and answers.

## Current version: 3.8.0

### What's new in 3.8
- Reworked detection around Seneca activity cards and grouped controls.
- More reliable multiple-choice detection, including radio/button-style choices.
- Proper detection of single and multiple gap-fill/text-input questions.
- Better handling of questions split across multiple page elements.
- Improved protection against detecting Seneca navigation and toolbar text.
- Better support for graph, chart, diagram and image-based questions.
- Added a visible-tab screenshot fallback for visual questions when direct image fetching fails.
- Visuals are captured when possible and supplied to compatible AI providers for analysis.
- Added protection against stale content scripts after an extension reload.
- Stronger empty-response handling with provider retry/fallback.
- Built-in diagnostic logging for troubleshooting detection and AI failures.

### AI providers
Study Helper supports:
1. Groq
2. Gemini
3. OpenRouter

Provider fallback is automatic when a configured provider fails. For visual questions, use a vision-capable model with Gemini/OpenRouter (or a compatible Groq vision model).

### Diagnostics
Open the extension popup and expand **Diagnostics & Logging**. You can:
- See how many events have been logged.
- Export logs as `study-helper-logs.json`.
- Clear the diagnostic log.

Logs include detection events, panel actions, AI request status, provider errors/retries and successful responses. API keys are never logged.

### Important behaviour
Study Helper provides assistance but keeps control of the actual Seneca work with the user. It does not click answer choices, type into homework fields, reveal answers, continue lessons or submit work.

## Install / update on Microsoft Edge
1. Download or clone this repository.
2. Open `edge://extensions`.
3. Turn on **Developer mode**.
4. Choose **Load unpacked** and select the project folder.
5. After an update, click the extension's reload button and refresh the Seneca tab.

## AI setup
Open the extension popup and add at least one provider API key and model name. Configure a second provider if you want fallback coverage.

## Rapid Mode
Enable **Rapid Mode** to automatically request an answer when a new question is detected.
