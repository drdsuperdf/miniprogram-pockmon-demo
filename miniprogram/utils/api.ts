// utils/api.ts
const BASE_URL = 'https://pokeapi.co/api/v2';

// ========== 类型定义 ==========
export interface NamedAPIResource {
  name: string;
  url: string;
}

export interface PokemonListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedAPIResource[];
}

export interface PokemonTypeResponse {
  pokemon: {
    pokemon: NamedAPIResource;
    slot: number;
  }[];
}

export interface PokemonSprites {
  front_default: string;
}

export interface PokemonAbility {
  ability: NamedAPIResource;
  is_hidden: boolean;
  slot: number;
}

export interface Pokemon {
  id: number;
  name: string;
  sprites: PokemonSprites;
  abilities: PokemonAbility[];
}

// ========== 改进的请求函数 ==========
/**
 * 封装 wx.request，正确处理 HTTP 状态码，返回 Promise
 * 只有状态码 2xx 才会 resolve，否则 reject 并携带错误信息
 */
function request<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: 'GET',
      success(res) {
        // 关键修复：检查 HTTP 状态码是否表示成功
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          // 非成功状态码，拒绝并传递详细信息
          console.error(`API error (${res.statusCode}):`, res.data);
          reject({
            type: 'HTTP_ERROR',
            status: res.statusCode,
            data: res.data,
            message: `请求失败 (${res.statusCode})`
          });
        }
      },
      fail(err) {
        // 网络错误（如断网、DNS解析失败）
        console.error('Network error:', err);
        reject({
          type: 'NETWORK_ERROR',
          err,
          message: '网络错误，请检查连接'
        });
      }
    });
  });
}

// ========== 导出 API 函数 ==========
export function fetchPokemonCount(): Promise<number> {
  return request<PokemonListResponse>(`${BASE_URL}/pokemon?limit=0`)
    .then(data => data.count)
    .catch(err => {
      // 可以在这里统一记录日志，然后继续抛出
      console.warn('fetchPokemonCount failed:', err);
      throw err; // 让调用方处理
    });
}

export function fetchTypes(): Promise<NamedAPIResource[]> {
  return request<{ results: NamedAPIResource[] }>(`${BASE_URL}/type`)
    .then(data => data.results)
    .catch(err => {
      console.warn('fetchTypes failed:', err);
      throw err;
    });
}

export function fetchPokemonList(offset: number, limit: number): Promise<NamedAPIResource[]> {
  return request<PokemonListResponse>(`${BASE_URL}/pokemon?offset=${offset}&limit=${limit}`)
    .then(data => data.results)
    .catch(err => {
      console.warn('fetchPokemonList failed:', err);
      throw err;
    });
}

export function fetchPokemonByType(typeName: string): Promise<NamedAPIResource[]> {
  return request<PokemonTypeResponse>(`${BASE_URL}/type/${typeName}`)
    .then(data => data.pokemon.map(p => p.pokemon))
    .catch(err => {
      console.warn('fetchPokemonByType failed:', err);
      throw err;
    });
}

export function fetchPokemonDetail(name: string): Promise<Pokemon> {
  return request<Pokemon>(`${BASE_URL}/pokemon/${name}`)
    .catch(err => {
      console.warn('fetchPokemonDetail failed:', err);
      throw err;
    });
}