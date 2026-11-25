export interface Field {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'json' | 'checkbox';
  required?: boolean;
}
export interface Action {
  label: string;
  path: string;
  method: 'POST' | 'PATCH';
  fields: Field[];
  initial?: Record<string, unknown>;
  permission: string;
  help?: string;
  values?: Row;
}
export type Row = Record<string, unknown>;
export interface Resource {
  title: string;
  description: string;
  permission: string;
  columns: { key: string; label: string; money?: boolean; status?: boolean }[];
}
export const getValue = (row: Row, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) => (value && typeof value === 'object' ? (value as Row)[key] : undefined),
      row,
    );
