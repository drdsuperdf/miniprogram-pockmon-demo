// utils/api.ts
import { CONFIG } from '../config';
import {
  NamedAPIResource,
  PokemonListResponse,
  PokemonTypeResponse,
  Pokemon,
} from '../types/pokemon';
import { PerformanceMonitor } from './performance';

const BASE_URL = CONFIG.API_BASE_URL;

// ========== 缓存 ==========
interface CacheItem<T = any> {
  promise: Promise<T>;
  expire: number;
}
const cache = new Map<string, CacheItem>();

// ========== 请求函数 ==========
/**
 * 封装 wx.request，支持超时、自动重试和内存缓存
 * @param url 请求地址
 * @param options 配置项：timeout, retries, cacheTTL
 */
function request<T>(
  url: string,
  options?: { timeout?: number; retries?: number; cacheTTL?: number }
): Promise<T> {
  const { timeout = CONFIG.REQUEST_TIMEOUT, retries = CONFIG.MAX_RETRIES, cacheTTL = CONFIG.CACHE_TTL } = options || {};
  const cacheKey = url;

  // 检查缓存
  if (cacheTTL > 0) {
    const cached = cache.get(cacheKey) as CacheItem<T> | undefined;
    if (cached && cached.expire > Date.now()) {
      return cached.promise;
    }
    if (cached) cache.delete(cacheKey);
  }

  const performRequest = (remainingRetries: number): Promise<T> => {
    return new Promise((resolve, reject) => {
      wx.request({
        url,
        method: 'GET',
        timeout,
        success(res) {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(res.data as T);
          } else {
            // 服务器错误（5xx）且还有重试次数时进行重试
            if (res.statusCode >= 500 && remainingRetries > 0) {
              console.warn(`服务器错误 ${res.statusCode}，剩余重试次数 ${remainingRetries - 1}，延迟 ${(CONFIG.MAX_RETRIES - remainingRetries + 1) * 1000}ms 后重试`);
              setTimeout(() => {
                performRequest(remainingRetries - 1).then(resolve).catch(reject);
              }, (CONFIG.MAX_RETRIES - remainingRetries + 1) * 1000);
            } else {
              reject({
                type: 'HTTP_ERROR',
                status: res.statusCode,
                data: res.data,
                message: `请求失败 (${res.statusCode})`,
              });
            }
          }
        },
        fail(err) {
          // 网络错误（含超时）进行重试
          if (remainingRetries > 0) {
            console.warn(`网络错误，剩余重试次数 ${remainingRetries - 1}，延迟 ${(CONFIG.MAX_RETRIES - remainingRetries + 1) * 1000}ms 后重试`, err);
            setTimeout(() => {
              performRequest(remainingRetries - 1).then(resolve).catch(reject);
            }, (CONFIG.MAX_RETRIES - remainingRetries + 1) * 1000);
          } else {
            reject({
              type: 'NETWORK_ERROR',
              err,
              message: '网络错误，请检查连接',
            });
          }
        },
      });
    });
  };

  const requestPromise = performRequest(retries);

  if (cacheTTL > 0) {
    cache.set(cacheKey, {
      promise: requestPromise,
      expire: Date.now() + cacheTTL,
    });
    // 请求失败时自动清除缓存
    requestPromise.catch(() => {
      const current = cache.get(cacheKey);
      if (current && current.promise === requestPromise) {
        cache.delete(cacheKey);
      }
    });
  }

  return requestPromise;
}

// ========== API 函数 ==========
/**
 * 获取宝可梦总数
 */
export function fetchPokemonCount(options?: { timeout?: number; retries?: number; cacheTTL?: number }): Promise<number> {
  const perfName = 'fetchPokemonCount';
  PerformanceMonitor.start(perfName);
  return request<PokemonListResponse>(`${BASE_URL}/pokemon?limit=0`, options)
    .then(data => {
      PerformanceMonitor.end(perfName);
      return data.count;
    })
    .catch(err => {
      PerformanceMonitor.end(perfName);
      console.warn('fetchPokemonCount failed:', err);
      throw err;
    });
}

/**
 * 获取所有宝可梦类型
 */
export function fetchTypes(options?: { timeout?: number; retries?: number; cacheTTL?: number }): Promise<NamedAPIResource[]> {
  const perfName = 'fetchTypes';
  PerformanceMonitor.start(perfName);
  return request<{ results: NamedAPIResource[] }>(`${BASE_URL}/type`, options)
    .then(data => {
      PerformanceMonitor.end(perfName);
      return data.results;
    })
    .catch(err => {
      PerformanceMonitor.end(perfName);
      console.warn('fetchTypes failed:', err);
      throw err;
    });
}

/**
 * 获取分页宝可梦列表（默认模式）
 */
export function fetchPokemonList(
  offset: number,
  limit: number,
  options?: { timeout?: number; retries?: number; cacheTTL?: number }
): Promise<NamedAPIResource[]> {
  const perfName = `fetchPokemonList_${offset}_${limit}`;
  PerformanceMonitor.start(perfName);
  return request<PokemonListResponse>(`${BASE_URL}/pokemon?offset=${offset}&limit=${limit}`, options)
    .then(data => {
      PerformanceMonitor.end(perfName);
      return data.results;
    })
    .catch(err => {
      PerformanceMonitor.end(perfName);
      console.warn('fetchPokemonList failed:', err);
      throw err;
    });
}

/**
 * 获取指定类型的宝可梦列表（返回所有，前端分页）
 */
export function fetchPokemonByType(
  typeName: string,
  options?: { timeout?: number; retries?: number; cacheTTL?: number }
): Promise<NamedAPIResource[]> {
  const perfName = `fetchPokemonByType_${typeName}`;
  PerformanceMonitor.start(perfName);
  return request<PokemonTypeResponse>(`${BASE_URL}/type/${typeName}`, options)
    .then(data => {
      PerformanceMonitor.end(perfName);
      return data.pokemon.map(p => p.pokemon);
    })
    .catch(err => {
      PerformanceMonitor.end(perfName);
      console.warn('fetchPokemonByType failed:', err);
      throw err;
    });
}

/**
 * 获取单个宝可梦详情
 */
export function fetchPokemonDetail(
  name: string,
  options?: { timeout?: number; retries?: number; cacheTTL?: number }
): Promise<Pokemon> {
  const perfName = `fetchPokemonDetail_${name}`;
  PerformanceMonitor.start(perfName);
  return request<Pokemon>(`${BASE_URL}/pokemon/${name}`, options)
    .catch(err => {
      PerformanceMonitor.end(perfName);
      console.warn('fetchPokemonDetail failed:', err);
      throw err;
    });
}