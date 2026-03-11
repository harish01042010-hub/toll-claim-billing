import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Route, Plus, Trash2, MapPin, Download, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const RoutesManage = () => {
    const [routes, setRoutes] = useState([]);
    const [showAdd, setShowAdd] = useState(false);

    // New Route Form
    const [routeName, setRouteName] = useState('');
    const [loadingLoc, setLoadingLoc] = useState('');
    const [loadingSap, setLoadingSap] = useState('');
    const [unloadingLoc, setUnloadingLoc] = useState('');
    const [unloadingSap, setUnloadingSap] = useState('');
    const [rateDate, setRateDate] = useState('');
    const [stateLocation, setStateLocation] = useState('');

    // Toll Plazas
    const [plazas, setPlazas] = useState([{ name: '', approved_rate: '' }]);

    const fetchData = async () => {
        try {
            const { data } = await axios.get(`${API}/api/routes`);
            setRoutes(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddPlaza = () => setPlazas([...plazas, { name: '', approved_rate: '' }]);

    const handlePlazaChange = (index, field, value) => {
        const newPlazas = [...plazas];
        newPlazas[index][field] = value;
        setPlazas(newPlazas);
    };

    const handleAddRoute = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/api/routes`, {
                name: routeName,
                loading_location: loadingLoc,
                loading_sap_code: loadingSap,
                unloading_location: unloadingLoc,
                unloading_sap_code: unloadingSap,
                rate_date: rateDate,
                state: stateLocation,
                toll_plazas: plazas.filter(p => p.name && p.approved_rate)
            });
            setShowAdd(false);
            setRouteName(''); setLoadingLoc(''); setLoadingSap(''); setUnloadingLoc(''); setUnloadingSap(''); setRateDate(''); setStateLocation('');
            setPlazas([{ name: '', approved_rate: '' }]);
            fetchData();

        } catch (err) {
            alert('Error adding route');
        }
    };

    const handleImportPdf = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await axios.post(`${API}/api/routes/parse-pdf`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.routeName) setRouteName(data.routeName);
            if (data.loadingLoc) setLoadingLoc(data.loadingLoc);
            if (data.loadingSap) setLoadingSap(data.loadingSap);
            if (data.unloadingLoc) setUnloadingLoc(data.unloadingLoc);
            if (data.unloadingSap) setUnloadingSap(data.unloadingSap);
            if (data.rateDate) setRateDate(data.rateDate);
            if (data.plazas && data.plazas.length > 0) setPlazas(data.plazas);
            else setPlazas([{ name: '', approved_rate: '' }]);

            setShowAdd(true);
            e.target.value = null; // reset input
        } catch (err) {
            console.error(err);
            alert('Error parsing PDF file');
        }
    };

    const handleDownloadPdf = async (routeSummary) => {
        try {
            // First fetch the full details including toll plazas
            const { data: route } = await axios.get(`http://localhost:5000/api/routes/${routeSummary.id}`);

            const doc = new jsPDF();

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');

            // Title Box
            doc.setLineWidth(0.5);
            doc.rect(14, 15, 182, 8);
            doc.text(route.name || 'ROUTE DIRECTORY', 105, 20, { align: 'center' });

            // Locations Table
            autoTable(doc, {
                startY: 30,
                theme: 'grid',
                styles: { fontSize: 8, font: 'helvetica', lineColor: 0, lineWidth: 0.2, textColor: 0 },
                headStyles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'center', textColor: 0 },
                head: [
                    [
                        { content: 'TRANSPORTATION ROUTES', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
                        { content: 'SI No.', rowSpan: 2, styles: { valign: 'middle' } },
                        { content: 'Loading location', colSpan: 2 },
                        { content: 'Unloading location', colSpan: 2 }
                    ],
                    ['SAP Code', 'Name', 'SAP Code', 'Name']
                ],
                body: [
                    ['', { content: '1', styles: { textColor: [200, 0, 0] } }, route.loading_sap_code || '-', route.loading_location || '-', route.unloading_sap_code || '-', route.unloading_location || '-']
                ],
                columnStyles: {
                    2: { halign: 'center' },
                    4: { halign: 'center' }
                }
            });

            // Tolls Table
            const tollBody = route.toll_plazas ? route.toll_plazas.map((p, i) => [
                i + 1, p.name, p.approved_rate
            ]) : [];

            // Calculate total
            const totalToll = route.toll_plazas ? route.toll_plazas.reduce((sum, p) => sum + Number(p.approved_rate), 0) : 0;

            // Add total row at the end of the body
            tollBody.push([
                { content: 'Total', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
                { content: totalToll, styles: { fontStyle: 'bold' } }
            ]);

            let rateDateStr = '-';
            if (route.rate_date) {
                const d = new Date(route.rate_date);
                rateDateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
            }

            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 10,
                tableWidth: 150,
                theme: 'grid',
                styles: { fontSize: 8, font: 'helvetica', lineColor: 0, lineWidth: 0.2, textColor: 0 },
                headStyles: { fillColor: [220, 220, 220], fontStyle: 'bold', textColor: 0 },
                head: [
                    [{ content: 'TOLL RATES', colSpan: 2, styles: { halign: 'center' } }, { content: '' }],
                    ['S.No', 'Toll Name', { content: rateDateStr, styles: { halign: 'center' } }]
                ],
                body: tollBody,
                columnStyles: {
                    0: { halign: 'center', cellWidth: 15 },
                    1: { cellWidth: 110 },
                    2: { halign: 'right', cellWidth: 25 }
                }
            });

            doc.save(`${route.name || 'Route'}_Tolls.pdf`);
        } catch (err) {
            console.error(err);
            alert('Failed to generate PDF. Could not load route details.');
        }
    };

    const handleDownloadAllPdf = async () => {
        if (routes.length === 0) return alert('No routes to download.');
        try {
            const doc = new jsPDF();

            for (let i = 0; i < routes.length; i++) {
                if (i > 0) doc.addPage();

                const { data: route } = await axios.get(`http://localhost:5000/api/routes/${routes[i].id}`);

                doc.setFontSize(11);
                doc.setFont('helvetica', 'bold');

                // Title Box
                doc.setLineWidth(0.5);
                doc.rect(14, 15, 182, 8);
                doc.text(route.name || 'ROUTE DIRECTORY', 105, 20, { align: 'center' });

                // Locations Table
                autoTable(doc, {
                    startY: 30,
                    theme: 'grid',
                    styles: { fontSize: 8, font: 'helvetica', lineColor: 0, lineWidth: 0.2, textColor: 0 },
                    headStyles: { fillColor: [220, 220, 220], fontStyle: 'bold', halign: 'center', textColor: 0 },
                    head: [
                        [
                            { content: 'TRANSPORTATION ROUTES', rowSpan: 2, styles: { halign: 'left', valign: 'middle' } },
                            { content: 'SI No.', rowSpan: 2, styles: { valign: 'middle' } },
                            { content: 'Loading location', colSpan: 2 },
                            { content: 'Unloading location', colSpan: 2 }
                        ],
                        ['SAP Code', 'Name', 'SAP Code', 'Name']
                    ],
                    body: [
                        ['', { content: '1', styles: { textColor: [200, 0, 0] } }, route.loading_sap_code || '-', route.loading_location || '-', route.unloading_sap_code || '-', route.unloading_location || '-']
                    ],
                    columnStyles: {
                        2: { halign: 'center' },
                        4: { halign: 'center' }
                    }
                });

                // Tolls Table
                const tollBody = route.toll_plazas ? route.toll_plazas.map((p, idx) => [
                    idx + 1, p.name, p.approved_rate
                ]) : [];

                const totalToll = route.toll_plazas ? route.toll_plazas.reduce((sum, p) => sum + Number(p.approved_rate), 0) : 0;
                tollBody.push([
                    { content: 'Total', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
                    { content: totalToll, styles: { fontStyle: 'bold' } }
                ]);

                let rateDateStr = '-';
                if (route.rate_date) {
                    const d = new Date(route.rate_date);
                    rateDateStr = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                }

                autoTable(doc, {
                    startY: doc.lastAutoTable.finalY + 10,
                    tableWidth: 150,
                    theme: 'grid',
                    styles: { fontSize: 8, font: 'helvetica', lineColor: 0, lineWidth: 0.2, textColor: 0 },
                    headStyles: { fillColor: [220, 220, 220], fontStyle: 'bold', textColor: 0 },
                    head: [
                        [{ content: 'TOLL RATES', colSpan: 2, styles: { halign: 'center' } }, { content: '' }],
                        ['S.No', 'Toll Name', { content: rateDateStr, styles: { halign: 'center' } }]
                    ],
                    body: tollBody,
                    columnStyles: {
                        0: { halign: 'center', cellWidth: 15 },
                        1: { cellWidth: 110 },
                        2: { halign: 'right', cellWidth: 25 }
                    }
                });
            }

            doc.save('All_Routes_Toll_Mapping.pdf');
        } catch (err) {
            console.error(err);
            alert('Failed to generate full PDF.');
        }
    };

    const deleteRoute = async (id) => {
        if (window.confirm('Delete this route?')) {
            await axios.delete(`http://localhost:5000/api/routes/${id}`);
            fetchData();
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Route & Toll Management</h1>
                <div className="flex gap-3">
                    <button onClick={handleDownloadAllPdf} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition font-medium">
                        <Download size={18} /> Download All
                    </button>
                    <label className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 cursor-pointer transition font-medium">
                        <Upload size={18} /> Import PDF
                        <input type="file" accept=".pdf" className="hidden" onChange={handleImportPdf} />
                    </label>
                    <button
                        onClick={() => setShowAdd(!showAdd)}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition"
                    >
                        <Plus size={20} /> Add Route
                    </button>
                </div>
            </div>

            {showAdd && (
                <div className="bg-white p-6 rounded-xl shadow-sm border mb-8">
                    <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4">Create New Route</h2>
                    <form onSubmit={handleAddRoute} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b pb-4 border-gray-100">
                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                                <input required value={routeName} onChange={e => setRouteName(e.target.value)} placeholder="e.g. Chennai to Madurai" className="w-full border rounded-lg px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                <input required value={stateLocation} onChange={e => setStateLocation(e.target.value)} placeholder="e.g. Tamil Nadu" className="w-full border rounded-lg px-4 py-2 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 outline-none transition uppercase" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rate Date</label>
                                <input type="date" required value={rateDate} onChange={e => setRateDate(e.target.value)} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Loading Location</label>
                                <div className="flex gap-2">
                                    <input required value={loadingLoc} onChange={e => setLoadingLoc(e.target.value)} placeholder="Origin Name" className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                                    <input value={loadingSap} onChange={e => setLoadingSap(e.target.value)} placeholder="SAP Code (e.g. 6300)" className="w-40 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Location</label>
                                <div className="flex gap-2">
                                    <input required value={unloadingLoc} onChange={e => setUnloadingLoc(e.target.value)} placeholder="Destination Name" className="flex-1 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                                    <input value={unloadingSap} onChange={e => setUnloadingSap(e.target.value)} placeholder="SAP Code (e.g. 3306)" className="w-40 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg border">
                            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2"><MapPin size={18} /> Toll Plazas on Route</h3>
                            {plazas.map((plaza, idx) => (
                                <div key={idx} className="flex gap-4 mb-3">
                                    <input required placeholder="Plaza Name" value={plaza.name} onChange={e => handlePlazaChange(idx, 'name', e.target.value)} className="flex-1 border rounded-lg px-4 py-2 focus:ring-primary-500 outline-none" />
                                    <input required type="number" placeholder="Approved Rate (₹)" value={plaza.approved_rate} onChange={e => handlePlazaChange(idx, 'approved_rate', e.target.value)} className="w-48 border rounded-lg px-4 py-2 focus:ring-primary-500 outline-none" />
                                </div>
                            ))}
                            <button type="button" onClick={handleAddPlaza} className="text-primary-600 font-medium hover:text-primary-800 text-sm mt-2 flex gap-1 items-center">
                                <Plus size={16} /> Add another plaza
                            </button>
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button type="button" onClick={() => setShowAdd(false)} className="px-6 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition font-medium shadow-sm">Save Complete Route</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {routes.map(r => (
                    <div key={r.id} className="bg-white rounded-xl shadow-sm border p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition hover:shadow-md">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{r.name}</h3>
                            <div className="flex flex-wrap items-center text-sm text-gray-500 gap-2 font-medium">
                                <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-md">{r.loading_location} <span className="text-blue-400">({r.loading_sap_code})</span></span>
                                <span>→</span>
                                <span className="bg-green-50 text-green-700 px-2 py-1 rounded-md">{r.unloading_location} <span className="text-green-400">({r.unloading_sap_code})</span></span>
                                {r.rate_date && <span className="bg-gray-100 px-2 py-1 rounded-md ml-2">Rates from: {new Date(r.rate_date).toLocaleDateString()}</span>}
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Plazas</p>
                                <p className="font-bold text-2xl text-gray-800">{r.toll_count}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-1">Total Toll</p>
                                <p className="font-bold text-2xl text-primary-600">₹{r.total_toll || 0}</p>
                            </div>
                            <div className="flex flex-col gap-2 ml-4 border-l pl-4 border-gray-100">
                                <button onClick={() => handleDownloadPdf(r)} className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Download Toll Mapping PDF">
                                    <Download size={20} />
                                </button>
                                <button onClick={() => deleteRoute(r.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Route">
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {routes.length === 0 && <div className="text-center p-12 bg-white rounded-xl border border-dashed"><p className="text-gray-500 text-lg">No routes configured yet.</p></div>}
            </div>
        </div>
    );
};

export default RoutesManage;
