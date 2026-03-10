import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Printer, Download, Save } from 'lucide-react';

const Claims = () => {
    const [vehicles, setVehicles] = useState([]);
    const [routes, setRoutes] = useState([]);

    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [shipmentNo, setShipmentNo] = useState('');
    const [shipmentDate, setShipmentDate] = useState('');

    const [claimData, setClaimData] = useState(null);
    const [pastClaims, setPastClaims] = useState([]);
    const [loading, setLoading] = useState(false);

    const printRef = useRef(null);

    const fetchData = async () => {
        try {
            const [vehRes, routeRes, claimsRes] = await Promise.all([
                axios.get('https://toll-claim-billing-production.up.railway.app/api/vehicles'),
axios.get('https://toll-claim-billing-production.up.railway.app/api/routes'),
axios.get('https://toll-claim-billing-production.up.railway.app/api/data/claims')
            ]);
            setVehicles(vehRes.data);
            setRoutes(routeRes.data);
            setPastClaims(claimsRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!selectedVehicle || !selectedRoute) return alert('Select Vehicle and Route');

        setLoading(true);
        setClaimData(null);
        try {
            const { data } = await axios.post('https://toll-claim-billing-production.up.railway.app/api/data/claims/generate', {
                vehicle_number: selectedVehicle,
                route_id: selectedRoute,
                start_date: startDate || null,
                end_date: endDate || null
            });
            setClaimData({ ...data, shipment_no: shipmentNo, shipment_date: shipmentDate, start_date: startDate, end_date: endDate });
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to generate claim');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveClaim = async () => {
        if (!claimData) return;
        try {
            const { data } = await axios.post('https://toll-claim-billing-production.up.railway.app/api/data/claims/save', {
                vehicle_number: claimData.vehicle_number,
                route_id: claimData.route_id,
                total_paid: claimData.total_paid,
                total_approved: claimData.total_approved,
                difference_amount: claimData.difference_amount,
                shipment_no: claimData.shipment_no,
                shipment_date: claimData.shipment_date,
                start_date: claimData.start_date,
                end_date: claimData.end_date
            });
            alert(`Claim Saved! Bill Number: ${data.bill_number}`);
            setClaimData(null);
            fetchData();
        } catch (err) {
            alert('Failed to save claim');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Toll Claim Generation</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border print:hidden">
                <form className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end" onSubmit={handleGenerate}>
                    <div className="col-span-1 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <select required value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50 uppercase object-cover">
                            <option value="">Select Vehicle</option>
                            {vehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                        <select required value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50">
                            <option value="">Select Route</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Opt)</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Opt)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shipment No</label>
                        <input type="text" value={shipmentNo} onChange={e => setShipmentNo(e.target.value)} placeholder="e.g. 104822" className="w-full border rounded-lg px-4 py-2 bg-gray-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Date</label>
                        <input type="date" value={shipmentDate} onChange={e => setShipmentDate(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50" />
                    </div>
                    <button disabled={loading} type="submit" className="md:col-span-4 lg:col-span-1 w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition h-10">
                        {loading ? 'Generating...' : <><Search size={18} /> Generate Claim</>}
                    </button>
                </form>
            </div>

            {claimData && (
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden mb-8" ref={printRef}>
                    <div className="p-8 pb-4 border-b border-gray-100 flex justify-between items-start">
                        <div>
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reimbursement Bill</h2>
                            <p className="text-gray-500 mt-1">Vehicle: <span className="font-bold text-gray-800 uppercase">{claimData.vehicle_number}</span></p>
                            <p className="text-gray-500">Route: <span className="font-bold text-gray-800">{routes.find(r => r.id == claimData.route_id)?.name}</span></p>
                        </div>
                        <div className="text-right print:hidden space-x-2">
                            <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 transition">
                                <Printer size={18} /> Print
                            </button>
                            <button onClick={handleSaveClaim} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium inline-flex items-center gap-2 shadow-sm transition">
                                <Save size={18} /> Save Claim
                            </button>
                        </div>
                    </div>

                    <div className="p-8">
                        <table className="w-full text-xs border-collapse border border-gray-800 mb-4">
                            <tbody>
                                <tr>
                                    <td colSpan="2" className="border border-gray-800 p-2 font-bold bg-gray-100">
                                        Vendor Details, Address and Vendor Code, Contact details. Plant Manager Location
                                    </td>
                                    <td className="border border-gray-800 p-2">
                                        <div><span className="font-bold">Re-reimbursement Bill No</span> <span className="float-right">[Auto-Gen]</span></div>
                                        <div><span className="font-bold">Bill Date</span> <span className="float-right">{new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}</span></div>
                                        <div><span className="font-bold">Vehicle No:</span> <span className="float-right">{claimData.vehicle_number}</span></div>
                                        <div className="mt-2 text-gray-700"><span className="font-bold">Shipment No</span> <span className="float-right">{claimData.shipment_no || '-'}</span></div>
                                        <div className="text-gray-700"><span className="font-bold">Shipment Date</span> <span className="float-right">{claimData.shipment_date ? new Date(claimData.shipment_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}</span></div>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan="2" className="border border-gray-800 p-4">
                                        <div className="grid grid-cols-[100px_1fr] gap-1">
                                            <div className="font-bold">Company:</div><div>{claimData.transporter?.name || '-'}</div>
                                            <div className="font-bold">Address:</div><div>{claimData.transporter?.address || '-'}</div>
                                            <div className="font-bold">GSTIN No:</div><div>{claimData.transporter?.gstin || 'NIL'}</div>
                                            <div className="font-bold">PAN No:</div><div>{claimData.transporter?.pan_number || '-'}</div>
                                            <div className="font-bold">Vendor Code:</div><div>{claimData.transporter?.vendor_code || '-'}</div>
                                            <div className="font-bold">Phone No:</div><div>{claimData.transporter?.phone || '-'}</div>
                                        </div>
                                    </td>
                                    <td className="border border-gray-800 p-4 align-top">
                                        <div className="flex justify-between font-bold mb-2"><span>From</span><span>To</span></div>
                                        <div className="flex justify-between text-gray-700">
                                            <span>
                                                {claimData.route_info?.loading_location || 'Loading'} {claimData.route_info?.loading_sap_code ? `[${claimData.route_info.loading_sap_code}]` : ''}
                                            </span>
                                            <span className="text-right">
                                                {claimData.route_info?.unloading_location || 'Unloading'} {claimData.route_info?.unloading_sap_code ? `[${claimData.route_info.unloading_sap_code}]` : ''}
                                            </span>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-gray-300 font-bold bg-gray-50 -mx-4 -mb-4 px-4 py-2">
                                            Bill From: {claimData.start_date ? new Date(claimData.start_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'} To: {claimData.end_date ? new Date(claimData.end_date).toLocaleDateString('en-GB').replace(/\//g, '-') : '-'}
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan="2" className="border border-gray-800 p-4 align-top">
                                        <div className="font-bold mb-2">To Plant manager:</div>
                                        <div className="whitespace-pre-wrap">{claimData.transporter?.plant_manager_address || 'Consignee Details:'}</div>
                                    </td>
                                    <td className="border border-gray-800 p-4 align-top">
                                        <div className="font-bold mb-1">Billing Address :</div>
                                        <div className="text-gray-700">
                                            Bharat Petroleum Corporation Limited, BPCL<br />
                                            Office complex, Business process<br />
                                            excellence center(BPEC), Plot No- 6,<br />
                                            sector-2, Behind cidco garden, Kharghar,<br />
                                            Navi Mumbai, Pin- 410210<br />
                                            GSTIN- 27AAACB2902M1ZT
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <table className="w-full text-center border-collapse border border-gray-800 text-xs">
                            <thead>
                                <tr className="bg-gray-100 font-bold">
                                    <th className="border border-gray-800 p-2">S.No</th>
                                    <th className="border border-gray-800 p-2">Trans Date</th>
                                    <th className="border border-gray-800 p-2">Transaction Id</th>
                                    <th className="border border-gray-800 p-2">Toll Name</th>
                                    <th className="border border-gray-800 p-2">Rate As on {claimData.route_info?.rate_date ? new Date(claimData.route_info.rate_date).toLocaleDateString('en-GB').replace(/\//g, '.') : '01.01.2018'}</th>
                                    <th className="border border-gray-800 p-2">Approved Rate</th>
                                    <th className="border border-gray-800 p-2">Toll Tax Paid</th>
                                    <th className="border border-gray-800 p-2">Diff Amount</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-800">
                                {claimData.details.map((d, i) => (
                                    <tr key={i} className="hover:bg-gray-50">
                                        <td className="border border-gray-800 p-2">{i + 1}</td>
                                        <td className="border border-gray-800 p-2">{new Date(d.date).toLocaleDateString('en-GB')}</td>
                                        <td className="border border-gray-800 p-2 text-left">{d.transaction_id || '-'}</td>
                                        <td className="border border-gray-800 p-2 text-left">{d.toll_plaza}</td>
                                        <td className="border border-gray-800 p-2">{d.approved_rate ? d.approved_rate.toFixed(1) : '0.0'}</td>
                                        <td className="border border-gray-800 p-2">{d.approved_rate ? d.approved_rate.toFixed(1) : '0.0'}</td>
                                        <td className="border border-gray-800 p-2">{d.paid_amount.toFixed(1)}</td>
                                        <td className="border border-gray-800 p-2">{d.difference.toFixed(1)}</td>
                                    </tr>
                                ))}
                                {claimData.details.length === 0 && (
                                    <tr><td colSpan="8" className="border border-gray-800 p-8 text-center text-gray-500">No FASTag transactions found for this selection.</td></tr>
                                )}
                            </tbody>
                            {claimData.details.length > 0 &&
                                <tfoot className="font-bold bg-gray-50">
                                    <tr>
                                        <td colSpan="4" className="border border-gray-800 p-2 text-left">
                                            Amount in words: <span className="font-normal italic">Rs. {claimData.difference_amount} Only</span>
                                        </td>
                                        <td colSpan="3" className="border border-gray-800 p-2 text-right">Total Bill Amount</td>
                                        <td className="border border-gray-800 p-2">{claimData.difference_amount}</td>
                                    </tr>
                                </tfoot>
                            }
                        </table>

                        {claimData.details.length > 0 && (
                            <div className="mt-8 flex justify-end">
                                <div className="bg-blue-50 border border-blue-100 p-6 rounded-xl w-full max-w-sm text-right">
                                    <h4 className="text-blue-800 uppercase text-xs font-bold tracking-widest mb-2">Final Claimable Amount</h4>
                                    <p className="text-4xl font-extrabold text-blue-900 tracking-tighter">₹ {Math.max(0, claimData.difference_amount)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Past Claims List (Hidden from Print) */}
            <div className="bg-white rounded-xl border overflow-hidden mt-8 print:hidden">
                <div className="bg-gray-50 p-6 border-b">
                    <h3 className="text-lg font-bold text-gray-800">Saved Claims</h3>
                </div>
                <table className="w-full text-left text-sm text-gray-600">
                    <thead>
                        <tr>
                            <th className="p-4 font-semibold border-b">Bill Number</th>
                            <th className="p-4 font-semibold border-b">Vehicle</th>
                            <th className="p-4 font-semibold border-b">Created Date</th>
                            <th className="p-4 font-semibold border-b text-right">Total Diff.</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pastClaims.map(c => (
                            <tr key={c.id}>
                                <td className="p-4 text-primary-600 font-medium">{c.bill_number}</td>
                                <td className="p-4 font-bold">{c.vehicle_number}</td>
                                <td className="p-4">{new Date(c.created_at).toLocaleDateString()}</td>
                                <td className="p-4 text-right font-bold text-gray-800">₹{c.difference_amount}</td>
                            </tr>
                        ))}
                        {pastClaims.length === 0 && <tr><td colSpan="4" className="p-6 text-center text-gray-400">No saved claims yet.</td></tr>}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default Claims;
