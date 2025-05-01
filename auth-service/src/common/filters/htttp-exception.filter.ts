import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: exceptionResponse['message'] || exception.message || 'Error interno del servidor',
    };

    // Registrar error en el log
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      JSON.stringify(errorResponse),
      exception.stack,
    );

    // Respuesta al cliente
    response.status(status).json(errorResponse);
  }
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status = 
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    
    // Para errores de Cassandra, personalizar el mensaje
    let message = 'Error interno del servidor';
    if (exception.name === 'Error' && exception.message.includes('Cassandra')) {
      message = 'Error de conexión con la base de datos';
    } else if (exception.message) {
      message = exception.message;
    }
    
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
    };

    // Registrar error en el log
    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      JSON.stringify(errorResponse),
      exception.stack,
    );

    // Respuesta al cliente
    response.status(status).json(errorResponse);
  }
}