# Speaker Time Tracker

A lightweight, zero-dependency browser app that tracks how long each participant speaks in a group meeting — with automatic speaker detection via the Web Speech API.

## Features

- Add any number of participants
- Tap a participant row to mark them as the active speaker
- **Voice detection**: click "Start listening" and the app listens for participant names in the room audio, automatically switching the active speaker when a name is heard
- Live progress bars showing each person's share of total talk time
- Pause and reset controls
- Dark mode support

## Usage

Open `index.html` directly in a browser — no build step or server required.

```
open index.html        # macOS
start index.html       # Windows
xdg-open index.html    # Linux
```

Or serve it locally:

```bash
npx serve .
# or
python3 -m http.server
```

## Voice detection

The app uses the [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (`SpeechRecognition`) to transcribe audio in real time. When a participant's name appears in the transcript, the tracker switches to that person automatically.

**Browser support**: Chrome and Edge work best. Safari has partial support. Firefox does not support `SpeechRecognition`.

### Tips
- Works best when names are spoken clearly and are reasonably distinct (short or common names like "Jo" may get false positives)
- You can still tap any row to switch speakers manually at any time
- The mic auto-restarts after silence — no need to re-click

## Files

| File | Purpose |
|------|---------|
| `index.html` | App shell and markup |
| `style.css` | Styles with dark mode support |
| `tracker.js` | All state, timer, speech, and rendering logic |

## License

MIT
