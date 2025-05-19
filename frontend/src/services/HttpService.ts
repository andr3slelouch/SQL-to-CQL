// src/services/HttpService.ts
import AuthService from './AuthService';

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  service?: 'auth' | 'permissions' | 'translator'; // Servicios disponibles
}

class HttpService {
  private baseUrls: Record<string, string>;

  constructor() {
    // Configuración de URLs base para cada microservicio
    this.baseUrls = {
      auth: 'http://localhost:3001/api', // Servicio de autenticación
      permissions: 'http://localhost:3002/api', // Servicio de permisos
      translator: 'http://localhost:3000/api' // Servicio de traducción
    };
  }

  // Método privado para agregar encabezados de autenticación
  private getAuthHeaders(): Record<string, string> {
    const token = AuthService.getAccessToken();
    if (!token) {
      console.warn('No se encontró token de autenticación');
    } else {
      console.log('Token de autenticación encontrado');
    }
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }

  // Método genérico para realizar solicitudes HTTP
  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    // Determinar qué servicio usar (por defecto, translator)
    const service = options.service || 'translator';
    
    // Construir la URL correcta para el servicio
    const url = `${this.baseUrls[service]}${endpoint}`;
    console.log(`Servicio seleccionado: ${service}`);
    console.log(`URL completa: ${url}`);
    
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
      console.log('Cuerpo de la petición:', options.body);
    }
    
    // Configurar opciones de la solicitud
    const requestOptions: RequestInit = {
      method: options.method || 'GET',
      headers,
      body,
      credentials: 'include' // Para soportar cookies si se utilizan
    };
    
    try {
      console.log(`Realizando petición a: ${url}`);
      const response = await fetch(url, requestOptions);
      
      // Manejar errores de respuesta HTTP
      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado o inválido
          console.error('Error 401: Token inválido o sesión expirada');
          AuthService.logout();
          throw new Error('Su sesión ha expirado. Por favor, inicie sesión nuevamente.');
        }
        
        // Manejar el conflicto de cédula duplicada específicamente
        if (response.status === 409) {
          console.error('Error 409: Conflicto - Recurso duplicado');
          const errorData = await response.json().catch(() => null);
          throw new Error('No se puede crear el usuario con la información ingresada');
        }
        
        // Intentar obtener detalles del error desde la respuesta
        const errorData = await response.json().catch(() => null);
        console.error('Error en la respuesta:', errorData);
        
        const errorMessage = errorData?.message || `Error ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      // Verificar si la respuesta contiene datos JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const jsonResponse = await response.json();
        console.log('Respuesta JSON:', jsonResponse);
        return jsonResponse as T;
      }
      
      // Si no es JSON, devolver la respuesta como texto
      const textResponse = await response.text();
      console.log('Respuesta texto:', textResponse);
      return textResponse as unknown as T;
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

  async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }
}

// Exportamos una instancia única del servicio HTTP
export default new HttpService();