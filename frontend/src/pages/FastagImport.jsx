import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

const FastagImport = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const fetchTransactions = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/data/fastag-transactions');
            setTransactions(data);
        } catch (err) {
            console.error('Failed to fetch transactions', err);
        }
    };

    useEffect(() => {
        fetchTransactions();
    }, []);

    const handleFileSelect = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setLoading(true);
        setMessage(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            await axios.post('http://localhost:5000/api/data/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage('FASTag transactions imported successfully!');
            fetchTransactions();
            setTimeout(() => {
                setFile(null);
                setMessage(null);
            }, 5000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload file');
            setFile(null);
        } finally {
            setLoading(false);
            e.target.value = null; // reset input
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">FASTag Transaction Import</h1>
                <p className="text-gray-500 mt-2">Upload Excel, CSV, or PDF files containing FASTag toll history. Ensure it includes Transaction Date, Vehicle Number, Toll Plaza Name, and Amount.</p>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 mt-8 text-center">
                <UploadCloud className={`mx-auto h-20 w-20 mb-6 ${loading ? 'text-primary-500 animate-pulse' : 'text-gray-400'}`} />
                <div className="space-y-6 flex flex-col items-center">

                    <label className={`relative group cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium px-8 py-4 rounded-xl shadow-sm border border-blue-200 text-lg transition ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span>{loading ? 'Uploading and Processing Data...' : (file ? file.name : "Select Excel / CSV / PDF File to Auto-Upload")}</span>
                        <input
                            type="file"
                            onChange={handleFileSelect}
                            accept=".csv, .xlsx, .xls, .pdf"
                            className="hidden"
                            disabled={loading}
                        />
                    </label>

                    {error && (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm w-full max-w-sm justify-center">
                            <AlertCircle size={18} /> {error}
                        </div>
                    )}

                    {message && (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg text-sm w-full max-w-sm justify-center font-medium border border-green-200">
                            <CheckCircle size={18} /> {message}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-gray-50 border rounded-xl p-6 mt-8">
                <h3 className="font-bold text-gray-800 mb-3">Expected Column Headers</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
                    <li><b>Transaction Date</b> (or Date, Time)</li>
                    <li><b>Vehicle Number</b> (or Vehicle, Reg. No)</li>
                    <li><b>Toll Plaza Name</b> (or Plaza, Toll Name)</li>
                    <li><b>Paid Amount</b> (or Amount, Fee)</li>
                    <li><b>Transaction ID</b> (optional, will auto-generate if missing)</li>
                </ul>
            </div>

            {transactions.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Recently Imported Transactions</h2>
                        <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">Showing latest 100</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse border border-gray-800 text-sm bg-white">
                            <thead>
                                <tr className="bg-gray-100 font-bold text-gray-800">
                                    <th className="border border-gray-800 p-3">Transaction Date</th>
                                    <th className="border border-gray-800 p-3">Transaction ID</th>
                                    <th className="border border-gray-800 p-3">Vehicle</th>
                                    <th className="border border-gray-800 p-3">Toll Plaza Name</th>
                                    <th className="border border-gray-800 p-3 text-right">Paid Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-800">
                                {transactions.map((t) => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="border border-gray-800 p-3">{new Date(t.transaction_date).toLocaleString()}</td>
                                        <td className="border border-gray-800 p-3 text-gray-600">{t.transaction_id}</td>
                                        <td className="border border-gray-800 p-3 font-bold uppercase">{t.vehicle_number}</td>
                                        <td className="border border-gray-800 p-3 text-gray-600 uppercase">{t.toll_plaza_name}</td>
                                        <td className="border border-gray-800 p-3 text-right font-bold text-red-600">
                                            ₹{parseFloat(t.paid_amount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FastagImport;
