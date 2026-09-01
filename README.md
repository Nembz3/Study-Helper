# Study Helper V3.3

Personal Microsoft Edge AI study helper with high-confidence question detection and token-saving AI assistance.

## V3.3 false-positive fix
Rapid Mode now requires strong evidence that the current screen is an actual interactive exercise before analysing it.

It ignores common non-question screens such as:
- course and section pages
- progress summaries
- "Up next" screens
- completion screens
- memory-strength screens
- XP and score summaries
- navigation-only screens

A candidate must also remain stable briefly before it is treated as a question.

## Token-saving safeguards
- High-confidence question detection
- Interactive answer-control checks
- Stable-question confirmation
- Per-session caching
- One Rapid Mode analysis per question signature
- Shorter prompts
- Limited response length

## Updating
Run `update.bat`, reload the extension in `edge://extensions`, then refresh the study page.
