import { useEffect, useState, useRef } from "react";
import { loadFlamapy } from "../../flamapy/flamapy";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import ModelInformation from "../../components/ModelInformation";
import ExecutionOutput from "../../components/ExecutionOutput";
import UVLEditor from "../../components/UVLEditor";
import Toolbar from "../../components/Toolbar";
import DropdownMenu from "../../components/DropdownMenu";

function EditorPage() {
  const [pyodide, setPyodide] = useState(null);
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

  useEffect(() => {
    async function initializePyodide() {
      try {
        const pyodideInstance = await loadFlamapy();
        setPyodide(pyodideInstance);
      } catch (error) {
        console.log(error);
      }
    }
    initializePyodide();
  }, []);

  // eslint-disable-next-line no-unused-vars
  const handleResize = (e, data) => {
    e.preventDefault();
    editorRef.current.layout({});
  };

  async function validateModel() {
    const code = editorRef.current.getValue();
    pyodide.globals.set("code", code);
    const result = await pyodide.runPythonAsync(
      `
with open("uvlfile.uvl", "w") as text_file:
    text_file.write(code)

process_uvl_file('uvlfile.uvl')
    `
    );
    setIsValid(result.toJs());
  }

  async function executeAction(action) {
    if (isValid && !isValid[0] && !isValid[1]) {
      const result = await pyodide.runPythonAsync(
        `
execute_pysat_operation('${action.value}')
        `
      );
      if (result.toJs) {
        setOutput({ label: action.label, result: result.toJs() });
      } else {
        setOutput({ label: action.label, result });
      }
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
