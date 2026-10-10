
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  File,
  FileCode2,
  Folder,
  FolderOpen,
  GitFork,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  XCircle,
  Zap
} from "lucide-react";

const API = "http://localhost:5000/api";

const demoCode = `function calculateTotal(items) {
  let total = 0;

  for (let i = 0; i <= items.length; i++) {
    total += items[i].price;
  }

  return total;
}`;

async function request(url, options = {}) {
  const response = await fetch(`${API}${url}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed (${response.status})`);
  }

  return data;
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
  className = ""
}) {
  const variants = {
    primary: "bg-violet-600 hover:bg-violet-500 text-white border-violet-500",
    secondary: "bg-[#171d2a] hover:bg-[#222b3b] text-slate-200 border-[#303a4c]",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30",
    success: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

function SelectField({ value, onChange, children, disabled = false }) {
  return (
    <div className="relative min-w-0">
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full appearance-none rounded-lg border border-[#303a4c] bg-[#111722] py-2 pl-3 pr-8 text-sm text-slate-200 outline-none focus:border-violet-500 disabled:opacity-40"
      >
        {children}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
}

function PanelTitle({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[#273142] px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
        <Icon size={16} className="text-violet-400" />
        {title}
      </div>
      {right}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState("github");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [githubStatus, setGithubStatus] = useState("Checking connection...");

  // GitHub workspace
  const [repos, setRepos] = useState([]);
  const [repo, setRepo] = useState("");
  const [branches, setBranches] = useState([]);
  const [branch, setBranch] = useState("");
  const [remotePath, setRemotePath] = useState("");
  const [remoteEntries, setRemoteEntries] = useState([]);
  const [remoteFile, setRemoteFile] = useState(null);
  const [repoSearch, setRepoSearch] = useState("");
  const [remoteHistory, setRemoteHistory] = useState([]);

  // Local workspace
  const [projectPath, setProjectPath] = useState("");
  const [projectName, setProjectName] = useState("");
  const [localPath, setLocalPath] = useState("");
  const [localEntries, setLocalEntries] = useState([]);
  const [localHistory, setLocalHistory] = useState([]);
  const [localFile, setLocalFile] = useState(null);
  const [localSearch, setLocalSearch] = useState("");

  // Shared editor and AI proposal
  const [editorCode, setEditorCode] = useState(demoCode);
  const [editorFile, setEditorFile] = useState("demo.js");
  const [language, setLanguage] = useState("javascript");
  const [proposal, setProposal] = useState("");
  const [proposalSummary, setProposalSummary] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [instructions, setInstructions] = useState(
    "Fix bugs, improve readability, preserve existing behavior, and explain important changes."
  );
  const [showComparison, setShowComparison] = useState(true);
  const [dirty, setDirty] = useState(false);

  const activeFile = page === "github" ? remoteFile : localFile;
  const isRemoteFile = page === "github" && Boolean(remoteFile);
  const isLocalFile = page === "local" && Boolean(localFile);

  const filteredRepos = useMemo(() => {
    const q = repoSearch.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) =>
      `${r.fullName} ${r.description || ""}`.toLowerCase().includes(q)
    );
  }, [repos, repoSearch]);

  const filteredEntries = useMemo(() => {
    const entries = page === "github" ? remoteEntries : localEntries;
    const q = (page === "github" ? repoSearch : localSearch).trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) => entry.name.toLowerCase().includes(q));
  }, [page, remoteEntries, localEntries, repoSearch, localSearch]);

  function clearMessages() {
    setError("");
    setNotice("");
  }

  async function runTask(name, task) {
    setBusy(name);
    setError("");
    setNotice("");
    try {
      await task();
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy("");
    }
  }

  async function checkGithub() {
    await runTask("github-status", async () => {
      const data = await request("/github/status");
      const connected = Boolean(data.connected || data.configured || data.available);
      setGithubStatus(connected ? "Token configured" : "Token not configured");

      if (connected) {
        await loadRepos();
      }
    });
  }

  async function loadRepos() {
    const data = await request("/github/repos");
    const list = data.repositories || data.repos || [];
    setRepos(list);
    setGithubStatus("Connected");
    if (!repo && list.length > 0) {
      setRepo(list[0].fullName || `${list[0].owner}/${list[0].name}`);
    }
  }

  async function loadBranches(fullName) {
    if (!fullName) return;
    const [owner, repoName] = fullName.split("/");
    const data = await request(
      `/github/branches?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}`
    );
    const list = data.branches || [];
    setBranches(list);
    const defaultBranch =
      repos.find((r) => (r.fullName || `${r.owner}/${r.name}`) === fullName)?.defaultBranch;
    setBranch((current) =>
      list.some((b) => b.name === current)
        ? current
        : defaultBranch && list.some((b) => b.name === defaultBranch)
          ? defaultBranch
          : list[0]?.name || ""
    );
  }

  async function loadRemoteFiles(path = "") {
    if (!repo || !branch) return;
    const [owner, repoName] = repo.split("/");
    const data = await request(
      `/github/files?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(path)}`
    );
    setRemotePath(path);
    setRemoteEntries(data.entries || data.files || []);
  }

  async function openRemoteEntry(entry) {
    if (entry.type === "dir" || entry.type === "tree" || entry.type === "directory") {
      setRemoteHistory((history) => [...history, remotePath]);
      await loadRemoteFiles(entry.path);
      return;
    }

    await runTask("open-remote-file", async () => {
      const [owner, repoName] = repo.split("/");
      const data = await request(
        `/github/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(branch)}&path=${encodeURIComponent(entry.path)}`
      );
      const file = { ...data, path: data.path || entry.path };
      setRemoteFile(file);
      setLocalFile(null);
      setEditorCode(file.content || "");
      setEditorFile(file.path.split("/").pop());
      setLanguage(detectLanguage(file.path));
      setProposal("");
      setProposalSummary("");
      setAnalysis(null);
      setDirty(false);
      setNotice("GitHub file opened in read-only source mode.");
    });
  }

  async function chooseRepo(value) {
    setRepo(value);
    setBranch("");
    setBranches([]);
    setRemoteEntries([]);
    setRemotePath("");
    setRemoteHistory([]);
    setRemoteFile(null);
    setProposal("");
    setAnalysis(null);
    if (!value) return;

    await runTask("branches", async () => {
      await loadBranches(value);
    });
  }

  async function chooseBranch(value) {
    setBranch(value);
    setRemotePath("");
    setRemoteHistory([]);
    setRemoteFile(null);
    setProposal("");
    setAnalysis(null);

    if (!value || !repo) return;
    await runTask("remote-files", async () => {
      const [owner, repoName] = repo.split("/");
      const data = await request(
        `/github/files?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repoName)}&branch=${encodeURIComponent(value)}&path=`
      );
      setRemoteEntries(data.entries || data.files || []);
    });
  }

  async function openLocalProject() {
    const input = window.prompt(
      "Enter the full path to your project folder on the computer running the CodeSential backend:"
    );
    if (!input?.trim()) return;

    await runTask("open-project", async () => {
      const data = await request("/project/open", {
        method: "POST",
        body: JSON.stringify({ path: input.trim() })
      });
      const root = data.projectPath || data.root || input.trim();
      setProjectPath(root);
      setProjectName(data.name || root.split(/[\\/]/).filter(Boolean).pop() || "Local project");
      setLocalPath("");
      setLocalHistory([]);
      setLocalFile(null);
      setRemoteFile(null);
      setEditorCode("");
      setEditorFile("");
      setProposal("");
      setAnalysis(null);
      setDirty(false);
      await loadLocalFiles(root, "");
      setNotice("Local project opened.");
    });
  }

  async function loadLocalFiles(root = projectPath, path = "") {
    if (!root) return;
    const data = await request(
      `/project/files?projectPath=${encodeURIComponent(root)}&path=${encodeURIComponent(path)}`
    );
    setLocalPath(path);
    setLocalEntries(data.entries || data.files || []);
  }

  async function openLocalEntry(entry) {
    if (entry.type === "dir" || entry.type === "directory" || entry.type === "folder") {
      setLocalHistory((history) => [...history, localPath]);
      await runTask("local-files", () => loadLocalFiles(projectPath, entry.path));
      return;
    }

    await runTask("open-local-file", async () => {
      const data = await request(
        `/project/file?projectPath=${encodeURIComponent(projectPath)}&path=${encodeURIComponent(entry.path)}`
      );
      const file = { ...data, path: data.path || entry.path };
      setLocalFile(file);
      setRemoteFile(null);
      setEditorCode(file.content || "");
      setEditorFile(file.path.split(/[\\/]/).pop());
      setLanguage(detectLanguage(file.path));
      setProposal("");
      setProposalSummary("");
      setAnalysis(null);
      setDirty(false);
      setNotice("Local file opened.");
    });
  }

  async function saveLocalFile() {
    if (!localFile || !projectPath) return;

    const confirmed = window.confirm(
      `Save changes to ${localFile.path}?\n\nThe backend should create a backup and check whether the file changed since it was opened.`
    );
    if (!confirmed) return;

    await runTask("save", async () => {
      const data = await request("/project/save", {
        method: "POST",
        body: JSON.stringify({
          projectPath,
          path: localFile.path,
          content: editorCode,
          expectedHash: localFile.hash
        })
      });
      setLocalFile({ ...localFile, content: editorCode, hash: data.hash || localFile.hash });
      setDirty(false);
      setNotice("File saved successfully.");
    });
  }

  async function analyzeCode() {
    if (!editorCode.trim()) {
      setError("Open a source file or enter some code first.");
      return;
    }

    await runTask("analyze", async () => {
      const data = await request("/analyze", {
        method: "POST",
        body: JSON.stringify({
          code: editorCode,
          language,
          fileName: editorFile || "untitled"
        })
      });
      setAnalysis(data.analysis || data);
      setNotice("AI analysis completed.");
    });
  }

  async function generateProposal() {
    if (!editorCode.trim()) {
      setError("Open a source file or enter some code first.");
      return;
    }

    await runTask("modernize", async () => {
      const data = await request("/modernize", {
        method: "POST",
        body: JSON.stringify({
          code: editorCode,
          language,
          fileName: editorFile || "untitled",
          instructions
        })
      });

      const result = data.proposal || data;
      const code = result.modernizedCode || result.code || data.modernizedCode;
      if (typeof code !== "string" || !code.trim()) {
        throw new Error("The AI response did not contain proposed code. Check the /api/modernize response format.");
      }

      setProposal(code);
      setProposalSummary(
        result.summary || data.summary || "Review the proposed changes before applying them."
      );
      setShowComparison(true);
      setNotice("Proposal generated. Review both versions before applying.");
    });
  }

  function applyProposal() {
    if (!proposal) return;
    if (isRemoteFile) {
      setError("GitHub files are read-only. Open a local project to apply and save changes, or add a GitHub commit/PR workflow.");
      return;
    }
    setEditorCode(proposal);
    setDirty(Boolean(localFile));
    setProposal("");
    setProposalSummary("");
    setAnalysis(null);
    setNotice("Proposal applied to the editor. Save the local file to persist it.");
  }

  function discardProposal() {
    setProposal("");
    setProposalSummary("");
    setNotice("Proposal rejected.");
  }

  function discardEditorChanges() {
    if (!activeFile) {
      setEditorCode(demoCode);
      setEditorFile("demo.js");
      setProposal("");
      setAnalysis(null);
      setDirty(false);
      return;
    }

    setEditorCode(activeFile.content || "");
    setDirty(false);
    setProposal("");
    setAnalysis(null);
    setNotice("Unsaved edits discarded.");
  }

  useEffect(() => {
    checkGithub();
    // Initial connection check only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (repo) {
      loadBranches(repo).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repo]);

  useEffect(() => {
    if (repo && branch) {
      loadRemoteFiles("").catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch]);

  const fileTitle = editorFile || "Select a file";
  const rootLabel = page === "github"
    ? repo || "No repository selected"
    : projectName || "No local project opened";

  return (
    <div className="min-h-screen bg-[#0a0e16] text-slate-200">
      <header className="sticky top-0 z-20 border-b border-[#263043] bg-[#0d121d]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-950/40">
              <Code2 size={22} />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight text-white">
                CodeSential<span className="text-violet-400">.</span>
              </div>
              <div className="text-xs text-slate-500">AI code analysis & modernization</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-2 hidden items-center gap-2 rounded-full border border-[#2a3547] bg-[#111722] px-3 py-2 text-xs text-slate-400 md:flex">
              <CircleDot size={12} className={githubStatus === "Connected" ? "text-emerald-400" : "text-amber-400"} />
              GitHub: {githubStatus}
            </div>
            <ActionButton
              variant={page === "github" ? "primary" : "secondary"}
              onClick={() => {
                clearMessages();
                setPage("github");
              }}
            >
              <GitFork size={16} /> GitHub Workspace
            </ActionButton>
            <ActionButton
              variant={page === "local" ? "primary" : "secondary"}
              onClick={() => {
                clearMessages();
                setPage("local");
              }}
            >
              <HardDrive size={16} /> Local Workspace
            </ActionButton>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-4 px-4 py-5 lg:px-6">
        {(error || notice) && (
          <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
            error
              ? "border-red-500/30 bg-red-500/10 text-red-200"
              : "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          }`}>
            {error ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
            <div className="min-w-0 flex-1 break-words">{error || notice}</div>
            <button onClick={clearMessages} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#273142] bg-gradient-to-br from-[#151c2b] via-[#111722] to-[#17152a]">
          <div className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center md:p-6">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">
                <Sparkles size={14} /> {page === "github" ? "Repository intelligence" : "Local project intelligence"}
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
                {page === "github" ? "Your code. Connected." : "Your project. Under control."}
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {page === "github"
                  ? "Explore your GitHub repositories, inspect source files, analyze risks, and review AI modernization proposals."
                  : "Open a project folder, browse files, edit source code, analyze issues, and safely save reviewed changes."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {page === "github" ? (
                <>
                  <ActionButton onClick={() => runTask("github-refresh", loadRepos)} disabled={Boolean(busy)}>
                    {busy === "github-refresh" ? <LoaderCircle className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                    Refresh repositories
                  </ActionButton>
                  <ActionButton variant="primary" onClick={() => runTask("github-load", () => loadRemoteFiles(""))} disabled={!repo || !branch || Boolean(busy)}>
                    <FolderOpen size={16} /> Browse repository
                  </ActionButton>
                </>
              ) : (
                <>
                  <ActionButton variant="primary" onClick={openLocalProject} disabled={Boolean(busy)}>
                    <FolderOpen size={16} /> Open local project
                  </ActionButton>
                  <ActionButton onClick={() => loadLocalFiles()} disabled={!projectPath || Boolean(busy)}>
                    <RefreshCw size={16} /> Refresh files
                  </ActionButton>
                </>
              )}
            </div>
          </div>
        </section>

        {page === "github" ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-xl border border-[#273142] bg-[#101620]">
              <PanelTitle
                icon={GitFork}
                title="GitHub Explorer"
                right={<button onClick={() => runTask("github-refresh", loadRepos)} title="Refresh"><RefreshCw size={15} className="text-slate-400" /></button>}
              />
              <div className="space-y-4 p-4">
                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">REPOSITORY</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      placeholder="Search repositories..."
                      className="w-full rounded-lg border border-[#303a4c] bg-[#0b1018] py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                    />
                  </div>
                  <div className="mt-2 max-h-44 space-y-1 overflow-auto">
                    {filteredRepos.map((r) => {
                      const fullName = r.fullName || `${r.owner}/${r.name}`;
                      return (
                        <button
                          key={r.id || fullName}
                          onClick={() => chooseRepo(fullName)}
                          className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                            repo === fullName
                              ? "border-violet-500/50 bg-violet-500/10"
                              : "border-transparent hover:bg-[#1a2230]"
                          }`}
                        >
                          <div className="truncate text-sm font-medium text-slate-200">{fullName}</div>
                          <div className="mt-1 truncate text-xs text-slate-500">{r.description || "No description"}</div>
                        </button>
                      );
                    })}
                    {filteredRepos.length === 0 && (
                      <p className="px-2 py-3 text-xs leading-5 text-slate-500">
                        No repositories loaded. Check that GITHUB_TOKEN is configured on the backend, then refresh.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">BRANCH</label>
                  <SelectField value={branch} onChange={(e) => chooseBranch(e.target.value)} disabled={!repo}>
                    <option value="">Select a branch</option>
                    {branches.map((b) => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </SelectField>
                </div>

                <div className="border-t border-[#273142] pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Repository files</span>
                    <button
                      className="text-xs text-violet-300 hover:text-violet-200"
                      onClick={() => runTask("remote-files", () => loadRemoteFiles(""))}
                      disabled={!repo || !branch}
                    >
                      Root
                    </button>
                  </div>
                  <div className="mb-2 flex items-center gap-1 truncate text-xs text-slate-500">
                    <Folder size={13} /> {remotePath || "/"}
                  </div>
                  {remotePath && (
                    <button
                      className="mb-2 flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                      onClick={() => {
                        const previous = remoteHistory[remoteHistory.length - 1];
                        setRemoteHistory((h) => h.slice(0, -1));
                        runTask("remote-back", () => loadRemoteFiles(previous ?? ""));
                      }}
                    >
                      <ChevronRight size={13} className="rotate-180" /> Back to previous folder
                    </button>
                  )}
                  <div className="max-h-[360px] space-y-0.5 overflow-auto">
                    {filteredEntries.map((entry) => {
                      const isDir = ["dir", "tree", "directory", "folder"].includes(entry.type);
                      return (
                        <button
                          key={entry.path}
                          onClick={() => runTask("remote-open", () => openRemoteEntry(entry))}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[#1a2230] ${
                            remoteFile?.path === entry.path ? "bg-violet-500/10 text-violet-200" : "text-slate-300"
                          }`}
                        >
                          {isDir ? <Folder size={15} className="shrink-0 text-amber-300" /> : <FileCode2 size={15} className="shrink-0 text-sky-300" />}
                          <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                          {isDir && <ChevronRight size={13} className="text-slate-600" />}
                        </button>
                      );
                    })}
                    {repo && branch && remoteEntries.length === 0 && (
                      <p className="px-2 py-3 text-xs text-slate-500">No files shown. Browse the repository or check the backend response.</p>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-4">
              <WorkspaceEditor
                page={page}
                title={fileTitle}
                rootLabel={rootLabel}
                editorCode={editorCode}
                setEditorCode={(value) => {
                  setEditorCode(value);
                  if (isLocalFile) setDirty(true);
                }}
                language={language}
                setLanguage={setLanguage}
                dirty={dirty}
                readOnly={isRemoteFile}
                busy={busy}
                analyzeCode={analyzeCode}
                generateProposal={generateProposal}
                saveLocalFile={saveLocalFile}
                discardEditorChanges={discardEditorChanges}
                proposal={proposal}
                analysis={analysis}
                proposalSummary={proposalSummary}
                applyProposal={applyProposal}
                discardProposal={discardProposal}
                instructions={instructions}
                setInstructions={setInstructions}
                showComparison={showComparison}
                setShowComparison={setShowComparison}
              />
            </div>
          </section>
        ) : (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="overflow-hidden rounded-xl border border-[#273142] bg-[#101620]">
              <PanelTitle
                icon={HardDrive}
                title="Local Project Explorer"
                right={<button onClick={() => runTask("local-refresh", () => loadLocalFiles())} title="Refresh"><RefreshCw size={15} className="text-slate-400" /></button>}
              />
              <div className="space-y-4 p-4">
                <div className="rounded-lg border border-[#303a4c] bg-[#0b1018] p-3">
                  <div className="text-xs text-slate-500">OPEN PROJECT</div>
                  <div className="mt-1 break-all text-sm font-medium text-slate-200">{projectName || "No project opened"}</div>
                  {projectPath && <div className="mt-1 break-all text-xs text-slate-500">{projectPath}</div>}
                  <ActionButton variant="primary" className="mt-3 w-full" onClick={openLocalProject} disabled={Boolean(busy)}>
                    <FolderOpen size={15} /> {projectPath ? "Open another project" : "Choose project folder"}
                  </ActionButton>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-slate-400">SEARCH FILES</label>
                  <div className="relative">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      value={localSearch}
                      onChange={(e) => setLocalSearch(e.target.value)}
                      placeholder="Filter current folder..."
                      className="w-full rounded-lg border border-[#303a4c] bg-[#0b1018] py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Project files</span>
                    <span className="text-xs text-slate-600">{localEntries.length} items</span>
                  </div>
                  <div className="mb-2 flex items-center gap-1 break-all text-xs text-slate-500">
                    <Folder size={13} /> {localPath || "/"}
                  </div>
                  {localPath && (
                    <button
                      className="mb-2 flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                      onClick={() => {
                        const previous = localHistory[localHistory.length - 1];
                        setLocalHistory((h) => h.slice(0, -1));
                        runTask("local-back", () => loadLocalFiles(projectPath, previous ?? ""));
                      }}
                    >
                      <ChevronRight size={13} className="rotate-180" /> Back to previous folder
                    </button>
                  )}
                  <div className="max-h-[460px] space-y-0.5 overflow-auto">
                    {filteredEntries.map((entry) => {
                      const isDir = ["dir", "directory", "folder"].includes(entry.type);
                      return (
                        <button
                          key={entry.path}
                          onClick={() => openLocalEntry(entry)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[#1a2230] ${
                            localFile?.path === entry.path ? "bg-violet-500/10 text-violet-200" : "text-slate-300"
                          }`}
                        >
                          {isDir ? <Folder size={15} className="shrink-0 text-amber-300" /> : <FileCode2 size={15} className="shrink-0 text-sky-300" />}
                          <span className="min-w-0 flex-1 truncate">{entry.name}</span>
                          {isDir && <ChevronRight size={13} className="text-slate-600" />}
                        </button>
                      );
                    })}
                    {!projectPath && (
                      <p className="px-2 py-3 text-xs leading-5 text-slate-500">Open a project folder to browse its files.</p>
                    )}
                  </div>
                </div>
              </div>
            </aside>

            <div className="min-w-0 space-y-4">
              <WorkspaceEditor
                page={page}
                title={fileTitle}
                rootLabel={rootLabel}
                editorCode={editorCode}
                setEditorCode={(value) => {
                  setEditorCode(value);
                  if (isLocalFile) setDirty(true);
                }}
                language={language}
                setLanguage={setLanguage}
                dirty={dirty}
                readOnly={false}
                busy={busy}
                analyzeCode={analyzeCode}
                generateProposal={generateProposal}
                saveLocalFile={saveLocalFile}
                discardEditorChanges={discardEditorChanges}
                proposal={proposal}
                analysis={analysis}
                proposalSummary={proposalSummary}
                applyProposal={applyProposal}
                discardProposal={discardProposal}
                instructions={instructions}
                setInstructions={setInstructions}
                showComparison={showComparison}
                setShowComparison={setShowComparison}
              />
            </div>
          </section>
        )}

        <footer className="flex flex-col justify-between gap-2 border-t border-[#202a39] py-4 text-xs text-slate-600 sm:flex-row sm:items-center">
          <span>CodeSential · AI-assisted code modernization</span>
          <span className="flex items-center gap-2">
            <ShieldCheck size={13} /> Review AI changes before saving
            <span>·</span>
            <span>{page === "github" ? "GitHub files are read-only" : "Local files can be saved"}</span>
          </span>
        </footer>
      </main>
    </div>
  );
}

function WorkspaceEditor({
  page,
  title,
  rootLabel,
  editorCode,
  setEditorCode,
  language,
  setLanguage,
  dirty,
  readOnly,
  busy,
  analyzeCode,
  generateProposal,
  saveLocalFile,
  discardEditorChanges,
  proposal,
  analysis,
  proposalSummary,
  applyProposal,
  discardProposal,
  instructions,
  setInstructions,
  showComparison,
  setShowComparison
}) {
  const languageOptions = [
    "javascript", "typescript", "python", "java", "cpp", "c", "csharp", "go", "rust", "html", "css", "json"
  ];

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-[#273142] bg-[#101620]">
        <PanelTitle
          icon={Code2}
          title="Source Editor"
          right={
            <div className="flex items-center gap-2">
              {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
              {readOnly && <span className="rounded-md border border-sky-500/20 bg-sky-500/10 px-2 py-1 text-xs text-sky-300">Read-only</span>}
            </div>
          }
        />

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#273142] bg-[#0d131d] px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-slate-200">{title}</div>
            <div className="mt-1 truncate text-xs text-slate-500">{rootLabel}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-32">
              <SelectField value={language} onChange={(e) => setLanguage(e.target.value)}>
                {languageOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </SelectField>
            </div>
            <ActionButton onClick={discardEditorChanges}>
              <RefreshCw size={14} /> Reset
            </ActionButton>
            {page === "local" && (
              <ActionButton variant="success" onClick={saveLocalFile} disabled={!dirty || !title || Boolean(busy)}>
                <Save size={14} /> Save
              </ActionButton>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 2xl:grid-cols-2">
          <div className="min-w-0">
            <div className="flex items-center justify-between border-b border-[#273142] bg-[#121a27] px-4 py-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <FileCode2 size={14} className="text-sky-300" /> Original code
              </span>
              <span className="text-xs text-slate-600">{editorCode.split("\n").length} lines</span>
            </div>
            <textarea
              value={editorCode}
              onChange={(e) => setEditorCode(e.target.value)}
              readOnly={readOnly}
              spellCheck={false}
              placeholder={page === "github" ? "Select a file from the GitHub explorer..." : "Open a local file or paste code here..."}
              className="min-h-[360px] w-full resize-y bg-[#0b1018] p-4 font-mono text-[13px] leading-6 text-slate-200 outline-none selection:bg-violet-500/30 read-only:text-slate-300"
            />
          </div>

          <div className="min-w-0 border-t border-[#273142] 2xl:border-l 2xl:border-t-0">
            <div className="flex items-center justify-between border-b border-[#273142] bg-[#121a27] px-4 py-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Sparkles size={14} className="text-violet-300" /> AI proposal
              </span>
              <span className="text-xs text-slate-600">{proposal ? `${proposal.split("\n").length} lines` : "Not generated"}</span>
            </div>
            {proposal ? (
              <textarea
                value={proposal}
                onChange={() => {}}
                readOnly
                spellCheck={false}
                className="min-h-[360px] w-full resize-y bg-[#0b1018] p-4 font-mono text-[13px] leading-6 text-emerald-200 outline-none"
              />
            ) : (
              <div className="flex min-h-[360px] flex-col items-center justify-center bg-[#0b1018] px-6 py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10">
                  <ArrowLeftRight size={24} className="text-violet-300" />
                </div>
                <div className="text-sm font-semibold text-slate-300">Compare before you change</div>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Generate an AI proposal to see your current code beside the suggested version.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 border-t border-[#273142] bg-[#0d131d] p-4">
          <label className="block text-xs font-medium text-slate-400">MODERNIZATION INSTRUCTIONS</label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={2}
            className="w-full resize-y rounded-lg border border-[#303a4c] bg-[#0b1018] px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500"
            placeholder="Tell the AI what to improve..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton variant="secondary" onClick={analyzeCode} disabled={!editorCode.trim() || Boolean(busy)}>
              {busy === "analyze" ? <LoaderCircle size={15} className="animate-spin" /> : <Activity size={15} />}
              Analyze code
            </ActionButton>
            <ActionButton variant="primary" onClick={generateProposal} disabled={!editorCode.trim() || Boolean(busy)}>
              {busy === "modernize" ? <LoaderCircle size={15} className="animate-spin" /> : <Zap size={15} />}
              Generate proposal
            </ActionButton>
            {proposal && (
              <>
                <ActionButton variant="success" onClick={applyProposal} disabled={readOnly}>
                  <Check size={15} /> Apply proposal
                </ActionButton>
                <ActionButton variant="danger" onClick={discardProposal}>
                  <XCircle size={15} /> Reject
                </ActionButton>
              </>
            )}
            <div className="ml-auto">
              <button
                onClick={() => setShowComparison((value) => !value)}
                className="text-xs text-slate-400 hover:text-white"
              >
                {showComparison ? "Comparison enabled" : "Comparison setting"} · {showComparison ? "On" : "Off"}
              </button>
            </div>
          </div>
          {proposal && proposalSummary && (
            <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3 text-sm text-violet-100">
              <div className="mb-1 flex items-center gap-2 font-semibold"><Sparkles size={14} /> Proposal summary</div>
              <p className="text-xs leading-5 text-slate-300">{proposalSummary}</p>
            </div>
          )}
          {proposal && !showComparison && (
            <p className="text-xs text-amber-300">The comparison panels are still visible; use the original and proposal panels above to review changes.</p>
          )}
        </div>
      </section>

      {analysis && (
        <section className="overflow-hidden rounded-xl border border-[#273142] bg-[#101620]">
          <PanelTitle icon={ShieldCheck} title="AI Analysis Report" />
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-[#2c3748] bg-[#0b1018] p-3">
                <div className="text-xs text-slate-500">Risk level</div>
                <div className="mt-1 text-lg font-semibold text-amber-300">{analysis.riskLevel || analysis.risk_level || "Not specified"}</div>
              </div>
              <div className="rounded-lg border border-[#2c3748] bg-[#0b1018] p-3">
                <div className="text-xs text-slate-500">Findings</div>
                <div className="mt-1 text-lg font-semibold text-white">{(analysis.findings || []).length}</div>
              </div>
              <div className="rounded-lg border border-[#2c3748] bg-[#0b1018] p-3">
                <div className="text-xs text-slate-500">Analysis status</div>
                <div className="mt-1 flex items-center gap-2 text-lg font-semibold text-emerald-300"><CheckCircle2 size={17} /> Complete</div>
              </div>
            </div>

            {analysis.summary && (
              <div>
                <h3 className="mb-1 text-sm font-semibold text-slate-200">Summary</h3>
                <p className="text-sm leading-6 text-slate-400">{analysis.summary}</p>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Findings</h3>
              {(analysis.findings || []).length ? (
                <div className="space-y-2">
                  {analysis.findings.map((finding, index) => (
                    <div key={index} className="rounded-lg border border-[#2c3748] bg-[#0b1018] p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-md px-2 py-1 text-[10px] font-bold uppercase ${
                          String(finding.severity || "").toLowerCase() === "high" || String(finding.severity || "").toLowerCase() === "critical"
                            ? "bg-red-500/10 text-red-300"
                            : String(finding.severity || "").toLowerCase() === "medium"
                              ? "bg-amber-500/10 text-amber-300"
                              : "bg-sky-500/10 text-sky-300"
                        }`}>{finding.severity || "Info"}</span>
                        <span className="text-sm font-medium text-slate-200">{finding.title || finding.type || `Finding ${index + 1}`}</span>
                        {finding.line && <span className="text-xs text-slate-600">Line {finding.line}</span>}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-slate-400">{finding.description || finding.message || ""}</p>
                      {finding.recommendation && <p className="mt-2 text-xs leading-5 text-emerald-300">Recommendation: {finding.recommendation}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No structured findings were returned.</p>
              )}
            </div>

            {analysis.positiveNotes?.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-200">Positive notes</h3>
                <ul className="space-y-1 text-sm text-slate-400">
                  {analysis.positiveNotes.map((item, i) => <li key={i}>• {item}</li>)}
                </ul>
              </div>
            )}
            {analysis.limitations && (
              <p className="text-xs leading-5 text-slate-500">Limitations: {analysis.limitations}</p>
            )}
          </div>
        </section>
      )}
    </>
  );
}

function detectLanguage(filePath = "") {
  const ext = filePath.split(".").pop()?.toLowerCase();
  const languages = {
    js: "javascript",
    jsx: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    java: "java",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    go: "go",
    rs: "rust",
    html: "html",
    css: "css",
    json: "json"
  };
  return languages[ext] || "javascript";
}
