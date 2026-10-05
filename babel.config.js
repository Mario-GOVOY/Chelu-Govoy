module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo ya añade el plugin de Reanimated/Worklets; no hay que ponerlo aquí.
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
  };
};
