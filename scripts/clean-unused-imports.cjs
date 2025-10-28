#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Directorios a procesar
const directories = [
  'src/services',
  'src/utils',
  'src/components',
  'src/pages',
  'src/hooks'
];

function removeUnusedImports(content, filePath) {
  let modified = false;
  let newContent = content;

  // Patrones comunes de imports no utilizados
  const unusedPatterns = [
    // criticalLogger no usado
    {
      pattern: /, criticalLogger/g,
      replacement: '',
      condition: (content) => !content.includes('criticalLogger.') && content.includes('import { logger, criticalLogger }')
    },
    // sanitizeEmail no usado
    {
      pattern: /, sanitizeEmail/g,
      replacement: '',
      condition: (content) => !content.includes('sanitizeEmail(') && content.includes('sanitizeEmail')
    },
    // updateProfile no usado
    {
      pattern: /,?\s*updateProfile,?\s*/g,
      replacement: '',
      condition: (content) => !content.includes('updateProfile(') && content.includes('updateProfile,')
    },
    // deleteDoc no usado
    {
      pattern: /, deleteDoc/g,
      replacement: '',
      condition: (content) => !content.includes('deleteDoc(') && content.includes('deleteDoc')
    },
    // UserProfile no usado en algunos archivos
    {
      pattern: /, UserProfile/g,
      replacement: '',
      condition: (content) => !content.includes(': UserProfile') && !content.includes('<UserProfile>') && content.includes('UserProfile,')
    }
  ];

  unusedPatterns.forEach(({ pattern, replacement, condition }) => {
    if (condition(content)) {
      const updatedContent = newContent.replace(pattern, replacement);
      if (updatedContent !== newContent) {
        newContent = updatedContent;
        modified = true;
      }
    }
  });

  // Limpiar imports vacíos
  const emptyImportPatterns = [
    /import\s*{\s*}\s*from\s*['"][^'"]+['"];\s*\n/g,
    /import\s*{\s*,\s*}\s*from\s*['"][^'"]+['"];\s*\n/g
  ];

  emptyImportPatterns.forEach(pattern => {
    const updatedContent = newContent.replace(pattern, '');
    if (updatedContent !== newContent) {
      newContent = updatedContent;
      modified = true;
    }
  });

  // Limpiar comas duplicadas en imports
  newContent = newContent.replace(/{\s*,/g, '{');
  newContent = newContent.replace(/,\s*,/g, ',');
  newContent = newContent.replace(/,\s*}/g, ' }');

  return { content: newContent, modified };
}

function processFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const { content: newContent, modified } = removeUnusedImports(content, filePath);

    if (modified) {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Limpiado: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error procesando ${filePath}:`, error.message);
  }
}

function processDirectory(dirPath) {
  try {
    const fullPath = path.resolve(dirPath);
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ Directorio no encontrado: ${fullPath}`);
      return;
    }

    const items = fs.readdirSync(fullPath);
    
    items.forEach(item => {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        processDirectory(itemPath);
      } else if (item.endsWith('.ts') || item.endsWith('.tsx')) {
        processFile(itemPath);
      }
    });
  } catch (error) {
    console.error(`❌ Error procesando directorio ${dirPath}:`, error.message);
  }
}

// Ejecutar el script
console.log('🧹 Iniciando limpieza de imports no utilizados...\n');

directories.forEach(dir => {
  console.log(`📁 Procesando directorio: ${dir}`);
  processDirectory(dir);
  console.log('');
});

console.log('✨ Limpieza completada!');