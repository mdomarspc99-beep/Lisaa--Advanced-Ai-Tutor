# Lisaa - Advanced AI Tutor

A bilingual (English/Bengali) AI tutor specializing in Physics, IELTS Speaking, and History. Powered by the Gemini Live API for an immersive, voice-first learning experience.

## 🚀 Deployment on Vercel

To make this application "Vercel friendly," use the following settings:

### 1. Framework Preset
When importing this project to Vercel, select the **Vite** framework preset. Vercel should auto-detect this based on the `package.json` and `vite.config.ts`.

### 2. Environment Variables
You **MUST** set the following environment variable in the Vercel Dashboard (**Settings > Environment Variables**):

| Key | Value |
| :--- | :--- |
| `GEMINI_API_KEY` | Your Google AI Studio API Key |

> [!IMPORTANT]
> Without this key, the AI connection will fail. You can get your key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 3. Build Settings
The default build settings for Vite are already configured:
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 4. Permissions
Ensure you access the site via **HTTPS**. Browsers will only allow microphone access on secure connections.

## 🛠️ Features
- **Proactive AI:** Lisaa starts the conversation immediately upon connection.
- **Bilingual Support:** Fluent in both English and Bengali.
- **Specialized Modes:**
  - **Physics:** Conceptual logic and analogies.
  - **IELTS:** Mock speaking tests with Band 8+ feedback.
  - **History & Geo:** Storytelling-driven historical facts.
- **Real-time Visuals:** Dynamic background animations and voice volume visualization.

## 👨‍💻 Developed by
**MD OMAR FARUK**
