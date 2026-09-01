# Study Helper V3

Personal Microsoft Edge AI study helper with rapid on-page question detection.

## V3 features
- Detects changing question content on supported Seneca pages
- Shows a floating Study Helper panel
- Hint, Explain and Analyse Answer modes
- Optional Rapid Mode that automatically starts AI analysis when a new question is detected
- Groq → Gemini → OpenRouter fallback
- Recent-question history
- API keys stored locally in extension storage

## Important behaviour
V3 reads visible question content and gives AI assistance. It does not click answer buttons, type into homework fields, press reveal/continue, or submit work.

## Install / update on Edge
1. In the project folder, run `update.bat`.
2. Open `edge://extensions`.
3. Find Study Helper and click the reload icon.
4. Refresh the Seneca tab.

## AI setup
Open the extension popup and add at least one API key. Configure additional providers for fallback.

## Rapid Mode
Enable **Rapid Mode** in the popup if you want each newly detected question to be analysed automatically.