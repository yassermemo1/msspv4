export interface ExternalSystem {
  id: number;
  systemName: string;
  displayName: string;
  systemType: 'api' | 'database' | 'file' | 'custom';
  baseUrl: string;
  authType: 'none' | 'basic' | 'bearer' | 'api_key' | 'oauth' | 'custom';
  authConfig?: {
    username?: string;
    password?: string;
    token?: string;
    key?: string;
    header?: string;
    accessToken?: string;
    customHeaders?: Record<string, string>;
  };
  connectionConfig?: {
    timeout?: number;
    retries?: number;
    sslVerify?: boolean;
    additionalHeaders?: Record<string, string>;
  };
  queryMethods?: Record<string, {
    type: 'http_get' | 'http_post' | 'graphql' | 'rest' | 'sql' | 'custom';
    endpoint?: string;
    queryParam?: string;
    queryField?: string;
    parametersField?: string;
    dataPath?: string;
    httpMethod?: string;
    contentType?: string;
    defaultPayload?: Record<string, any>;
    timeout?: number;
    customEndpoint?: string;
  }>;
  dataTransforms?: Record<string, {
    type: 'filter' | 'map' | 'aggregate' | 'sort';
    config: any;
  }>;
  apiEndpoints?: Record<string, any>;
  healthCheckConfig?: {
    endpoint: string;
    method?: string;
    timeout?: number;
  };
  rateLimitConfig?: {
    maxRequests: number;
    windowMs: number;
  };
  errorHandling?: {
    retryOnErrors?: string[];
    maxRetries?: number;
    retryDelay?: number;
  };
  isActive: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
} 