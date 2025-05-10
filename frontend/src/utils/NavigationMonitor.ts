// src/utils/NavigationMonitor.ts
import PerformanceLogger from './PerformanceLogger';

/**
 * Clase que proporciona funciones de monitoreo unificadas para navegación
 */
class NavigationMonitor {
  private isMonitoring: boolean = false;
  private lastNavigationTime: number | null = null;
  private lastNavigationInfo: any = null;
  private frameCheckerId: number | null = null;
  private redirectHistory: Array<{from: string, to: string, time: number}> = [];
  
  /**
   * Inicia el monitoreo de navegación
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    PerformanceLogger.logEvent('🔍 Monitor de navegación iniciado');
    
    // Monitor de bloqueo del hilo principal
    this.startThreadBlockingMonitor();
    
    // Observar eventos de navegación del historial
    this.observeHistoryEvents();
  }
  
  /**
   * Detiene el monitoreo de navegación
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    if (this.frameCheckerId !== null) {
      cancelAnimationFrame(this.frameCheckerId);
      this.frameCheckerId = null;
    }
    
    PerformanceLogger.logEvent('🔍 Monitor de navegación detenido');
  }
  
  /**
   * Registra una intención de navegación
   * @param from Ruta de origen
   * @param to Ruta de destino
   * @param reason Motivo de la navegación
   */
  logNavigationIntent(from: string, to: string, reason: string): void {
    const timestamp = new Date().toISOString();
    const timeMs = performance.now();
    
    this.lastNavigationTime = timeMs;
    this.lastNavigationInfo = { from, to, reason, timestamp, timeMs };
    
    // Guardar en sesión para acceder desde el componente destino
    sessionStorage.setItem('lastNavigation', JSON.stringify({
      from,
      to,
      reason,
      timestamp,
      timeMs
    }));
    
    PerformanceLogger.logEvent('🚀 NAVEGACIÓN INICIADA', {
      from,
      to,
      reason,
      timestamp
    });
    
    // Registrar en historial de redirecciones
    this.redirectHistory.push({from, to, time: timeMs});
    if (this.redirectHistory.length > 10) {
      this.redirectHistory.shift();
    }
    
    // Verificar si hay un patrón de redirección circular
    this.checkForRedirectionLoop();
  }
  
  /**
   * Registra cuando un componente se monta (página de destino)
   * @param componentName Nombre del componente
   * @param path Ruta actual
   */
  logComponentMount(componentName: string, path: string): void {
    const mountTime = performance.now();
    const lastNavInfo = sessionStorage.getItem('lastNavigation');
    
    PerformanceLogger.logEvent(`📦 Componente ${componentName} montado en ${path}`);
    
    if (lastNavInfo) {
      try {
        const navInfo = JSON.parse(lastNavInfo);
        const navigationDuration = mountTime - navInfo.timeMs;
        
        PerformanceLogger.logEvent(`⏱️ Tiempo de navegación a ${componentName}`, {
          from: navInfo.from,
          to: navInfo.to,
          reason: navInfo.reason,
          durationMs: navigationDuration.toFixed(2)
        });
        
        if (navigationDuration > 1000) {
          PerformanceLogger.logEvent(`⚠️ NAVEGACIÓN LENTA a ${componentName}`, {
            durationMs: navigationDuration.toFixed(2),
            threshold: '1000ms'
          });
        }
        
        // Limpiar después de usar
        sessionStorage.removeItem('lastNavigation');
      } catch (error) {
        console.error('Error procesando información de navegación:', error);
      }
    }
  }
  
  /**
   * Inicia un monitor para detectar bloqueos del hilo principal
   */
  private startThreadBlockingMonitor(): void {
    let lastFrameTime = performance.now();
    
    const checkFrame = () => {
      const currentTime = performance.now();
      const timeSinceLastFrame = currentTime - lastFrameTime;
      
      // Si el tiempo entre frames es mayor a 100ms, hay un bloqueo
      if (timeSinceLastFrame > 100) {
        PerformanceLogger.logEvent('⚠️ BLOQUEO DEL HILO PRINCIPAL detectado', {
          durationMs: timeSinceLastFrame.toFixed(2),
          location: window.location.pathname,
          timestamp: new Date().toISOString()
        });
      }
      
      lastFrameTime = currentTime;
      
      if (this.isMonitoring) {
        this.frameCheckerId = requestAnimationFrame(checkFrame);
      }
    };
    
    this.frameCheckerId = requestAnimationFrame(checkFrame);
  }
  
