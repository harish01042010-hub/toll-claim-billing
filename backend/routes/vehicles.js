const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT v.*, t.name as transporter_name 
            FROM vehicles v 
            LEFT JOIN transporters t ON v.transporter_id = t.id
            ORDER BY v.created_at DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { transporter_id, vehicle_number, driver_name, driver_phone } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO vehicles (transporter_id, vehicle_number, driver_name, driver_phone) VALUES (?, ?, ?, ?)',
            [transporter_id, vehicle_number, driver_name, driver_phone]
        );
        res.status(201).json({ id: result.insertId, transporter_id, vehicle_number, driver_name, driver_phone });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM vehicles WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
