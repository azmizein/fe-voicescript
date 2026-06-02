# VoiceScript Frontend

This is the frontend user interface for VoiceScript. It provides a sleek, modern workstation for managing legal transcription cases, assigning roles, and interacting with AI tools.

## Tech Stack
- **Framework:** React
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Vanilla CSS (Custom Design System)

## Prerequisites
- Node.js (v18+ recommended)
- The VoiceScript Backend must be running concurrently for full API functionality.

## Setup & Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy the example environment file.
   ```bash
   cp .env.example .env
   ```
   *Ensure `VITE_API_URL` points to your backend instance (the default is `http://localhost:3001`). Note: Do not place your Groq API key here; it belongs in the backend `.env` for security.*

## Running the Application

To start the Vite development server with hot-module replacement (HMR):
```bash
npm run dev
```

The application will typically be available at `http://localhost:5173`. 

## Key Features
- **Case Dashboard:** Track the status of legal reporting jobs (NEW, ASSIGNED, TRANSCRIBED, REVIEWED, COMPLETED).
- **AutoScript Workspace:** An interactive editor to review and scope transcripts.
- **AI Audio Uploads:** Seamless UI for uploading audio recordings, which are then processed by the backend using Whisper and LLaMA.
- **Role Management UI:** Interfaces for viewing, assigning, and managing Reporters and Editors.
