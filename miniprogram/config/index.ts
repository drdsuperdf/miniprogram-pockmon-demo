// config/index.ts

/**
 * 获取当前小程序环境
 * @returns 'development' | 'testing' | 'production'
 */
const getEnv = (): 'development' | 'testing' | 'production' => {
  try {
    // 获取小程序环境版本
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo.miniProgram.envVersion; // 'develop' | 'trial' | 'release'
    
    switch (envVersion) {
      case 'develop':
        return 'development';
      case 'trial':
        return 'testing';
      case 'release':
      default:
        return 'production';
    }
  } catch (error) {
    // 异常情况（如不支持该API）默认返回生产环境
    console.warn('获取环境信息失败，使用生产环境配置', error);
    return 'production';
  }
};

const currentEnv = getEnv();

// 各环境配置
const envConfig = {
  development: {
    API_BASE_URL: 'https://pokeapi.co/api/v2', // 开发环境可使用 mock 或实际 API
    DEBUG_MODE: true,
    CACHE_TTL: 2 * 60 * 1000, // 2分钟
  },
  testing: {
    API_BASE_URL: 'https://pokeapi.co/api/v2', // 测试环境可改用测试地址
    DEBUG_MODE: true,
    CACHE_TTL: 5 * 60 * 1000,
  },
  production: {
    API_BASE_URL: 'https://pokeapi.co/api/v2',
    DEBUG_MODE: false,
    CACHE_TTL: 10 * 60 * 1000,
  },
};

// 导出统一配置对象
export const CONFIG = {
  ...envConfig[currentEnv],
  ENV: currentEnv,
  PAGE_SIZE: 24,
  CACHE_SIZE: 50, // 缓存最大条目数
  REQUEST_TIMEOUT: 10000, // 10秒
  MAX_RETRIES: 3,
  DEFAULT_POKEMON_IMAGE: '/images/default-pokemon.png', // 备用图片路径
};