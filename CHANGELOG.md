# Changelog

## 3.3.0 — High-Confidence Rapid Mode
- Fixed Rapid Mode false positives that could analyse course pages, progress screens and completion screens
- Added interactive-answer detection before a question can trigger AI
- Added confidence scoring for detected activities
- Added a blacklist for common non-question Seneca screens
- Removed generic "Continue" detection
- Added stable-question confirmation before detection is mounted
- Added a session-level Rapid Mode analysed set so the same question cannot spend tokens twice
- Increased scan spacing to reduce unnecessary page processing

## 3.2.0 — Rapid Assist
- Added automatic one-time analysis for each newly detected question
- Added per-session caching to reduce duplicate API requests
- Reduced question context size to save tokens
- Added shorter prompts and response limits
- Added Quick Answer mode
- Added Copy Answer support for written responses
- Updated the default Groq model setting
- Improved duplicate-question handling

## 3.1.0
- Fixed stale question detection logic
- Improved updater reliability

## 3.0.0
- Added automatic on-page question detection and Rapid Mode
