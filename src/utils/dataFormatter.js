/**
 * Formats a string to Title Case (each word capitalized)
 * @param {string} str - The string to format
 * @returns {string} - The formatted string
 */
const toTitleCase = (str) => {
  return str
    .replace(/([A-Z])/g, ' $1') // Add space before capital letters
    .replace(/_/g, ' ') // Replace underscores with spaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
    .trim();
};

/**
 * Formats a value to Sentence case or keeps it as is based on rules
 * @param {string} value - The value to format
 * @returns {string} - The formatted value
 */
const formatValue = (value) => {
  // If it's a number or alphanumeric identifier, return as is
  if (/^\d+$/.test(value) || /^[A-Z0-9]+$/.test(value)) {
    return value;
  }
  
  // If it's a date in format DD/MM/YYYY, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }
  
  // If it's a CURP or similar identifier, return as is
  if (/^[A-Z0-9]{18}$/.test(value)) {
    return value;
  }
  
  // For other text, convert to sentence case
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

/**
 * Flattens and formats nested data according to specified rules
 * @param {Object} data - The nested data structure
 * @returns {Object} - Flattened and formatted key-value pairs
 */
const flattenAndFormatData = (data) => {
  const result = {};
  const excludedFields = ['_id', '$oid', 'status', 'codigo', 'mensaje', 'Detalles', 'docProbatorio'];
  
  const processNode = (node, prefix = '') => {
    if (!node || typeof node !== 'object') return;
    
    Object.entries(node).forEach(([key, value]) => {
      // Skip excluded fields
      if (excludedFields.includes(key)) return;
      
      // Skip empty data objects
      if (key === 'data' && (!value || Object.keys(value).length === 0)) return;
      
      const newKey = prefix ? `${prefix} -> ${key}` : key;
      
      if (Array.isArray(value)) {
        // Process array items
        value.forEach((item, index) => {
          if (typeof item === 'object') {
            processNode(item, `${newKey}[${index}]`);
          }
        });
      } else if (typeof value === 'object' && value !== null) {
        // Process nested objects
        processNode(value, newKey);
      } else {
        // Process leaf nodes
        const baseKey = newKey.split(' -> ').pop();
        const formattedKey = toTitleCase(baseKey);
        const formattedValue = formatValue(value.toString());
        result[formattedKey] = formattedValue;
      }
    });
  };
  
  processNode(data);
  
  // Remove duplicates (keeping last occurrence)
  const uniqueResult = {};
  Object.entries(result).forEach(([key, value]) => {
    uniqueResult[key] = value;
  });
  
  return uniqueResult;
};

/**
 * Converts the flattened data to a formatted string
 * @param {Object} flattenedData - The flattened data object
 * @returns {string} - Formatted string output
 */
const formatOutput = (flattenedData) => {
  return Object.entries(flattenedData)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
};

export { flattenAndFormatData, formatOutput }; 