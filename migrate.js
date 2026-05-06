const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const p = path.join(dir, file);
    if (fs.statSync(p).isDirectory()) {
      processDir(p);
    } else if (p.endsWith('route.js')) {
      let content = fs.readFileSync(p, 'utf8');
      content = content.replace(/(?<!await )readData\(/g, 'await readData(');
      content = content.replace(/(?<!await )writeData\(/g, 'await writeData(');
      fs.writeFileSync(p, content);
      console.log('Processed', p);
    }
  }
}

processDir(path.resolve('./app/api'));
processDir(path.resolve('../admin-employee/app/api'));
