import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Printer, Download, Save, Files } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const Claims = () => {
    const [vehicles, setVehicles] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [reports, setReports] = useState([]);

    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [selectedReportId, setSelectedReportId] = useState('');
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
            const [vehRes, routeRes, claimsRes, reportsRes] = await Promise.all([
                axios.get(`${API}/api/vehicles`),
                axios.get(`${API}/api/routes`),
                axios.get(`${API}/api/data/claims`),
                axios.get(`${API}/api/data/fastag-reports`)
            ]);
            setVehicles(vehRes.data);
            setRoutes(routeRes.data);
            setPastClaims(claimsRes.data);
            setReports(reportsRes.data);
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
            const { data } = await axios.post(`${API}/api/data/claims/generate`, {
                vehicle_number: selectedVehicle,
                route_id: selectedRoute,
                start_date: startDate || null,
                end_date: endDate || null,
                report_id: selectedReportId || null
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
            const { data } = await axios.post(`${API}/api/data/claims/save`, {
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

    const generatePdfFromElement = async (element, filename) => {
        if (!element) return;

        // Hide buttons matching 'print:hidden' for a clean capture
        const hiddenElements = element.querySelectorAll('.print\\:hidden');
        hiddenElements.forEach(el => el.style.opacity = '0');

        try {
            const canvas = await html2canvas(element, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });

            hiddenElements.forEach(el => el.style.opacity = '1');

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            let heightLeft = pdfHeight;
            let position = 0;
            const pageHeight = pdf.internal.pageSize.getHeight();

            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;

            while (heightLeft > 0) {
                position = heightLeft - pdfHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
                heightLeft -= pageHeight;
            }

            pdf.save(filename);
        } catch (err) {
            console.error('PDF Generation Error', err);
            hiddenElements.forEach(el => el.style.opacity = '1');
        }
    };

    const handleDownloadSinglePdf = async () => {
        await generatePdfFromElement(printRef.current, `Claim_${claimData.vehicle_number}_Single_Full.pdf`);
    };

    const handleDownloadSplitPdf = async () => {
        const vendorBlock = document.getElementById('vendor-details-block');
        const tollBlock = document.getElementById('toll-details-block');

        if (vendorBlock) await generatePdfFromElement(vendorBlock, `Claim_${claimData.vehicle_number}_Vendor_Part.pdf`);
        if (tollBlock) await generatePdfFromElement(tollBlock, `Claim_${claimData.vehicle_number}_Toll_Calc_Part.pdf`);
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-900">Toll Claim Generation</h1>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border print:hidden">
                <form className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end" onSubmit={handleGenerate}>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-blue-700 mb-1">Upload Report (Optional)</label>
                        <select 
                            value={selectedReportId} 
                            onChange={e => {
                                const repId = e.target.value;
                                setSelectedReportId(repId);
                                const r = reports.find(rep => String(rep.id) === String(repId));
                                if(r && r.vehicle_number) setSelectedVehicle(r.vehicle_number);
                            }} 
                            className="w-full border-blue-300 border bg-blue-50 rounded-lg px-4 py-2 font-medium"
                        >
                            <option value="">-- Use Date Range Instead --</option>
                            {reports.map(r => (
                                <option key={r.id} value={r.id}>
                                    {r.original_filename} ({r.vehicle_number || 'Unknown'} - {r.record_count} TXN)
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                        <select required value={selectedVehicle} onChange={e => setSelectedVehicle(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50 uppercase object-cover">
                            <option value="">Select Vehicle</option>
                            {vehicles.map(v => <option key={v.id} value={v.vehicle_number}>{v.vehicle_number}</option>)}
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                        <select required value={selectedRoute} onChange={e => setSelectedRoute(e.target.value)} className="w-full border rounded-lg px-4 py-2 bg-gray-50">
                            <option value="">Select Route</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date (Opt)</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={!!selectedReportId} className="w-full border rounded-lg px-4 py-2 bg-gray-50 disabled:opacity-50" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date (Opt)</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={!!selectedReportId} className="w-full border rounded-lg px-4 py-2 bg-gray-50 disabled:opacity-50" />
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
                        <div className="print:hidden">
                            {/* Title Removed for exact match */}
                        </div>
                        <div className="text-right print:hidden space-x-2 flex items-center justify-end w-full">
                            <button onClick={handleDownloadSinglePdf} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1 shadow-sm transition">
                                <Download size={16} /> Single PDF
                            </button>
                            <button onClick={handleDownloadSplitPdf} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1 shadow-sm transition">
                                <Files size={16} /> Split PDF
                            </button>
                            <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1 transition border">
                                <Printer size={16} /> Print
                            </button>
                            <button onClick={handleSaveClaim} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-1 shadow-sm transition">
                                <Save size={16} /> Save
                            </button>
                        </div>
                    </div>

                    <div className="p-8 pb-0 flex justify-between items-center bg-white border-b border-gray-100">
                        <img src="/kvb_logo.svg" alt="KVB" className="h-10 object-contain" />
                        <div className="text-center font-bold">
                            <h2 className="text-lg tracking-wider">KVB FASTAG</h2>
                            <h3 className="text-md">TRANSACTION SUMMARY REPORT</h3>
                        </div>
                        <img src="/netc_fastag_logos.svg" alt="NETC Fastag" className="h-10 object-contain" />
                    </div>

                    <div className="px-8 py-4 flex justify-between items-end border-b border-gray-800">
                        <div className="text-[12px] text-gray-900">
                            <p>Reports between:</p>
                            <p>{claimData.start_date ? new Date(claimData.start_date).toLocaleDateString('en-GB').replace(/\//g,'/') : '-'} To {claimData.end_date ? new Date(claimData.end_date).toLocaleDateString('en-GB').replace(/\//g,'/') : '-'}</p>
                        </div>
                        <div className="text-right text-[12px] text-gray-900">
                            <p>Mobile number: {claimData.transporter?.phone || '9443356010'}</p>
                        </div>
                    </div>

                    <div className="p-8 pb-4 print:hidden" id="vendor-details-block">
                        <h3 className="font-bold text-lg mb-4 text-center">VENDOR BILLING DETAILS</h3>
                        <table className="w-full text-xs border-collapse border border-gray-800 mb-4 bg-white">
                            <tbody>
                                <tr>
                                    <td colSpan="2" className="border border-gray-800 p-2 font-bold">
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
                                        <div className="mt-4 pt-4 border-t border-gray-300 font-bold -mx-4 -mb-4 px-4 py-2">
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
                    </div>

                    <div className="p-8 pb-0">
                        {/* Summary Table Format matching user request */}
                        <table className="w-full text-center border-collapse border border-gray-800 text-[11px] bg-white mb-8">
                            <thead>
                                <tr className="font-bold">
                                    <th className="border border-gray-800 p-2 uppercase">Date</th>
                                    <th className="border border-gray-800 p-2 uppercase">Time</th>
                                    <th className="border border-gray-800 p-2 uppercase">Toll_Reader<br/>Date_Time</th>
                                    <th className="border border-gray-800 p-2 uppercase">Vehicle_No</th>
                                    <th className="border border-gray-800 p-2 uppercase">Paymentd<br/>Description</th>
                                    <th className="border border-gray-800 p-2 uppercase">Txn_Id</th>
                                    <th className="border border-gray-800 p-2 uppercase">Debit<br/>Amount</th>
                                    <th className="border border-gray-800 p-2 uppercase">Credit<br/>Amount</th>
                                    <th className="border border-gray-800 p-2 uppercase">Txn<br/>Status</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-900 border-b border-gray-800">
                                {claimData.details.length === 0 && (
                                    <tr><td colSpan="9" className="border border-gray-800 p-8 text-center text-gray-500 font-bold">No FASTag transactions found.</td></tr>
                                )}
                                {claimData.details.map((d, i) => {
                                    // Parse original date string DD/MM/YYYY to DD/MMM/YYYY
                                    let formattedDate = d.date;
                                    let formattedReaderDate = d.toll_reader_date_time;
                                    try {
                                        const [day, month, year] = d.date.split('/');
                                        const dateObj = new Date(`${year}-${month}-${day}`);
                                        if(!isNaN(dateObj.getTime())) {
                                            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                            formattedDate = `${day}/${monthNames[parseInt(month)-1]}/${year}`;
                                            formattedReaderDate = `${day}/${monthNames[parseInt(month)-1]}/${year.slice(-2)}\n${d.time}`;
                                        }
                                    } catch(e) {}

                                    return (
                                    <tr key={i} className="align-top">
                                        <td className="border border-gray-800 p-1 px-2 whitespace-nowrap">{formattedDate}</td>
                                        <td className="border border-gray-800 p-1 px-2 whitespace-nowrap">{d.time}</td>
                                        <td className="border border-gray-800 p-1 px-2 whitespace-pre-line leading-tight">{formattedReaderDate}</td>
                                        <td className="border border-gray-800 p-1 px-2 font-bold uppercase">{claimData.vehicle_number}</td>
                                        <td className="border border-gray-800 p-1 px-2 text-left leading-tight break-words max-w-[140px] whitespace-pre-line">{`${d.transaction_id ? d.transaction_id.slice(-6) : '000000'}\n${d.toll_plaza}`}</td>
                                        <td className="border border-gray-800 p-1 px-2 text-left leading-tight break-all max-w-[140px]">
                                            {d.transaction_id ? d.transaction_id : '720377-123001-0010002103271'}
                                        </td>
                                        <td className="border border-gray-800 p-1 px-2 text-left">{d.paid_amount.toFixed(1)}</td>
                                        <td className="border border-gray-800 p-1 px-2"></td>
                                        <td className="border border-gray-800 p-1 px-2 text-left">Success</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>

                        {/* Keep the Toll Difference Calculation for Billing purposes below it */}
                        <div id="toll-details-block" className="mt-8 border-t-2 border-dashed border-gray-300 pt-8">
                            <h3 className="font-bold text-lg mb-4 text-center">CLAIM DIFFERENCE CALCULATION</h3>
                            <table className="w-full text-center border-collapse border border-gray-800 text-[10px] bg-white">
                                <thead>
                                    <tr className="font-bold bg-gray-50">
                                        <th className="border border-gray-800 p-2 w-[5%]">S.No</th>
                                        <th className="border border-gray-800 p-2 w-[15%]">TOLL NAME</th>
                                        <th className="border border-gray-800 p-2 w-[12%]">APPROVED RATE</th>
                                        <th className="border border-gray-800 p-2 w-[12%]">TOLL TAX PAID</th>
                                        <th className="border border-gray-800 p-2 w-[12%] text-red-600">DIFF AMOUNT</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {claimData.details.map((d, i) => (
                                        <tr key={i}>
                                            <td className="border border-gray-800 p-1">{i + 1}</td>
                                            <td className="border border-gray-800 p-1 text-left uppercase">{d.toll_plaza}</td>
                                            <td className="border border-gray-800 p-1 font-bold">₹{d.approved_rate ? d.approved_rate.toFixed(1) : '0.0'}</td>
                                            <td className="border border-gray-800 p-1 font-bold">₹{d.paid_amount.toFixed(1)}</td>
                                            <td className="border border-gray-800 p-1 font-bold text-red-600">₹{d.difference.toFixed(1)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="font-bold">
                                    {claimData.details.length > 0 && (
                                        <>
                                            <tr>
                                                <td colSpan="3" className="border border-gray-800 p-2 text-right font-bold align-middle bg-gray-50 uppercase tracking-wider">Total Claim Amount</td>
                                                <td colSpan="2" className="border border-gray-800 p-2 align-middle font-bold text-lg text-red-700 bg-gray-50 italic">₹{claimData.difference_amount}</td>
                                            </tr>
                                            <tr>
                                                <td colSpan="5" className="border border-gray-800 p-4 h-24 align-bottom text-center font-bold">
                                                    Signature & Stamp (Transporter)
                                                </td>
                                            </tr>
                                        </>
                                    )}
                                </tfoot>
                            </table>
                        </div>
                    </div>  </div>
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
