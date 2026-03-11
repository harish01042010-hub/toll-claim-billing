const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const xlsx = require('xlsx');
const pdfParse = require('pdf-parse');
const fs = require('fs');

const upload = multer({ storage: multer.memoryStorage() });

// Dashboard Data
router.get('/stats', async (req, res) => {
    try {
        const [vehicles] = await db.query('SELECT COUNT(*) as count FROM vehicles');
        const [routes] = await db.query('SELECT COUNT(*) as count FROM routes');
        const [claims] = await db.query('SELECT COUNT(*) as count, SUM(total_approved) as totalAmount FROM claim_bills');

        const [recent_transactions] = await db.query(`
            SELECT * FROM fastag_transactions 
            ORDER BY transaction_date DESC LIMIT 5
        `);

        res.json({
            total_vehicles: vehicles[0].count,
            total_routes: routes[0].count,
            total_claims: claims[0].count,
            total_claim_amount: claims[0].totalAmount || 0,
            recent_transactions
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Fastag Transactions for Preview
router.get('/fastag-transactions', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT * FROM fastag_transactions 
            ORDER BY created_at DESC, transaction_date DESC 
            LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upload transactions (Excel/CSV/PDF)
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        let extractedRows = [];

        if (req.file.originalname.toLowerCase().endsWith('.pdf')) {
            const data = await pdfParse(req.file.buffer);
            const lines = data.text.split('\n');

            for (const line of lines) {
                // Heuristic regex to match: [Date] ... [Vehicle] ... [Amount]
                // Examples: 27/03/2021 12:30:00 MH12AB1234 Some Toll Plaza 150
                // Or: txn123 2021-03-27 TN52W3099 Paliyekkara Toll Plaza 410.0
                const dateMatch = line.match(/(\d{2}[-/]\d{2}[-/]\d{2,4}(?:\s+\d{2}:\d{2}:\d{2})?)/);
                const vehMatch = line.match(/\b([A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{4})\b/);
                const amtMatch = line.match(/\b(\d{2,5}(?:\.\d{1,2})?)\s*$/);

                if (dateMatch && vehMatch && amtMatch) {
                    let transId = line.match(/\b([0-9a-zA-Z]{10,20})\b/);
                    let plazaStr = line
                        .replace(dateMatch[0], '')
                        .replace(vehMatch[0], '')
                        .replace(amtMatch[0], '')
                        .replace(transId ? transId[0] : '', '')
                        .trim();

                    extractedRows.push({
                        Date: dateMatch[1],
                        Vehicle: vehMatch[1],
                        Amount: amtMatch[1],
                        Plaza: plazaStr.replace(/[^a-zA-Z\s]/g, '').trim(),
                        Id: transId ? transId[1] : null
                    });
                }
            }
        } else {
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const rawRows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            for (const row of rawRows) {
                const keys = Object.keys(row);
                const getDate = (k) => k.toLowerCase().includes('date') || k.toLowerCase().includes('time');
                const getVech = (k) => k.toLowerCase().includes('vehicle') || k.toLowerCase().includes('reg');
                const getPlaza = (k) => k.toLowerCase().includes('plaza') || k.toLowerCase().includes('toll');
                const getAmt = (k) => k.toLowerCase().includes('amount') || k.toLowerCase().includes('fee');
                const getTransId = (k) => k.toLowerCase().includes('id') || k.toLowerCase().includes('txn');

                extractedRows.push({
                    Date: row[keys.find(getDate)],
                    Vehicle: row[keys.find(getVech)],
                    Plaza: row[keys.find(getPlaza)],
                    Amount: row[keys.find(getAmt)],
                    Id: row[keys.find(getTransId)]
                });
            }
        }

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            // Determine primary vehicle for this report (just pick the first valid one or most common)
            let primaryVehicle = null;
            if (extractedRows.length > 0) {
                const vecs = extractedRows.map(r => String(r.Vehicle).replace(/\s+/g, '').toUpperCase()).filter(v => v && v !== 'UNDEFINED');
                // Could get most frequent, but just taking the first for simplicity
                primaryVehicle = vecs[0] || 'UNKNOWN';
            }

            // Insert into fastag_reports
            const saved_filename = Date.now() + '_' + req.file.originalname.replace(/\s+/g, '_');
            const [reportResult] = await connection.query(
                `INSERT INTO fastag_reports (original_filename, saved_filename, file_type, vehicle_number, record_count, file_data) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                    req.file.originalname, 
                    saved_filename, 
                    req.file.originalname.split('.').pop().toLowerCase(), 
                    primaryVehicle, 
                    extractedRows.length,
                    req.file.buffer
                ]
            );
            const reportId = reportResult.insertId;

            for (const row of extractedRows) {
                if (!row.Date || !row.Vehicle || !row.Plaza || !row.Amount) continue;

                let vechVal = String(row.Vehicle).replace(/\s+/g, '').toUpperCase();
                let transId = row.Id || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;
                let amtVal = parseFloat(row.Amount);

                let transaction_date;
                if (typeof row.Date === 'number') {
                    transaction_date = new Date(Math.round((row.Date - 25569) * 86400 * 1000));
                } else {
                    transaction_date = new Date(row.Date);
                }

                if (isNaN(transaction_date.getTime())) {
                    transaction_date = new Date(); // fallback
                }

                await connection.query(
                    `INSERT IGNORE INTO fastag_transactions 
                     (transaction_id, transaction_date, vehicle_number, toll_plaza_name, paid_amount, report_id) 
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [String(transId), transaction_date, vechVal, row.Plaza, amtVal, reportId]
                );
            }
            await connection.commit();

            res.json({ message: 'File uploaded and saved successfully', extractedRecords: extractedRows.length, reportId });
        } catch (insertError) {
            await connection.rollback();
            // cleanup file on error
            fs.unlinkSync(req.file.path);
            throw insertError;
        } finally {
            connection.release();
        }
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message });
    }
});

