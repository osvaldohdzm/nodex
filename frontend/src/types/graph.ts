import { Node, Edge } from 'reactflow';

export interface DemoNodeData {
  name: string;
  typeDetails: string;
  status: 'normal' | 'warning' | 'alert' | 'delayed';
  icon?: string;
  details?: Record<string, any>;
  title?: string;
  location?: string;
  rawJsonData?: any; // To store the complete JSON data for the person
  imageUrl?: string; // For profile image
  onImageUpload?: (nodeId: string, file: File) => void; // For image upload functionality
  isHighlighted?: boolean; // For highlighting nodes
}

export interface JsonData {
  nodes?: Node<DemoNodeData>[];
  edges?: Edge[];
  [key: string]: any; // Allow for other properties in the JSON
}

// Re-export types for convenience
export type { Node, Edge };
export type { DemoNodeData as NodeData };