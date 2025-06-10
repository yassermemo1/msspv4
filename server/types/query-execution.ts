// Type definitions for query execution service

export interface MethodConfig {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  transform?: TransformConfig;
  timeout?: number;
  retries?: number;
}

export interface TransformConfig {
  type: 'jq' | 'jsonpath' | 'custom' | 'passthrough';
  expression: string;
  fallback?: any;
  outputFormat?: 'json' | 'array' | 'string' | 'number';
}

export interface AuthConfig {
  type: 'basic' | 'bearer' | 'apikey' | 'oauth' | 'none';
  credentials: BasicAuth | BearerAuth | ApiKeyAuth | OAuthConfig;
}

export interface BasicAuth {
  username: string;
  password: string;
}

export interface BearerAuth {
  token: string;
}

export interface ApiKeyAuth {
  key: string;
  value: string;
  location: 'header' | 'query' | 'body';
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface QueryExecutionRequest {
  systemId: number;
  methodName: string;
  parameters?: Record<string, any>;
  options?: QueryExecutionOptions;
}

export interface QueryExecutionOptions {
  timeout?: number;
  retries?: number;
  cacheKey?: string;
  cacheTtl?: number;
  validateResponse?: boolean;
}

export interface QueryExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata: {
    systemId: number;
    methodName: string;
    executionTime: number;
    timestamp: string;
    cacheHit?: boolean;
    retryCount?: number;
  };
}

export interface SystemMethodDefinition {
  systemId: number;
  methods: MethodConfig[];
  authConfig: AuthConfig;
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface CacheEntry {
  key: string;
  data: any;
  timestamp: Date;
  ttl: number;
  systemId: number;
  methodName: string;
}

// Error types
export class QueryExecutionError extends Error {
  constructor(
    message: string,
    public systemId: number,
    public methodName: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'QueryExecutionError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string, public systemId: number) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field: string, public value: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string, public timeout: number) {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Response types for different data formats
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: PaginationInfo;
  metadata?: ResponseMetadata;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ResponseMetadata {
  timestamp: string;
  version: string;
  source: string;
  executionTime: number;
  requestId?: string;
}

// Specific data structures for common integrations
export interface JiraIssueData {
  id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: string;
  reporter: string;
  created: string;
  updated: string;
  project: string;
}

export interface SlackMessageData {
  id: string;
  channel: string;
  user: string;
  text: string;
  timestamp: string;
  threadTs?: string;
  reactions?: Array<{
    name: string;
    count: number;
    users: string[];
  }>;
}

export interface TeamsChannelData {
  id: string;
  displayName: string;
  description?: string;
  membershipType: 'standard' | 'private';
  createdDateTime: string;
  webUrl: string;
} 