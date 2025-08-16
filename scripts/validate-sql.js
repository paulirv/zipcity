const fs = require('fs');

function validateSQLFile(sqlFilePath, tableName) {
  console.log(`\nValidating ${sqlFilePath}...`);
  
  if (!fs.existsSync(sqlFilePath)) {
    console.log(`❌ File not found: ${sqlFilePath}`);
    return false;
  }
  
  const content = fs.readFileSync(sqlFilePath, 'utf8');
  const lines = content.trim().split('\n');
  
  console.log(`📊 Total lines: ${lines.length}`);
  
  // Check first few lines
  console.log(`\n🔍 First 3 statements:`);
  lines.slice(0, 3).forEach((line, i) => {
    console.log(`${i + 1}: ${line.substring(0, 100)}...`);
  });
  
  // Validate SQL structure
  let validCount = 0;
  let errorCount = 0;
  const errors = [];
  
  lines.forEach((line, index) => {
    if (line.trim()) {
      if (line.startsWith(`INSERT INTO ${tableName}`)) {
        validCount++;
      } else {
        errorCount++;
        if (errorCount <= 5) { // Show first 5 errors only
          errors.push(`Line ${index + 1}: ${line.substring(0, 50)}...`);
        }
      }
    }
  });
  
  console.log(`\n✅ Valid INSERT statements: ${validCount}`);
  console.log(`❌ Invalid lines: ${errorCount}`);
  
  if (errors.length > 0) {
    console.log(`\n⚠️ Sample errors:`);
    errors.forEach(error => console.log(`  ${error}`));
  }
  
  return errorCount === 0;
}

// Validate both files
const usValid = validateSQLFile('data/zipcodes.us.sql', 'us_zipcodes');
const caValid = validateSQLFile('data/zipcodes.ca.sql', 'ca_zipcodes');

console.log(`\n📋 Summary:`);
console.log(`US data: ${usValid ? '✅ Valid' : '❌ Has errors'}`);
console.log(`Canada data: ${caValid ? '✅ Valid' : '❌ Has errors'}`);

if (usValid && caValid) {
  console.log(`\n🎉 All SQL files are valid! Ready to import.`);
  console.log(`\nNext steps:`);
  console.log(`1. wrangler d1 execute zipcity-data --file=data/zipcodes.us.sql`);
  console.log(`2. wrangler d1 execute zipcity-data --file=data/zipcodes.ca.sql`);
} else {
  console.log(`\n⚠️ Fix the errors before importing.`);
}
