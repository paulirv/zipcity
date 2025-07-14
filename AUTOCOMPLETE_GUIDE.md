# Autocomplete API Documentation

The zipcity Worker now includes autocomplete functionality for both US and Canadian locations.

## Autocomplete Endpoints

### US Autocomplete
**Endpoint:** `GET /api/autocomplete/us?q=<query>&limit=<limit>`

**Parameters:**
- `q` (required): Search query (minimum 3 characters)
- `limit` (optional): Maximum number of results (default: 10)

**Behavior:**
- If query starts with numbers → ZIP code search
- If query starts with letters → City name search

**Examples:**
```bash
# City name search
curl "https://zipcity.iwpi.com/api/autocomplete/us?q=Burli&limit=5"

# ZIP code search  
curl "https://zipcity.iwpi.com/api/autocomplete/us?q=0540&limit=5"
```

### Canada Autocomplete
**Endpoint:** `GET /api/autocomplete/ca?q=<query>&limit=<limit>`

**Parameters:**
- `q` (required): Search query (minimum 3 characters)
- `limit` (optional): Maximum number of results (default: 10)

**Behavior:**
- If query starts with numbers → Postal code search
- If query starts with letters → City name search

**Examples:**
```bash
# City name search
curl "https://zipcity.iwpi.com/api/autocomplete/ca?q=Toro&limit=3"

# Postal code search
curl "https://zipcity.iwpi.com/api/autocomplete/ca?q=M5A&limit=5"
```

## Response Format

### City Search Response
```json
{
  "query": "Burli",
  "results": [
    {
      "type": "city",
      "display": "Burlington, VT",
      "value": "Burlington, VT",
      "city": "Burlington",
      "state": "VT",
      "zipcode": "05401"
    }
  ],
  "count": 1
}
```

### ZIP/Postal Code Search Response
```json
{
  "query": "0540",
  "results": [
    {
      "type": "zipcode",
      "display": "05401 - Burlington, VT",
      "value": "05401",
      "city": "Burlington", 
      "state": "VT",
      "zipcode": "05401"
    }
  ],
  "count": 1
}
```

## Frontend Integration Guide

### For Nanawall Repfinder Module

#### 1. Trigger Autocomplete
- Trigger autocomplete when user types 4+ characters
- Use debouncing (300-500ms) to avoid excessive API calls

#### 2. Detect Input Type
The API automatically detects whether the user is searching for:
- **City names** (letters) → Returns city suggestions
- **ZIP codes** (numbers) → Returns ZIP code suggestions

#### 3. JavaScript Implementation Example

```javascript
class ZipCityAutocomplete {
  constructor(inputElement, resultsElement, options = {}) {
    this.input = inputElement;
    this.results = resultsElement;
    this.apiBase = options.apiBase || 'https://zipcity.iwpi.com/api/autocomplete';
    this.country = options.country || 'us'; // 'us' or 'ca'
    this.limit = options.limit || 10;
    this.minChars = options.minChars || 4;
    this.debounceMs = options.debounceMs || 300;
    
    this.debounceTimer = null;
    this.init();
  }
  
  init() {
    this.input.addEventListener('input', (e) => {
      this.handleInput(e.target.value);
    });
    
    this.input.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.input.contains(e.target) && !this.results.contains(e.target)) {
        this.hideResults();
      }
    });
  }
  
  handleInput(value) {
    clearTimeout(this.debounceTimer);
    
    if (value.length < this.minChars) {
      this.hideResults();
      return;
    }
    
    this.debounceTimer = setTimeout(() => {
      this.search(value);
    }, this.debounceMs);
  }
  
  async search(query) {
    try {
      const url = `${this.apiBase}/${this.country}?q=${encodeURIComponent(query)}&limit=${this.limit}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        this.showResults(data.results);
      } else {
        console.error('Autocomplete API error:', data.error);
        this.hideResults();
      }
    } catch (error) {
      console.error('Autocomplete request failed:', error);
      this.hideResults();
    }
  }
  
  showResults(results) {
    if (results.length === 0) {
      this.hideResults();
      return;
    }
    
    this.results.innerHTML = results.map(result => 
      `<div class="autocomplete-item" data-value="${result.value}" data-city="${result.city}" data-state="${result.state}" data-zipcode="${result.zipcode}">
        ${result.display}
      </div>`
    ).join('');
    
    // Add click handlers
    this.results.querySelectorAll('.autocomplete-item').forEach(item => {
      item.addEventListener('click', () => {
        this.selectItem(item);
      });
    });
    
    this.results.style.display = 'block';
  }
  
  selectItem(item) {
    const value = item.dataset.value;
    const city = item.dataset.city;
    const state = item.dataset.state;
    const zipcode = item.dataset.zipcode;
    
    this.input.value = value;
    this.hideResults();
    
    // Trigger custom event with selected data
    this.input.dispatchEvent(new CustomEvent('autocomplete-select', {
      detail: { value, city, state, zipcode }
    }));
  }
  
  hideResults() {
    this.results.style.display = 'none';
    this.results.innerHTML = '';
  }
  
  handleKeydown(e) {
    const items = this.results.querySelectorAll('.autocomplete-item');
    if (items.length === 0) return;
    
    const current = this.results.querySelector('.autocomplete-item.highlighted');
    let next;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        next = current ? current.nextElementSibling : items[0];
        break;
      case 'ArrowUp':
        e.preventDefault();
        next = current ? current.previousElementSibling : items[items.length - 1];
        break;
      case 'Enter':
        e.preventDefault();
        if (current) {
          this.selectItem(current);
        }
        return;
      case 'Escape':
        this.hideResults();
        return;
    }
    
    if (next) {
      if (current) current.classList.remove('highlighted');
      next.classList.add('highlighted');
    }
  }
}

// Usage
const autocomplete = new ZipCityAutocomplete(
  document.getElementById('location-input'),
  document.getElementById('autocomplete-results'),
  {
    country: 'us', // or 'ca'
    limit: 10,
    minChars: 4
  }
);

// Listen for selection
document.getElementById('location-input').addEventListener('autocomplete-select', (e) => {
  const { value, city, state, zipcode } = e.detail;
  console.log('Selected:', { value, city, state, zipcode });
  
  // You can now populate other form fields or trigger other actions
});
```

#### 4. CSS Styling Example

```css
.autocomplete-container {
  position: relative;
  width: 100%;
}

.autocomplete-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.autocomplete-item {
  padding: 10px;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.autocomplete-item:hover,
.autocomplete-item.highlighted {
  background-color: #f5f5f5;
}

.autocomplete-item:last-child {
  border-bottom: none;
}
```

#### 5. HTML Structure

```html
<div class="autocomplete-container">
  <input 
    type="text" 
    id="location-input" 
    placeholder="Enter city name or ZIP code (4+ characters)"
    autocomplete="off"
  />
  <div id="autocomplete-results" class="autocomplete-results"></div>
</div>
```

## Features

✅ **Smart Detection**: Automatically detects city names vs ZIP codes  
✅ **Deduplication**: Removes duplicate city/state combinations  
✅ **Sorting**: Results sorted alphabetically  
✅ **Configurable Limits**: Control number of results returned  
✅ **CORS Enabled**: Works from any domain  
✅ **Fast Performance**: Optimized search algorithms  
✅ **Fallback Support**: Works with both R2 binding and public URLs
