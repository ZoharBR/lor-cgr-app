export enum DeviceType {
  MIKROTIK = 'Mikrotik',
  HUAWEI = 'Huawei',
  JUNIPER = 'Juniper',
  OLT_FIBERHOME = 'OLT FiberHome',
  LINUX_SERVER = 'Linux Server',
  WINDOWS_SERVER = 'Windows Server',
  VMWARE_ESXI = 'VMWare ESXi',
}

export interface Device {
  id: string;
  name: string;
  ip: string;
  type: DeviceType;
  model: string;
  status: 'online' | 'offline' | 'warning';
  lastBackup?: string;
  cpuLoad?: number;
  uptime?: string;
}

export interface TerminalSession {
  id: string;
  name: string;
  protocol: 'SSH' | 'TELNET' | 'RDP' | 'WINBOX' | 'WEB';
  host: string;
  port: number;
  user?: string;
  group?: string;
  tags?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  isThinking?: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  INVENTORY = 'INVENTORY',
  TERMINAL = 'TERMINAL', // Conexões
  MONITORING = 'MONITORING',
  IPAM = 'IPAM',
  BACKUPS = 'BACKUPS',
  NTP = 'NTP',
  FIBERHOME = 'FIBERHOME', // New View
  HISTORY = 'HISTORY',
  AI_CENTER = 'AI_CENTER',
  ADMIN = 'ADMIN',
  MANUAL = 'MANUAL', // Renamed/New View for PDF Manual
  SETTINGS = 'SETTINGS',
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: 'ADMIN' | 'READ_ONLY' | 'NOC';
  language: 'pt-BR' | 'en-US' | 'es-ES';
  avatar?: string;
  
  // Extended Profile Fields
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  isWhatsapp?: boolean;
  isTelegram?: boolean;
  birthDate?: string;
  gender?: 'Masculino' | 'Feminino' | 'Outro';
}

// Dashboard Specific Types
export type WidgetType = 'KPI' | 'AREA_CHART' | 'BAR_CHART' | 'CPU_CHART' | 'TERMINAL_QUICK' | 'IPAM_SUMMARY' | 'DEVICE_LIST' | 'HISTORY_LOG' | 'AI_MINI';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  colSpan: 1 | 2 | 3 | 4; // grid column span (out of 4 for md, usually)
  className?: string; // Additional tailwind classes
  // KPI specific
  icon?: string;
  value?: string | number;
  subtext?: string;
  subtextColor?: string;
  iconColor?: string; 
  bgGradient?: string;
}