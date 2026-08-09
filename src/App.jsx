import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import Nav from "./components/Nav";
import './App.css'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Discover from "./pages/Discover";
import Collections from "./pages/Collections";
import Leaderboard from "./pages/Leaderboard";
import { AuthProvider } from "./context/AuthContext";
import CollectionDetail from "./pages/CollectionDetail";
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import AboutGorshey from './pages/AboutGorshey';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Nav />
        <Routes>
          <Route path="/" element={<Discover />} />
          <Route path="/collections" element={<Collections />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/collections/:id" element={<CollectionDetail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<AboutGorshey />} />
        </Routes>
    </BrowserRouter>
    </AuthProvider>

  );
}

export default App;