  /**
   * Observa eventos de historial del navegador
   */
  private observeHistoryEvents(): void {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    // Envolver pushState
    history.pushState = (...args) => {
      PerformanceLogger.logEvent('📌 history.pushState llamado', {
        args,
        timestamp: new Date().toISOString()
      });
      return originalPushState.apply(history, args);
    };
    
    // Envolver replaceState
    history.replaceState = (...args) => {
      PerformanceLogger.logEvent('🔄 history.replaceState llamado', {
        args,
        timestamp: new Date().toISOString()
      });
      return originalReplaceState.apply(history, args);
    };
    
    // Observar evento popstate
    window.addEventListener('popstate', () => {
      PerformanceLogger.logEvent('⬅️ Evento popstate detectado', {
        pathname: window.location.pathname,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  /**
   * Verifica si hay un patrón de redirección en bucle
   */
  private checkForRedirectionLoop(): void {
    if (this.redirectHistory.length < 4) return;
    
    // Verificar redirecciones recientes
    const recent = this.redirectHistory.slice(-4);
    
    // Buscar patrón A->B->A->B
    if (recent[0].from === recent[2].from && 
        recent[0].to === recent[2].to &&
        recent[1].from === recent[3].from && 
        recent[1].to === recent[3].to) {
      
      PerformanceLogger.logEvent('⚠️ PATRÓN DE REDIRECCIÓN CIRCULAR DETECTADO', {
        pattern: `${recent[0].from} → ${recent[0].to} → ${recent[1].from} → ${recent[1].to}`,
        timespan: `${(recent[3].time - recent[0].time).toFixed(2)}ms`
      });
    }
    
    // Verificar velocidad de redirecciones
    const recentThree = this.redirectHistory.slice(-3);
    if (recentThree.length === 3) {
      const timeSpan = recentThree[2].time - recentThree[0].time;
      if (timeSpan < 1000) {
        PerformanceLogger.logEvent('⚠️ REDIRECCIONES RÁPIDAS DETECTADAS', {
          redirections: `${recentThree[0].from} → ${recentThree[0].to} → ${recentThree[1].to} → ${recentThree[2].to}`,
          timeSpanMs: timeSpan.toFixed(2)
        });
      }
    }
  }
  
  /**
   * Registra el rendimiento de carga de la página
   */
  logPageLoadPerformance(): void {
    if (window.performance && window.performance.timing) {
      // Usar setTimeout para asegurar que las métricas estén disponibles
      setTimeout(() => {
        const timing = window.performance.timing;
        const navigationStart = timing.navigationStart;
        
        const metrics = {
          total: timing.loadEventEnd - navigationStart,
          networkLatency: timing.responseEnd - timing.fetchStart,
          domProcessing: timing.domComplete - timing.domLoading,
          renderTime: timing.domComplete - timing.domContentLoadedEventStart
        };
        
        PerformanceLogger.logEvent('📊 Métricas de carga de página', metrics);
        
        // Si alguna métrica es excesiva, registrarlo
        if (metrics.total > 5000) {
          PerformanceLogger.logEvent('⚠️ Tiempo de carga total excesivo', {
            totalMs: metrics.total,
            threshold: '5000ms'
          });
        }
        
        if (metrics.domProcessing > 2000) {
          PerformanceLogger.logEvent('⚠️ Procesamiento DOM excesivo', {
            domProcessingMs: metrics.domProcessing,
            threshold: '2000ms'
          });
        }
      }, 0);
    }
  }
}

// Exportar una instancia única
const navigationMonitor = new NavigationMonitor();
export default navigationMonitor;