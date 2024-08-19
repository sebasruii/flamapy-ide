import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./pages/editor/EditorPage";
import "./App.css";
import Navbar from "./components/Navbar";

function App() {
  return (
    <BrowserRouter>
      <div className="h-screen w-screen flex flex-col">
        <Navbar />
        <Routes>
          <Route path="/editor" element={<EditorPage />}></Route>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
