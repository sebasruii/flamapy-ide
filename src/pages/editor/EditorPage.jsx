import { useEffect, useState, useRef } from "react";
import { loadFlamapy } from "../../flamapy/flamapy";
import Editor from "@monaco-editor/react";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import ModelInformation from "../../components/ModelInformation";

function EditorPage() {
  const [pyodide, setPyodide] = useState(null);
  const [isValid, setIsValid] = useState(false);

  const editorRef = useRef(null);

  const defaultCode = `features
    a
        optional
            b`;

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

  function handleEditorDidMount(editor, monaco) {
    editorRef.current = editor;
    monaco.languages.register({ id: "uvl" });

    // Set the tokens provider (syntax highlighting)
    monaco.languages.setMonarchTokensProvider("uvl", {
      defaultToken: "",
      tokenPostfix: ".uvl",

      keywords: [
        "root",
        "features",
        "constraints",
        "group",
        "and",
        "or",
        "xor",
        "alternative",
        "optional",
        "mandatory",
      ],

      operators: ["=", "==", "!", ">", "<", ">=", "<=", "&&", "||", "!", "+"],

      symbols: /[=><!~?:&|+\-*\/\^%]+/,

      escapes: /\\(?:[abfnrtv\\"'0-9x])/,

      tokenizer: {
        root: [
          // Identifiers and keywords
          [
            /[a-z_$][\w$]*/,
            {
              cases: {
                "@keywords": "keyword",
                "@default": "identifier",
              },
            },
          ],

          // Whitespace
          { include: "@whitespace" },

          // Delimiters and operators
          [/[{}()\[\]]/, "@brackets"],
          [/[<>](?!@symbols)/, "@brackets"],
          [
            /@symbols/,
            {
              cases: {
                "@operators": "operator",
                "@default": "",
              },
            },
          ],

          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, "number.float"],
          [/\d+/, "number"],

          // Strings
          [/"([^"\\]|\\.)*$/, "string.invalid"], // Non-terminated string
          [/"$/, "string.escape", "@popall"],
          [/"/, "string", "@string"],

          // Comments
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],
        ],

        comment: [
          [/[^\/*]+/, "comment"],
          [/\*\//, "comment", "@pop"],
          [/[\/*]/, "comment"],
        ],

        string: [
          [/[^\\"]+/, "string"],
          [/@escapes/, "string.escape"],
          [/\\./, "string.escape.invalid"],
          [/"/, "string", "@pop"],
        ],

        whitespace: [
          [/[ \t\r\n]+/, ""],
          [/\/\*/, "comment", "@comment"],
          [/\/\/.*$/, "comment"],
        ],
      },
    });

    // Define the language configuration (brackets, comments, etc.)
    monaco.languages.setLanguageConfiguration("uvl", {
      comments: {
        lineComment: "//",
        blockComment: ["/*", "*/"],
      },
      brackets: [
        ["{", "}"],
        ["[", "]"],
        ["(", ")"],
      ],
      autoClosingPairs: [
        { open: "{", close: "}" },
        { open: "[", close: "]" },
        { open: "(", close: ")" },
        { open: '"', close: '"' },
      ],
    });
  }

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

  return (
    <div className="flex flex-row h-full w-full">
      {/* Top Section */}
      <div className="flex flex-1 p-2 gap-2">
        {/* Left Side Panel */}
        <ResizableBox
          width={200}
          height={Infinity}
          axis="x"
          minConstraints={[150, Infinity]}
          maxConstraints={[400, Infinity]}
          className="bg-gray-800 text-white p-4 resize-handle-right rounded-lg"
          handle={
            <div className="absolute right-0 top-0 h-full w-2 cursor-ew-resize" />
          }
        >
          <p>Left Side Panel</p>
        </ResizableBox>

        {/* Center Section (Text Editor + Bottom Panel) */}
        <div className="flex flex-1 flex-col">
          {/* Text Editor */}
          <div className="flex-1 bg-gray-100 text-black p-4">
            <div className="grid grid-cols-1 grid-rows-1 h-full w-full rounded-lg">
              <Editor
                defaultLanguage="uvl"
                value={defaultCode}
                onMount={handleEditorDidMount}
                onChange={validateModel}
              />
            </div>
          </div>
          {/* Bottom Panel */}
          <ResizableBox
            width={Infinity}
            height={150}
            axis="y"
            minConstraints={[Infinity, 100]}
            maxConstraints={[Infinity, 300]}
            className="bg-gray-700 text-white p-4 resize-handle-top rounded-lg"
            handle={
              <div className="absolute top-0 left-0 w-full h-2 cursor-ns-resize" />
            }
            resizeHandles={["n"]}
            onResize={handleResize}
          >
            <p>Bottom Panel</p>
          </ResizableBox>
        </div>
        {/* Right Side Panel */}
        <ModelInformation onValidateModel={validateModel} isValid={isValid} />
      </div>
    </div>
  );
}

export default EditorPage;
