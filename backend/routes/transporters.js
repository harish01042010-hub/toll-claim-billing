const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all transporters
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM transporters ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a transporter
router.post('/', async (req, res) => {
    const { name, contact_person, phone, email, address, gstin, pan_number, vendor_code, plant_manager_address } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO transporters (name, contact_person, phone, email, address, gstin, pan_number, vendor_code, plant_manager_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, contact_person, phone, email, address, gstin || null, pan_number || null, vendor_code || null, plant_manager_address || null]
        );
        res.status(201).json({ id: result.insertId, name, contact_person, phone, email, address, gstin, pan_number, vendor_code, plant_manager_address });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a transporter
router.delete('/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM transporters WHERE id = ?', [req.params.id]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
