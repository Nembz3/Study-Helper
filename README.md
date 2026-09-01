# Study Helper V3.5

Personal AI study helper for Microsoft Edge.

## What's new in V3.5

V3.5 focuses on two things:

### Better activity detection
The extension now classifies interactive activities instead of treating every large block of page text as a possible question.

Supported activity types include:
- Choice questions
- Multi-select and toggle questions
- Text input
- Dropdowns
- Matching
- Drag-and-drop ordering

### Lower token usage
Only compact activity data is sent to the AI:
- activity type
- question
- answer options
- relevant instruction

Large course containers, progress information and unrelated page text are filtered out.

## Updating
Run `update.bat`, reload the extension at `edge://extensions`, then refresh the study page.
