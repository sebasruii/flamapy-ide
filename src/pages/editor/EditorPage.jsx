/* eslint-disable react/prop-types */
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "react-resizable/css/styles.css";
import ModelInformation from "../../components/ModelInformation";
import { UVLEditor } from "@flamapy/web-ui";
import TitleBar from "../../components/layout/TitleBar";
import ActionToolbar from "../../components/layout/ActionToolbar";
import ActivityBar from "../../components/layout/ActivityBar";
import EditorTabs from "../../components/layout/EditorTabs";
import BottomPanel from "../../components/layout/BottomPanel";
import StatusBar from "../../components/layout/StatusBar";
import { saveAs } from "file-saver";
import { OperationInputModal } from "@flamapy/web-ui";
import {
  WASM,
  REST,
  installedBackends,
  solverOptionsFromCatalog,
  structuralOperationsFromCatalog,
  analysisOperationsForSolver,
} from "@flamapy/web-core";
import {
  OPEN_BACKEND_SETTINGS,
  OPEN_PLUGIN_MANAGER,
} from "@flamapy/plugin-flamapy-engine";
import { START_OPTIMIZATION } from "@flamapy/plugin-view-charts";
import { CONFIGURATOR_VIEW_ID } from "@flamapy/plugin-configurator";
import { createWorkbench } from "../../workbench/createWorkbench";
import { builtinPlugins } from "../../workbench/builtinPlugins";
import { useContributionStore } from "../../workbench/useContributionStore";
import { useEngine } from "../../workbench/useEngine";
import { ToolbarMenuSlot } from "../../workbench/slots/ToolbarMenuSlot";
import { StatusBarSlot } from "../../workbench/slots/StatusBarSlot";
import { SidebarSlot } from "../../workbench/slots/SidebarSlot";
import { ViewOutlet } from "../../workbench/slots/ViewOutlet";
import { ModalOutlet } from "../../workbench/slots/ModalOutlet";

// The analysis/structural operation menus are derived at runtime from the plugin
// capability catalog the Pyodide bridge reports (which backends implement which
// operations), so runtime-installed plugins surface without an IDE edit. The
// derivation + the IDE's presentation layer (labels, input prompts, order, the one
// legacy modal operation) live in @flamapy/web-core (operationCatalog); the worker,
// validation and dispatch live in the flamapy-engine plugin's services.

const EXPORT_OPERATIONS = [
  { label: "AFM", value: "afm" },
  { label: "Glencoe", value: "gfm.json" },
  { label: "JSON", value: "json" },
  { label: "SPLOT", value: "sxfm" },
  { label: "Download UVL", value: "uvl" },
];

