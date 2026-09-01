# Changelog

## 3.5.0 — Universal Activity Detection & Token Optimisation
- Rebuilt activity detection around interactive controls instead of broad page text
- Added explicit multi-select and toggle activity classification
- Added compact activity extraction: type, question, options and instruction
- Added support for choice, multi-select, text input, dropdown, matching and ordering activities
- Reduced candidate text limits to avoid sending course/navigation content
- Added stable activity fingerprints based on type + question + options
- Improved duplicate suppression for DOM re-renders and MutationObserver noise
- Reduced output token caps by mode
- Prompts now send only compact activity data instead of large page containers
- Improved ordering instructions so exact answer order can be returned clearly

## 3.4.0 — Activity-Type Detection
- Added dedicated detection for drag-and-drop questions
- Added ordering and sequencing activity detection

## 3.3.0 — High-Confidence Rapid Mode
- Added interactive-answer detection and confidence scoring
- Added stronger duplicate protection
