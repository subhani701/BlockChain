/**
 * truffle-config.js
 * -----------------------------------------------------------------------------
 * Central configuration for the Truffle development framework.
 *
 * Truffle reads this file to learn:
 *   1. Which Ethereum networks it can talk to (host / port / network id).
 *   2. Which Solidity compiler version + settings to use.
 *   3. Where to put compiled artifacts (build/contracts/*.json).
 *
 * We target a LOCAL Ganache instance. Ganache is a personal Ethereum
 * blockchain that runs entirely on your machine — it gives you 10 funded
 * accounts and mines transactions instantly, which is perfect for a PoC.
 *
 * Ganache GUI default RPC port  : 7545
 * Ganache CLI default RPC port  : 8545
 *
 * Change `port` below to match whichever Ganache you run. By default we use
 * 7545 (the GUI), and allow an override via the GANACHE_PORT env var.
 * -----------------------------------------------------------------------------
 */

const GANACHE_HOST = process.env.GANACHE_HOST || "127.0.0.1";
const GANACHE_PORT = process.env.GANACHE_PORT || 7545;

module.exports = {
  /**
   * `networks` defines how Truffle connects to a blockchain.
   * The key ("ganache") is the name you pass with `--network ganache`.
   */
  networks: {
    ganache: {
      host: GANACHE_HOST, // Where Ganache is listening.
      port: GANACHE_PORT, // RPC port (7545 GUI / 8545 CLI).
      network_id: "*",    // "*" = connect to ANY network id Ganache reports.
      gas: 6721975,       // Gas limit per transaction (Ganache default block gas limit).
      gasPrice: 20000000000 // 20 gwei.
    },

    // A convenience alias if you run the Ganache CLI on 8545.
    development: {
      host: "127.0.0.1",
      port: 8545,
      network_id: "*"
    }
  },

  // Directory where the compiled JSON ABIs + bytecode are written.
  // The backend reads ProductRegistry.json from here to talk to the contract.
  contracts_build_directory: "./build/contracts",

  /**
   * Mocha is the test runner Truffle uses for `truffle test`.
   */
  mocha: {
    timeout: 100000
  },

  /**
   * Solidity compiler configuration.
   * We pin 0.8.21 — any 0.8.x works for this PoC and gives us built-in
   * overflow checks. OpenZeppelin v5 requires >= 0.8.20.
   */
  compilers: {
    solc: {
      version: "0.8.21",
      settings: {
        optimizer: {
          enabled: true,
          runs: 200 // Optimize for a balance of deploy cost vs runtime cost.
        },
        evmVersion: "paris" // Safe target for Ganache.
      }
    }
  }
};
