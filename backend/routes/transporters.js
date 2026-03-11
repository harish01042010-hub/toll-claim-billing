const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const upload = multer({ dest: 'uploads/' });

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

// Parse Transporter PDF
router.post('/parse-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const fs = require('fs');
        const dataBuffer = fs.readFileSync(req.file.path);
        const data = await pdfParse(dataBuffer);
        const text = data.text;

        const gstinMatch = text.match(/GSTIN(?:\s*No)?\s*:\s*([A-Za-z0-9]+|NIL)/i);
        const panMatch = text.match(/PAN No\s*:\s*([A-Za-z0-9]+)/i);
        const vendorCodeMatch = text.match(/Vendor Code\:\s*([0-9A-Za-z]+)/i);
        const phoneMatch = text.match(/Phone No\s*:\s*([0-9\-\s\+]+)/i);
        const companyMatch = text.match(/Company\:\s*(.+?)(?=\r?\n|$)/i);
        const addressMatch = text.match(/Address\:\s*(.*?)(?=\nGSTIN|\nPAN|\nVendor|\nPhone|$)/is);

        // More complex match for Plant manager section
        let plantMatch = text.match(/To Plant manager\:\s*(.*?)(?=\nBill|Billing Address|S\.No|Trans Date|$)/is);
        if (!plantMatch) plantMatch = text.match(/Consignee Details\:\s*(.*?)(?=\nGSTIN|\nBill|Billing Address|S\.No|Trans Date|$)/is);

        const name = companyMatch ? companyMatch[1].trim() : '';
        const address = addressMatch ? addressMatch[1].replace(/[\n\r]+/g, ' ').trim() : '';
        const gstin = gstinMatch ? gstinMatch[1].trim() : '';
        const pan_number = panMatch ? panMatch[1].trim() : '';
        const vendor_code = vendorCodeMatch ? vendorCodeMatch[1].trim() : '';
        const phone = phoneMatch ? phoneMatch[1].trim() : '';
        const plant_manager_address = plantMatch ? plantMatch[1].replace(/[\n\r]+/g, ' ').trim() : '';

        // cleanup file
        fs.unlinkSync(req.file.path);

        res.json({
            name, address, gstin, pan_number, vendor_code, phone, plant_manager_address
        });
    } catch (err) {
        console.error(err);
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
