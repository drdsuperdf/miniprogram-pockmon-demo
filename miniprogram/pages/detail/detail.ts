// pages/detail/detail.ts
import { fetchPokemonDetail, Pokemon } from '../../utils/api';

Page({
  data: {
    pokemon: null as Pokemon | null,
    loading: true,
  },

  onLoad(options: Record<string, string | undefined>) {
    const name = options.name;
    if (name) {
      this.fetchDetail(name);
    } else {
      wx.showToast({ title: '未指定宝可梦', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  async fetchDetail(name: string) {
    this.setData({ loading: true });
    try {
      const pokemon = await fetchPokemonDetail(name);
      this.setData({ pokemon, loading: false });
    } catch (err) {
      wx.showToast({ title: '加载详情失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  goBack() {
    wx.navigateBack();
  },
});