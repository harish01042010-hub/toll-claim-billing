import React, { useState } from 'react';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

const FastagImport = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setLoading(true);
        setMessage(null);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.post('http://localhost:5000/api/data/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMessage('FASTag transactions imported successfully!');
            setFile(null);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to upload file');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">FASTag Transaction Import</h1>
                <p className="text-gray-500 mt-2">Upload Excel or CSV files containing FASTag toll history. Ensure it includes Transaction ID, Date, Vehicle Number, Toll Plaza Name, and Amount.</p>
            </div>

            <div className="bg-white p-10 rounded-2xl shadow-sm border border-gray-100 mt-8 text-center">
                <UploadCloud className="mx-auto h-20 w-20 text-gray-400 mb-6" />
                <form onSubmit={handleUpload} className="space-y-6 flex flex-col items-center">

                    <div className="relative group cursor-pointer">
                        <input
                            type="file"
                            onChange={e => setFile(e.target.files[0])}
                            accept=".csv, .xlsx, .xls"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button type="button" className="bg-blue-50 text-blue-700 px-8 py-4 rounded-xl font-medium group-hover:bg-blue-100 transition shadow-sm border border-blue-200 text-lg">
                            {file ? file.name : "Select Excel / CSV File"}
                        </button>
                    </div>

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

                    <button
                        type="submit"
                        disabled={!file || loading}
                        className={`w-full max-w-sm py-4 rounded-xl font-bold text-lg shadow-sm transition ${file && !loading ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
                    >
                        {loading ? 'Processing Upload...' : 'Upload & Import Data'}
                    </button>
                </form>
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
        </div>
    );
};

export default FastagImport;
