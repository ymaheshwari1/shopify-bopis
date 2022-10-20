module.exports = {
  pluginOptions: {
    i18n: {
      locale: 'en',
      fallbackLocale: 'en',
      localeDir: 'locales',
      enableLegacy: true,
      runtimeOnly: true,
      compositionOnly: false,
      fullInstall: true,
      enableInSFC: true
    }
  },
  configureWebpack: {
    optimization: {
      splitChunks: false
    },
    output: {
      filename: 'js/script-bopis.min.js'
    }
  },
  css: {
    extract: false
  }
}
