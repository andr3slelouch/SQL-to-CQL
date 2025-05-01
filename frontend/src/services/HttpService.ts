// src/services/HttpService.ts
import AuthService from './AuthService';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  service?: 'auth' | 'permissions'; // Para identificar a qué servicio hacer la petición
}

class HttpService {
  private baseUrls: Record<string, string>;

  constructor() {
    // Configuración de URLs base para cada microservicio
    this.baseUrls = {
      auth: 'http://localhost:3001/api',      // Servicio de autenticación
      permissions: 'http://localhost:3002/api' // Servicio de permisos
    };
  }

  // Método privado para agregar encabezados de autenticación
  private getAuthHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Método genérico para realizar solicitudes HTTP
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // Determinar qué servicio usar (por defecto, auth)
    const service = options.service || 'auth';
    const url = `${this.baseUrls[service]}${endpoint}`;
    
    // Configurar encabezados predeterminados
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...(options.headers || {})
    };
    
    // Preparar el cuerpo de la solicitud si existe
    let body;
    if (options.body) {
      body = JSON.stringify(options.body);
    }
    
    // Configurar opciones de la solicitud
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      body,
      credentials: 'include'  // Para soportar cookies si se utilizan
    };
    
    try {
      console.log(`Realizando petición a: ${url}`);
      const response = await fetch(url, requestOptions);
      
      // Manejar errores de respuesta HTTP
      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          AuthService.logout();
          throw new Error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        }
        
        // Intentar obtener detalles del error desde la respuesta
        const errorData = await response.json().catch(() => null);
        const errorMessage = errorData?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      // Verificar si la respuesta contiene datos JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json() as T;
      }
      
      // Si no es JSON, devolver la respuesta como texto
      return await response.text() as unknown as T;
      
    } catch (error) {
      // Re-lanzar el error para que lo maneje el componente
      throw error;
    }
  }

  // Métodos de conveniencia para los tipos comunes de solicitudes
  async get<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body, ...options });
  }

  async put<T>(endpoint: string, body: any, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body, ...options });
  }

  async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

// Exportamos una instancia única del servicio HTTP
export default new HttpService();