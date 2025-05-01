// src/main.ts del microservicio de permisos
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Habilitar CORS para el frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4173'], // Puertos comunes de Vite en desarrollo
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Prefijo global para todas las rutas de la API
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3002;
  await app.listen(port);
  logger.log(`Permission Service corriendo en el puerto ${port}`);
}
bootstrap();