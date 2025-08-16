const fs = require('fs');

function createBatchSQLFiles(csvFilePath, tableName, batchSize = 1000) {
  const csvContent = fs.readFileSync(csvFilePath, 'utf8');
  const lines = csvContent.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  let batchNumber = 1;
  let currentBatch = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const escapedValues = values.map(value => {
      if (value === '' || value === 'NULL') return 'NULL';
      return `'${value.replace(/'/g, "''")}'`;
    });
    
    currentBatch.push(`INSERT INTO ${tableName} (${headers.join(', ')}) VALUES (${escapedValues.join(', ')});`);
    
    if (currentBatch.length === batchSize || i === lines.length - 1) {
      const filename = `data/${tableName}_batch_${batchNumber}.sql`;
      fs.writeFileSync(filename, currentBatch.join('\n'));
      console.log(`Generated ${filename} with ${currentBatch.length} statements`);
      
      currentBatch = [];
      batchNumber++;
    }
  }
}

// Create batch files
createBatchSQLFiles('data/us_zipcodes.csv', 'us_zipcodes', 1000);
createBatchSQLFiles('data/ca_zipcodes.csv', 'ca_zipcodes', 1000);
