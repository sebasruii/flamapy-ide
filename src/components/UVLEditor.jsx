/* eslint-disable react/prop-types */

import { Editor } from "@monaco-editor/react";

function UVLEditor({ editorRef, validateModel }) {
  const defaultCode = "";
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

  return (
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
  );
}

export default UVLEditor;
