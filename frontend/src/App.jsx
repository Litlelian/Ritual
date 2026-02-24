import './App.css'

import { BrowserRouter, Routes, Route } from "react-router-dom";
import GamePage from "./pages/GamePage";
import SpellTestPage from "./pages/SpellTestPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/test/game" element={<GamePage />} />
        <Route path="/test/spell" element={<SpellTestPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App