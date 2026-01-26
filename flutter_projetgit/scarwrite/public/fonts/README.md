Place a UTF-8 TTF font here to improve PDF character rendering.

1. Download Noto Sans Regular (or Roboto Regular) TTF. Example (manual):
   - Noto Sans: https://fonts.google.com/specimen/Noto+Sans
   - Roboto: https://fonts.google.com/specimen/Roboto

2. Save the regular TTF file with the name `NotoSans-Regular.ttf` into this folder (`public/fonts/NotoSans-Regular.ttf`).

3. Rebuild / Restart dev server (`npm run dev`). The app will try to load `/fonts/NotoSans-Regular.ttf` at runtime and register it with jsPDF.

Notes:
- The PDF generator attempts to load the font asynchronously; placing the file in `public/fonts/` before running the app guarantees offline usage and correct glyph rendering for accented characters and currency symbols.
- If you prefer us to add the font file directly into the repository, tell me and I'll embed the base64 TTF into the project (this increases repository size).