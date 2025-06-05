export interface JsonData {
  nodes?: Array<any>;
  edges?: Array<any>;
  [key: string]: any; // Allow for other properties in the JSON
} 