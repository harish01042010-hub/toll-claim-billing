const db = require('./backend/config/db');

async function run() {
    try {
        const connection = await db.getConnection();
        
        await connection.query(`
            CREATE TABLE IF NOT EXISTS fastag_reports (
                id INT AUTO_INCREMENT PRIMARY KEY,
                original_filename VARCHAR(255) NOT NULL,
                saved_filename VARCHAR(255) NOT NULL,
                file_type VARCHAR(50),
                vehicle_number VARCHAR(50),
                record_count INT DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Check if report_id exists in fastag_transactions
        const [columns] = await connection.query(`SHOW COLUMNS FROM fastag_transactions LIKE 'report_id'`);
        if (columns.length === 0) {
            await connection.query(`ALTER TABLE fastag_transactions ADD COLUMN report_id INT NULL`);
            await connection.query(`ALTER TABLE fastag_transactions ADD CONSTRAINT fk_report FOREIGN KEY (report_id) REFERENCES fastag_reports(id) ON DELETE SET NULL`);
        }
        
        console.log('Database updated successfully');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
