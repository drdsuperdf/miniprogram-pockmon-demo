// utils/performance.ts
import { CONFIG } from '../config';

interface PerformanceMetric {
  name: string;
  startTime: number;
  duration?: number;
}

export class PerformanceMonitor {
  private static metrics: Map<string, PerformanceMetric> = new Map();

  /**
   * 开始记录一个性能指标
   */
  static start(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: Date.now(),
    });
  }

  /**
   * 结束记录，返回耗时（毫秒）
   */
  static end(name: string): number {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`性能监控：未找到名为 "${name}" 的开始记录`);
      return 0;
    }

    const duration = Date.now() - metric.startTime;
    metric.duration = duration;

    if (CONFIG.DEBUG_MODE) {
      console.log(`性能监控 [${name}]: ${duration}ms`);
    }

    // 生产环境可上报分析服务
    if (CONFIG.ENV === 'production') {
      wx.reportAnalytics?.('api_performance', {
        name,
        duration,
        timestamp: Date.now(),
      });
    }

    return duration;
  }

  /**
   * 清理所有记录
   */
  static clear(): void {
    this.metrics.clear();
  }
}