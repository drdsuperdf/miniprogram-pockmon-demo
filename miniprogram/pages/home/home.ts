// pages/home/home.ts
import {
  fetchPokemonCount,
  fetchTypes,
  fetchPokemonList,
  fetchPokemonByType,
  NamedAPIResource,
} from '../../utils/api';

const PAGE_SIZE = 24;

function extractPokemonId(url: string): string {
  const match = url.match(/\/(\d+)(?:\/|$|\?)/);
  return match ? match[1] : '0';
}

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
    filteredList: [] as (NamedAPIResource & { imageUrl: string })[],
    filterText: '',
    page: 1,
    totalPages: 1,
    loading: false,
    filterDebounceTimer: null as number | null,
    typesExpanded: true,
    isFiltering: false, // 是否正在过滤
  },

  onLoad() {
    this.fetchTotalAndTypes();
  },

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

      this.setData({
        pokemonList: enrichedList,
        totalPages,
        loading: false,
      }, () => {
        this.applyFilter();
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

  onFilterInput(e: WechatMiniprogram.Input) {
    const text = e.detail.value;
    this.setData({ filterText: text, isFiltering: true });

    if (this.data.filterDebounceTimer) {
      clearTimeout(this.data.filterDebounceTimer);
    }

    const timer = setTimeout(() => {
      this.applyFilter();
    }, 300) as unknown as number;

    this.setData({ filterDebounceTimer: timer });
  },

  applyFilter() {
    const { pokemonList, filterText } = this.data;
    if (!filterText.trim()) {
      this.setData({ filteredList: pokemonList, isFiltering: false });
      return;
    }
    const lowerText = filterText.toLowerCase();
    const filtered = pokemonList.filter(item =>
      item.name.toLowerCase().includes(lowerText)
    );
    this.setData({ filteredList: filtered, isFiltering: false });
  },

  toggleTypes() {
    this.setData({ typesExpanded: !this.data.typesExpanded });
  },

  onSelectType(e: WechatMiniprogram.TouchEvent) {
    const type = e.currentTarget.dataset.type as string;
    const selectedType = this.data.selectedType === type ? null : type;
    this.setData({ selectedType, page: 1, filterText: '' });
    this.fetchListByCurrentMode(1);
  },

  onClearType() {
    this.setData({ selectedType: null, page: 1, filterText: '' });
    this.fetchListByCurrentMode(1);
  },

  onPageChange(e: WechatMiniprogram.TouchEvent) {
    const newPage = e.currentTarget.dataset.page as number;
    if (newPage >= 1 && newPage <= this.data.totalPages) {
      this.setData({ filterText: '' });
      this.fetchListByCurrentMode(newPage);
    }
  },

  goToDetail(e: WechatMiniprogram.TouchEvent) {
    const name = e.currentTarget.dataset.name as string;
    wx.navigateTo({ url: `/pages/detail/detail?name=${name}` });
  },

  onImageError(e: WechatMiniprogram.TouchEvent) {
    console.warn('Image load error', e);
  },
});