const fs = require('fs');
const path = require('path');

function fixAwaitSyntax(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Corregir await(docRef, data) -> await updateDoc(docRef, data)
    if (content.includes('await(') && content.includes(', {')) {
      content = content.replace(/await\(([^,]+),\s*({[^}]*}[^)]*)\)/g, 'await updateDoc($1, $2)');
      modified = true;
    }

    // Corregir await(docRef) -> await deleteDoc(docRef)
    if (content.includes('await(') && !content.includes(', {')) {
      content = content.replace(/await\(([^)]+)\);/g, 'await deleteDoc($1);');
      modified = true;
    }

    // Asegurar que updateDoc y deleteDoc estén importados
    if (modified) {
      // Verificar si updateDoc está importado
      if (content.includes('updateDoc(') && !content.includes('updateDoc')) {
        content = content.replace(
          /import \{\s*([^}]+)\s*\} from 'firebase\/firestore';/,
          (match, imports) => {
            if (!imports.includes('updateDoc')) {
              const cleanImports = imports.trim();
              return `import { ${cleanImports}, updateDoc} from 'firebase/firestore';`;
            }
            return match;
          }
        );
      }

      // Verificar si deleteDoc está importado
      if (content.includes('deleteDoc(') && !content.includes('deleteDoc')) {
        content = content.replace(
          /import \{\s*([^}]+)\s*\} from 'firebase\/firestore';/,
          (match, imports) => {
            if (!imports.includes('deleteDoc')) {
              const cleanImports = imports.trim();
              return `import { ${cleanImports}, deleteDoc} from 'firebase/firestore';`;
            }
            return match;
          }
        );
      }
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
  console.log('🔧 Fixing await syntax errors...\n');
  
  const filesToFix = [
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/memberStatusService.ts',
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/vendorService.ts',
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/trainerService.ts',
    '/Users/admin/Desktop/Proyectos benja/GYMsisV2/src/services/users/memberService.ts'
  ];

  let totalFixed = 0;
  
  filesToFix.forEach(filePath => {
    if (fixAwaitSyntax(filePath)) {
      totalFixed++;
    }
  });

  console.log(`\n🎉 Process completed! Fixed ${totalFixed} files.`);
}

main();