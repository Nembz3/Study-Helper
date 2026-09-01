# Study Helper V3.6.0

Personal AI study helper for Microsoft Edge.

## What's new in V3.5

V3.5.3 focuses on two things:

### Better activity detection
The extension now classifies interactive activities instead of treating every large block of page text as a possible question.

Supported activity types include:
- Single text-input / free-response questions (including placeholder-only inputs)
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


## Development logging

Every published change is tracked in this repository.

- **Git commits** record the exact code changes.
- **CHANGELOG.md** records user-facing fixes, improvements and releases.
- **README.md** is kept aligned with the current published version.
- Bug reports and confirmed fixes are logged in the relevant release entry.
- Future updates will be committed to GitHub with descriptive commit messages rather than being left as untracked chat-only changes.
