# Study Helper V2

Personal Microsoft Edge AI study helper.

## Features
- Highlight text on a webpage and right-click **Ask Study Helper about this**
- Hint mode
- Step-by-step explanation mode
- Answer mode
- Groq primary provider
- Gemini fallback
- OpenRouter fallback
- Automatic fallback if a configured provider errors or rate-limits
- Recent-question history
- API keys stored locally in extension storage

## Install on Microsoft Edge
1. Clone or download the repository.
2. Open `edge://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the project folder.
6. Pin Study Helper.

## AI setup
Open the extension → **AI Providers & Settings** and add one or more API keys.

## Updating
If cloned with Git, double-click `update.bat`.

## Security
Never commit API keys to GitHub. Keys are stored locally in browser extension storage.

Provider quotas can change; no free API is guaranteed unlimited.