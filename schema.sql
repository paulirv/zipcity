-- Create US zipcodes table
CREATE TABLE IF NOT EXISTS us_zipcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zipcode TEXT NOT NULL,
  place TEXT NOT NULL,
  state TEXT,
  state_code TEXT,
  latitude REAL,
  longitude REAL
);

-- Create Canada zipcodes table  
CREATE TABLE IF NOT EXISTS ca_zipcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zipcode TEXT NOT NULL,
  place TEXT NOT NULL,
  state TEXT,
  state_code TEXT,
  latitude REAL,
  longitude REAL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_us_place_state ON us_zipcodes(place, state_code);
CREATE INDEX IF NOT EXISTS idx_us_zipcode ON us_zipcodes(zipcode);
CREATE INDEX IF NOT EXISTS idx_ca_place_state ON ca_zipcodes(place, state_code);
CREATE INDEX IF NOT EXISTS idx_ca_zipcode ON ca_zipcodes(zipcode);