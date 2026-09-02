# Study Helper

Study Helper is a Microsoft Edge extension that detects learning activities on Seneca Learning and gives the student an AI hint, explanation or optional quick answer.

## What it supports

- Multiple-choice questions
- Radio/checkbox and ARIA option controls
- Single and multi-gap text inputs
- Textareas, contenteditable fields and native selects
- Ordering/drag-style activities
- Questions containing images, graphs, charts, diagrams and SVG/canvas visuals
- Screenshot fallback for visual questions when the page does not expose the image directly
- Local diagnostic logging with refresh, export and clear controls
- Multiple AI providers with automatic fallback and retry handling

## Current version

**V4.0.0**

## AI providers

1. **Groq** — fast primary provider for text questions. Recommended default: `openai/gpt-oss-20b`.
2. **Gemini** — multimodal fallback. Recommended default: `gemini-3.6-flash`.
3. **OpenRouter** — additional fallback; choose a model that supports vision if you want it to handle visual questions.

Study Helper automatically migrates retired Gemini 2.0 model IDs to current supported models. Visual requests are not sent to the text-only Groq model.

## Diagnostics

The extension keeps up to 500 local diagnostic events. Logs can include:

- detected activity type and question text
- control/option counts
- confidence evidence
- visual detection/capture status
- AI provider attempts, retries and failures
- model migrations
- UI events

API keys are never written to the diagnostic log.

## Safety / scope

Study Helper is intentionally an **assistive** tool. It does not automatically click answer choices, type answers into Seneca, reveal answers, continue lessons or submit homework.

## Installation

1. Download or clone this repository.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the Study Helper folder.
5. Open or refresh Seneca Learning.
6. Configure an AI provider in the extension popup.

After updating the extension, refresh any already-open Seneca tab so the new content script is loaded.

## Updating

If Git is installed, `update.bat` can synchronize a local checkout with the repository. It also searches common Git installation paths if Git is not available on the normal Windows PATH.
