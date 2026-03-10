const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const pdfParse = require('pdf-parse');

const upload = multer({ dest: 'uploads/' });

// Get all routes
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT r.*, COUNT(tr.id) as toll_count, SUM(tr.approved_rate) as total_toll
            FROM routes r
            LEFT JOIN toll_rates tr ON r.id = tr.route_id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a route
router.post('/', async (req, res) => {
    const { name, loading_location, loading_sap_code, unloading_location, unloading_sap_code, rate_date, toll_plazas } = req.body;
    // toll_plazas should be an array of { name: 'Plaza1', approved_rate: 100 }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [routeResult] = await connection.query(
            'INSERT INTO routes (name, loading_location, loading_sap_code, unloading_location, unloading_sap_code, rate_date) VALUES (?, ?, ?, ?, ?, ?)',
            [name, loading_location, loading_sap_code || null, unloading_location, unloading_sap_code || null, rate_date || null]
        );
        const routeId = routeResult.insertId;

        if (toll_plazas && toll_plazas.length > 0) {
            for (const plaza of toll_plazas) {
                // Find or create toll plaza
                let plazaId;
                const [existingPlaza] = await connection.query('SELECT id FROM toll_plazas WHERE name = ?', [plaza.name]);
                if (existingPlaza.length > 0) {
                    plazaId = existingPlaza[0].id;
                } else {
                    const [plazaResult] = await connection.query('INSERT INTO toll_plazas (name) VALUES (?)', [plaza.name]);
                    plazaId = plazaResult.insertId;
                }

                // Add to toll_rates
                await connection.query(
                    'INSERT IGNORE INTO toll_rates (route_id, toll_plaza_id, approved_rate) VALUES (?, ?, ?)',
                    [routeId, plazaId, plaza.approved_rate]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ id: routeId, name });
    } catch (err) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: err.message });
    } finally {
        if (connection) connection.release();
    }
});

// Delete a route
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM routes WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get specific route details including plazas
router.get('/:id', async (req, res) => {
    try {
        const [route] = await db.query('SELECT * FROM routes WHERE id = ?', [req.params.id]);
        if (route.length === 0) return res.status(404).json({ error: 'Route not found' });

        const [plazas] = await db.query(`
            SELECT tp.name, tr.approved_rate 
            FROM toll_rates tr
            JOIN toll_plazas tp ON tr.toll_plaza_id = tp.id
            WHERE tr.route_id = ?
        `, [req.params.id]);

        res.json({ ...route[0], toll_plazas: plazas });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Parse PDF endpoint
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        const fs = require('fs');
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        const text = data.text;

        let routeName = '';
        const routeMatch = text.match(/([a-zA-Z\s]+ TO [a-zA-Z\s]+)/i);
        if (routeMatch) routeName = routeMatch[1].trim().toUpperCase();

        let loadingLoc = '', unloadingLoc = '', loadingSap = '', unloadingSap = '';

        // Find SAP codes - looking for 4-5 digit numbers and nearby text
        const textLines = text.split('\n');
        for (let i = 0; i < textLines.length; i++) {
            const line = textLines[i].trim();
            // Match pattern like: 1    6300    Kochi Refinery TPP    3306    Kurnool LPG Plant
            const sapMatch = line.match(/\d+\s+(\d{4,5})\s+(.*?)\s+(\d{4,5})\s+(.*)/);
            if (sapMatch) {
                loadingSap = sapMatch[1];
                loadingLoc = sapMatch[2].trim();
                unloadingSap = sapMatch[3];
                unloadingLoc = sapMatch[4].trim();
                break;
            }
        }

        let rateDate = '';
        // Find rate date: DD-MM-YYYY
        const dateMatch = text.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
            const parts = dateMatch[1].split('-');
            rateDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
        }

        let plazas = [];
        // Find tolls: \d+ Toll Name 515
        for (const line of textLines) {
            const m = line.match(/^\s*\d+\s+(.*?Toll.*?)\s+(\d+(?:\.\d+)?)\s*$/i);
            if (m) {
                plazas.push({ name: m[1].trim(), approved_rate: parseFloat(m[2]) });
            } else {
                // Secondary check for cases without "Toll" word but ending in numbers
                const fallbackMatch = line.match(/^\s*\d+\s+([a-zA-Z\s().&]+)\s+(\d{2,4})\s*$/);
                if (fallbackMatch && line.toLowerCase().includes('toll')) {
                    plazas.push({ name: fallbackMatch[1].trim(), approved_rate: parseFloat(fallbackMatch[2]) });
                }
            }
        }

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            routeName,
            loadingLoc,
            loadingSap,
            unloadingLoc,
            unloadingSap,
            rateDate,
            plazas
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
