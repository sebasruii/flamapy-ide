import { loadPyodide } from "pyodide";

export async function loadFlamapy() {
  const pyodideInstance = await loadPyodide({
    indexURL: "pyodide",
  });
  await pyodideInstance.loadPackage("micropip");
  await pyodideInstance.loadPackage("python-sat");
  await pyodideInstance.runPythonAsync(`
import micropip
await micropip.install("flamapy/flamapy-2.0.0-py3-none-any.whl", deps=False)
await micropip.install("flamapy/flamapy_fw-2.0.0-py3-none-any.whl", deps=False)
await micropip.install("flamapy/flamapy_fm-2.0.0-py3-none-any.whl", deps=False)
await micropip.install("flamapy/flamapy_sat-2.0.0-py3-none-any.whl", deps=False)
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
    return result

def execute_export_transformation(transformation: str):
    dm = DiscoverMetamodels()
    feature_model = dm.use_transformation_t2m("uvlfile.uvl",'fm') 
    return dm.use_transformation_m2t(feature_model,'export/model.{}'.format(transformation))

`);

  pyodideInstance.FS.mkdir("export");

  return pyodideInstance;
}