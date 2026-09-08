module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo include automaticamente il plugin di react-native-worklets
    // (necessario a react-native-reanimated) quando il pacchetto è installato.
    presets: [['babel-preset-expo', { 'react-compiler': true }]],
  };
};
