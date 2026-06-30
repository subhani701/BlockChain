// truffle-config.js
// For Step 5 we only need the COMPILER section so `truffle compile` works.
// In Step 6 we'll add a `networks` section to deploy to Ganache.
module.exports = {
  compilers: {
    solc: {
      version: "0.8.21", // any 0.8.x works; OpenZeppelin v5 needs >= 0.8.20
      settings: {
        optimizer: { enabled: true, runs: 200 }
      }
    }
  }
};
