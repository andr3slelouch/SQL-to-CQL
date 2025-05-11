// src/utils/PerformanceLogger.ts

/**
 * Utilidad simple para registrar eventos en la consola
 */
class PerformanceLogger {
  private static timers: Record<string, number> = {};
  private static enabled: boolean = true;
  
  /**
   * Habilita o deshabilita el registro de rendimiento
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    console.log(`PerformanceLogger ${enabled ? 'habilitado' : 'deshabilitado'}`);
  }

  /**
   * Inicia un temporizador con el nombre especificado
   */
  static startTimer(name: string): void {
    if (!this.enabled) return;
    
    this.timers[name] = performance.now();
    console.log(`⏱️ INICIO: ${name}`);
  }

  /**
   * Finaliza un temporizador y registra el tiempo transcurrido
   */
  static endTimer(name: string): number {
    if (!this.enabled || !this.timers[name]) return 0;
    
    const endTime = performance.now();
    const startTime = this.timers[name];
    const duration = endTime - startTime;
    
    console.log(`⏱️ FIN: ${name} - Duración: ${duration.toFixed(2)}ms`);
    
    // Marcar visualmente tiempos lentos
    if (duration > 300) {
      console.warn(`⚠️ OPERACIÓN LENTA: ${name} tomó ${duration.toFixed(2)}ms`);
    }
    
    delete this.timers[name]; // Limpiar el timer para evitar fugas de memoria
    return duration;
  }

  /**
   * Registra un evento con datos opcionales
   */
  static logEvent(message: string, data?: any): void {
    if (!this.enabled) return;
    
    if (data) {
      console.log(`📝 ${message}`, data);
    } else {
      console.log(`📝 ${message}`);
    }
  }
}

export default PerformanceLogger;