// client/src/App.js
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoadingPage from './LoadingPage'; // Import new
import HomePage from './HomePage';
import RoomPage from './RoomPage';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoadingPage />} /> {/* Root is now loading page */}
          <Route path="/home" element={<HomePage />} /> {/* Home is now /home */}
          <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;