// Collaboration endpoint when VITE_COLLAB_URL is not set: derive it from the page's
// own origin so the all-in-one Docker image (nginx proxies /collab to the bundled
// collab server) works on localhost or any domain without a rebuild. Falls back to
// the local dev server when there is no window (e.g. tests).
function defaultCollabEndpoint() {
  if (typeof window === "undefined") return "ws://localhost:1234";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/collab`;
}

function EditorPage({ selectedFile, darkMode, toggleDark }) {
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);
  const docIdFromQuery = searchParams.get("doc");
  const collabFeatureAvailable = import.meta.env.VITE_ENABLE_COLLAB === "true";
  const collabEnabled = collabFeatureAvailable && !!docIdFromQuery;
  const collabEndpoint = import.meta.env.VITE_COLLAB_URL || defaultCollabEndpoint();
  const collabConfig = collabEnabled
    ? { enabled: true, docId: docIdFromQuery, endpoint: collabEndpoint }
    : { enabled: false };

  // ---------------------------------------------------------------------------
  // v3 workbench: the plugin host, the shell-owned document and the contribution
  // stores the chrome renders from. The flamapy engine (Pyodide worker, catalog,
  // validation, dispatch) is a plugin; its services arrive through useEngine.
  // ---------------------------------------------------------------------------
  const workbenchRef = useRef(null);
  if (!workbenchRef.current) {
    workbenchRef.current = createWorkbench("");
  }
  const workbench = workbenchRef.current;

  const [isRunning, setIsRunning] = useState(false);
  const [isImported, setIsImported] = useState(true);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [lastOutputHeight, setLastOutputHeight] = useState(150);
  const [output, setOutput] = useState({
    label: "Loading Flamapy...",
    result: selectedFile ? `Importing model '${selectedFile.name}'` : "FlamapyIDE is starting",
  });
  const [copyMessage, setCopyMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [uvlhubMessage, setUvlhubMessage] = useState("");
  const [collabStatus, setCollabStatus] = useState("");
  const [initialContent, setInitialContent] = useState("");
  // Model metrics (right panel) — fetched separately from validation because
  // some metrics are full analyses and must not run on every (debounced) keystroke.
  const [modelInfo, setModelInfo] = useState(null);
  const [currentView, setCurrentView] = useState("source");
  const [showConfiguratorPanel, setShowConfiguratorPanel] = useState(true);
  const [modelInfoOpen, setModelInfoOpen] = useState(true);
  const [panelTab, setPanelTab] = useState("output");

  // Operation-argument modal state ({ action, options } while open, else null)
  const [inputModal, setInputModal] = useState(null);

  const [pluginModals, setPluginModals] = useState([]);
  const nextModalKeyRef = useRef(0);
  const currentViewRef = useRef("source");
  currentViewRef.current = currentView;
  const editorRef = useRef(null);

  // Delegates capture the freshest state each render (plugins call through them).
  workbench.delegates.showOutput = (label, result) => setOutput({ label, result });
  workbench.delegates.openModal = (render) => {
    const key = nextModalKeyRef.current++;
    setPluginModals((open) => [...open, { key, render }]);
  };
  workbench.delegates.setActiveView = (id) => setCurrentView(id);
  workbench.delegates.getActiveView = () => currentViewRef.current;

  const closePluginModal = useCallback(
    (key) => setPluginModals((open) => open.filter((modal) => modal.key !== key)),
    []
  );

  // Activate the built-in plugins once (the engine among them).
  useEffect(() => {
    for (const plugin of builtinPlugins) {
      workbench.host.register(plugin);
    }
    workbench.host.activateAll();
    return () => {
      workbench.host.deactivateAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const engine = useEngine(workbench);
  const { isLoaded, pluginCatalog, validation, restApiUrl, selectedSolver } = engine;
  const computeBackend = engine.computeBackend ?? WASM;

  const call = useCallback(
    (action, data) => {
      if (!engine.services) return Promise.reject(new Error("Engine not ready"));
      return engine.services.worker.call(action, data);
    },
    [engine.services]
  );

  // Contributed views become tabs; plugins can observe the active view.
  const contributedViews = useContributionStore(workbench.stores.views);
  useEffect(() => {
    workbench.notifyActiveViewChanged(currentView);
  }, [workbench, currentView]);

  // Non-'editor' document writes (imports, diagram edits) land in monaco. Monaco's own
  // changes flow the other way via UVLEditor's onContentChange below.
  useEffect(() => {
    const subscription = workbench.documents.onDidChange(({ text, origin }) => {
      if (origin === "editor") return;
      const editor = editorRef.current;
      if (editor && editor.getValue() !== text) {
        editor.setValue(text);
      }
    });
    return () => subscription.dispose();
  }, [workbench]);

  // Which solver backends are installed, derived from the capability catalog the
  // worker reports (updated live when a plugin is installed at runtime). Gates the
  // solver tabs, the bdd-only metrics views, and the "keep selectedSolver valid".
  const enabledPlugins = useMemo(() => {
    if (!pluginCatalog) return { sat: true, bdd: true, z3: true };
    const enabled = {};
    for (const backend of installedBackends(pluginCatalog)) enabled[backend] = true;
    return enabled;
  }, [pluginCatalog]);

  // When worker finishes loading, update output and trigger file import if needed
  useEffect(() => {
    if (isLoaded) {
      setOutput({
        label: "Flamapy is ready",
        result: "Here you will see the result of executing an operation",
      });
      if (selectedFile) setIsImported(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Restore editor content on startup: URL ?model= param takes priority over localStorage
  useEffect(() => {
    if (isLoaded && isEditorReady && !selectedFile) {
      const modelParam = searchParams.get("model");
      if (modelParam) {
        try {
          const decoded = decodeURIComponent(escape(atob(modelParam)));
          editorRef.current.setValue(decoded);
          setInitialContent(decoded);
          return;
        } catch { /* ignore malformed param */ }
      }
      const saved = localStorage.getItem("flamapy-ide-content");
      if (saved) {
        editorRef.current.setValue(saved);
        setInitialContent(saved);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isEditorReady]);

  const viewOptions = useMemo(() => [
    { label: "Source", value: "source" },
  ], []);

  // Solver tabs + operation menus, derived from the plugin capability catalog.
  const solverOptions = useMemo(() => solverOptionsFromCatalog(pluginCatalog), [pluginCatalog]);
  const structuralOptions = useMemo(
    () => structuralOperationsFromCatalog(pluginCatalog),
    [pluginCatalog]
  );
  const analysisOptions = useMemo(
    () => analysisOperationsForSolver(pluginCatalog, selectedSolver),
    [pluginCatalog, selectedSolver]
  );

  const setSelectedSolver = useCallback(
    (solver) => engine.services?.analysis.setSelectedSolver(solver),
    [engine.services]
  );

  // Keep selectedSolver valid after config loads
  useEffect(() => {
    if (!enabledPlugins[selectedSolver]) {
      const first = Object.entries(enabledPlugins).find(([, v]) => v);
      if (first) setSelectedSolver(first[0]);
    }
  }, [enabledPlugins, selectedSolver, setSelectedSolver]);

  // Import file once worker and editor are both ready
  useEffect(() => {
    if (selectedFile && isLoaded && !isImported && isEditorReady) {
      const reader = new FileReader();
      const fileName = selectedFile.name;
      const fileExtension = fileName.substring(fileName.indexOf(".") + 1);
      reader.onload = async (e) => {
        const fileContent = e.target.result;
        setInitialContent(fileContent);
        if (fileExtension === "uvl") {
          editorRef.current.setValue(fileContent);
          editorRef.current.layout();
          setIsImported(true);
        } else {
          try {
            const result = await call("importModel", { fileContent, fileExtension });
            editorRef.current.setValue(result);
            setInitialContent(result);
            editorRef.current.layout();
            setIsImported(true);
          } catch (error) {
            setOutput({
              label: "Import error",
              result: error.message?.includes("not_supported")
                ? "The provided file extension is not supported. Try: .gfm.json, .afm, .fide, .json, .xml or .uvl"
                : "There was an error importing the model. Please verify it is valid.",
            });
            setIsImported(true);
          }
        }
      };
      reader.readAsText(selectedFile);
    }
  }, [isLoaded, isImported, selectedFile, call, isEditorReady]);

  useEffect(() => {
    if (currentView === CONFIGURATOR_VIEW_ID) setShowConfiguratorPanel(true);
  }, [currentView]);

  const handleResize = (e, data) => {
    e.preventDefault();
    if (data.size.height !== lastOutputHeight) {
      editorRef.current.layout({});
      setLastOutputHeight(data.size.height);
    }
  };

  // Shell-side validation wrapper: persist the content (document concerns), then let the
  // engine validate the document text. The engine tracks staleness by document version.
  function validateModel() {
    if (!isLoaded || !engine.services) return Promise.resolve(null);
    const code = editorRef.current.getValue();
    setInitialContent(code);
    if (!collabConfig.enabled) {
      localStorage.setItem("flamapy-ide-content", code);
    }
    return engine.services.analysis.validateNow().then((result) => {
      if (result) {
        setModelInfo(null); // metrics refer to the previous model — refetch on demand
      }
      return result;
    });
  }

  async function ensureValidated() {
    if (!engine.services) return null;
    return engine.services.analysis.ensureValidated();
  }

  // The right panel's Validate button also computes the model metrics, which
  // are deliberately excluded from per-keystroke validation (they include full
  // analyses such as core features and atomic sets).
  async function handleValidateClick() {
    const result = await validateModel();
    if (result?.valid) {
      try {
        setModelInfo(await call("getModelInformation"));
      } catch (error) {
        setOutput({ label: "Model information", result: error.message });
      }
    }
  }

  async function executeAction(action) {
    if (!isLoaded) return;
    const currentValidation = await ensureValidated();
    if (!currentValidation?.valid) {
      setOutput({ label: action.label, result: "Error: the model is not valid. Fix syntax errors and retry." });
      return;
    }

    if (action.engine === "legacy" && action.value === "AttributeOptimization") {
      workbench.shell.commands.execute(START_OPTIMIZATION, {
        backend: action.backendAware ? selectedSolver : "z3",
      });
      return;
    }

    if (action.input) {
      // Operation needs an extra argument: collect it via a modal, then run.
      let options = [];
      if (action.input.kind === "feature") {
        try {
          options = await call("getFeatures");
        } catch (error) {
          setOutput({ label: action.label, result: error.message });
          return;
        }
      }
      setInputModal({ action, options });
      return;
    }

    runOperation(action);
  }

  async function runOperation(action) {
    const { analysis } = engine.services;
    setIsRunning(true);
    setOutput({ label: action.label, result: "Executing operation" });
    try {
      const result = await analysis.runOperation(action);
      setOutput({ label: action.label, result });
    } catch (error) {
      setOutput({ label: action.label, result: analysis.describeError(error) });
    }
    setIsRunning(false);
  }

  function confirmInputOperation(value) {
    const { action } = inputModal;
    setInputModal(null);
    runOperation({ ...action, args: { ...(action.args || {}), [action.input.arg]: value } });
  }

  function interruptExecution() {
    if (!isLoaded || !engine.services) return;
    const { worker } = engine.services;
    // Fast path: raise KeyboardInterrupt inside the running Python operation
    // (needs cross-origin isolation). The pending call rejects and is shown as
    // "Operation interrupted." — Flamapy itself stays loaded.
    if (worker.interrupt()) {
      setOutput({ label: "Execution interrupted", result: "Stopping the running operation…" });
      return;
    }
    // Fallback (no SharedArrayBuffer): tear down and reload the whole runtime.
    worker.restart();
    setIsRunning(false);
    setOutput({ label: "Execution interrupted", result: "Re-starting Flamapy..." });
  }

  async function downloadFile(action) {
    if (!isLoaded) return;
    try {
      const result = await engine.services.analysis.exportModel(action.value);
      saveAs(new File([result], `model.${action.value}`, { type: "text/plain;charset=utf-8" }));
    } catch (error) {
      setOutput({ label: "Export failed", result: error.message });
    }
  }

  async function toggleView(option) {
    if (!isLoaded) return;
    const currentValidation = await ensureValidated();
    if (!currentValidation?.valid) {
      const messages = {
      };
      setOutput({ label: option.label, result: messages[option.value] ?? "The model is not valid." });
      return;
    }

    setCurrentView(option.value);
  }

  // Browsers and intermediaries start rejecting URLs in the low tens of KB;
  // stay safely below that when embedding the whole model in a link.
  const MAX_SHARE_URL_LENGTH = 8000;

  async function handleSaveToUVLHub() {
    const currentValidation = await ensureValidated();
    if (!currentValidation?.valid) {
      setUvlhubMessage("Model must be valid");
      setTimeout(() => setUvlhubMessage(""), 2000);
      return;
    }
    const code = editorRef.current?.getValue() || "";
    const encoded = btoa(unescape(encodeURIComponent(code)));
    if (encoded.length > MAX_SHARE_URL_LENGTH) {
      setUvlhubMessage("Model too large to send as a link");
      setTimeout(() => setUvlhubMessage(""), 3000);
      return;
    }
    const rawEndpoint = new URL("/raw/model.uvl", window.location.href);
    rawEndpoint.searchParams.set("model", encoded);
    const uvlhubBase = import.meta.env.VITE_UVLHUB_URL || "https://www.uvlhub.io";
    const uvlhubUrl = new URL("/dataset/import/", uvlhubBase);
    uvlhubUrl.searchParams.set("import", rawEndpoint.toString());
    window.open(uvlhubUrl.toString(), "_blank", "noopener,noreferrer");
  }

  async function handleCopyModelLink() {
    const code = editorRef.current?.getValue() || "";
    const encoded = btoa(unescape(encodeURIComponent(code)));
    if (encoded.length > MAX_SHARE_URL_LENGTH) {
      setShareMessage("Model too large to share as a link");
      setTimeout(() => setShareMessage(""), 3000);
      return;
    }
    const url = new URL("/editor", window.location.href);
    url.searchParams.set("model", encoded);
    try {
      await navigator.clipboard.writeText(url.toString());
      setShareMessage("Link copied!");
    } catch {
      setShareMessage("Unable to copy");
    }
    setTimeout(() => setShareMessage(""), 2000);
  }

  async function handleCopySessionLink() {
    if (!collabEnabled || !docIdFromQuery) return;
    const url = new URL(window.location.href);
    url.searchParams.set("doc", docIdFromQuery);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyMessage("Session link copied");
    } catch {
      setCopyMessage("Unable to copy link");
    }
    setTimeout(() => setCopyMessage(""), 2000);
  }

  const generateDocId = useCallback(() => {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }, []);

  async function checkCollabHealth() {
    try {
      const wsUrl = new URL(collabEndpoint);
      const healthUrl = new URL(wsUrl);
      healthUrl.protocol = wsUrl.protocol === "wss:" ? "https:" : "http:";
      // Append /health to the endpoint path so it works for both a same-origin
      // proxied endpoint (…/collab -> …/collab/health) and a bare host:port one.
      healthUrl.pathname = `${wsUrl.pathname.replace(/\/+$/, "")}/health`;
      const res = await fetch(healthUrl.toString(), { mode: "cors" });
      return res.ok;
    } catch {
      return false;
    }
  }

  async function handleStartCollab() {
    if (!collabFeatureAvailable) {
      setCollabStatus("Enable VITE_ENABLE_COLLAB=true to use collaboration.");
      return;
    }
    const warning =
      "This feature relies on a backend server. Your file will no longer be sandboxed to this machine. Continue?";
    if (!window.confirm(warning)) { setCollabStatus(""); return; }
    setCollabStatus("Checking collaboration backend…");
    if (!(await checkCollabHealth())) {
      setCollabStatus("Collaboration backend is not responding.");
      return;
    }
    setInitialContent(editorRef.current?.getValue() || initialContent || "");
    const newDocId = generateDocId();
    const nextSearch = new URLSearchParams(location.search);
    nextSearch.set("doc", newDocId);
    navigate({ pathname: location.pathname, search: nextSearch.toString() });
    setCollabStatus("Session created. Share the link to collaborate.");
  }

  // VSCode-style editor tabs: base views + metrics + plugin-contributed views, plus a
  // dynamic tab for the configurator / pareto-front / dynamic plugin views while active.
  const editorTabs = useMemo(() => {
    const tabs = [...viewOptions];
    for (const view of contributedViews) {
      if (!view.dynamic || view.id === currentView) {
        tabs.push({ label: view.title, value: view.id, contributed: true });
      }
    }
    return tabs;
  }, [viewOptions, contributedViews, currentView]);

  // Contributed tabs open through the shell (running the view's onBeforeOpen guard);
  // legacy tabs keep the toggleView side effects.
  const selectTab = useCallback(
    (tab) => {
      if (tab.contributed) {
        workbench.shell.views.open(tab.value);
        return;
      }
      toggleView(tab);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [workbench]
  );

  // Status-bar backend control toggles between in-browser WASM and the remote API
  // (switching to REST opens the engine's settings modal via its command).
  const toggleComputeBackend = useCallback(() => {
    if (!engine.services) return;
    const next = computeBackend === WASM ? REST : WASM;
    engine.services.analysis.setComputeBackend(next);
    if (next === REST) workbench.shell.commands.execute(OPEN_BACKEND_SETTINGS);
  }, [computeBackend, engine.services, workbench]);

  return (
    <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-surface dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <TitleBar darkMode={darkMode} toggleDark={toggleDark} />

      <ActionToolbar
        structuralOptions={structuralOptions}
        executeAction={executeAction}
        solverOptions={solverOptions}
        selectedSolver={selectedSolver}
        setSelectedSolver={setSelectedSolver}
        analysisOptions={analysisOptions}
        exportOptions={EXPORT_OPERATIONS}
        downloadFile={downloadFile}
        onShareLink={handleCopyModelLink}
        shareMessage={shareMessage}
        onUvlhub={handleSaveToUVLHub}
        uvlhubMessage={uvlhubMessage}
        collab={{
          enabled: collabEnabled,
          available: collabFeatureAvailable,
          onCopySession: handleCopySessionLink,
          copyMessage,
          onStart: handleStartCollab,
          status: collabStatus,
        }}
      >
        <ToolbarMenuSlot store={workbench.stores.toolbarMenus} />
      </ActionToolbar>

      <div className="flex flex-1 overflow-hidden">
        <ActivityBar
          sidebarOpen={showConfiguratorPanel}
          onToggleSidebar={() => setShowConfiguratorPanel((o) => !o)}
          modelInfoOpen={modelInfoOpen}
          onToggleModelInfo={() => setModelInfoOpen((o) => !o)}
          onOpenBackend={() => workbench.shell.commands.execute(OPEN_BACKEND_SETTINGS)}
          onOpenPlugins={() => workbench.shell.commands.execute(OPEN_PLUGIN_MANAGER)}
        />

        <SidebarSlot
          store={workbench.stores.sidebarPanels}
          side="left"
          visible={showConfiguratorPanel}
        />

        <div className="flex flex-1 flex-col overflow-hidden">
          <EditorTabs tabs={editorTabs} currentView={currentView} onSelect={selectTab} />

          <div className="flex flex-1 flex-col overflow-hidden relative">
            <UVLEditor
              editorRef={editorRef}
              validateModel={validateModel}
              defaultCode={initialContent}
              hide={currentView !== "source"}
              collabConfig={collabConfig}
              onEditorMount={() => setIsEditorReady(true)}
              onContentChange={(text) => workbench.documents.setText(text, "editor")}
              darkMode={darkMode}
            />
            <ViewOutlet store={workbench.stores.views} activeViewId={currentView} />
          </div>

          <BottomPanel
            panelTab={panelTab}
            setPanelTab={setPanelTab}
            output={output}
            validation={validation}
            isAwaiting={isRunning || !isImported || !isLoaded}
            handleResize={handleResize}
            handleStop={interruptExecution}
          />
        </div>

        {modelInfoOpen && (
          <ModelInformation
            onValidateModel={handleValidateClick}
            validation={validation}
            modelInfo={modelInfo}
          />
        )}
        <SidebarSlot store={workbench.stores.sidebarPanels} side="right" />
      </div>

      <StatusBar
        isLoaded={isLoaded}
        isAwaiting={isRunning || !isImported || !isLoaded}
        validation={validation}
        onShowProblems={() => setPanelTab("problems")}
        computeBackend={computeBackend}
        WASM={WASM}
        onToggleBackend={toggleComputeBackend}
        restApiUrl={restApiUrl}
        selectedSolver={selectedSolver}
        extraLeft={<StatusBarSlot store={workbench.stores.statusBarItems} side="left" />}
        extraRight={<StatusBarSlot store={workbench.stores.statusBarItems} side="right" />}
      />

      <ModalOutlet modals={pluginModals} onClose={closePluginModal} />

      {inputModal && (
        <OperationInputModal
          action={inputModal.action}
          options={inputModal.options}
          onConfirm={confirmInputOperation}
          onCancel={() => setInputModal(null)}
        />
      )}
    </div>
  );
}

export default EditorPage;
