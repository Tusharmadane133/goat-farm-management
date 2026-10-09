import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Goats from './pages/Goats';
import GoatProfile from './pages/GoatProfile';
import Breeding from './pages/Breeding';
import HittingCycle from './pages/HittingCycle';
import Finance from './pages/Finance';
import Vaccinations from './pages/Vaccinations';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Groups from './pages/Groups';

export default function App() {
  const [user, setUser] = useState(localStorage.getItem('user'));

  useEffect(() => {
    const sync = () => setUser(localStorage.getItem('user'));
    window.addEventListener('storage', sync);
    window.addEventListener('userUpdated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('userUpdated', sync);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />

        <Route path="/dashboard" element={
          user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/goats" element={
          user ? <Layout><Goats /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/goats/:goat_code" element={
          user ? <Layout><GoatProfile /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/breeding" element={
          user ? <Layout><Breeding /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/hitting-cycle" element={
          user ? <Layout><HittingCycle /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/finance" element={
          user ? <Layout><Finance /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/vaccinations" element={
          user ? <Layout><Vaccinations /></Layout> : <Navigate to="/login" />
        } />
        <Route path="/settings" element={
          user ? <Layout><Settings /></Layout> : <Navigate to="/login" />
        } />
<Route path="/groups" element={
  user ? <Layout><Groups /></Layout> : <Navigate to="/login" />
} />
        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </BrowserRouter>
  );
}