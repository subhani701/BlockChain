/**
 * test/ProductRegistry.test.js
 * -----------------------------------------------------------------------------
 * Truffle / Mocha tests for the ProductRegistry contract.
 *
 * Run with:  npm test   (i.e. `truffle test --network ganache`)
 *
 * These tests build a Merkle tree off-chain (exactly as the backend does) and
 * assert the on-chain verifyProduct() agrees with it — including the all
 * important TAMPERING case where a modified product must FAIL verification.
 *
 * We deliberately re-implement the tiny bit of Merkle logic here (rather than
 * importing the TS `shared/`) so the contract tests stay self-contained and
 * runnable by Truffle without a TypeScript loader.
 * -----------------------------------------------------------------------------
 */
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");
const { solidityPackedKeccak256 } = require("ethers");

const ProductRegistry = artifacts.require("ProductRegistry");

// --- Off-chain helpers (mirror shared/hash.ts + shared/merkle.ts) -----------

function hashProduct(p) {
  // keccak256(abi.encodePacked(productId, serialNumber, batchId, manufactureDate))
  return solidityPackedKeccak256(
    ["string", "string", "string", "uint256"],
    [p.productId, p.serialNumber, p.batchId, p.manufactureDate]
  );
}

const toBuf = (hex) => Buffer.from(hex.replace(/^0x/, ""), "hex");
const toHex = (buf) => "0x" + buf.toString("hex");

function buildTree(leaves) {
  return new MerkleTree(leaves.map(toBuf), keccak256, {
    sortPairs: true,
    hashLeaves: false
  });
}

function makeBatch(batchId, count) {
  const products = [];
  for (let i = 1; i <= count; i++) {
    const seq = String(i).padStart(4, "0");
    products.push({
      productId: `SKU-${seq}`,
      serialNumber: `SN-${batchId}-${seq}`,
      batchId,
      manufactureDate: 1700000000 + i * 60
    });
  }
  return products;
}

// --- Tests ------------------------------------------------------------------

contract("ProductRegistry", (accounts) => {
  const [manufacturer, stranger] = accounts;
  const BATCH_ID = "BATCH-001";
  const COUNT = 100;

  let registry;
  let products;
  let tree;
  let root;

  beforeEach(async () => {
    registry = await ProductRegistry.new(manufacturer, { from: manufacturer });
    products = makeBatch(BATCH_ID, COUNT);
    const leaves = products.map(hashProduct);
    tree = buildTree(leaves);
    root = tree.getHexRoot();
  });

  it("registers a batch and stores the Merkle root", async () => {
    const receipt = await registry.registerBatch(BATCH_ID, root, COUNT, {
      from: manufacturer
    });

    // Event assertions.
    const ev = receipt.logs.find((l) => l.event === "BatchRegistered");
    assert(ev, "BatchRegistered event not emitted");
    assert.equal(ev.args.merkleRoot, root, "root mismatch in event");
    assert.equal(ev.args.totalProducts.toString(), String(COUNT));

    // Storage assertions via getBatch().
    const batch = await registry.getBatch(BATCH_ID);
    assert.equal(batch.merkleRoot, root);
    assert.equal(batch.totalProducts.toString(), String(COUNT));
    assert.equal(batch.id, BATCH_ID);
  });

  it("prevents non-owners from registering a batch", async () => {
    try {
      await registry.registerBatch(BATCH_ID, root, COUNT, { from: stranger });
      assert.fail("stranger should not be able to register a batch");
    } catch (err) {
      assert(
        err.message.includes("revert"),
        `expected revert, got: ${err.message}`
      );
    }
  });

  it("rejects duplicate batch ids", async () => {
    await registry.registerBatch(BATCH_ID, root, COUNT, { from: manufacturer });
    try {
      await registry.registerBatch(BATCH_ID, root, COUNT, {
        from: manufacturer
      });
      assert.fail("duplicate batch should revert");
    } catch (err) {
      assert(err.message.includes("batch already exists"));
    }
  });

  it("verifies a genuine product (VALID)", async () => {
    await registry.registerBatch(BATCH_ID, root, COUNT, { from: manufacturer });

    const target = products[42];
    const leaf = hashProduct(target);
    const proof = tree.getHexProof(leaf);

    // Read-only check (no gas, no event).
    const valid = await registry.verifyProductView.call(BATCH_ID, proof, leaf);
    assert.equal(valid, true, "genuine product should verify as VALID");

    // State-changing variant emits ProductVerified(valid = true).
    const receipt = await registry.verifyProduct(BATCH_ID, proof, leaf, {
      from: stranger
    });
    const ev = receipt.logs.find((l) => l.event === "ProductVerified");
    assert(ev && ev.args.valid === true, "expected ProductVerified(valid=true)");
  });

  it("rejects a TAMPERED product (INVALID)", async () => {
    await registry.registerBatch(BATCH_ID, root, COUNT, { from: manufacturer });

    const original = products[10];
    const proof = tree.getHexProof(hashProduct(original));

    // Tamper: change the serial number. The leaf hash changes completely.
    const tampered = { ...original, serialNumber: "SN-FAKE-9999" };
    const tamperedLeaf = hashProduct(tampered);

    // Using the ORIGINAL proof with the TAMPERED leaf must fail.
    const valid = await registry.verifyProductView.call(
      BATCH_ID,
      proof,
      tamperedLeaf
    );
    assert.equal(valid, false, "tampered product must be INVALID");
  });

  it("rejects a product that was never in the batch", async () => {
    await registry.registerBatch(BATCH_ID, root, COUNT, { from: manufacturer });

    const fake = {
      productId: "SKU-9999",
      serialNumber: "SN-FORGED-0001",
      batchId: BATCH_ID,
      manufactureDate: 1700000000
    };
    const fakeLeaf = hashProduct(fake);
    // Borrow any real proof — it won't reconstruct the root for a fake leaf.
    const someProof = tree.getHexProof(hashProduct(products[0]));

    const valid = await registry.verifyProductView.call(
      BATCH_ID,
      someProof,
      fakeLeaf
    );
    assert.equal(valid, false, "forged product must be INVALID");
  });

  it("reverts when verifying against an unknown batch", async () => {
    const leaf = hashProduct(products[0]);
    const proof = tree.getHexProof(leaf);
    try {
      await registry.verifyProductView.call("BATCH-NOPE", proof, leaf);
      assert.fail("should revert for unknown batch");
    } catch (err) {
      assert(err.message.includes("unknown batch"));
    }
  });
});
