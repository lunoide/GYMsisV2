const fs = require('fs');
const path = require('path');

// Configuración de archivos a procesar
const directories = [
  'src/services',
  'src/utils',
  'src/components',
  'src/pages'
];

// Correcciones específicas de sintaxis
const syntaxFixes = [
  // Corregir await.
  { pattern: /await\./g, replacement: 'await ' },
  
  // Corregir .now()
  { pattern: /\.now\(\)/g, replacement: 'Timestamp.now()' },
  
  // Corregir .fromDate()
  { pattern: /\.fromDate\(/g, replacement: 'Timestamp.fromDate(' },
  
  // Corregir .getMemberPlanAssignments()
  { pattern: /\[\.getMemberPlanAssignments\(/g, replacement: '[PlanService.getMemberPlanAssignments(' },
  { pattern: /await\.getMemberPlanAssignments\(/g, replacement: 'await PlanService.getMemberPlanAssignments(' },
  
  // Corregir .getMemberAssignments()
  { pattern: /,\.getMemberAssignments\(/g, replacement: ', ClassService.getMemberAssignments(' },
  
  // Corregir .updateExpiredAssignments()
  { pattern: /await\.updateExpiredAssignments\(\)/g, replacement: 'await PlanService.updateExpiredAssignments()' },
  
  // Corregir .getActivePlans()
  { pattern: /\[\.getActivePlans\(\)/g, replacement: '[PlanService.getActivePlans()' },
  { pattern: /await\.getActivePlans\(\)/g, replacement: 'await PlanService.getActivePlans()' },
  
  // Corregir .assignPlanToMember()
  { pattern: /await\.assignPlanToMember\(/g, replacement: 'await PlanService.assignPlanToMember(' },
  
  // Corregir .getPlans()
  { pattern: /await\.getPlans\(\)/g, replacement: 'await PlanService.getPlans()' },
  
  // Corregir .updatePlan()
  { pattern: /await\.updatePlan\(/g, replacement: 'await PlanService.updatePlan(' },
  
  // Corregir .createPlan()
  { pattern: /await\.createPlan\(/g, replacement: 'await PlanService.createPlan(' },
  
  // Corregir .deletePlan()
  { pattern: /await\.deletePlan\(/g, replacement: 'await PlanService.deletePlan(' },
  
  // Corregir export constDefault =;
  { pattern: /export constDefault =;/g, replacement: '' },
  
  // Corregir export function(
  { pattern: /export function\(/g, replacement: 'export function sanitizeText(' }
];

// Imports necesarios por archivo
const requiredImports = {
  'src/services/user/userPointsService.ts': [
    "import { PlanService } from '../plans/planService';",
    "import { ClassService } from '../classes/classService';"
  ],
  'src/services/scheduler/schedulerService.ts': [
    "import { PlanService } from '../plans/planService';"
  ],
  'src/services/users/memberService.ts': [
    "import { Timestamp } from 'firebase/firestore';"
  ],
  'src/services/users/memberStatusService.ts': [
    "import { Timestamp } from 'firebase/firestore';"
  ],
  'src/components/plans/PlanAssignment.tsx': [
    "import { PlanService } from '../../services/plans/planService';"
  ],
  'src/components/plans/PlanManagement.tsx': [
    "import { PlanService } from '../../services/plans/planService';"
  ],
  'src/pages/public/PlansPage.tsx': [
    "import { PlanService } from '../../services/plans/planService';"
  ]
};

function addMissingImports(content, filePath) {
  const relativePath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
  const imports = requiredImports[relativePath];
  
  if (!imports) return content;
  
  const lines = content.split('\n');
  let importInsertIndex = 0;
  
  // Encontrar el lugar para insertar imports (después de los imports existentes)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ')) {
      importInsertIndex = i + 1;
    } else if (lines[i].trim() === '' && importInsertIndex > 0) {
      break;
    }
  }
  
  // Agregar imports faltantes
  imports.forEach(importStatement => {
    if (!content.includes(importStatement)) {
      lines.splice(importInsertIndex, 0, importStatement);
      importInsertIndex++;
    }
  });
  
  return lines.join('\n');
}

function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    const originalContent = content;

    // Aplicar correcciones de sintaxis
    syntaxFixes.forEach(({ pattern, replacement }) => {
      const newContent = content.replace(pattern, replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });

    // Agregar imports faltantes
    const contentWithImports = addMissingImports(content, filePath);
    if (contentWithImports !== content) {
      content = contentWithImports;
      modified = true;
    }

    // Limpiar líneas vacías múltiples
    content = content.replace(/\n\s*\n\s*\n/g, '\n\n');

    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Corregido: ${path.relative(process.cwd(), filePath)}`);
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

console.log('🔧 Iniciando corrección de errores de sintaxis...');

directories.forEach(dir => {
  console.log(`\n📁 Procesando directorio: ${dir}`);
  processDirectory(dir);
});

console.log('\n✨ Corrección de sintaxis completada!');