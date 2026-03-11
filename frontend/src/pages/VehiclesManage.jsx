import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Truck, Plus, Trash2, Download, Upload } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const VehiclesManage = () => {
    const [vehicles, setVehicles] = useState([]);
    const [transporters, setTransporters] = useState([]);
    const [showAdd, setShowAdd] = useState(false);

    // New Transporter Form
    const [tName, setTName] = useState('');
    const [tContact, setTContact] = useState('');
    const [tPhone, setTPhone] = useState('');
    const [tAddress, setTAddress] = useState('');
    const [tGstin, setTGstin] = useState('');
    const [tPan, setTPan] = useState('');
    const [tVendorCode, setTVendorCode] = useState('');
    const [tPlantAddress, setTPlantAddress] = useState('');

    // New Vehicle Form
    const [vTransporter, setVTransporter] = useState('');
    const [vNumber, setVNumber] = useState('');
    const [vDriver, setVDriver] = useState('');

    const fetchData = async () => {
        try {
            const [vehRes, transRes] = await Promise.all([
                axios.get(`${API}/api/vehicles`),
                axios.get(`${API}/api/transporters`)
            ]);
            setVehicles(vehRes.data);
            setTransporters(transRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleImportPdf = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const { data } = await axios.post(`${API}/api/transporters/parse-pdf`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (data.name) setTName(data.name);
            if (data.address) setTAddress(data.address);
            if (data.gstin) setTGstin(data.gstin);
            if (data.pan_number) setTPan(data.pan_number);
            if (data.vendor_code) setTVendorCode(data.vendor_code);
            if (data.phone) setTPhone(data.phone);
            if (data.plant_manager_address) setTPlantAddress(data.plant_manager_address);

            setShowAdd(true);
            e.target.value = null;
        } catch (err) {
            console.error(err);
            alert('Error parsing PDF file');
        }
    };

    const handleDownloadPdf = (t) => {
        const doc = new jsPDF();

        doc.setFontSize(10);

        autoTable(doc, {
            startY: 20,
            theme: 'plain',
            styles: { fontSize: 9, font: 'helvetica', textColor: 0, cellPadding: 2, lineWidth: 0.5, lineColor: 0 },
            columnStyles: {
                0: { cellWidth: 25, fontStyle: 'bold' },
                1: { cellWidth: 80 },
                2: { cellWidth: 40, fontStyle: 'bold' },
                3: { cellWidth: 40 }
            },
            body: [
                [
                    { content: 'Vendor Details, Address and Vendor Code, Contact details. Plant Manager Location', colSpan: 2, styles: { fontStyle: 'bold' } },
                    { content: 'Re-reimbursement\nBill No', styles: { valign: 'middle' } },
                    { content: '', styles: { valign: 'middle' } }
                ],
                [
                    { content: 'Company:', styles: { lineWidth: { left: 0.5, bottom: 0, top: 0, right: 0 } } },
                    { content: t.name || '-', styles: { lineWidth: { right: 0.5, bottom: 0, top: 0, left: 0 } } },
                    { content: 'Bill Date' },
                    { content: '' }
                ],
                [
                    { content: 'Address:', styles: { lineWidth: { left: 0.5, bottom: 0, top: 0, right: 0 } } },
                    { content: t.address || '-', styles: { lineWidth: { right: 0.5, bottom: 0, top: 0, left: 0 } } },
                    { content: 'Vehicle No:' },
                    { content: '' }
                ],
                [
                    { content: 'GSTIN No:', styles: { lineWidth: { left: 0.5, bottom: 0, top: 0, right: 0 } } },
                    { content: t.gstin || 'NIL', styles: { lineWidth: { right: 0.5, bottom: 0, top: 0, left: 0 } } },
                    { content: 'Shipment No' },
                    { content: '' }
                ],
                [
                    { content: 'PAN No:', styles: { lineWidth: { left: 0.5, bottom: 0, top: 0, right: 0 } } },
                    { content: t.pan_number || '-', styles: { lineWidth: { right: 0.5, bottom: 0, top: 0, left: 0 } } },
                    { content: 'Shipment Date' },
                    { content: '' }
                ],
                [
                    { content: 'Vendor\nCode:', styles: { valign: 'top', lineWidth: { left: 0.5, bottom: 0, top: 0, right: 0 } } },
                    { content: t.vendor_code || '-', styles: { valign: 'top', lineWidth: { right: 0.5, bottom: 0, top: 0, left: 0 } } },
                    { content: 'From\n\n' },
                    { content: 'To\n\n', styles: { fontStyle: 'bold' } }
                ],
                [
                    { content: 'Phone No:', styles: { lineWidth: { left: 0.5, bottom: 0.5, top: 0, right: 0 } } },
                    { content: t.phone || '-', styles: { lineWidth: { right: 0.5, bottom: 0.5, top: 0, left: 0 } } },
                    { content: 'Bill From:               To:', colSpan: 2 }
                ],
                [
                    { content: 'To Plant manager:', colSpan: 2, styles: { fontStyle: 'bold', lineWidth: { left: 0.5, right: 0.5, top: 0.5, bottom: 0 } } },
                    { content: 'Billing Address :\n\nBharat Petroleum Corporation Limited,\nBPCL\nOffice complex, Business process\nexcellance center(BPEC), Plot No- 6,\nsector-2, Behind cidco garden, Kharghar,\nNavi Mumbai, Pin- 410210\nGSTIN- 27AAACB2902M1ZT', colSpan: 2, rowSpan: 2, styles: { fontStyle: 'bold', valign: 'top' } }
                ],
                [
                    { content: 'Consignee Details:\n\n' + (t.plant_manager_address || '-'), colSpan: 2, styles: { fontStyle: 'bold', lineWidth: { left: 0.5, right: 0.5, top: 0, bottom: 0.5 } } },
                ]
            ]
        });

        doc.save(`${t.name || 'Transporter'}_Template.pdf`);
    };

    const handleAddTransporter = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/api/transporters`, {
                name: tName, contact_person: tContact, phone: tPhone, address: tAddress, gstin: tGstin, pan_number: tPan, vendor_code: tVendorCode, plant_manager_address: tPlantAddress
            });
            setTName(''); setTContact(''); setTPhone(''); setTAddress(''); setTGstin(''); setTPan(''); setTVendorCode(''); setTPlantAddress('');
            fetchData();
        } catch (err) {
            alert('Error adding transporter');
        }
    };

    const handleAddVehicle = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API}/api/vehicles`, {
                transporter_id: vTransporter,
                vehicle_number: vNumber,
                driver_name: vDriver
            });
            setVTransporter(''); setVNumber(''); setVDriver('');
            fetchData();
        } catch (err) {
            alert('Error adding vehicle');
        }
    };

    const deleteVehicle = async (id) => {
        if (window.confirm('Delete this vehicle?')) {
            await axios.delete(`${API}/api/vehicles/${id}`);
            fetchData();
        }
    };

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">Vehicle & Transporter Management</h1>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2 transition"
                >
                    <Plus size={20} /> Add New
                </button>
            </div>

            {showAdd && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">Add Transporter</h2>
                            <label className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded text-sm flex items-center gap-2 cursor-pointer transition font-medium border border-blue-200">
                                <Upload size={16} /> Auto-Fill via PDF
                                <input type="file" accept=".pdf" className="hidden" onChange={handleImportPdf} />
                            </label>
                        </div>
                        <form onSubmit={handleAddTransporter} className="space-y-4">
                            <input required value={tName} onChange={e => setTName(e.target.value)} placeholder="Company Name" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                            <div className="flex gap-2">
                                <input value={tContact} onChange={e => setTContact(e.target.value)} placeholder="Contact Person" className="w-1/2 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                                <input value={tPhone} onChange={e => setTPhone(e.target.value)} placeholder="Phone" className="w-1/2 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                            <input value={tAddress} onChange={e => setTAddress(e.target.value)} placeholder="Full Address" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                            <div className="flex gap-2">
                                <input value={tGstin} onChange={e => setTGstin(e.target.value)} placeholder="GSTIN" className="w-1/3 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none uppercase" />
                                <input value={tPan} onChange={e => setTPan(e.target.value)} placeholder="PAN No" className="w-1/3 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none uppercase" />
                                <input value={tVendorCode} onChange={e => setTVendorCode(e.target.value)} placeholder="Vendor Code" className="w-1/3 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                            </div>
                            <textarea value={tPlantAddress} onChange={e => setTPlantAddress(e.target.value)} placeholder="To Plant Manager / Consignee Address" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" rows="2" />
                            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg transition">Save Transporter</button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border">
                        <h2 className="text-lg font-bold mb-4">Add Vehicle</h2>
                        <form onSubmit={handleAddVehicle} className="space-y-4">
                            <select required value={vTransporter} onChange={e => setVTransporter(e.target.value)} className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none">
                                <option value="">Select Transporter</option>
                                {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                            <input required value={vNumber} onChange={e => setVNumber(e.target.value)} placeholder="Vehicle Number (e.g. MH12AB1234)" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none uppercase" />
                            <input value={vDriver} onChange={e => setVDriver(e.target.value)} placeholder="Driver Name" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 outline-none" />
                            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 rounded-lg transition">Save Vehicle</button>
                        </form>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm">
                            <th className="p-4 font-medium">Vehicle No.</th>
                            <th className="p-4 font-medium">Transporter</th>
                            <th className="p-4 font-medium">Driver</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {vehicles.map((v) => (
                            <tr key={v.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800 tracking-wide">{v.vehicle_number}</td>
                                <td className="p-4">{v.transporter_name || '-'}</td>
                                <td className="p-4">{v.driver_name || '-'}</td>
                                <td className="p-4 text-right">
                                    <button onClick={() => deleteVehicle(v.id)} className="text-red-500 hover:text-red-700 bg-red-50 p-2 rounded-md transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {vehicles.length === 0 && <tr><td colSpan="4" className="p-8 text-center text-gray-500">No vehicles found. Add one to get started.</td></tr>}
                    </tbody>
                </table>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden mt-8">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 text-gray-500 text-sm">
                            <th className="p-4 font-medium">Transporter Company</th>
                            <th className="p-4 font-medium">Vendor Code</th>
                            <th className="p-4 font-medium">GSTIN / PAN</th>
                            <th className="p-4 font-medium">Phone No</th>
                            <th className="p-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {transporters.map((t) => (
                            <tr key={t.id} className="hover:bg-gray-50">
                                <td className="p-4 font-bold text-gray-800 tracking-wide">{t.name}</td>
                                <td className="p-4">{t.vendor_code || '-'}</td>
                                <td className="p-4">{t.gstin || '-'}<br /><span className="text-gray-400 text-xs">{t.pan_number}</span></td>
                                <td className="p-4">{t.phone || '-'}</td>
                                <td className="p-4 text-right flex justify-end gap-2">
                                    <button onClick={() => handleDownloadPdf(t)} className="text-blue-500 hover:text-blue-700 bg-blue-50 p-2 rounded-md transition-colors" title="Download Transporter Details PDF">
                                        <Download size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {transporters.length === 0 && <tr><td colSpan="5" className="p-8 text-center text-gray-500">No transporters found. Add one above.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default VehiclesManage;
