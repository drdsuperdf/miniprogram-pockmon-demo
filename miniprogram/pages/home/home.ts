// pages/home/home.ts
import {
  fetchPokemonCount,
  fetchTypes,
  fetchPokemonList,
  fetchPokemonByType,
  NamedAPIResource,
} from '../../utils/api';

const PAGE_SIZE = 24;

// 辅助函数：从 PokeAPI 的宝可梦 URL 中提取数字 ID
function extractPokemonId(url: string): string {
  // 正则匹配 URL 末尾的数字（支持 /25/、/25、/25?param= 等情况）
  const match = url.match(/\/(\d+)(?:\/|$|\?)/);
  return match ? match[1] : '0'; // 如果没找到返回 '0'（可自定义默认值）
}

// 辅助函数：生成 GitHub 官方精灵图 URL
function getPokemonImageUrl(pokemonUrl: string): string {
  const id = extractPokemonId(pokemonUrl);
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

Page({
  data: {
    total: 0,
    types: [] as NamedAPIResource[],
    selectedType: null as string | null,
    pokemonList: [] as (NamedAPIResource & { imageUrl: string })[],
    page: 1,
    totalPages: 1,
    loading: false,
  },

  onLoad() {
    this.fetchTotalAndTypes();
  },

  // 获取总数和类型列表
  async fetchTotalAndTypes() {
    this.setData({ loading: true });
    try {
      const [total, types] = await Promise.all([
        fetchPokemonCount(),
        fetchTypes(),
      ]);
      this.setData({ total, types, loading: false });
      this.fetchListByCurrentMode(1);
    } catch (err) {
      console.error('fetchTotalAndTypes error:', err);
      let message = '加载失败';
      if (err && typeof err === 'object') {
        if ((err as any).type === 'HTTP_ERROR') {
          message = `服务器错误 (${(err as any).status || '未知'})`;
        } else if ((err as any).type === 'NETWORK_ERROR') {
          message = '网络连接异常';
        }
      }
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 根据当前模式（有无类型筛选）获取列表
  async fetchListByCurrentMode(page: number) {
    this.setData({ loading: true, page });
    const offset = (page - 1) * PAGE_SIZE;

    try {
      let list: NamedAPIResource[] = [];
      let totalItems = 0;

      if (this.data.selectedType) {
        const all = await fetchPokemonByType(this.data.selectedType);
        totalItems = all.length;
        list = all.slice(offset, offset + PAGE_SIZE);
      } else {
        list = await fetchPokemonList(offset, PAGE_SIZE);
        totalItems = this.data.total;
      }

      // 为每个项添加 imageUrl 字段
      const enrichedList = list.map(item => ({
        ...item,
        imageUrl: getPokemonImageUrl(item.url),
      }));

      const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

      this.setData({
        pokemonList: enrichedList,
        totalPages,
        loading: false,
      });
    } catch (err) {
      console.error('fetchListByCurrentMode error:', err);
      let message = '获取列表失败';
      if (err && typeof err === 'object') {
        if ((err as any).type === 'HTTP_ERROR') {
          message = `服务器错误 (${(err as any).status || '未知'})`;
        } else if ((err as any).type === 'NETWORK_ERROR') {
          message = '网络连接异常';
        }
      }
      wx.showToast({ title: message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 选择类型
  onSelectType(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as string;
    const selectedType = this.data.selectedType === type ? null : type;
    this.setData({ selectedType, page: 1 });
    this.fetchListByCurrentMode(1);
  },

  // 清除类型筛选
  onClearType() {
    this.setData({ selectedType: null, page: 1 });
    this.fetchListByCurrentMode(1);
  },

  // 改变页码
  onPageChange(e: WechatMiniprogram.TouchEvent) {
    const newPage = e.currentTarget.dataset.page as number;
    if (newPage >= 1 && newPage <= this.data.totalPages) {
      this.fetchListByCurrentMode(newPage);
    }
  },

  // 跳转到详情页
  goToDetail(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    wx.navigateTo({ url: `/pages/detail/detail?name=${name}` });
  },

  // 可选：图片加载失败时的回调
  onImageError(e: WechatMiniprogram.TouchEvent) {
    console.warn('Image load error', e);
    // 可以在这里实现更精细的替换逻辑，例如使用默认占位图
  },
});