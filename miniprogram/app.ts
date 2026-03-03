// miniprogram/app.ts
import { CONFIG } from './config';

App({
  onLaunch() {
    if (CONFIG.DEBUG_MODE) {
      console.log('当前环境:', CONFIG.ENV);
      wx.setEnableDebug({ enableDebug: true });
    }

    const hasLaunched = wx.getStorageSync('hasLaunched') as boolean;
    if (!hasLaunched) {
      wx.showModal({
        title: '欢迎',
        content: `欢迎使用宝可梦图鉴小程序！当前环境：${CONFIG.ENV}`,
        showCancel: false,
        success: () => {
          wx.setStorageSync('hasLaunched', true);
        },
      });
    }
  },
});