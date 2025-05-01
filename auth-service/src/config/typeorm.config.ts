import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * Configuración para utilizar Cassandra con TypeORM
 * Nota: TypeORM tiene soporte limitado para Cassandra
 */
export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  return {
    type: 'cockroachdb', // Usamos cockroachdb como tipo compatible
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get<number>('DB_PORT', 9042),
    username: configService.get('DB_USERNAME', ''),
    password: configService.get('DB_PASSWORD', ''),
    database: configService.get('DB_KEYSPACE', 'my_keyspace'),
    entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
    synchronize: false, // No crear tablas automáticamente
    ssl: configService.get('DB_SSL') === 'true',
    extra: {
      // Configuraciones específicas para Cassandra
      contactPoints: [configService.get('DB_HOST', 'localhost')],
      localDataCenter: configService.get('DB_DATA_CENTER', 'datacenter1'),
      keyspace: configService.get('DB_KEYSPACE', 'my_keyspace')
    }
  };
};