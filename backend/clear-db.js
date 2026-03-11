const db = require('./config/db');

async function clearDatabase() {
    console.log('Starting data cleanup...');
    const connection = await db.getConnection();
    try {
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');

        const tables = [
            'toll_rates',
            'toll_plazas',
            'claim_bills',
            'fastag_transactions',
            'vehicles',
            'transporters',
            'routes'
        ];

        for (const table of tables) {
            console.log(`Clearing table: ${table}`);
            await connection.query(`TRUNCATE TABLE ${table}`);
        }

        await connection.query('SET FOREIGN_KEY_CHECKS = 1');
        console.log('✅ All data erased successfully. Database is now clean.');
    } catch (err) {
        console.error('❌ Error erasing data:', err.message);
    } finally {
        connection.release();
        process.exit();
    }
}

clearDatabase();
