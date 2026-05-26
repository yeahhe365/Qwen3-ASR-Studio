export type JsonRecord = Record<string, unknown>;

export const isJsonRecord = (value: unknown): value is JsonRecord => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const getJsonString = (value: unknown, fallback = '') => {
  return typeof value === 'string' ? value : fallback;
};

export const getJsonBoolean = (value: unknown) => {
  return typeof value === 'boolean' ? value : undefined;
};

export const getJsonNumber = (value: unknown) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

export const getJsonNonnegativeNumber = (value: unknown) => {
  const number = getJsonNumber(value);
  return typeof number === 'number' ? Math.max(0, number) : undefined;
};

export const getJsonEnumValue = <T extends Record<string, string>>(enumObject: T, value: unknown) => {
  return typeof value === 'string' && Object.values(enumObject).includes(value) ? value : undefined;
};
