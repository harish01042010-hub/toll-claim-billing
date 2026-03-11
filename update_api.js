const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend', 'src');

function traverseAndReplace(dir) {
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseAndReplace(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            if (content.includes('http://localhost:5000')) {
                // Add API declaration at the top if not exists
                if (!content.includes('const API = import.meta.env.VITE_API_URL;')) {
                    // Find the last import and insert after it
                    const importLines = content.split('\n').filter(l => l.startsWith('import '));
                    if (importLines.length > 0) {
                        const lastImport = importLines[importLines.length - 1];
                        content = content.replace(lastImport, lastImport + '\n\nconst API = import.meta.env.VITE_API_URL || "http://localhost:5000";');
                    } else {
                        content = 'const API = import.meta.env.VITE_API_URL || "http://localhost:5000";\n\n' + content;
                    }
                }
                
                // Replace hardcoded URLs using single/double quotes
                content = content.replace(/'http:\/\/localhost:5000([^']+)'/g, '`${API}$1`');
                content = content.replace(/"http:\/\/localhost:5000([^"]+)"/g, '`${API}$1`');
                
                // For Fastag Reports Download Link (which uses backticks)
                content = content.replace(/href=\{`http:\/\/localhost:5000([^`]+)`\}/g, 'href={`\\${API}$1`}');
                
                modified = true;
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated: ${fullPath}`);
            }
        }
    });
}

traverseAndReplace(srcDir);
console.log('API URL update complete.');
