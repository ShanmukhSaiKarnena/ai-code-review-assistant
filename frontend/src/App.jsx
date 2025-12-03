import { useEffect, useState } from "react";
import axios from "axios";

function App() {
  const [status, setStatus] = useState("Checking...");
  const [repos, setRepos] = useState([]);

  // ⭐ STEP 5.1 — States for selected repo and its PRs
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [pullRequests, setPullRequests] = useState([]);

  // ⭐ STEP 5.4 — State for selected PR
  const [selectedPR, setSelectedPR] = useState(null);

  // ⭐ STEP 6.2 — State to store PR diff
  const [prDiff, setPrDiff] = useState([]);

  // ⭐ STEP 7.1 — AI Review states
  const [aiReview, setAiReview] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  useEffect(() => {
    axios
      .get(import.meta.env.VITE_API_URL + "/health")
      .then((res) => setStatus(res.data.status))
      .catch(() => setStatus("Backend offline"));
  }, []);

  useEffect(() => {
    if (token) {
      localStorage.setItem("github_token", token);
    }
  }, []);

  const loginWithGithub = () => {
    window.location.href = "http://localhost:4000/auth/github/login";
  };

  const fetchRepos = () => {
    const savedToken = localStorage.getItem("github_token");

    if (!savedToken) {
      alert("Please login first");
      return;
    }

    axios
      .post(import.meta.env.VITE_API_URL + "/github/repos", { token: savedToken })
      .then((res) => {
        setRepos(res.data);
      })
      .catch(() => {
        alert("Failed to fetch repos");
      });
  };

  // ⭐ STEP 5.1 — Select a repo and load its PRs
  const selectRepo = (repo) => {
    setSelectedRepo(repo);
    fetchPullRequests(repo);
  };

  const fetchPullRequests = (repo) => {
    const savedToken = localStorage.getItem("github_token");

    axios
      .post(import.meta.env.VITE_API_URL + "/github/prs", {
        token: savedToken,
        owner: repo.owner.login,
        repoName: repo.name,
      })
      .then((res) => {
        setPullRequests(res.data);
      })
      .catch((err) => {
        console.log(err);
        alert("Failed to load pull requests");
      });
  };

  // ⭐ STEP 5.4 — Select a specific PR
  // Modified per STEP 6.2: call fetchPRDiff when selecting PR
  const selectPR = (pr) => {
    setSelectedPR(pr);
    fetchPRDiff(pr);
  };

  // ⭐ STEP 6.3 — fetchPRDiff (exact code from instructions)
  const fetchPRDiff = (pr) => {
    const savedToken = localStorage.getItem("github_token");

    axios
      .post(import.meta.env.VITE_API_URL + "/github/pr-diff", {
        token: savedToken,
        owner: selectedRepo.owner.login,
        repoName: selectedRepo.name,
        prNumber: pr.number
      })
      .then((res) => {
        setPrDiff(res.data);
      })
      .catch((err) => {
        console.log(err);
        alert("Failed to fetch PR diff");
      });
  };

  // ⭐ STEP 7.2 — Run AI Review
  const runAIReview = () => {
    setLoadingAI(true);

    const savedToken = localStorage.getItem("github_token");

    axios
      .post(import.meta.env.VITE_API_URL + "/ai/review", {
        diff: prDiff,
        repo: selectedRepo.name,
        owner: selectedRepo.owner.login,
        prNumber: selectedPR.number,
        token: savedToken
      })
      .then((res) => {
        setAiReview(res.data);
        setLoadingAI(false);
      })
      .catch((err) => {
        console.log(err);
        alert("AI review failed");
        setLoadingAI(false);
      });
  };

  // ⭐ NEW — POST REVIEW TO GITHUB
  const postReviewToGitHub = async () => {
    const savedToken = localStorage.getItem("github_token");
    if (!savedToken) { alert("Please login first."); return; }
    if (!aiReview) { alert("Run AI review first."); return; }
    if (!selectedRepo || !selectedPR) { alert("Select repo & PR."); return; }

    try {
      const payload = {
        token: savedToken,
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        prNumber: selectedPR.number,
        aiReview: aiReview
      };

      const r = await axios.post(import.meta.env.VITE_API_URL + "/github/post-review", payload);
      if (r.data && r.data.ok) {
        alert("AI review posted to GitHub. Inline comments posted: " + r.data.reviewPosted + ". Fallback items: " + r.data.fallbackCount);
      } else {
        alert("Posted but unexpected response.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to post to GitHub: " + (err.response?.data?.error || err.message));
    }
  };

  // ⭐ NEW — APPLY AI FIXES (AUTO PR)
  const applyAIFixes = async () => {
    const savedToken = localStorage.getItem("github_token");
    if (!savedToken) return alert("Please login first.");
    if (!aiReview) return alert("Run AI review first.");

    try {
      const payload = {
        token: savedToken,
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        prNumber: selectedPR.number,
        aiReview: aiReview
      };

      const res = await axios.post(
        import.meta.env.VITE_API_URL + "/github/apply-fixes",
        payload
      );

      alert(
        "AI Fix Branch Created: " + res.data.branch +
        "\nPull Request: " + res.data.prUrl
      );
    } catch (err) {
      console.error(err);
      alert("Failed to apply fixes");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Code Review Assistant</h1>

      <button
        onClick={loginWithGithub}
        style={{
          padding: "10px 20px",
          background: "#24292F",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        Login with GitHub
      </button>

      <p>
        Backend Status: <b>{status}</b>
      </p>
      <p>GitHub Token: {token || "Not logged in"}</p>

      <button
        onClick={fetchRepos}
        style={{
          padding: "10px 20px",
          background: "#0366d6",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginTop: "15px",
        }}
      >
        Load My Repositories
      </button>

      <div style={{ marginTop: "20px" }}>
        {repos.map((repo) => (
          <div
            key={repo.id}
            style={{
              padding: "10px",
              marginBottom: "10px",
              border: "1px solid #ddd",
              borderRadius: "5px",
            }}
          >
            <h3>{repo.name}</h3>
            <p>{repo.description || "No description"}</p>
            <p>
              <b>Private:</b> {repo.private ? "Yes" : "No"}
            </p>
            <p>
              <b>Owner:</b> {repo.owner.login}
            </p>

            {/* ⭐ STEP 5.1 — Select this repo */}
            <button
              onClick={() => selectRepo(repo)}
              style={{
                padding: "8px 15px",
                background: "green",
                color: "white",
                border: "none",
                cursor: "pointer",
                marginTop: "10px",
              }}
            >
              Select this Repo
            </button>
          </div>
        ))}
      </div>

      {/* ⭐ STEP 5.4 — Display Pull Requests for selectedRepo */}
      {selectedRepo && (
        <div style={{ marginTop: "30px" }}>
          <h2>Pull Requests for: {selectedRepo.name}</h2>

          {pullRequests.length === 0 && <p>No open PRs</p>}

          {pullRequests.map((pr) => (
            <div
              key={pr.id}
              style={{
                padding: "10px",
                marginBottom: "10px",
                border: "1px solid #ccc",
                borderRadius: "5px",
              }}
            >
              <h3>
                #{pr.number} — {pr.title}
              </h3>
              <p>
                <b>Author:</b> {pr.user.login}
              </p>
              <p>
                <b>Status:</b> {pr.state}
              </p>

              <button
                onClick={() => selectPR(pr)}
                style={{
                  padding: "8px 15px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  marginTop: "10px",
                }}
              >
                Review This PR
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ⭐ STEP 6.4 — Display PR diff for selectedPR */}
      {selectedPR && (
        <div style={{ marginTop: "30px" }}>
          <h2>Changes in PR #{selectedPR.number}</h2>

          {/* ⭐ STEP 7.1 — Run AI Review button */}
          <button
            onClick={runAIReview}
            style={{
              padding: "10px 20px",
              background: "crimson",
              color: "white",
              border: "none",
              cursor: "pointer",
              marginBottom: "20px",
            }}
          >
            {loadingAI ? "Running AI Review..." : "Run AI Review"}
          </button>

          {/* ---------- UPDATED AI REVIEW RENDERING BLOCK ---------- */}

          {/* AI Review Section */}
          {loadingAI && <p>Running AI review...</p>}

          {aiReview && (
            <div style={{ marginTop: "20px" }}>
              <h2>AI Review Report</h2>

              <button
                onClick={postReviewToGitHub}
                style={{
                  padding: "10px 16px",
                  background: "#24292f",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  marginTop: 12
               }}
              >
                 Post AI Review to GitHub (create comments)
              </button>

              {/* ⭐ NEW — APPLY AI FIXES BUTTON */}
              <button
                onClick={applyAIFixes}
                style={{
                  padding: "10px 16px",
                  background: "green",
                  color: "white",
                  border: "none",
                  cursor: "pointer",
                  marginTop: "12px",
                  marginLeft: "10px"
                }}
              >
                Apply AI Fixes (Auto PR)
              </button>

              {aiReview.files.length === 0 && <p>No files reviewed or no issues found.</p>}

              {aiReview.files.map((fileObj, fi) => (
                <div key={fi} style={{ marginTop: "20px", padding: "12px", border: "1px solid #efebebff", borderRadius: 6 }}>
                  <h3>{fileObj.file}</h3>
                  <p><i>{fileObj.summary}</i></p>

                  {fileObj.issues.length === 0 && <p>No issues found for this file.</p>}

                  {fileObj.issues.map((issue, idx) => (
                    <div key={idx} style={{ marginTop: 10, padding: "10px", border: "1px solid #eee", borderRadius: 6 }}>
                      <p><b>Category:</b> {issue.category}</p>
                      <p><b>Issue:</b> {issue.issue}</p>
                      <p><b>Explanation:</b> {issue.explanation}</p>
                      <p><b>Suggestion:</b> {issue.suggestion}</p>

                      <div style={{ marginTop: 8 }}>
                        <p style={{ marginBottom: 4 }}><b>Corrected snippet:</b></p>
                        <pre style={{ background: "#64c836ff", padding: 8, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                          {issue.corrected_snippet}
                        </pre>
                      </div>

                      <div style={{ marginTop: 8 }}>
                        <p style={{ marginBottom: 4 }}><b>Full corrected file (for this issue):</b></p>
                        <pre style={{ background: "#64f041ff", padding: 8, whiteSpace: "pre-wrap", overflowX: "auto" }}>
                          {issue.corrected_file}
                        </pre>
                      </div>
                    </div>
                  ))}

                  {/* Optionally show a merged 'corrected file' if you want one per file rather than per-issue */}
                  {/*
                  <div style={{ marginTop: 12 }}>
                    <p><b>Full corrected file (merged):</b></p>
                    <pre style={{ background:'#fff9f9ff', padding:8, whiteSpace:'pre-wrap', overflowX:'auto' }}>
                      {fileObj.corrected_file_merged}
                    </pre>
                  </div>
                  */}
                </div>
              ))}
            </div>
          )}

          {/* ---------- END UPDATED AI REVIEW RENDERING BLOCK ---------- */}

          {prDiff.length === 0 && <p>No changes found</p>}

          {prDiff.map((file) => (
            <div
              key={file.filename}
              style={{
                padding: "10px",
                marginBottom: "15px",
                border: "1px solid #0d0d0dff",
                borderRadius: "5px",
              }}
            >
              <h3>{file.filename}</h3>

              <pre
                style={{
                  background: "#0a0b0bff",
                  padding: "10px",
                  whiteSpace: "pre-wrap",
                  overflowX: "auto",
                }}
              >
                {file.patch || "No diff available"}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
