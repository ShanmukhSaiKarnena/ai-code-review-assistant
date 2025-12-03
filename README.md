🚀 AI Code Review Assistant
Automated Pull-Request Reviewer using MERN + Google Gemini + GitHub API

An intelligent code-review system that analyzes GitHub Pull Requests, identifies issues, generates optimized fixes, and can even auto-apply those fixes by creating branches and PRs — just like a real senior developer or GitHub bot.


🔹 Landing Page
<img width="1919" height="1033" alt="image" src="https://github.com/user-attachments/assets/798f8115-79b1-4e3a-b331-cb807facfb79" />

🔹 Repository Selection
<img width="1917" height="898" alt="image" src="https://github.com/user-attachments/assets/6358a0e8-cd41-4680-9b89-9be6ed98f66d" />

🔹 Pull Request List
<img width="1896" height="949" alt="image" src="https://github.com/user-attachments/assets/03202044-45cf-477e-aaac-3550552c6af7" />

🔹 AI Review Output
<img width="1910" height="939" alt="image" src="https://github.com/user-attachments/assets/60d44071-6960-473d-aa07-673911f890e4" />



<img width="1919" height="925" alt="image" src="https://github.com/user-attachments/assets/5c3cbb21-2ceb-459f-a53c-4eab2ea078b0" />

🔹 Apply Fixes (Auto PR Creation)
<img width="1917" height="752" alt="image" src="https://github.com/user-attachments/assets/0285908b-b3ac-4c19-a578-8fbf11ca3703" />

🔹 GitHub PR With AI Comments
<img width="1903" height="1004" alt="image" src="https://github.com/user-attachments/assets/ef2d708f-fdf1-4e3b-8988-56db99a64a3c" />
<img width="907" height="388" alt="image" src="https://github.com/user-attachments/assets/4ecb47ce-e2be-4923-b4bf-33ef79d3ae09" />

🌟 Key Features
🤖 AI-Powered PR Review

Style issues

Bug detection

Security vulnerabilities

Performance optimizations

Missing tests

Each review includes:

Clear explanation of the issue

Fix suggestions

Corrected code snippet

Full corrected file version

🧠 Google Gemini Integration

Your system uses Gemini 2.5 Flash for:

Diff understanding

Code correction

Structured JSON output

Full file regeneration

🔐 GitHub OAuth Integration

Secure login

Repo browsing

Pull request listing

Token passed safely to frontend

🔍 Pull Request Diff Analysis

Fetches PR diffs via GitHub API

Patch analysis

Per-file review

📝 Auto-Comment on GitHub

AI reviewer:

Posts inline comments

Adds summary comment

Behaves like a real reviewer bot

🛠 Auto-Apply Fixes (AI Code Patching)

AI:

Generates full corrected file

Creates new branch

Uploads corrected files

Commits the changes

Automatically opens a Pull Request

🌐 Fully Deployed & Live

Frontend: Vercel
https://ai-code-review-assistant-phi.vercel.app/

Backend: Render
https://ai-code-review-assistant-7nuc.onrender.com


🧩 Tech Stack
Frontend

React (Vite)

Axios

Tailwind (optional)

GitHub OAuth redirect

Backend

Node.js

Express

Google Gemini API

GitHub REST API

OAuth token exchange

Branch creation, file update, PR creation


📦 Project Structure
AI-Code-Review-Assistant/
│
├── backend/
│   ├── index.js
│   ├── package.json
│   ├── .env (ignored in Git)
│
├── frontend/
│   ├── src/
│   ├── App.jsx
│   ├── vite.config.js
│   ├── package.json
│   ├── .env (ignored)
│
└── README.md


⚙️ Environment Variables
PORT=4000
GEMINI_API_KEY=YOUR_KEY
GITHUB_CLIENT_ID=YOUR_ID
GITHUB_CLIENT_SECRET=YOUR_SECRET
GITHUB_REDIRECT_URI=https://your-backend.onrender.com/auth/github/callback
FRONTEND_URL=https://your-frontend.vercel.app


🔹 Frontend (Vercel Env Vars)
VITE_API_URL=https://your-backend.onrender.com
VITE_GITHUB_CLIENT_ID=your_id


🚀 How It Works (Workflow)
1️⃣ Login with GitHub

User authenticates via GitHub OAuth.

2️⃣ Select Repo & PR

The frontend fetches:

User repos

PR list

3️⃣ AI Review

Backend sends PR diff → Gemini → returns structured review.

4️⃣ Post Review to GitHub

AI-generated comments added automatically.

5️⃣ Auto-Apply Fixes

AI-corrected files pushed to a new branch → auto-created PR.


🧪 Local Development Setup
1. Clone repository
git clone https://github.com/your-username/ai-code-review-assistant.git

2. Install dependencies
cd backend && npm install
cd ../frontend && npm install

3. Create .env files

(Follow details above)

4. Run backend
npm run dev

5. Run frontend
npm run dev



🔮 Future Enhancements

Beautiful dashboard UI

Severity scoring

Export AI review as PDF

Multi-model support (Gemini / GPT / DeepSeek)

CI/CD PR Bot (auto runs on GitHub Actions)

Store review history w/ MongoDB




👨‍💻 Author

Shanmukh Sai Karnena
shanmukhsaikarnena@gmail.com


📄 License

This project is licensed under the MIT License.





