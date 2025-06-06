// Type declarations for external modules
declare module 'html2canvas' {
  const html2canvas: any;
  export default html2canvas;
}

declare module 'jspdf' {
  const jsPDF: any;
  export default jsPDF;
}

declare module 'react-resizable-panels' {
  export const Panel: any;
  export const PanelGroup: any;
  export const PanelResizeHandle: any;
}

declare module 'lucide-react' {
  export const FileCode: any;
  export const Edit: any;
  export const Eye: any;
  export const HelpCircle: any;
  export const Database: any;
  export const User: any;
  export const Settings: any;
  export const UploadCloud: any;
  export const FileJson: any;
  export const Replace: any;
  export const Layers: any;
  export const Download: any;
  export const X: any;
}

// Add type declarations for parameters in GraphPage.tsx
declare type Edge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  style?: any;
  markerEnd?: any;
  label?: string;
  className?: string;
  sourceHandle?: string;
  targetHandle?: string;
};

declare type Node<T = any> = {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: T;
  className?: string;
};

declare type Connection = {
  source: string | null;
  target: string | null;
  sourceHandle?: string;
  targetHandle?: string;
};

// Add type declarations for React and ReactFlow
declare module 'react' {
  export type FC<P = {}> = React.FunctionComponent<P>;
  export type FunctionComponent<P = {}> = (props: P) => React.ReactElement | null;
  export type ReactElement = any;
  
  export interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    className?: string;
    style?: React.CSSProperties;
    title?: string;
    role?: string;
    tabIndex?: number;
    // Add other common HTML attributes as needed
  }

  export interface ButtonHTMLAttributes<T> extends HTMLAttributes<T> {
    type?: 'button' | 'submit' | 'reset';
    // Add other button-specific attributes as needed
  }

  export interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    type?: string;
    value?: string | number | readonly string[];
    // Add other input-specific attributes as needed
  }

  export interface DetailedHTMLProps<E extends HTMLAttributes<T>, T> extends E {
    // Add any additional props needed
  }

  export interface AriaAttributes {
    // Add ARIA attributes as needed
  }

  export interface DOMAttributes<T> {
    // Add DOM event handlers as needed
  }

  export interface CSSProperties {
    // Add CSS properties as needed
  }
  
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: ReadonlyArray<any>): T;
  export function useEffect(effect: () => void | (() => void), deps?: ReadonlyArray<any>): void;
  export function useMemo<T>(factory: () => T, deps: ReadonlyArray<any>): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
}

declare module 'reactflow' {
  export type { Node, Edge, Connection };
  export const Controls: any;
  export const Background: any;
  export const useNodesState: <T>(initial: T[]) => [T[], (updater: (nodes: T[]) => T[]) => void, any];
  export const useEdgesState: <T>(initial: T[]) => [T[], (updater: (edges: T[]) => T[]) => void, any];
  export const useReactFlow: () => any;
  export const ReactFlowProvider: React.FC<{ children: React.ReactNode }>;
  export const MarkerType: { ArrowClosed: string };
  export const addEdge: (edge: Edge, edges: Edge[]) => Edge[];
  export const ReactFlow: React.FC<any>;
}

// Add type declarations for state setters
declare type SetStateAction<T> = T | ((prevState: T) => T);
declare type Dispatch<A> = (value: A) => void;
declare type SetState<T> = Dispatch<SetStateAction<T>>;

// Add JSX type declarations
declare namespace JSX {
  interface IntrinsicElements {
    div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
    input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
    details: React.DetailedHTMLProps<React.DetailsHTMLAttributes<HTMLDetailsElement>, HTMLDetailsElement>;
    summary: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
    h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    // Add other HTML elements as needed
  }
} 