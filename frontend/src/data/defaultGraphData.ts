import { Node, Edge, MarkerType } from 'reactflow';
import { DemoNodeData } from '../types/graph';

export const defaultNodes: Node<DemoNodeData>[] = [
  // People (mapped to PersonNode)
  {
    id: 'alice',
    type: 'person', // This will use PersonNode
    position: { x: 600, y: 50 },
    data: { name: 'Alice', title: 'CEO', typeDetails: 'Executive User', status: 'normal', icon: 'user-tie', details: { department: 'Executive', employeeId: 'E1001' } },
    className: 'node-appear',
  },
  {
    id: 'bob',
    type: 'person',
    position: { x: 350, y: 200 },
    data: { name: 'Bob', title: 'Dev Manager', typeDetails: 'Management User', status: 'normal', icon: 'user-cog', details: { department: 'Engineering', team: 'Alpha Team' } },
    className: 'node-appear',
  },
  {
    id: 'carol',
    type: 'person',
    position: { x: 850, y: 200 },
    data: { name: 'Carol', title: 'Product Manager', typeDetails: 'Management User', status: 'warning', icon: 'user-shield', details: { department: 'Product', projectsOverseeing: ['Alpha', 'Beta'] } },
    className: 'node-appear',
  },
  {
    id: 'david',
    type: 'person',
    position: { x: 200, y: 350 },
    data: { name: 'David', title: 'Sr. Developer', typeDetails: 'Technical User', status: 'normal', icon: 'user-hard-hat', details: { team: 'Alpha Team', skills: ['React', 'Node.js'] } },
    className: 'node-appear',
  },
  {
    id: 'eve',
    type: 'person',
    position: { x: 500, y: 350 },
    data: { name: 'Eve', title: 'UX Designer', typeDetails: 'Technical User', status: 'normal', icon: 'user-pen', details: { team: 'Alpha Team', specialisation: 'Mobile UX' } },
    className: 'node-appear',
  },

  // Systems/Computers (mapped to CompanyNode)
  {
    id: 'main_server',
    type: 'company', // This will use CompanyNode
    position: { x: 350, y: 550 },
    data: { name: 'Main Server', location: 'DC-1 Rack A', typeDetails: 'Primary Application Server', status: 'normal', icon: 'server', details: { ip: '192.168.1.10', os: 'Linux Ubuntu 22.04' } },
    className: 'node-appear',
  },
  {
    id: 'db_server',
    type: 'company',
    position: { x: 600, y: 700 },
    data: { name: 'Database Server', location: 'DC-1 Rack B', typeDetails: 'PostgreSQL Cluster', status: 'alert', icon: 'database', details: { ip: '192.168.1.15', version: 'PostgreSQL 14', issue: 'High CPU Load' } },
    className: 'node-appear',
  },
  {
    id: 'backup_server',
    type: 'company',
    position: { x: 100, y: 700 },
    data: { name: 'Backup Server', location: 'DC-2 Offsite', typeDetails: 'Daily Backup Storage', status: 'normal', icon: 'archive', details: { ip: '10.10.5.20', lastBackup: '2023-10-26 03:00 UTC' } },
    className: 'node-appear',
  },

  // Projects (mapped to CompanyNode)
  {
    id: 'project_alpha',
    type: 'company',
    position: { x: 700, y: 350 },
    data: { name: 'Project Alpha', location: 'Q4 Initiative', typeDetails: 'Core Product Rewrite', status: 'normal', icon: 'clipboard-list', details: { deadline: '2023-12-15', budget: '$250,000' } },
    className: 'node-appear',
  },
  {
    id: 'project_beta',
    type: 'company',
    position: { x: 1000, y: 350 },
    data: { name: 'Project Beta', location: 'R&D Effort', typeDetails: 'New Feature Exploration', status: 'delayed', icon: 'lightbulb', details: { statusReason: 'Resource constraints', revisedEta: '2024-02-01' } },
    className: 'node-appear',
  },
  {
    id: 'firewall_main',
    type: 'company',
    position: { x: 600, y: 550 },
    data: { name: 'Firewall GW', location: 'Network Edge', typeDetails: 'Main Security Gateway', status: 'warning', icon: 'shield-check', details: { policy: 'Strict', lastAudit: '2023-09-15', issue: 'Firmware update pending' } },
    className: 'node-appear',
  }
];

