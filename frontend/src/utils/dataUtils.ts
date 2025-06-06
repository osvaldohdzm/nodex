export const deepSearchInObject = (obj: any, term: string): boolean => {
  if (term === '') return false;
  const lowerCaseTerm = term.toLowerCase();

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'object' && value !== null) {
        if (deepSearchInObject(value, term)) return true;
      } else if (value !== null && value !== undefined) {
        if (String(value).toLowerCase().includes(lowerCaseTerm)) {
          return true;
        }
      }
    }
  }
  return false;
};

export const flattenObject = (obj: any, parentKey: string = '', result: Record<string, any> = {}): Record<string, any> => {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const propName = parentKey ? `${parentKey} -> ${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        flattenObject(value, propName, result);
      } else if (Array.isArray(value)) {
        if (value.every(item => typeof item !== 'object')) {
          result[propName] = value.join(', ');
        } else {
          value.forEach((item, index) => {
            flattenObject(item, `${propName}[${index}]`, result);
          });
        }
      } else {
        if (value !== null && value !== undefined && value !== '') {
          result[propName] = value;
        }
      }
    }
  }
  return result;
};

export const formatKeyForDisplay = (key: string): string => {
  // Extract the last part of the key if it comes with a path (e.g. "curp_online -> data -> curp" -> "curp")
  const finalKey = key.includes(' -> ') ? key.substring(key.lastIndexOf(' -> ') + 4) : key;

  // Convert camelCase or snake_case to Title Case
  let result = finalKey
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2'); // Insert space before uppercase in camelCase

  // Capitalize first letter of each word
  return result
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const normalizeValueToSentenceCase = (value: string): string => {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }
  // If the value is all uppercase and short (like an acronym), or a CURP/RFC, don't change it
  if ((value === value.toUpperCase() && value.length <= 5) || /^[A-Z0-9]{10,}$/.test(value)) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};
