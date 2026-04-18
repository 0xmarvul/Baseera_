import React from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom'
import './App.css'

import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Login from './pages/Login'
import Register from './pages/Register'
import Forget from './pages/Forget'
import ResetPassword from './pages/ResetPassword'
import Landing from './pages/Landing'
import Bugs from './pages/Bugs'
import Profile from './pages/Profile'
import EditProfile from './pages/EditProfile';
import Delete from './pages/Delete';
import ChangePassword from './pages/ChangePassword';
import ExtensionSettings from './pages/ExtensionSettings';
import AccountVerification from './pages/AccountVerification';
import VerifyEmail from './pages/VerifyEmail';
import AIChatbot from './pages/AIChatbot';
import BaseeraFloatingChat from './components/BaseeraFloatingChat';


function HomeRedirect() {
  const token = localStorage.getItem("authToken");
  if (token) {
    return <Navigate to="/landing" replace />;
  }
  return <Home />;
}

function AppContent() {
  const location = useLocation();

  // 👇 navbar يظهر في كل الصفحات ما عدا landing
  // const hideNavbarRoutes = ["/landing " , "/bugs"];
  // const showNavbar = !hideNavbarRoutes.includes(location.pathname);

  return (
    <>
    
      <Routes>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forget" element={<Forget />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/bugs" element={
            <ProtectedRoute>
              <Bugs />
            </ProtectedRoute>
          } />
        
        <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        <Route path="/edit-profile" element={
            <ProtectedRoute>
              <EditProfile />
            </ProtectedRoute>
          } />
        <Route path="/delete" element={
            <ProtectedRoute>
              <Delete />
            </ProtectedRoute>
          } />
        <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />
        <Route path="/extension-settings" element={<ExtensionSettings />} />
        <Route path="/account-verification" element={<AccountVerification />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/ai-chatbot" element={
            <ProtectedRoute>
              <AIChatbot />
            </ProtectedRoute>
          } />
        <Route
          path="/landing"
          element={
            <ProtectedRoute>
              <Landing />
            </ProtectedRoute>
          }
        />
      </Routes>
      <BaseeraFloatingChat />
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