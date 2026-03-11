import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Truck, Map, CreditCard, Activity } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

// ✅ API is now correctly placed outside the import block
const API = import.meta.env?.VITE_API_URL ?? "https://toll-claim-billing.onrender.com";

const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 transition-transform hover:-translate-y-1">
        <div className={`p-4 rounded-full ${color}`}>
            <Icon className="w-8 h-8 text-white" />
        </div>
        <div>
            <p className="text-gray-500 text-sm font-medium">{label}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState({
        total_vehicles: 0,
        total_routes: 0,
        total_claims: 0,
        total_claim_amount: 0,
        recent_transactions: []
    });

    const fetchStats = async () => {
        try {
            const { data } = await axios.get(`${API}/api/data/stats`);
            setStats(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const chartData = stats.recent_transactions.map(t => ({
        name: new Date(t.transaction_date).toLocaleDateString(),
        amount: t.paid_amount
    })).reverse();

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Truck} label="Total Vehicles" value={stats.total_vehicles} color="bg-blue-500" />
                <StatCard icon={Map} label="Total Routes" value={stats.total_routes} color="bg-green-500" />
                <StatCard icon={Activity} label="Total Toll Claims" value={stats.total_claims} color="bg-purple-500" />
                <StatCard icon={CreditCard} label="Total Claim Amount" value={`₹${stats.total_claim_amount}`} color="bg-primary-600" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Recent Transactions Trend</h2>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
                                <YAxis tick={{ fill: '#6B7280' }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                                <Line type="monotone" dataKey="amount" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-bold text-gray-800">Recent Transactions</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-gray-500 text-sm">
                                    <th className="p-4 font-medium">Date</th>
                                    <th className="p-4 font-medium">Vehicle</th>
                                    <th className="p-4 font-medium">Plaza Name</th>
                                    <th className="p-4 font-medium text-right">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                {stats.recent_transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4">{new Date(t.transaction_date).toLocaleString()}</td>
                                        <td className="p-4 font-medium">{t.vehicle_number}</td>
                                        <td className="p-4 text-gray-500">{t.toll_plaza_name}</td>
                                        <td className="p-4 text-right font-medium">₹{t.paid_amount}</td>
                                    </tr>
                                ))}
                                {stats.recent_transactions.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-6 text-center text-gray-500">No recent transactions.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;