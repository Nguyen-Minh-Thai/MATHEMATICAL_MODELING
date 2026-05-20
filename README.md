<div align="center">
<!-- <img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" /> -->
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/697b82d5-f5a1-4a4d-9ecd-f9cf563e8fac

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

Optional: run the Python backend alongside the UI

1. Install backend Python requirements (will create a `.venv` inside the backend folder):

```powershell
npm run backend:install
```

2. Run both backend and UI together:

```powershell
npm run dev:all
```

Notes:
- The backend folder is expected at `../exam_scheduler-main- 16-5` relative to this project root.
- The backend scripts assume Windows PowerShell path to the venv; modify scripts for other OSes.
