export type Role = 'coordinator' | 'volunteer';
export type ObservationStatus = 'new' | 'reviewed' | 'actioned' | 'resolved';
export type Concern =
  | 'foam'
  | 'discoloration'
  | 'litter'
  | 'odour'
  | 'dead_fish'
  | 'algae'
  | 'erosion'
  | 'wildlife'
  | 'clear';
export type Confidence = 'unsure' | 'fairly_sure' | 'certain';
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  workspaceId: string;
  workspaceName: string;
  isDemo: boolean;
}
export interface Site {
  id: string;
  name: string;
  catchment: string;
  lat: number;
  lng: number;
  description: string;
  habitat: string;
  access: string;
  exposure: number;
  walkMinutes: number;
  lastCheckedAt: string | null;
  sensitive: boolean;
}
export interface Observation {
  actionedAt?: string;
  id: string;
  siteId: string;
  authorId: string;
  authorName: string;
  observedAt: string;
  createdAt: string;
  concerns: Concern[];
  clarity: 'clear' | 'cloudy' | 'opaque' | 'unsure';
  flow: 'still' | 'slow' | 'steady' | 'fast' | 'unsure';
  confidence: Confidence;
  notes: string;
  photo: string | null;
  status: ObservationStatus;
  demo: boolean;
  revision: number;
}
export interface Reason {
  label: string;
  points: number;
  detail: string;
}
export interface Assessment {
  observationId: string;
  score: number;
  priority: 'urgent' | 'high' | 'medium' | 'routine';
  evidence: 'limited' | 'developing' | 'corroborated';
  reasons: Reason[];
  cautions: string[];
  suggestedAction: string;
  question: string;
  corroboratingCount: number;
  oneHealth: { environment: string; animals: string; people: string };
  version: string;
}
export interface FieldTask {
  id: string;
  observationId: string;
  siteId: string;
  title: string;
  kind: 'verify' | 'sample' | 'cleanup' | 'recheck';
  status: 'planned' | 'in_progress' | 'completed';
  assignedTo: string;
  dueAt: string;
  createdAt: string;
  completedAt: string | null;
  result: string | null;
  estimatedMinutes: number;
  canUpdate?: boolean;
}
export interface AuditEvent {
  observationId?: string;
  id: string;
  entityId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
  decision?: {
    engineVersion: string;
    score: number;
    priority: Assessment['priority'];
    evidence: Assessment['evidence'];
    reasons: Reason[];
    assessedAt: string;
  };
}
export interface WorkspaceData {
  user: User;
  sites: Site[];
  observations: Observation[];
  assessments: Assessment[];
  tasks: FieldTask[];
  activity: AuditEvent[];
  engineVersion: string;
  scenarioDate: string | null;
}
export interface ObservationInput {
  siteId: string;
  observedAt: string;
  concerns: Concern[];
  clarity: Observation['clarity'];
  flow: Observation['flow'];
  confidence: Confidence;
  notes: string;
  photo?: string | null;
  clientId: string;
}
export interface PlanItem {
  siteId: string;
  observationId: string;
  title: string;
  minutes: number;
  score: number;
  rationale: string;
  rank: number;
}
export interface FieldPlan {
  budgetMinutes: number;
  usedMinutes: number;
  items: PlanItem[];
  deferred: { siteId: string; reason: string }[];
  explanation: string;
  engineVersion: string;
}
