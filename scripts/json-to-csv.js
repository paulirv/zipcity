const fs = require('fs');

function jsonToCSV(jsonFilePath, csvFilePath) {
  if (!fs.existsSync(jsonFilePath)) {
    console.log(`${jsonFilePath} not found. Skipping...`);
    return;
  }
  
  const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
  
  if (!Array.isArray(jsonData) || jsonData.length === 0) {
    console.log(`${jsonFilePath} is empty or not an array. Skipping...`);
    return;
  }
  
  // Get headers from first object
  const headers = Object.keys(jsonData[0]);
  
  // Create CSV content
  const csvLines = [headers.join(',')];
  
  jsonData.forEach(item => {
    const values = headers.map(header => {
      const value = item[header] || '';
      // Escape commas and quotes in CSV
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    csvLines.push(values.join(','));
  });
  
  fs.writeFileSync(csvFilePath, csvLines.join('\n'));
  console.log(`Converted ${jsonFilePath} to ${csvFilePath} with ${jsonData.length} records`);
}

// Convert JSON files to CSV if they exist
jsonToCSV('../data/zipcodes.us.json', '../data/us_zipcodes.csv');
jsonToCSV('../data/zipcodes.ca.json', '../data/ca_zipcodes.csv');

// Quick debug function - add this at the end
function debugDataStructure() {
  const usPath = '../data/zipcodes.us.json';
  if (fs.existsSync(usPath)) {
    const data = JSON.parse(fs.readFileSync(usPath, 'utf8'));
    console.log('\n=== US Data Debug ===');
    console.log('Sample record:', JSON.stringify(data[0], null, 2));
    console.log('Total records:', data.length);
    console.log('Headers:', Object.keys(data[0]));
    
    // Check for common issues
    const sample = data[0];
    if (sample.zipcode || sample.zip_code || sample.zip) {
      console.log('✓ Has zip field');
    } else {
      console.log('❌ Missing zip field - check column names');
    }
    
    if (sample.city || sample.cityname) {
      console.log('✓ Has city field'); 
    } else {
      console.log('❌ Missing city field - check column names');
    }
    
    // Generate sample SQL for worker debugging
    console.log('\n=== Sample SQL for your worker ===');
    console.log('For autocomplete query "coos":');
    console.log(`SELECT zipcode, place, state_code FROM zipcodes WHERE place LIKE 'coos%' LIMIT 20;`);
    console.log('\nMake sure your worker is querying "place" not "city"!');
  }
}

debugDataStructure();