export const defaultEdges: Edge[] = [
  // Hierarchy
  { id: 'e-alice-bob', source: 'alice', target: 'bob', label: 'Manages', type: 'smoothstep', animated: false, style: { stroke: 'var(--accent-cyan)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-cyan)' }, className: 'edge-appear' },
  { id: 'e-alice-carol', source: 'alice', target: 'carol', label: 'Manages', type: 'smoothstep', style: { stroke: 'var(--accent-cyan)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-cyan)' }, className: 'edge-appear' },
  { id: 'e-bob-david', source: 'bob', target: 'david', label: 'Leads', type: 'smoothstep', style: { stroke: 'var(--accent-green)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-green)' }, className: 'edge-appear' },
  { id: 'e-bob-eve', source: 'bob', target: 'eve', label: 'Leads', type: 'smoothstep', style: { stroke: 'var(--accent-green)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-green)' }, className: 'edge-appear' },

  // Project Assignments
  { id: 'e-carol-project_alpha', source: 'carol', target: 'project_alpha', label: 'Oversees', type: 'smoothstep', style: { stroke: 'var(--accent-purple)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-purple)' }, className: 'edge-appear' },
  { id: 'e-carol-project_beta', source: 'carol', target: 'project_beta', label: 'Oversees', type: 'smoothstep', style: { stroke: 'var(--accent-purple)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-purple)' }, className: 'edge-appear' },
  { id: 'e-david-project_alpha', source: 'david', target: 'project_alpha', label: 'Works On', type: 'smoothstep', animated: true, style: { stroke: 'var(--accent-orange)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-orange)' }, className: 'edge-appear' },
  { id: 'e-eve-project_alpha', source: 'eve', target: 'project_alpha', label: 'Works On', type: 'smoothstep', animated: true, style: { stroke: 'var(--accent-orange)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-orange)' }, className: 'edge-appear' },
  { id: 'e-david-project_beta', source: 'david', target: 'project_beta', label: 'Consults For', type: 'smoothstep', style: { stroke: 'var(--accent-pink)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-pink)' }, className: 'edge-appear' },

  // System Connections
  { id: 'e-david-main_server', source: 'david', target: 'main_server', label: 'Accesses (SSH)', type: 'smoothstep', className: 'edge-appear' },
  { id: 'e-main_server-firewall', source: 'main_server', target: 'firewall_main', label: 'Protected By', type: 'smoothstep', animated: true, style: { stroke: 'var(--accent-green)', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-green)' }, className: 'edge-appear' },
  { id: 'e-firewall-db_server', source: 'firewall_main', target: 'db_server', label: 'Protects', type: 'smoothstep', style: { stroke: 'var(--accent-red)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-red)' }, className: 'edge-appear' }, // Edge to alert node
  { id: 'e-main_server-db_server', source: 'main_server', target: 'db_server', label: 'Connects To', type: 'smoothstep', animated: true, style: { stroke: 'var(--accent-red)', strokeWidth: 2.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-red)' }, className: 'edge-appear' },
  { id: 'e-main_server-backup_server', source: 'main_server', target: 'backup_server', label: 'Backs Up To', type: 'smoothstep', className: 'edge-appear' },
  { id: 'e-project_alpha-db_server', source: 'project_alpha', target: 'db_server', label: 'Uses Data From', type: 'smoothstep', style: { stroke: 'var(--accent-red)', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--accent-red)' }, className: 'edge-appear' },

  // Inter-departmental
  { id: 'e-bob-carol', source: 'bob', target: 'carol', label: 'Collaborates With', type: 'smoothstep', style: { stroke: 'var(--text-secondary)', strokeDasharray: '5 5', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--text-secondary)' }, className: 'edge-appear' },
  { id: 'e-eve-main_server', source: 'eve', target: 'main_server', label: 'Uses API', type: 'smoothstep', style: { stroke: '#7c3aed', strokeDasharray: '3 3', strokeWidth: 1.5 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#7c3aed' }, className: 'edge-appear' }, // Eve also interacts with main server
]; 