import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS para permitir peticiones desde el frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4173'], // Puertos comunes de Vite
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Configuración global de pipes de validación
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Elimina propiedades no decoradas en DTOs
      transform: true, // Transforma parámetros a sus tipos apropiados
      forbidNonWhitelisted: true, // Rechaza propiedades no definidas en DTOs
    }),
  );
  
  // Prefijo global para todas las rutas de la API
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3000; // Puerto para el servicio de traducción
  await app.listen(port);
  logger.log(`Microservicio de traducción corriendo en el puerto ${port}`);
}

bootstrap();