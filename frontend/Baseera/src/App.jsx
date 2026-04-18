import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import './App.css'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import Forget from './pages/Forget'
import Landing from './pages/Landing'
import Bugs from './pages/Bugs'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile';
import Delete from './pages/Delete';


function AppContent() {
  const location = useLocation();

  // 👇 navbar يظهر في كل الصفحات ما عدا landing
  // const hideNavbarRoutes = ["/landing " , "/bugs"];
  // const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forget" element={<Forget />} />
        <Route path="/bugs" element={<Bugs />} />
        
        <Route path="/profile" element={<Profile />} />
        <Route path="/edit-profile" element={<EditProfile />} />
        <Route path="/delete" element={<Delete />} />
        <Route
          path="/landing"
          element={
            <ProtectedRoute>
              <Landing />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;