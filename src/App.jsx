import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./pages/editor/EditorPage";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/editor" element={<EditorPage />}></Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
