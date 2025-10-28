const fs = require('fs');
const path = require('path');

// Archivos que necesitan corrección
const filesToFix = [
  'src/utils/profileCreationDiagnostic.ts',
  'src/services/audit/auditReportService.ts',
  'src/services/audit/systemAuditService.ts',
  'src/utils/setupAdminAndTest.ts',
  'src/utils/memberRegistrationDiagnostic.ts',
  'src/services/security/rateLimitService.ts',
  'src/services/classes/classService.ts',
  'src/services/users/memberService.ts',
  'src/services/rewards/rewardsService.ts',
  'src/services/plans/planService.ts',
  'src/services/users/memberStatusService.ts',
  'src/services/sales/salesService.ts'
];

function fixDateTimestamp(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Reemplazar DateTimestampTimestamp con Date
    if (content.includes('DateTimestampTimestamp')) {
      content = content.replace(/DateTimestampTimestamp/g, 'Date');
      modified = true;
    }

    // Reemplazar TimestampTimestamp con Timestamp
    if (content.includes('TimestampTimestamp')) {
      content = content.replace(/TimestampTimestamp/g, 'Timestamp');
      modified = true;
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
  console.log('🔧 Fixing DateTimestampTimestamp and TimestampTimestamp references...\n');
  
  let totalFixed = 0;
  
  for (const file of filesToFix) {
    const fullPath = path.join(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      if (fixDateTimestamp(fullPath)) {
        totalFixed++;
      }
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }
  
  console.log(`\n🎉 Process completed! Fixed ${totalFixed} files.`);
}

main();