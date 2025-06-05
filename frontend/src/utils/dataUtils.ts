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
