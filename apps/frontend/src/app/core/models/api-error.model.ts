export interface ApiValidationConstraints {
  [constraintName: string]: string;
}

export interface ApiValidationError {
  property: string;
  value: unknown;
  constraints: ApiValidationConstraints;
  children: ApiValidationError[];
  target?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly validationErrors?: ApiValidationError[]
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
