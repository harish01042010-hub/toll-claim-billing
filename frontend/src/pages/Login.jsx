import React, { useState } from 'react';
import axios from 'axios';
import { Truck } from 'lucide-react';

const API = "https://toll-claim-billing.onrender.com";

const Login = ({ onLogin }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { username, password });
      onLogin(data.token);
    } catch (err) {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <div className="text-center mb-8">
          <Truck className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="text-2xl font-bold">Toll Claim Billing</h2>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="bg-red-100 text-red-700 p-2 text-center rounded">{error}</div>}
          <input
            type="text"
            className="w-full p-2 border rounded"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="w-full p-2 border rounded"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
            Sign In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;