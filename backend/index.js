require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "backend working" });
})

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Backend running on port", PORT));

// app.get("/auth/github/login", (req, res) => {
//   const redirectUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=repo,user`;
//   res.redirect(redirectUrl);
// });
app.get("/auth/github/login", (req, res) => {
  const redirectUrl = `https://github.com/login/oauth/authorize` +
    `?client_id=${process.env.GITHUB_CLIENT_ID}` +
    `&redirect_uri=${process.env.GITHUB_REDIRECT_URI}` +
    `&scope=repo,user`;

  res.redirect(redirectUrl);
});



const axios = require("axios");

app.get("/auth/github/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).json({ error: "Code not found" });
  }

  try {
    const tokenResponse = await axios.post(
      `https://github.com/login/oauth/access_token`,
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    // Send token to frontend (later we store in DB/JWT)
    res.redirect(`https://ai-code-review-assistant-phi.vercel.app/?token=${accessToken}`);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Token exchange failed" });
  }
});

app.post("/github/repos", async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token missing" });
  }

  try {
    const response = await axios.get("https://api.github.com/user/repos", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    res.json(response.data);
  } catch (err) {
    console.log(err.message);
    res.status(500).json({ error: "Failed to fetch repositories" });
  }
});

app.post("/github/prs", async (req, res) => {
  const { token, owner, repoName } = req.body;

  if (!token || !owner || !repoName) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repoName}/pulls`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    res.json(response.data);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch PRs" });
  }
});

app.post("/github/pr-diff", async (req, res) => {
  const { token, owner, repoName, prNumber } = req.body;

  if (!token || !owner || !repoName || !prNumber) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const response = await axios.get(
      `https://api.github.com/repos/${owner}/${repoName}/pulls/${prNumber}/files`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    res.json(response.data); // this contains filename, patch, status, etc.
  } catch (err) {
    console.log(err.response?.data || err);
    res.status(500).json({ error: "Failed to fetch PR diff" });
  }
});

// const { GoogleGenerativeAI } = require("@google/generative-ai");

// app.post("/ai/review", async (req, res) => {
//   const { diff } = req.body;

//   if (!diff || diff.length === 0) {
//     return res.status(400).json({ error: "No diff provided" });
//   }

//   try {
//     const diffText = diff
//       .map(
//         (file) => `
// FILE: ${file.filename}
// CHANGES:
// ${file.patch || "No patch available"}
// `
//       )
//       .join("\n\n");

//     const prompt = `
// You are a senior software engineer reviewing a GitHub Pull Request.
// Analyze the following code changes and generate a structured review.

// ======================
// PULL REQUEST DIFF:
// ${diffText}
// ======================

// Perform the following checks:

// 1. STYLE REVIEW
// 2. BUGS REVIEW
// 3. SECURITY REVIEW
// 4. PERFORMANCE REVIEW
// 5. TESTING REVIEW

// Respond ONLY in this JSON format (no backticks, no markdown):

// {
//   "style": [...],
//   "bugs": [...],
//   "security": [...],
//   "performance": [...],
//   "tests": [...]
// }

// Each issue object must be:
// {
//   "file": "filename",
//   "issue": "short description",
//   "explanation": "why it's a problem",
//   "suggestion": "how to fix"
// }
// `;

//     const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//     // 🔥 Using gemini-2.5-flash (your preferred model)
//     const model = genAI.getGenerativeModel({
//       model: "gemini-2.5-flash",
//       generationConfig: {
//         responseMimeType: "application/json"   // 🔥 ensures VALID JSON output
//       }
//     });

//     const result = await model.generateContent(prompt);

//     const text = result.response.text();

//     // Now it's ALWAYS valid JSON
//     const json = JSON.parse(text);

//     res.json(json);
//   } catch (err) {
//     console.log("Gemini Error:", err.response?.data || err);
//     res.status(500).json({ error: "Gemini AI review failed" });
//   }
// });

// backend/index.js (replace /ai/review block with this)
const { GoogleGenerativeAI } = require("@google/generative-ai");

