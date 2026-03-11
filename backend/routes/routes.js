const express = require('express');
const router = express.Router();
const db = require('../config/db');
const auth = require('../middleware/auth');

router.use(auth); // Protect all routes here
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
    const { name, loading_location, loading_sap_code, unloading_location, unloading_sap_code, rate_date, state, toll_plazas } = req.body;
    // toll_plazas should be an array of { name: 'Plaza1', approved_rate: 100 }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [routeResult] = await connection.query(
            'INSERT INTO routes (name, loading_location, loading_sap_code, unloading_location, unloading_sap_code, rate_date, state) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, loading_location, loading_sap_code || null, unloading_location, unloading_sap_code || null, rate_date || null, state || null]
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
        const routeMatch = text.match(/([a-zA-Z\s&]+ TO [a-zA-Z\s&]+)/i);
        if (routeMatch) {
            routeName = routeMatch[1].replace(/LOADING\s*LOCATION/gi, '').replace(/TRANSPORTATION\s*ROUTES?/gi, '').trim().toUpperCase();
        }

        let loadingLoc = '', unloadingLoc = '', loadingSap = '', unloadingSap = '';

        // Extract SAP codes and locations from the top section before TOLL RATES
        const topSection = text.split(/TOLL\s*RATES/i)[0] || text;
        const sapCodes = [...topSection.matchAll(/\b(\d{4})\b/g)];
        if (sapCodes.length >= 2) {
            loadingSap = sapCodes[0][1];
            unloadingSap = sapCodes[1][1];

            const loc1Start = sapCodes[0].index + sapCodes[0][0].length;
            const loc1End = sapCodes[1].index;
            loadingLoc = topSection.substring(loc1Start, loc1End).replace(/[\n\r]/g, ' ').replace(/SAP|Code|Name|Loading|location|Unloading|SI\s*No/gi, '').trim();

            const loc2Start = sapCodes[1].index + sapCodes[1][0].length;
            unloadingLoc = topSection.substring(loc2Start).replace(/[\n\r]/g, ' ').replace(/SAP|Code|Name|Loading|location|Unloading|SI\s*No/gi, '').trim();
        }

        let rateDate = '';
        // Find rate date: DD-MM-YYYY
        const dateMatch = text.match(/(\d{2}[-/]\d{2}[-/]\d{4})/);
        if (dateMatch) {
            const parts = dateMatch[1].split(/[-/]/);
            if (parts[2].length === 4) {
                rateDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Convert to YYYY-MM-DD
            }
        }

        let plazas = [];
        const tollsText = text.substring(text.search(/TOLL\s*RATES/i));
        const tollRegex = /(?:\b|^)\d+\s+([A-Za-z().&\s\-]+?(?:Toll|Plaza)[A-Za-z().&\s\-]*?)\s+(\d{2,5}(?:\.\d+)?)/gi;

        let m;
        while ((m = tollRegex.exec(tollsText)) !== null) {
            const plazaName = m[1].replace(/[\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim();
            // Add if not already extracted (prevent PDF page headers replicating same toll)
            if (!plazas.some(p => p.name === plazaName)) {
                plazas.push({ name: plazaName, approved_rate: parseFloat(m[2]) });
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
        if (req.file && fs.existsSync(req.file.path)) {
            const fs = require('fs');
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
