// app.ts
App({
  onLaunch() {
    const hasLaunched = wx.getStorageSync('hasLaunched') as boolean;
    if (!hasLaunched) {
      wx.showModal({
        title: '欢迎',
        content: '欢迎使用宝可梦图鉴小程序！',
        showCancel: false,
        success: () => {
          wx.setStorageSync('hasLaunched', true);
        },
      });
    }
  },
});