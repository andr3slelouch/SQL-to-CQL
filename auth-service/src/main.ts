import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/htttp-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  
  // Configuración de CORS para permitir peticiones desde el frontend
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4173'], // Puertos comunes de Vite en desarrollo
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
  
  // Filtros de excepciones
  app.useGlobalFilters(
    new AllExceptionsFilter(),
    new HttpExceptionFilter(),
  );
  
  // Prefijo global para todas las rutas de la API
  app.setGlobalPrefix('api');
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  logger.log(`Aplicación corriendo en el puerto ${port}`);
}
bootstrap();