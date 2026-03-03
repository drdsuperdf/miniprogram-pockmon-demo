// miniprogram/config.ts

/**
 * 获取当前小程序环境
 * @returns 'development' | 'testing' | 'production'
 */
const getEnv = (): 'development' | 'testing' | 'production' => {
  try {
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
    console.warn('获取环境信息失败，使用生产环境配置', error);
    return 'production';
  }
};

const currentEnv = getEnv();

const envConfig = {
  development: {
    API_BASE_URL: 'https://pokeapi.co/api/v2',
    DEBUG_MODE: true,
    CACHE_TTL: 2 * 60 * 1000, // 2分钟
  },
  testing: {
    API_BASE_URL: 'https://pokeapi.co/api/v2', // 可替换为测试地址
    DEBUG_MODE: true,
    CACHE_TTL: 5 * 60 * 1000,
  },
  production: {
    API_BASE_URL: 'https://pokeapi.co/api/v2',
    DEBUG_MODE: false,
    CACHE_TTL: 10 * 60 * 1000,
  },
};

export const CONFIG = {
  ...envConfig[currentEnv],
  ENV: currentEnv,
  PAGE_SIZE: 24,
  CACHE_SIZE: 50,
  REQUEST_TIMEOUT: 10000,
  MAX_RETRIES: 3,
  DEFAULT_POKEMON_IMAGE: '/images/default-pokemon.png',
};