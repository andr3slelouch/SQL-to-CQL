// src/utils/PerformanceLogger.ts

/**
 * Utilidad simple para registrar tiempos de ejecución y eventos en la aplicación
 */
class PerformanceLogger {
    private timers: Record<string, number> = {};
    private enabled: boolean = true;
  
    /**
     * Habilita o deshabilita el registro de rendimiento
     */
    setEnabled(enabled: boolean): void {
      this.enabled = enabled;
    }
  
    /**
     * Inicia un temporizador con el nombre especificado
     */
    startTimer(name: string): void {
      if (!this.enabled) return;
      
      this.timers[name] = performance.now();
      console.log(`⏱️ INICIO: ${name} a las ${new Date().toISOString()}`);
    }
  
    /**
     * Finaliza un temporizador y registra el tiempo transcurrido
     */
    endTimer(name: string): number {
      if (!this.enabled || !this.timers[name]) return 0;
      
      const endTime = performance.now();
      const startTime = this.timers[name];
      const duration = endTime - startTime;
      
      console.log(`⏱️ FIN: ${name} - Duración: ${duration.toFixed(2)}ms`);
      
      // Marcar visualmente tiempos lentos
      if (duration > 1000) {
        console.warn(`⚠️ OPERACIÓN LENTA: ${name} tomó ${duration.toFixed(2)}ms`);
      }
      
      delete this.timers[name]; // Limpiar el timer para evitar fugas de memoria
      return duration;
    }
  
    /**
     * Registra un evento con datos opcionales
     */
    logEvent(message: string, data?: any): void {
      if (!this.enabled) return;
      
      const timestamp = new Date().toISOString();
      
      if (data) {
        console.log(`📝 [${timestamp}] ${message}`, data);
      } else {
        console.log(`📝 [${timestamp}] ${message}`);
      }
    }
  
    /**
     * Registra un punto de control con el tiempo transcurrido desde el inicio de la aplicación
     */
    checkpoint(name: string): void {
      if (!this.enabled) return;
      
      const timeFromPageLoad = performance.now();
      console.log(`🚩 CHECKPOINT: ${name} - ${timeFromPageLoad.toFixed(2)}ms desde carga de página`);
    }
  }
  
  // Exportamos una instancia única
  export default new PerformanceLogger();