import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import RoomPage from "./RoomPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Home page with intro video */}
        <Route path="/" element={<HomePage />} />

        {/* Meeting room */}
        <Route path="/room/:roomId" element={<RoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
