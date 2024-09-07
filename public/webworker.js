/* eslint-disable no-undef */
importScripts("/pyodide/pyodide.js");
class Flamapy {
  constructor() {
    this.pyodide = null;
    this.isValid = false;
  }

  async loadFlamapy() {
    const pyodideInstance = await loadPyodide({
      indexURL: "pyodide",
    });
    await pyodideInstance.loadPackage("micropip");
    await pyodideInstance.loadPackage("python-sat");
    await pyodideInstance.runPythonAsync(`
  import micropip
  await micropip.install("flamapy/flamapy-2.0.1-py3-none-any.whl", deps=False)
  await micropip.install("flamapy/flamapy_fw-2.0.1-py3-none-any.whl", deps=False)
  await micropip.install("flamapy/flamapy_fm-2.0.1-py3-none-any.whl", deps=False)
  await micropip.install("flamapy/flamapy_sat-2.0.1-py3-none-any.whl", deps=False)
  await micropip.install("flamapy/uvlparser-2.0.1-py3-none-any.whl", deps=False)
  await micropip.install("flamapy/afmparser-1.0.3-py3-none-any.whl", deps=False)
  await micropip.install("flamapy/antlr4_python3_runtime-4.13.1-py3-none-any.whl", deps=False)
  
  
  import js
  from flamapy.interfaces.python import FLAMAFeatureModel
  from flamapy.core.exceptions import FlamaException
  from antlr4 import CommonTokenStream, FileStream
  from uvl.UVLCustomLexer import UVLCustomLexer
  from uvl.UVLPythonParser import UVLPythonParser
  from antlr4.error.ErrorListener import ErrorListener
  from flamapy.core.discover import DiscoverMetamodels
  from flamapy.metamodels.fm_metamodel.transformations import GlencoeReader, AFMReader, FeatureIDEReader, JSONReader, XMLReader
  
  
  fm = None
  
  # Custom error listener
  class CustomErrorListener(ErrorListener):
      def syntaxError(self, recognizer, offendingSymbol, line, column, msg, e):
          if "warning" in msg:
              print(f"Warning in UVL: Line {line}:{column} - {msg}")
              return
          else:
              raise Exception(f"Error in UVL: Line {line}:{column} - {msg}")
  
  # Function to process UVL file
  def process_uvl_file(file_path):
      try:
          input_stream = FileStream(file_path)
          lexer = UVLCustomLexer(input_stream)
          lexer.removeErrorListeners()
          lexer.addErrorListener(CustomErrorListener())
  
          stream = CommonTokenStream(lexer)
          parser = UVLPythonParser(stream)
          parser.removeErrorListeners()
          parser.addErrorListener(CustomErrorListener())
  
          tree = parser.featureModel()
          tree_string = tree.toStringTree(recog=parser)
          #print(tree_string.lower())
          if "warning" in tree_string.lower():
              return True, False, tree_string  # Warning, no exception
                  
          global fm
          fm = FLAMAFeatureModel('uvlfile.uvl')
  
          return False, False, get_model_information()  # No warning, no exception
      except Exception as e:
          error_message = str(e)
          print(f"Exception in file {file_path}: {error_message}")  # Print the exception information
          return False, True, error_message  # Exception with message
  
  def satisfiable(file_content):
    with open("uvlfile.uvl", "w") as text_file:
        text_file.write(file_content)
    
    fm = FLAMAFeatureModel("uvlfile.uvl")
    result=fm.satisfiable()
    return result
  
          
  def get_model_information():
      model_information = dict()
  
      model_information['Average Branching Factor'] = fm.average_branching_factor()
      model_information['Leaf Number'] = fm.count_leafs()
      model_information['Estimated Number of Configurations'] = fm.estimated_number_of_configurations()
      model_information['Max Depth'] = fm.max_depth()
      model_information['Atomic Sets'] = fm.atomic_sets()
      model_information['Core Features'] = fm.core_features()
      model_information['Leaf Features'] = fm.leaf_features()
      return model_information
  
  def execute_pysat_operation(operation: str):
      dm = DiscoverMetamodels()
      feature_model = dm.use_transformation_t2m("uvlfile.uvl", 'fm')
      if operation in ['PySATConflictDetection', 'PySATDiagnosis']:
          sat_model = dm.use_transformation_m2m(feature_model, "pysat_diagnosis")
      else:
          sat_model = dm.use_transformation_m2m(feature_model, "pysat")
      # Get the operation
      operation = dm.get_operation(sat_model, operation)
      # Execute the operation
      operation.execute(sat_model)
      # Get and print the result
      result = operation.get_result()
      if type(result) is list:
          return [str(conf) for conf in result]
      return result
  
  def execute_export_transformation(transformation: str):
      dm = DiscoverMetamodels()
      feature_model = dm.use_transformation_t2m("uvlfile.uvl",'fm') 
      return dm.use_transformation_m2t(feature_model,'export/model.{}'.format(transformation))
  
  def execute_import_transformation(file_extension: str, file_content: str):
    with open("import.{}".format(file_extension), "w") as text_file:
        text_file.write(file_content)
    dm = DiscoverMetamodels()
    match(file_extension):
        case 'gfm.json':
            feature_model = GlencoeReader("import.gfm.json").transform()
        case 'afm':
            feature_model = AFMReader("import.afm").transform()
        case 'fide':
            feature_model = FeatureIDEReader("import.fide").transform()
        case 'json':
            feature_model = JSONReader("import.json").transform()
        case 'xml':
            feature_model = XMLReader("import.xml").transform()

    return dm.use_transformation_m2t(feature_model,'uvlfile.uvl')
    `);
    pyodideInstance.FS.mkdir("export");

    this.pyodide = pyodideInstance;
  }

