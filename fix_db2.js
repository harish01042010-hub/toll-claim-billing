const db = require('./backend/config/db');

async function run() {
    try {
        const connection = await db.getConnection();
        
        // Add file_data column as LONGBLOB
        const [columns] = await connection.query(`SHOW COLUMNS FROM fastag_reports LIKE 'file_data'`);
        if (columns.length === 0) {
            await connection.query(`ALTER TABLE fastag_reports ADD COLUMN file_data LONGBLOB NULL`);
        }
        
        console.log('Database updated for file storage');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
run();
