// src/sql-translator/services/permissions-api.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PermissionsApiService {
  private readonly logger = new Logger(PermissionsApiService.name);
  private readonly permissionsApiUrl: string;

  constructor(
    private configService: ConfigService,
    private httpService: HttpService
  ) {
    this.permissionsApiUrl = this.configService.get<string>('PERMISSIONS_API_URL', 'http://localhost:3002/api/admin');
  }

  /**
   * Actualiza los keyspaces de un usuario en el servicio de permisos
   * @param cedula Cédula del usuario
   * @param keyspace Nombre del keyspace
   * @param add Indica si se debe añadir (true) o eliminar (false) el keyspace
   * @param token Token JWT del usuario que realiza la operación
   */
  async updateUserKeyspace(cedula: string, keyspace: string, add: boolean, token: string): Promise<boolean> {
    try {
      // Usar update-single-keyspace en lugar de update-user-keyspaces
      const url = `${this.permissionsApiUrl}/keyspaces/update-single-keyspace`;
      const data = {
        cedula,
        keyspace,
        action: add ? 'add' : 'remove'
      };
      
      await this.httpService.post(
        url,
        data,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      ).toPromise();
      
      this.logger.log(`Keyspace ${keyspace} ${add ? 'añadido a' : 'eliminado de'} usuario ${cedula}`);
      return true;
    } catch (error) {
      this.logger.error(`Error al actualizar keyspace para usuario: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtiene los keyspaces actuales de un usuario
   * @param cedula Cédula del usuario
   * @param token Token JWT del usuario
   * @returns Lista de keyspaces del usuario
   */
  async getUserKeyspaces(cedula: string, token: string): Promise<string[]> {
    try {
      const url = `${this.permissionsApiUrl}/keyspaces/user?cedula=${cedula}`;
      const response = await this.httpService.get(
        url,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      ).toPromise();
      
      // Verifica si la respuesta existe y tiene datos
      if (response && response.data) {
        return response.data.keyspaces || [];
      }
      
      return [];
    } catch (error) {
      this.logger.error(`Error al obtener keyspaces del usuario: ${error.message}`);
      return [];
    }
  }

  /**
   * Extrae la información del usuario a partir del token JWT
   * @param token Token JWT
   * @returns Datos del usuario (cédula)
   */
  decodeToken(token: string): { cedula: string } | null {
    try {
      // Dividir el token en sus 3 partes (header.payload.signature)
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decodificar la parte del payload (segunda parte)
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      
      if (!payload || !payload.sub) {
        return null;
      }
      
      return { cedula: payload.sub };
    } catch (error) {
      this.logger.error(`Error al decodificar token: ${error.message}`);
      return null;
    }
  }
}