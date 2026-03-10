const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ dest: 'uploads/' });

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

// Upload transactions (Excel/CSV)
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    try {
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const connection = await db.getConnection();
        await connection.beginTransaction();

        try {
            for (const row of rows) {
                // Determine fields (normalize keys)
                const keys = Object.keys(row);

                const getDate = (k) => k.toLowerCase().includes('date') || k.toLowerCase().includes('time');
                const getVech = (k) => k.toLowerCase().includes('vehicle');
                const getPlaza = (k) => k.toLowerCase().includes('plaza') || k.toLowerCase().includes('toll');
                const getAmt = (k) => k.toLowerCase().includes('amount') || k.toLowerCase().includes('fee');
                const getTransId = (k) => k.toLowerCase().includes('id') || k.toLowerCase().includes('txn');

                let dateVal = row[keys.find(getDate)];
                let vechVal = row[keys.find(getVech)];
                let plazaVal = row[keys.find(getPlaza)];
                let amtVal = row[keys.find(getAmt)];
                let transId = row[keys.find(getTransId)] || `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

                if (!dateVal || !vechVal || !plazaVal || !amtVal) continue; // Skip incomplete

                // Clean data
                vechVal = String(vechVal).replace(/\s+/g, '').toUpperCase();

                // Convert Date if it's an Excel sequential number date
                let transaction_date;
                if (typeof dateVal === 'number') {
                    transaction_date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                } else {
                    transaction_date = new Date(dateVal);
                }

                await connection.query(
                    `INSERT IGNORE INTO fastag_transactions 
                     (transaction_id, transaction_date, vehicle_number, toll_plaza_name, paid_amount) 
                     VALUES (?, ?, ?, ?, ?)`,
                    [String(transId), transaction_date, vechVal, plazaVal, parseFloat(amtVal)]
                );
            }
            await connection.commit();
            res.json({ message: 'File uploaded and processed successfully' });
        } catch (insertError) {
            await connection.rollback();
            throw insertError;
        } finally {
            connection.release();
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generate Claims / Get Claims List
router.post('/claims/generate', async (req, res) => {
    // Generate claim for a vehicle & route for a date range
    const { vehicle_number, route_id, start_date, end_date } = req.body;

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

        // Find fastag transactions for vehicle and timeframe
        let query = 'SELECT * FROM fastag_transactions WHERE vehicle_number = ?';
        let queryParams = [vehicle_number];

        if (start_date) {
            query += ' AND transaction_date >= ?';
            queryParams.push(new Date(start_date));
        }
        if (end_date) {
            query += ' AND transaction_date <= ?';
            queryParams.push(new Date(end_date));
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

            details.push({
                transaction_id: t.transaction_id,
                date: t.transaction_date,
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