app.post("/ai/review", async (req, res) => {
  const { diff } = req.body;

  if (!diff || diff.length === 0) {
    return res.status(400).json({ error: "No diff provided" });
  }

  try {
    // Build a compact diffText (trim huge diffs if needed)
    const MAX_CHARS = 20000; // guard against huge prompts
    let diffText = diff
      .map(
        (file) => `FILE: ${file.filename}
CHANGES:
${file.patch || "No patch available"}`
      )
      .join("\n\n---\n\n");

    if (diffText.length > MAX_CHARS) {
      // keep only added/removed lines and filename if very large
      diffText = diff
        .map((file) => {
          const patch = file.patch || "";
          // take only lines beginning with + or - and first 2000 chars per file
          const important = patch
            .split("\n")
            .filter((l) => l.startsWith("+") || l.startsWith("-"))
            .slice(0, 500)
            .join("\n");

          return `FILE: ${file.filename}\nCHANGES_SNIPPET:\n${important || "(too large - skipped details)"}`;
        })
        .join("\n\n---\n\n");
    }

    // Prompt
    const prompt = `
You are a senior software engineer and code-reviewer. Analyze the following Pull Request changes and produce a structured JSON review.

PULL REQUEST DIFF (only changed files and patches):
${diffText}

For each changed file, perform the following checks:
1) STYLE (naming, formatting, comments)
2) BUGS (logic/runtime errors)
3) SECURITY (vulnerabilities)
4) PERFORMANCE (inefficiencies)
5) TESTS (missing or suggested tests)

Return ONLY valid JSON (no markdown fences, no extra commentary). The JSON MUST follow this exact structure:

{
  "files": [
    {
      "file": "relative/path/to/file",
      "summary": "short summary of key problems (1-2 sentences)",
      "issues": [
        {
          "category": "style"|"bugs"|"security"|"performance"|"tests",
          "issue": "short title",
          "explanation": "why it's a problem (concise)",
          "suggestion": "what to do to fix (concise)",
          "corrected_snippet": "raw code snippet that fixes the issue — only the smallest changed block (no markdown)",
          "corrected_file": "the full file content after applying the fix/optimizations (the complete file as a string, ready to write)."
        }
      ]
    }
  ]
}

Requirements:
- Each file object must include a 'corrected_file' string that is the full, corrected file content (not a patch).
- Each issue must include a 'corrected_snippet' with only the minimal change (can be multiple lines).
- If no problems found for a file, return issues: [] and summary: "No issues found".
- Keep all code returned as plain text (no triple-backtick fences). Escape newlines normally so the JSON string remains valid.
- Keep responses concise.
`;

    // Init Gemini client
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Use model "gemini-2.5-flash" with JSON response
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Parse JSON safely
    let json;
    try {
      json = JSON.parse(text);
    } catch (err) {
      console.log("JSON parse error. Raw output:");
      console.log(text);
      return res.status(500).json({
        error: "AI returned invalid JSON",
        raw: text,
      });
    }

    // Basic validation
    if (!json || !Array.isArray(json.files)) {
      return res.status(500).json({
        error: "AI returned unexpected JSON structure",
        raw: json,
      });
    }

    res.json(json);
  } catch (err) {
    console.log("Gemini Error:", err);
    res.status(500).json({ error: "Gemini AI review failed" });
  }
});




// backend/index.js  -- add near the other /github/* routes
const qs = require("querystring");

/**
 * Helper: compute the 'position' (diff index) that GitHub expects for inline comments.
 * - patch: the file.patch string from /pulls/:number/files (unified diff)
 * - targetLineInNewFile: the line number in the new file (1-indexed) you want to comment on
 *
 * Returns: integer position (1-indexed) or null if couldn't compute.
 *
 * NOTE: This is a best-effort mapping. GitHub's "position" is the index of the line
 * in the unified diff; here we count lines inside the patch hunks to find target.
 */
function computePositionFromPatch(patch, targetLineInNewFile) {
  if (!patch) return null;

  const lines = patch.split("\n");
  // pattern like: @@ -oldStart,oldCount +newStart,newCount @@
  const hunkHeaderRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
  let position = 0; // position counts every diff line shown (starting at 1)
  let currNewFileLine = 0; // track new file line number

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(hunkHeaderRe);
    if (m) {
      // start of new hunk
      const newStart = parseInt(m[1], 10);
      currNewFileLine = newStart - 1; // will increment when we see a context or + line
      continue;
    }

    // every non-hunk-header line increments the 'position'
    position += 1;

    // lines starting with ' ' or '+' are present in the new file
    if (line.startsWith(" ") || line.startsWith("+")) {
      if (line.startsWith(" ") || line.startsWith("+")) {
        // If it's context or added line, increment new file line counter
        currNewFileLine += 1;
      }
    } else if (line.startsWith("-")) {
      // removed line only affects old file numbering, not new file
    } else {
      // some weird line - count but don't increment currNewFileLine
    }

    // if we've reached the desired new-file line, return current position
    if (currNewFileLine === targetLineInNewFile) {
      return position;
    }
  }

  // not found
  return null;
}

