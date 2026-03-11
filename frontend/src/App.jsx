import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Route as RouteIcon, Truck, UploadCloud, FileText, LogOut, Menu } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import RoutesManage from './pages/RoutesManage';
import VehiclesManage from './pages/VehiclesManage';
import FastagImport from './pages/FastagImport';
import Claims from './pages/Claims';
import Login from './pages/Login';

const SidebarItem = ({ icon: Icon, label, to }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-primary-50 text-primary-600 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </Link>
  );
};

const Layout = ({ children, onLogout }) => {
  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="text-primary-600" />
            Toll Claim Pro
          </h1>
        </div>
        <nav className="flex-1 px-4 space-y-1 mt-6">
          <SidebarItem to="/" icon={LayoutDashboard} label="Dashboard" />
          <SidebarItem to="/routes" icon={RouteIcon} label="Routes & Tolls" />
          <SidebarItem to="/vehicles" icon={Truck} label="Transporters" />
          <SidebarItem to="/import" icon={UploadCloud} label="FASTag Import" />
          <SidebarItem to="/claims" icon={FileText} label="Claims & Bills" />
        </nav>
        <div className="p-4 border-t">
          <button onClick={onLogout} className="flex w-full items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto flex flex-col">
        <header className="bg-white border-b h-16 flex items-center px-6 md:hidden">
          <Menu className="w-6 h-6 text-gray-600" />
          <span className="ml-4 font-bold text-lg">Toll Claim Pro</span>
        </header>
        <div className="p-8 pb-16 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (token) => {
    localStorage.setItem('token', token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/routes" element={<RoutesManage />} />
          <Route path="/vehicles" element={<VehiclesManage />} />
          <Route path="/import" element={<FastagImport />} />
          <Route path="/claims" element={<Claims />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
