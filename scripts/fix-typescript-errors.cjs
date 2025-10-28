const fs = require('fs');
const path = require('path');

// Configuración de archivos a procesar
const directories = [
  'src/services',
  'src/utils',
  'src/components',
  'src/pages',
  'src/hooks'
];

// Lista de imports específicos a eliminar
const unusedImports = [
  'Timestamp',
  'limit',
  'orderBy',
  'updateProfile',
  'LoginCredentials',
  'AuthUser',
  'sanitizeText',
  'updateDoc',
  'deleteDoc',
  'PlanService',
  'ClassService'
];

// Patrones de limpieza más agresivos
const cleanupPatterns = [
  // Eliminar imports específicos no utilizados
  ...unusedImports.map(imp => ({
    pattern: new RegExp(`\\s*${imp},?\\s*`, 'g'),
    replacement: ''
  })),
  
  // Eliminar imports completos no utilizados
  { pattern: /import\s*{\s*PlanService\s*}\s*from[^;]+;/g, replacement: '' },
  { pattern: /import\s*{\s*ClassService\s*}\s*from[^;]+;/g, replacement: '' },
  
  // Limpiar imports vacíos y malformados
  { pattern: /import\s*{\s*,\s*}/g, replacement: 'import {' },
  { pattern: /import\s*{\s*}\s*from[^;]+;/g, replacement: '' },
  { pattern: /,\s*,/g, replacement: ',' },
  { pattern: /{\s*,/g, replacement: '{' },
  { pattern: /,\s*}/g, replacement: '}' },
  { pattern: /,\s*\n\s*}/g, replacement: '\n}' },
  
  // Limpiar líneas vacías múltiples
  { pattern: /\n\s*\n\s*\n/g, replacement: '\n\n' }
];

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // Aplicar patrones de limpieza
    cleanupPatterns.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // Limpiar imports específicos por línea
    const lines = content.split('\n');
    const cleanedLines = lines.map(line => {
      let cleanedLine = line;
      
      // Si es una línea de import, limpiar elementos específicos
      if (line.trim().startsWith('import') && line.includes('{')) {
        unusedImports.forEach(imp => {
          // Eliminar el import específico
          cleanedLine = cleanedLine.replace(new RegExp(`\\s*${imp}\\s*,?`, 'g'), '');
        });
        
        // Limpiar comas duplicadas o al inicio/final
        cleanedLine = cleanedLine.replace(/,\s*,/g, ',');
        cleanedLine = cleanedLine.replace(/{\s*,/g, '{');
        cleanedLine = cleanedLine.replace(/,\s*}/g, '}');
        
        // Si el import queda vacío, eliminarlo
        if (cleanedLine.match(/import\s*{\s*}\s*from/)) {
          return '';
        }
      }
      
      return cleanedLine;
    });

    const finalContent = cleanedLines.filter(line => line.trim() !== '').join('\n');
    
    if (finalContent !== originalContent) {
      fs.writeFileSync(filePath, finalContent, 'utf8');
      console.log(`✅ Corregido: ${path.relative(process.cwd(), filePath)}`);
      modified = true;
    }

    return modified;

  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
    return false;
  }
}

function processDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  Directorio no encontrado: ${dirPath}`);
    return;
  }

  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  
  files.forEach(file => {
    const fullPath = path.join(dirPath, file.name);
    
    if (file.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.isFile() && (file.name.endsWith('.ts') || file.name.endsWith('.tsx'))) {
      processFile(fullPath);
    }
  });
}

console.log('🧹 Iniciando limpieza final de errores de TypeScript...');

directories.forEach(dir => {
  console.log(`\n📁 Procesando directorio: ${dir}`);
  processDirectory(dir);
});

console.log('\n✨ Limpieza final completada!');