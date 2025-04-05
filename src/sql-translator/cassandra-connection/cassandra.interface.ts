export interface CassandraConnectionOptions {
    contactPoint: string;
    port: number;
    keyspace: string;
    username: string;
    password: string;
    datacenter: string;
  }
  
  export interface CassandraExecutionResult {
    success: boolean;
    result?: any;
    error?: string;
  }