  async validateModel(code) {
    this.pyodide.globals.set("code", code);
    const result = await this.pyodide.runPythonAsync(
      `
with open("uvlfile.uvl", "w") as text_file:
    text_file.write(code)

process_uvl_file('uvlfile.uvl')
    `
    );
    this.isValid = result.toJs();
    if (this.isValid[2] instanceof Map)
      this.isValid[2] = Array.from(this.isValid[2]);
    return this.isValid;
  }

  async executeAction(action) {
    if (this.isValid && !this.isValid[0] && !this.isValid[1]) {
      const result = await this.pyodide.runPythonAsync(
        `
execute_pysat_operation('${action.value}')
        `
      );
      if (result.toJs) {
        return { label: action.label, result: result.toJs() };
      } else {
        return { label: action.label, result };
      }
    }
  }

  async downloadFile(action) {
    if (this.isValid && !this.isValid[0] && !this.isValid[1]) {
      const result = await this.pyodide.runPythonAsync(
        `
execute_export_transformation('${action.value}')
        `
      );
      return result;
    }
  }

  async importModel(fileExtension, fileContent) {
    this.pyodide.globals.set("file_content", fileContent);
    const result = await this.pyodide.runPythonAsync(
      `
execute_import_transformation('${fileExtension}', file_content)
      `
    );
    return result;
  }
}

async function loadFlamapyWorker() {
  self.flamapy = new Flamapy();
  await self.flamapy.loadFlamapy();
}
let flamapyReadyPromise = loadFlamapyWorker()
  .then(() => self.postMessage({ status: "loaded" }))
  .catch((exception) => self.postMessage({ status: "error", exception }));

self.onmessage = async (event) => {
  await flamapyReadyPromise;
  const { action, data, ...context } = event.data;
  for (const key of Object.keys(context)) {
    self[key] = context[key];
  }
  try {
    let results;
    if (action === "validateModel") {
      results = await self.flamapy.validateModel(data);
    } else if (action === "executeAction") {
      results = await self.flamapy.executeAction(data);
    } else if (action === "downloadFile") {
      results = await self.flamapy.downloadFile(data);
    } else if (action === "importModel") {
      results = await self.flamapy.importModel(
        data.fileExtension,
        data.fileContent
      );
    }

    self.postMessage({ results, action });
  } catch (error) {
    console.error(error);
    self.postMessage({ error: error.message, action });
  }
};
