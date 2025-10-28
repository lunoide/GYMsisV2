const fs = require('fs');
const path = require('path');

function fixQuerySyntax(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Corregir consultas mal formateadas como ),('firstName', 'asc')
    if (content.includes(`),('firstName', 'asc')`)) {
      content = content.replace(/\),\('firstName', 'asc'\)/g, `),\n        orderBy('firstName', 'asc')`);
      modified = true;
    }

    // Corregir otras variaciones similares
    if (content.includes(`),('`)) {
      // Buscar patrones como ),('campo', 'orden') y reemplazarlos
      content = content.replace(/\),\('([^']+)', '(asc|desc)'\)/g, `),\n        orderBy('$1', '$2')`);
      modified = true;
    }

    // Asegurar que orderBy esté importado
    if (modified && !content.includes('orderBy')) {
      content = content.replace(
        /import \{\s*([^}]+)\s*\} from 'firebase\/firestore';/,
        (match, imports) => {
          if (!imports.includes('orderBy')) {
            const cleanImports = imports.trim();
            return `import { ${cleanImports},\n  orderBy} from 'firebase/firestore';`;
          }
          return match;
        }
      );
    }

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
  console.log('🔧 Fixing query syntax errors...\n');
  
  const filesToFix = [
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/memberService.ts',
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/vendorService.ts',
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/trainerService.ts'
  ];

  let totalFixed = 0;
  
  filesToFix.forEach(filePath => {
    if (fixQuerySyntax(filePath)) {
      totalFixed++;
    }
  });

  console.log(`\n🎉 Process completed! Fixed ${totalFixed} files.`);
}

main();