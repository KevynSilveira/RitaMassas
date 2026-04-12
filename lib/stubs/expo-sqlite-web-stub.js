/** Substituído na web pelo Metro — evita carregar wa-sqlite.wasm ausente no pacote npm. */
module.exports = {
  openDatabaseAsync: async () => {
    throw new Error(
      'expo-sqlite não é usado na web; use sql.js (openAppDatabase).'
    );
  },
};
