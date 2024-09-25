# FlamapyIDE

_Flamapy-based Integrated Developement Environment for Feature Models that runs on WebAssembly_

## Introduction

FlamapyIDE is Francisco Benítez's (@sebasruii) Final Degree Project. It consists of a web application that provides users with tools to perform Automated Analysis of Feature Models defined in UVL (Universal Variability Language). To accomplish this task, it delegates the execution of operations to a web worker that runs Flamapy compiled to webAssembly. Thanks to this, FlamapyIDE runs completely on your browser, without the need for a Backend server to perform AAFM operations, or installation of external tools on your machine.

## Main Features

- UVL Code Editor, with syntax coloring
- Display quick information of the current feature model that automatically updates as the code is edited
- Graphical visualization of the feature model tree
- Execution of SAT-based operations on the model
- Execution of BDD-based operations on the model
- Create a product configuration, and test its validity
- Different export options, including Glencoe, FeatureIDE, AFM or SPLOT
- Import feature models defined in different formats into UVL, including Glencoe, FeatureIDE or AFM

## Getting started

To run FlamapyIDE locally, you must have NodeJS (>=18.5) installed. Clone this repository and follow these steps:

### 1. Install dependencies

Navigate to the project root and run:
`npm install`

### 2. Run pyodide setup script

Run:
`node setup.mjs`
This script will download all pyodide packages needed to install the provided Flamapy packages.

### 3. Run FlamapyIDE

Once packages have been downloaded, you can run:
`npm run dev`
and this will deploy FlamapyIDE on localhost.
