// pages/home/home.ts
import {
  fetchPokemonCount,
  fetchTypes,
  fetchPokemonList,
  fetchPokemonByType,
  
} from '../../utils/api';
import { NamedAPIResource } from "../../types/pokemon";
import { PerformanceMonitor } from '../../utils/performance';
import { CONFIG } from '../../config';

const PAGE_SIZE = CONFIG.PAGE_SIZE;

/**
 * 从宝可梦 URL 中提取 ID
 * @param url 宝可梦详情 URL
 * @returns 宝可梦 ID 字符串
 */
function extractPokemonId(url: string): string {
  const match = url.match(/\/(\d+)(?:\/|$|\?)/);
  return match ? match[1] : '0';
}

/**
 * 根据宝可梦 URL 生成图片 URL
 * @param pokemonUrl 宝可梦详情 URL
 * @returns 图片 URL
 */
function getPokemonImageUrl(pokemonUrl: string): string {
  try {
    const id = extractPokemonId(pokemonUrl);
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  } catch (error) {
    console.error('Error generating image URL:', error);
    return CONFIG.DEFAULT_POKEMON_IMAGE;
  }
}

Page({
  data: {
    total: 0,
    types: [] as NamedAPIResource[],
    selectedType: null as string | null,
    pokemonList: [] as (NamedAPIResource & { imageUrl: string })[],
    filteredList: [] as (NamedAPIResource & { imageUrl: string })[],
    filterText: '',
    page: 1,
    totalPages: 1,
    loading: false,
    filterDebounceTimer: null as number | null,
    typesExpanded: true,
    isFiltering: false,
  },

  onLoad() {
    PerformanceMonitor.start('page_load');
    this.fetchTotalAndTypes();
  },

  /**
   * 获取总数和类型列表
   */
  async fetchTotalAndTypes() {
    this.setData({ loading: true });
    PerformanceMonitor.start('fetch_total_and_types');
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
    } finally {
      PerformanceMonitor.end('fetch_total_and_types');
      PerformanceMonitor.end('page_load');
    }
  },

  /**
   * 根据当前模式（有无类型筛选）获取列表
   */
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

      const enrichedList = list.map(item => ({
        ...item,
        imageUrl: getPokemonImageUrl(item.url),
      }));

      const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;

      this.setData(
        {
          pokemonList: enrichedList,
          totalPages,
          loading: false,
        },
        () => {
          this.applyFilter();
        }
      );
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

  /**
   * 输入过滤文本（带验证和防抖）
   */
  onFilterInput(e: WechatMiniprogram.Input) {
    let text = e.detail.value;

    // 输入长度限制
    if (text.length > 50) {
      wx.showToast({
        title: '输入过长，最多 50 个字符',
        icon: 'none',
        duration: 1000,
      });
      return;
    }

    // 特殊字符过滤（禁止可能用于注入的字符）
    const invalidChars = /[<>"'%;()&+]/;
    if (invalidChars.test(text)) {
      wx.showToast({
        title: '输入包含非法字符',
        icon: 'none',
        duration: 1000,
      });
      return;
    }

    this.setData({ filterText: text, isFiltering: true });

    if (this.data.filterDebounceTimer) {
      clearTimeout(this.data.filterDebounceTimer);
    }

    const timer = setTimeout(() => {
      this.applyFilter();
    }, 300) as unknown as number;

    this.setData({ filterDebounceTimer: timer });
  },

  /**
   * 对当前 pokemonList 进行过滤
   */
  applyFilter() {
    const { pokemonList, filterText } = this.data;
    if (!filterText.trim()) {
      this.setData({ filteredList: pokemonList, isFiltering: false });
      return;
    }
    const lowerText = filterText.toLowerCase();
    const filtered = pokemonList.filter(item => item.name.toLowerCase().includes(lowerText));
    this.setData({ filteredList: filtered, isFiltering: false });
  },

  /**
   * 折叠/展开类型列表
   */
  toggleTypes() {
    this.setData({ typesExpanded: !this.data.typesExpanded });
  },

  /**
   * 选择类型
   */
  onSelectType(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as string;
    const selectedType = this.data.selectedType === type ? null : type;
    this.setData({ selectedType, page: 1, filterText: '' });
    this.fetchListByCurrentMode(1);
  },

  /**
   * 清除类型筛选
   */
  onClearType() {
    this.setData({ selectedType: null, page: 1, filterText: '' });
    this.fetchListByCurrentMode(1);
  },

  /**
   * 翻页
   */
  onPageChange(e: WechatMiniprogram.TouchEvent) {
    const newPage = e.currentTarget.dataset.page as number;
    if (newPage >= 1 && newPage <= this.data.totalPages) {
      this.setData({ filterText: '' });
      this.fetchListByCurrentMode(newPage);
    }
  },

  /**
   * 跳转到详情页
   */
  goToDetail(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    wx.navigateTo({ url: `/pages/detail/detail?name=${name}` });
  },

  /**
   * 图片加载失败时替换为默认图片
   */
  onImageError(e: WechatMiniprogram.TouchEvent) {
    const { default: defaultUrl, index } = e.currentTarget.dataset;
    const { pokemonList, filteredList } = this.data;

    // 更新 pokemonList 中的对应项
    if (index !== undefined && pokemonList[index]) {
      const updatedList = [...pokemonList];
      updatedList[index].imageUrl = defaultUrl;
      this.setData({ pokemonList: updatedList }, () => {
        // 重新过滤以更新 filteredList
        this.applyFilter();
      });
    } else {
      console.warn('Image load error but cannot update:', e);
    }
  },
});