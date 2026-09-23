import type {
  WorkspaceData,
  User,
  ObservationInput,
  FieldPlan,
  FieldTask,
  ObservationStatus,
} from '../shared/types';
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: method || (body === undefined ? 'GET' : 'POST'),
    credentials: 'same-origin',
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json'))
    throw new ApiError(
      'The server is unavailable. Your work has been kept on this device.',
      response.status,
    );
  const result = await response.json();
  if (!response.ok)
    throw new ApiError(result.error || 'Something went wrong. Please try again.', response.status);
  return result as T;
}
export const client = {
  me: () => api<{ user: User }>('/auth/me'),
  demo: () => api<{ user: User }>('/auth/demo', {}),
  login: (email: string, password: string) =>
    api<{ user: User }>('/auth/login', { email, password }),
  register: (name: string, email: string, password: string, workspaceName: string) =>
    api<{ user: User }>('/auth/register', { name, email, password, workspaceName }),
  logout: () => api('/auth/logout', {}),
  workspace: () => api<WorkspaceData>('/workspace'),
  observe: (input: ObservationInput) =>
    api<{ observation: { id: string } }>('/observations', input),
  review: (id: string, status: ObservationStatus, note: string, revision: number) =>
    api(`/observations/${id}/review`, { status, note, revision }),
  plan: (budgetMinutes: number) => api<FieldPlan>('/plan', { budgetMinutes }),
  commitPlan: (budgetMinutes: number) =>
    api<{ tasks: FieldTask[] }>('/plan/commit', { budgetMinutes }),
  task: (body: unknown) => api<{ task: FieldTask }>('/tasks', body),
  updateTask: (id: string, body: unknown) => api(`/tasks/${id}`, body),
};
export function dateLabel(value: string, withTime = false) {
  const d = new Date(value);
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}
export function relativeTime(value: string) {
  const min = Math.floor((Date.now() - new Date(value).getTime()) / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return `${min}m ago`;
  if (min < 1440) return `${Math.floor(min / 60)}h ago`;
  return `${Math.floor(min / 1440)}d ago`;
}
export const concernLabels: Record<string, string> = {
  foam: 'Surface foam',
  discoloration: 'Unusual colour',
  litter: 'Litter',
  odour: 'Unusual smell',
  dead_fish: 'Fish in distress',
  algae: 'Algal growth',
  erosion: 'Bank erosion',
  wildlife: 'Wildlife seen',
  clear: 'No visible concern',
};
export const statusLabels: Record<string, string> = {
  new: 'Needs review',
  reviewed: 'Reviewed',
  actioned: 'Action underway',
  resolved: 'Rechecked',
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
};
