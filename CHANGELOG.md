# Changelog

## 3.1.0
- Fixed stale question detection logic
- Ignore the extension's own overlay during page scanning
- Prevent a closed panel from immediately reappearing for the same question
- Added safer handling when a question changes during an AI request
- Reduced unnecessary scans
- Improved ZIP-to-Git updater setup
- Replaced destructive updater reset with safer fast-forward updates
- Synced extension manifest version with V3.1

## 3.0.0
- Added automatic on-page question detection for Seneca pages
- Added floating rapid-help panel
- Added optional Rapid Mode auto-analysis
- Added background AI request handling for page overlays
- Added DOM monitoring for changing question cards
- Kept answer selection, typing and submission under user control

## 2.0.0
- Added Groq, Gemini and OpenRouter provider support
- Added automatic provider fallback
- Added recent-question history
- Improved Edge extension interface
- Added local API-key storage
- Added batch update helper