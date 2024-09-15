/* eslint-disable react/prop-types */
import { useEffect, useState, useRef } from "react";
import "react-resizable/css/styles.css";
import ModelInformation from "../../components/ModelInformation";
import ExecutionOutput from "../../components/ExecutionOutput";
import UVLEditor from "../../components/UVLEditor";
import Toolbar from "../../components/Toolbar";
import DropdownMenu from "../../components/DropdownMenu";
import { saveAs } from "file-saver";
import TreeView from "../../components/FeatureTree";

function EditorPage({ selectedFile }) {
  const [worker, setWorker] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isImported, setIsImported] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [lastOutputHeight, setLastOutputHeight] = useState(150);
  const [output, setOutput] = useState({
    label: "Loading Flamapy...",
    result: selectedFile
      ? `Importing model '${selectedFile.name}'`
      : "FlamapyIDE is starting",
  });
  const [featureTree, setFeatureTree] = useState(null);

  const editorRef = useRef(null);

  const SATOperations = [
    { label: "Configurations", value: "PySATConfigurations" },
    { label: "Number of configurations", value: "PySATConfigurationsNumber" },
    { label: "Dead features", value: "PySATDeadFeatures" },
    { label: "Diagnosis", value: "PySATDiagnosis" },
    { label: "False optional features", value: "PySATFalseOptionalFeatures" },
    { label: "Satisfiable", value: "PySATSatisfiable" },
  ];
  const BDDOperations = [
    { label: "Configurations", value: "BDDConfigurations" },
    { label: "Number of configurations", value: "BDDConfigurationsNumber" },
    { label: "Dead features", value: "BDDDeadFeatures" },
    { label: "Satisfiable", value: "BDDSatisfiable" },
    { label: "Configuration distribution", value: "BDDProductDistribution" },
    {
      label: "Feature Inclusion Probability",
      value: "BDDFeatureInclusionProbability",
    },
    { label: "Unique Features", value: "BDDUniqueFeatures" },
    { label: "Homogeneity", value: "BDDHomogeneity" },
    { label: "Variability", value: "BDDVariability" },
    { label: "Variant Features", value: "BDDVariantFeatures" },
  ];

  const exportOperations = [
    { label: "AFM", value: "afm" },
    { label: "Glencoe", value: "gfm.json" },
    { label: "JSON", value: "json" },
    { label: "SPLOT", value: "sxfm" },
    { label: "Download UVL", value: "uvl" },
  ];

  function initializeWorker() {
    const flamapyWorker = new Worker("/webworker.js");
    flamapyWorker.onmessage = (event) => {
      if (event.data.status === "loaded") {
        setIsLoaded(true);
        setOutput({
          label: "Flamapy is ready",
          result: "Here you will see the result of executing an operation",
        });
        if (selectedFile) setIsImported(false);
      } else {
        console.error(event.data.exeption);
      }
    };
    setWorker(flamapyWorker);
    return flamapyWorker;
  }

  useEffect(() => {
    try {
      const flamapyWorker = initializeWorker();
      return () => {
        flamapyWorker.terminate();
      };
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    if (selectedFile && isLoaded && !isImported) {
      const reader = new FileReader();
      const fileName = selectedFile.name;
      const extensionIndexStart = fileName.indexOf(".") + 1;
      const fileExtension = fileName.substring(
        extensionIndexStart,
        fileName.length
      );
      reader.onload = (e) => {
        const fileContent = e.target.result; // Read file content as text
        if (fileExtension === "uvl") {
          editorRef.current.setValue(fileContent);
          editorRef.current.layout();
          setIsImported(true);
        } else {
          worker.postMessage({
            action: "importModel",
            data: { fileContent, fileExtension },
          });

          worker.onmessage = async (event) => {
            if (event.data.results !== undefined) {
              editorRef.current.setValue(event.data.results);
              await editorRef.current.layout();
              setIsImported(true);
            }
          };
        }
      };
      reader.readAsText(selectedFile);
    }
  }, [isLoaded, worker, isImported, selectedFile]);

  useEffect(() => {
    if (isValid && !isValid[0] && !isValid[1]) {
      worker.postMessage({
        action: "getFeatureTree",
      });

      worker.onmessage = (event) => {
        if (event.data.results !== undefined) {
          setFeatureTree(event.data.results);
        }
      };
    }
  }, [isValid, worker]);

  // eslint-disable-next-line no-unused-vars
  const handleResize = (e, data) => {
    e.preventDefault();
    if (data.size.height !== lastOutputHeight) {
      editorRef.current.layout({});
      setLastOutputHeight(data.size.height);
    }
  };

  async function validateModel() {
    if (isLoaded) {
      const code = editorRef.current.getValue();
      worker.postMessage({ action: "validateModel", data: code });

      worker.onmessage = (event) => {
        if (event.data.results !== undefined) {
          setIsValid(event.data.results);
        } else if (event.data.error) {
          console.error("Error:", event.data.error);
        }
      };
    }
  }

  async function executeAction(action) {
    if (isLoaded) {
      if (!isValid || isValid[0] || isValid[1]) {
        await validateModel();
      }
      worker.postMessage({ action: "executeAction", data: action });
      setIsRunning(true);
      setOutput({ label: action.label, result: "Executing operation" });
      worker.onmessage = (event) => {
        if (event.data.results !== undefined) {
          setOutput(event.data.results);
        } else if (event.data.error) {
          console.error("Error:", event.data.error);
        }
        setIsRunning(false);
      };
    }
  }

  async function executeActionWithConf(action, configuration) {
    if (isLoaded) {
      if (!isValid || isValid[0] || isValid[1]) {
        await validateModel();
      }
      worker.postMessage({
        action: "executeActionWithConf",
        data: { action, configuration },
      });
      setIsRunning(true);
      setOutput({ label: action.label, result: "Executing operation" });
      worker.onmessage = (event) => {
        if (event.data.results !== undefined) {
          setOutput(event.data.results);
        } else if (event.data.error) {
          console.error("Error:", event.data.error);
        }
        setIsRunning(false);
      };
    }
  }

  function interruptExecution() {
    if (isLoaded) {
      worker.terminate();
      setIsLoaded(false);
      setIsRunning(false);
      setOutput({
        label: "Execution has been interrupted",
        result: "Re-starting Flamapy...",
      });
      initializeWorker();
    }
  }

  async function downloadFile(action) {
    if (isLoaded) {
      worker.postMessage({ action: "downloadFile", data: action });

      worker.onmessage = (event) => {
        if (event.data.results !== undefined) {
          const file = new File([event.data.results], `model.${action.value}`, {
            type: "text/plain;charset=utf-8",
          });
          saveAs(file);
        } else if (event.data.error) {
          console.error("Error:", event.data.error);
        }
      };
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Top Section */}

      <div className="flex flex-1 p-2 gap-2">
        {/* Left Side Panel */}
        <TreeView
          treeData={featureTree}
          executeAction={executeActionWithConf}
        />

        {/* Center Section (Text Editor + Bottom Panel) */}
        <div className="flex flex-1 flex-col">
          {/* Toolbar */}
          <Toolbar>
            <DropdownMenu
              buttonLabel={"SAT Operations"}
              options={SATOperations}
              executeAction={executeAction}
            ></DropdownMenu>
            <DropdownMenu
              buttonLabel={"BDD Operations"}
              options={BDDOperations}
              executeAction={executeAction}
            ></DropdownMenu>
            <DropdownMenu
              buttonLabel={"Export To"}
              options={exportOperations}
              executeAction={downloadFile}
            />
          </Toolbar>

          {/* Text Editor */}

          <UVLEditor editorRef={editorRef} validateModel={validateModel} />
          {/* Bottom Panel */}
          <ExecutionOutput
            handleResize={handleResize}
            handleStop={interruptExecution}
            isAwaiting={isRunning || !isImported || !isLoaded}
          >
            {output}
          </ExecutionOutput>
        </div>
        {/* Right Side Panel */}
        <ModelInformation onValidateModel={validateModel} isValid={isValid} />
      </div>
    </div>
  );
}

export default EditorPage;
