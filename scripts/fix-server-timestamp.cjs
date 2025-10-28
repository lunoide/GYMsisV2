const fs = require('fs');
const path = require('path');

// Archivos que necesitan corrección
const filesToFix = [
  'src/services/user/userPointsService.ts',
  'src/services/rewards/rewardRequestsService.ts',
  'src/services/products/productService.ts',
  'src/services/sales/salesService.ts',
  'src/services/payments/paymentService.ts'
];

function fixServerTimestamp(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Reemplazar import de 'server' con 'serverTimestamp'
    if (content.includes('server}') && !content.includes('serverTimestamp')) {
      content = content.replace(/server}/g, 'serverTimestamp}');
      modified = true;
    }

    // Reemplazar todas las llamadas server() con serverTimestamp()
    if (content.includes('server()')) {
      content = content.replace(/server\(\)/g, 'serverTimestamp()');
      modified = true;
    }

    // Casos específicos donde server está en imports mal formateados
    content = content.replace(/,\s*server\s*}/g, ', serverTimestamp}');
    content = content.replace(/{\s*server\s*}/g, '{ serverTimestamp }');

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
      return true;
    } else {
      console.log(`⏭️  No changes needed: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function main() {
  console.log('🔧 Fixing server/serverTimestamp references...\n');
  
  let totalFixed = 0;
  
  for (const file of filesToFix) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      if (fixServerTimestamp(fullPath)) {
        totalFixed++;
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log(`\n🎉 Process completed! Fixed ${totalFixed} files.`);
}

main();