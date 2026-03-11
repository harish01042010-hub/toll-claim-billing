const db = require('./config/db');

async function run() {
    try {
        await db.query('ALTER TABLE routes ADD COLUMN state VARCHAR(100) DEFAULT NULL');
        console.log('Column added successfully');
    } catch (err) {
        console.error('Error:', err);
    }
    process.exit();
}

run();
