const mysql = require('mysql2/promise');
async function test() {
  try {
    const conn = await mysql.createConnection({ user: 'root', password: '' });
    console.log('Connected! empty pass');
    const [rows] = await conn.query('SHOW DATABASES');
    console.log(rows);
    process.exit();
  } catch(e) {
    console.log('Failed empty pass: ' + e.message);
  }
}
test();