// Get Fastag Reports List
router.get('/fastag-reports', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM fastag_reports ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Download Fastag Report File
router.get('/download-report/:id', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT original_filename, file_data FROM fastag_reports WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: 'Report not found' });
        
        const report = rows[0];
        
        if (report.file_data) {
            res.setHeader('Content-Disposition', `attachment; filename="${report.original_filename}"`);
            
            // Set basic content types based on original extension
            const ext = report.original_filename.split('.').pop().toLowerCase();
            if (ext === 'pdf') res.setHeader('Content-Type', 'application/pdf');
            else if (ext === 'xlsx') res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            else if (ext === 'csv') res.setHeader('Content-Type', 'text/csv');
            
            res.send(report.file_data);
        } else {
            // Fallback to file system if it was uploaded before the BLOB change
            const [rowWithSavedName] = await db.query('SELECT saved_filename, original_filename FROM fastag_reports WHERE id = ?', [req.params.id]);
            const filePath = `uploads/${rowWithSavedName[0].saved_filename}`;
            if (fs.existsSync(filePath)) {
                res.download(filePath, rowWithSavedName[0].original_filename);
            } else {
                res.status(404).json({ error: 'File has been deleted or is missing from server' });
            }
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Claims / Get Claims List
router.post('/claims/generate', async (req, res) => {
    // Generate claim for a vehicle & route for a date range OR specify a report_id directly
    const { vehicle_number, route_id, start_date, end_date, report_id } = req.body;

    try {
        const connection = await db.getConnection();

        // Find approved toll rates and plazas for this route
        const [plazas] = await connection.query(`
            SELECT tp.name, tr.approved_rate 
            FROM toll_rates tr
            JOIN toll_plazas tp ON tr.toll_plaza_id = tp.id
            WHERE tr.route_id = ?
        `, [route_id]);

        if (plazas.length === 0) {
            return res.status(400).json({ error: 'Route has no toll plazas defined' });
        }

        const approvedRatesMap = {};
        plazas.forEach(p => {
            approvedRatesMap[p.name.toLowerCase().trim()] = parseFloat(p.approved_rate);
        });

        // Find fastag transactions
        let query = 'SELECT * FROM fastag_transactions WHERE vehicle_number = ?';
        let queryParams = [vehicle_number];

        if (report_id) {
            query += ' AND report_id = ?';
            queryParams.push(report_id);
        } else {
            if (start_date) {
                query += ' AND transaction_date >= ?';
                queryParams.push(new Date(start_date));
            }
            if (end_date) {
                // Ensure end_date includes the end of the day by adding 1 day or using time
                let ed = new Date(end_date);
                ed.setHours(23, 59, 59, 999);
                query += ' AND transaction_date <= ?';
                queryParams.push(ed);
            }
        }

        const [transactions] = await connection.query(query, queryParams);

        let total_paid = 0;
        let total_approved = 0;
        let details = [];

        transactions.forEach(t => {
            const plazaName = t.toll_plaza_name.toLowerCase().trim();
            // Try to match plaza names (basic includes for now)
            let matchedApprovedRate = 0;
            for (const [key, val] of Object.entries(approvedRatesMap)) {
                if (plazaName.includes(key) || key.includes(plazaName)) {
                    matchedApprovedRate = val;
                    break;
                }
            }

            total_paid += parseFloat(t.paid_amount);
            total_approved += matchedApprovedRate;

            const transDate = new Date(t.transaction_date);
            const timeStr = transDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const dateStr = transDate.toLocaleDateString('en-GB');

            details.push({
                transaction_id: t.transaction_id,
                date: dateStr,
                time: timeStr,
                toll_reader_date_time: `${dateStr.split('/').join('/')} ${timeStr}`,
                toll_plaza: t.toll_plaza_name,
                paid_amount: parseFloat(t.paid_amount),
                approved_rate: matchedApprovedRate,
                difference: parseFloat(t.paid_amount) - matchedApprovedRate
            });
        });

        let difference_amount = total_paid - total_approved;

        // Fetch transporter / vendor details
        const [veh] = await connection.query('SELECT transporter_id FROM vehicles WHERE vehicle_number = ?', [vehicle_number]);
        let transporter = null;
        if (veh.length > 0 && veh[0].transporter_id) {
            const [transResult] = await connection.query('SELECT * FROM transporters WHERE id = ?', [veh[0].transporter_id]);
            transporter = transResult.length ? transResult[0] : null;
        }

        const [routeDetails] = await connection.query('SELECT * FROM routes WHERE id = ?', [route_id]);
        const route_info = routeDetails.length ? routeDetails[0] : null;

        res.json({
            vehicle_number,
            route_id,
            route_info,
            transporter,
            total_paid,
            total_approved,
            difference_amount,
            details
        });

        connection.release();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/claims/save', async (req, res) => {
    const { vehicle_number, route_id, total_paid, total_approved, difference_amount, shipment_no, shipment_date, start_date, end_date } = req.body;
    try {
        const [veh] = await db.query('SELECT transporter_id FROM vehicles WHERE vehicle_number = ?', [vehicle_number]);
        const transporter_id = veh.length ? veh[0].transporter_id : null;

        const bill_number = `BILL-${Date.now()}`;

        await db.query(`
            INSERT INTO claim_bills 
            (bill_number, transporter_id, vehicle_number, route_id, total_paid, total_approved, difference_amount, shipment_no, shipment_date, bill_from_date, bill_to_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bill_number, transporter_id, vehicle_number, route_id, total_paid, total_approved, difference_amount, shipment_no || null, shipment_date || null, start_date || null, end_date || null]);

        res.json({ message: 'Bill saved successfully', bill_number });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/claims', async (req, res) => {
    try {
        const [claims] = await db.query('SELECT * FROM claim_bills ORDER BY created_at DESC');
        res.json(claims);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
