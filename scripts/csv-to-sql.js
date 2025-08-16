const fs = require('fs');
const path = require('path');

function csvToSQL(csvFilePath, tableName, outputPath) {
  // Check if file exists
  if (!fs.existsSync(csvFilePath)) {
    console.log(`Warning: ${csvFilePath} not found. Skipping...`);
    return;
  }
  
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  console.log(`Processing ${csvFilePath} with headers:`, headers);
  
  const sqlStatements = [];
  
  for (let i = 1; i < lines.length; i++) {
    // Handle CSV parsing with proper quote handling
    const values = parseCSVLine(lines[i]);
    
    // Escape single quotes in values and handle NULL values
    const escapedValues = values.map(value => {
      if (value === '' || value === 'NULL' || value === null || value === undefined) return 'NULL';
      // Remove quotes if they exist and escape single quotes
      const cleanValue = value.replace(/^"(.*)"$/, '$1').replace(/'/g, "''");
      return `'${cleanValue}'`;
    });
    
    const sql = `INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${escapedValues.join(', ')});`;
    sqlStatements.push(sql);
  }
  
  // Create output directory if it doesn't exist
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, sqlStatements.join('\n'));
  console.log(`Generated ${outputPath} with ${sqlStatements.length} INSERT statements`);
}

function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  values.push(current.trim());
  return values;
}

// Check if data directory exists
if (!fs.existsSync('data')) {
  console.log('Creating data directory...');
  fs.mkdirSync('data', { recursive: true });
}

// Convert US data if it exists
if (fs.existsSync('data/zipcodes.us.csv')) {
  csvToSQL('data/zipcodes.us.csv', 'us_zipcodes', 'data/zipcodes.us.sql');
} else {
  console.log('data/zipcodes.us.csv not found. Please create this file first.');
}

// Convert Canada data if it exists
if (fs.existsSync('data/zipcodes.ca.csv')) {
  csvToSQL('data/zipcodes.ca.csv', 'ca_zipcodes', 'data/zipcodes.ca.sql');
} else {
  console.log('data/zipcodes.ca.csv not found. Please create this file first.');
}

console.log('\nNext steps:');
console.log('1. Apply updated schema: wrangler d1 execute zipcity-data --file=schema.sql');
console.log('2. Import US data: wrangler d1 execute zipcity-data --file=data/zipcodes.us.sql');
console.log('3. Import CA data: wrangler d1 execute zipcity-data --file=data/zipcodes.ca.sql');