/**
 * POST /github/post-review
 * body: {
 *   token: "<github-token>",
 *   owner: "owner",
 *   repo: "repo",
 *   prNumber: 123,
 *   aiReview: <the structured JSON returned by your AI>
 * }
 *
 * This will:
 * 1) Create inline review comments where possible
 * 2) Submit the review to the PR
 * 3) Create a summary comment with any leftover items
 */
app.post("/github/post-review", async (req, res) => {
  const { token, owner, repo, prNumber, aiReview } = req.body;

  if (!token || !owner || !repo || !prNumber || !aiReview) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    // 1) Get PR details to find head sha (needed for review or for commit_id)
    const prResp = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
    );
    const pr = prResp.data;
    const headSha = pr.head.sha;

    // 2) Build inline comments array (per GitHub API create review)
    // We'll attempt to compute positions by fetching PR files (we may already have them client-side)
    const filesResp = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files`,
      { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
    );
    const prFiles = filesResp.data; // array with filename, patch, etc.

    const reviewComments = [];
    const fallbackItems = []; // items we will include in summary if inline fails

    // aiReview.files expected structure (per our prompt)
    for (const fileObj of aiReview.files || []) {
      const filename = fileObj.file;
      // find matching PR file
      const prFile = prFiles.find(f => f.filename === filename || f.filename === `/${filename}` || f.filename.endsWith(filename));
      const patch = prFile?.patch || "";

      // For each issue in file
      for (const issue of fileObj.issues || []) {
        // Best-effort: find a target line to attach comment.
        // Strategy: try to find first added line (+) in patch that relates to issue.
        // If AI provided a snippet, we can try to match snippet lines to the patch to find location.
        let position = null;

        if (issue.corrected_snippet) {
          // attempt to match the first non-empty line from corrected_snippet into the patch context
          const snippetLines = issue.corrected_snippet.split("\n").map(l => l.trim()).filter(Boolean);
          if (snippetLines.length > 0) {
            const firstLine = snippetLines[0];
            // find that line in the patch (as added lines or context)
            const patchLines = patch.split("\n");
            let newFileLineCounter = 0;
            let hunkHeaderRe = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/;
            let positionCounter = 0;
            for (let i = 0; i < patchLines.length; i++) {
              const pl = patchLines[i];
              const mh = pl.match(hunkHeaderRe);
              if (mh) {
                newFileLineCounter = parseInt(mh[1], 10) - 1;
              } else {
                positionCounter += 1;
                if (pl.startsWith("+") || pl.startsWith(" ") ) {
                  if (pl.startsWith("+") || pl.startsWith(" ")) newFileLineCounter += 1;
                }
                // compare trimmed content ignoring plus/minus prefix
                const content = pl.startsWith("+") || pl.startsWith("-") || pl.startsWith(" ") ? pl.slice(1).trim() : pl.trim();
                if (content && firstLine.includes(content) || content.includes(firstLine) || content === firstLine) {
                  // compute coarse position: use computePositionFromPatch for the matched newFileLineCounter
                  const maybePos = computePositionFromPatch(patch, newFileLineCounter);
                  if (maybePos) { position = maybePos; break; }
                }
              }
            }
          }
        }

        // fallback: if no snippet mapping, attempt to comment at top of file (position 1)
        if (position === null) {
          position = computePositionFromPatch(patch, 1);
        }

        if (position) {
          // build a GitHub review comment
          reviewComments.push({
            path: filename,
            position: position,
            body: `AI Review: ${issue.category.toUpperCase()} - ${issue.issue}\n\n${issue.explanation}\n\nSuggestion: ${issue.suggestion}`
          });
        } else {
          // cannot compute position: add to fallback
          fallbackItems.push({ file: filename, issue });
        }
      }
    }

    // 3) Submit a review if we have inline comments
    let reviewId = null;
    if (reviewComments.length > 0) {
      // Create a review with comments array via the "create review" endpoint
      // (This will create a draft review containing our comments and submit it as a COMMENT event)
      const createReviewBody = {
        commit_id: headSha,
        body: "Automated AI review — inline comments below.",
        event: "COMMENT",
        comments: reviewComments
      };

      const reviewResp = await axios.post(
        `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/reviews`,
        createReviewBody,
        { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
      );

      reviewId = reviewResp.data.id;
    }

    // 4) Create a summary comment (issues that couldn't be posted inline + short summary of everything)
    let summaryBody = `## AI Review Summary\n\n**Files reviewed:** ${ (aiReview.files || []).map(f=>f.file).join(", ") }\n\n`;

    // Summarize each file and its issues
    for (const f of aiReview.files || []) {
      if (!f.issues || f.issues.length === 0) {
        summaryBody += `**${f.file}** — No issues found.\n\n`;
        continue;
      }
      summaryBody += `### ${f.file}\n`;
      for (const issue of f.issues) {
        const inlineFlag = fallbackItems.find(x => x.file === f.file && x.issue.issue === issue.issue);
        const prefix = inlineFlag ? "*(in summary — inline failed)* " : "";
        summaryBody += `- ${prefix}**${issue.category.toUpperCase()}** — ${issue.issue}\n  - ${issue.explanation}\n  - Suggestion: ${issue.suggestion}\n\n`;
      }
    }

    if (fallbackItems.length > 0) {
      summaryBody += `\n> Some inline comments could not be attached at a precise position and are included above.\n`;
    }

    // Post summary via Issues API (PR is an issue)
    await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`,
      { body: summaryBody },
      { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
    );

    return res.json({ ok: true, reviewPosted: !!reviewId, fallbackCount: fallbackItems.length });
  } catch (err) {
    console.log("GitHub post-review error:", err.response?.data || err.message || err);
    return res.status(500).json({ error: "Failed to post review to GitHub", details: err.response?.data || err.message });
  }
});


async function createNewBranch(token, owner, repo, baseSha, branchName) {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs`;
  const body = {
    ref: `refs/heads/${branchName}`,
    sha: baseSha
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  return response.data;
}

async function commitCorrectedFile(token, owner, repo, branch, filePath, fileContent) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  // 1) Get existing file SHA (if file exists)
  let existingSha = undefined;

  try {
    const getResp = await axios.get(url + `?ref=${branch}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json"
      }
    });

    existingSha = getResp.data.sha; // 🔥 existing file sha
  } catch (err) {
    // File does NOT exist → ignore (we will create new)
    existingSha = undefined;
  }

  // 2) Encode new content
  const contentBase64 = Buffer.from(fileContent, "utf-8").toString("base64");

  // 3) Build request body depending on CREATE vs UPDATE
  const body = {
    message: `AI Fix: Updated ${filePath}`,
    content: contentBase64,
    branch: branch
  };

  if (existingSha) {
    body.sha = existingSha;   // 🔥 REQUIRED for updating existing files
  }

  // 4) PUT request → creates or updates file
  const response = await axios.put(url, body, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json"
    }
  });

  return response.data;
}



app.post("/github/apply-fixes", async (req, res) => {
  const { token, owner, repo, prNumber, aiReview } = req.body;

  if (!token || !owner || !repo || !prNumber || !aiReview) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    // 1. Get PR details to find base branch & latest commit SHA
    const pr = (await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers: { Authorization: `token ${token}` } }
    )).data;

    const baseBranch = pr.head.ref; 
    const baseSha = pr.head.sha;

    // 2. Create new branch: ai-fix-pr-<number>
    const uniqueId = Date.now(); // or use nanoid / uuid if you want
    const newBranch = `ai-fix-pr-${prNumber}-${uniqueId}`;
    await createNewBranch(token, owner, repo, baseSha, newBranch);

    // 3. Commit corrected files
    for (const fileObj of aiReview.files || []) {
      if (!fileObj.issues || fileObj.issues.length === 0) continue;

      // We choose the corrected file of the first issue
      const correctedFile = fileObj.issues[0].corrected_file;
      if (!correctedFile) continue;

      await commitCorrectedFile(
        token,
        owner,
        repo,
        newBranch,
        fileObj.file,
        correctedFile
      );
    }

    // 4. Create a new Pull Request
    const prResponse = await axios.post(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        title: `AI Fixes for PR #${prNumber}`,
        head: newBranch,
        base: pr.base.ref,
        body: "This PR contains AI-generated fixes based on automated code review."
      },
      {
        headers: { Authorization: `token ${token}` }
      }
    );

    return res.json({
      message: "AI Fix PR created",
      branch: newBranch,
      prUrl: prResponse.data.html_url
    });

  } catch (err) {
    console.log("Apply Fix Error:", err.response?.data || err);
    res.status(500).json({ error: "Failed to apply fixes" });
  }
});
