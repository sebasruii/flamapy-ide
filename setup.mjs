import { loadPyodide } from "./public/pyodide/pyodide.mjs";
// This script downloads micropip and python-sat (and their required deps) to pyodide module.
// These packages are needed in order to install flamapy
// By downloading these packages before launching the app, all required packages will be
// served locally without the need to access pyodide CDN each time the editor is loaded
const pyodide = await loadPyodide();

pyodide.loadPackage("micropip");
pyodide.loadPackage("python-sat");
