import fs from 'fs';
import path from 'path';

// helper function to update exports in package.json - for manual use, created by chatGPT
// (it has its run script "generate:exports" in package.json)

const libDir = './lib/components';
const packageJsonPath = './package.json';

function generateExports() {
    const entries = {};

    // Add root entry point
    entries['.'] = './lib/index.js';

    const files = fs.readdirSync(libDir);

    files.forEach((file) => {
        const ext = path.extname(file);
        const name = path.basename(file, ext);

        if (ext === '.js') {
            entries[`./${name}`] = `./lib/components/${file}`;
        }
    });

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    pkg.exports = entries;

    fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    console.log('✅ package.json exports updated');
}

generateExports();
