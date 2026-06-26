/**
 * migrations/1_deploy_product_registry.js
 * -----------------------------------------------------------------------------
 * Truffle migration script.
 *
 * Migrations are ordinary JS files run in numeric order (1_, 2_, ...). Truffle
 * keeps track of which migrations have already run so they are not re-deployed.
 *
 * Modern Truffle (>= 5.1) records migration state off-chain in a JSON file, so
 * we no longer need the legacy `Migrations.sol` bookkeeping contract.
 *
 * `artifacts.require("ProductRegistry")` loads the compiled artifact
 * (build/contracts/ProductRegistry.json) produced by `truffle compile`.
 *
 * The function receives:
 *   - deployer : Truffle's deployment helper.
 *   - network  : the network name (e.g. "ganache").
 *   - accounts : the list of unlocked accounts from Ganache.
 *
 * We deploy ProductRegistry and pass accounts[0] as the initial owner. That
 * account becomes the "manufacturer" allowed to call registerBatch().
 * -----------------------------------------------------------------------------
 */
const ProductRegistry = artifacts.require("ProductRegistry");

module.exports = async function (deployer, network, accounts) {
  const manufacturer = accounts[0];

  // Deploy the contract, passing the manufacturer address to the constructor.
  await deployer.deploy(ProductRegistry, manufacturer);

  const instance = await ProductRegistry.deployed();

  // Helpful deployment log so you can copy the address into the backend .env.
  console.log("------------------------------------------------------------");
  console.log("ProductRegistry deployed");
  console.log("  network         :", network);
  console.log("  contract address:", instance.address);
  console.log("  manufacturer    :", manufacturer);
  console.log("------------------------------------------------------------");
};
