import { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./pages/editor/EditorPage";
import "./App.css";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);

  return (
    <BrowserRouter>
      <div className="h-screen w-screen flex flex-col">
        <Navbar />
        <Routes>
          <Route
            path="/"
            element={<Home setSelectedFile={setSelectedFile} />}
          ></Route>
          <Route
            path="/editor"
            element={<EditorPage selectedFile={selectedFile} />}
          ></Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
