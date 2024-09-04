import { useEffect, useState, useRef } from "react";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import ModelInformation from "../../components/ModelInformation";
import ExecutionOutput from "../../components/ExecutionOutput";
import UVLEditor from "../../components/UVLEditor";
import Toolbar from "../../components/Toolbar";
import DropdownMenu from "../../components/DropdownMenu";
import { saveAs } from "file-saver";

function EditorPage() {
  const [worker, setWorker] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [output, setOutput] = useState({
    label: "Execution results",
    result: "Here you will see the result of executing an operation",
  });

  const editorRef = useRef(null);

  const SATOperations = [
    { label: "Configurations", value: "PySATConfigurations" },
    { label: "Number of configurations", value: "PySATConfigurationsNumber" },
    { label: "Dead features", value: "PySATDeadFeatures" },
    { label: "Diagnosis", value: "PySATDiagnosis" },
    { label: "False optional features", value: "PySATFalseOptionalFeatures" },
    { label: "Satisfiable", value: "PySATSatisfiable" },
    { label: "Sampling", value: "PySATSampling" },
  ];

  const exportOperations = [
    { label: "AFM", value: "afm" },
    { label: "Glencoe", value: "gfm.json" },
    { label: "JSON", value: "json" },
    { label: "SPLOT", value: "sxfm" },
    { label: "Download UVL", value: "uvl" },
  ];

  useEffect(() => {
    try {
      const flamapyWorker = new Worker("/webworker.js");

      setWorker(flamapyWorker);
      return () => {
        flamapyWorker.terminate();
      };
    } catch (error) {
      console.error(error);
    }
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleResize = (e, data) => {
    e.preventDefault();
    editorRef.current.layout({});
  };

  async function validateModel() {
    if (worker) {
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
    if (worker) {
      worker.postMessage({ action: "executeAction", data: action });

      worker.onmessage = (event) => {
        if (event.data.results !== undefined) {
          setOutput(event.data.results);
        } else if (event.data.error) {
          console.error("Error:", event.data.error);
        }
      };
    }
  }

  async function downloadFile(action) {
    if (worker) {
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
        <ResizableBox
          width={200}
          height={Infinity}
          axis="x"
          minConstraints={[150, Infinity]}
          maxConstraints={[400, Infinity]}
          className="bg-neutral-300 text-neutral-900 p-4 resize-handle-right rounded-lg"
          handle={
            <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" />
          }
        >
          <p>Features</p>
        </ResizableBox>

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
              buttonLabel={"Export To"}
              options={exportOperations}
              executeAction={downloadFile}
            />
          </Toolbar>

          {/* Text Editor */}

          <UVLEditor editorRef={editorRef} validateModel={validateModel} />
          {/* Bottom Panel */}
          <ExecutionOutput handleResize={handleResize}>
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
