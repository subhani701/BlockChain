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

const ProductRegistry = artifacts.require("ProductRegistry");

// --- Off-chain helpers (mirror shared/hash.ts + shared/merkle.ts) -----------

const toBuf = (hex) => Buffer.from(hex.replace(/^0x/, ""), "hex");
const toHex = (buf) => "0x" + buf.toString("hex");

// leaf = keccak256(keccak256(utf8(JSON.stringify({serial, sku, batch_id, manufactured_at}))))
// DOUBLE-hashed, second-preimage safe — mirrors shared/hash.ts (LEAF SPEC 2.0.0).
function hashProduct(p) {
  const canonical = JSON.stringify({
    serial: p.serial,
    sku: p.sku,
    batch_id: p.batch_id,
    manufactured_at: p.manufactured_at
  });
  const inner = keccak256(Buffer.from(canonical, "utf8")); // Buffer (32 bytes)
  return toHex(keccak256(inner)); // keccak256 of the 32-byte inner hash
}

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
      serial: `SN-${batchId}-${seq}`,
      sku: "SKF-6205-2RS",
      batch_id: batchId,
      manufactured_at: new Date((1700000000 + i * 60) * 1000).toISOString()
    });
  }
  return products;
}

// --- Tests ------------------------------------------------------------------

contract("ProductRegistry", (accounts) => {
  const [manufacturer, stranger, registrar2] = accounts;
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

  it("prevents accounts without REGISTRAR_ROLE from registering a batch", async () => {
    try {
      await registry.registerBatch(BATCH_ID, root, COUNT, { from: stranger });
      assert.fail("stranger should not be able to register a batch");
    } catch (err) {
      // OZ v5 reverts with a custom error AccessControlUnauthorizedAccount.
      assert(
        /revert|AccessControl|Unauthorized/i.test(err.message),
        `expected access-control revert, got: ${err.message}`
      );
    }
  });

  it("lets an admin grant and revoke REGISTRAR_ROLE", async () => {
    const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();

    // registrar2 has no role yet → cannot register.
    assert.equal(await registry.hasRole(REGISTRAR_ROLE, registrar2), false);

    // Admin (manufacturer) grants the role.
    await registry.grantRole(REGISTRAR_ROLE, registrar2, { from: manufacturer });
    assert.equal(await registry.hasRole(REGISTRAR_ROLE, registrar2), true);

    // Now registrar2 can register a batch.
    const receipt = await registry.registerBatch("BATCH-R2", root, COUNT, {
      from: registrar2
    });
    assert(
      receipt.logs.find((l) => l.event === "BatchRegistered"),
      "granted registrar should be able to register"
    );

    // Admin revokes the role → registrar2 can no longer register.
    await registry.revokeRole(REGISTRAR_ROLE, registrar2, { from: manufacturer });
    assert.equal(await registry.hasRole(REGISTRAR_ROLE, registrar2), false);
    try {
      await registry.registerBatch("BATCH-R3", root, COUNT, { from: registrar2 });
      assert.fail("revoked registrar should not be able to register");
    } catch (err) {
      assert(/revert|AccessControl|Unauthorized/i.test(err.message));
    }
  });

  it("prevents a non-admin from granting roles", async () => {
    const REGISTRAR_ROLE = await registry.REGISTRAR_ROLE();
    try {
      await registry.grantRole(REGISTRAR_ROLE, stranger, { from: stranger });
      assert.fail("non-admin should not be able to grant roles");
    } catch (err) {
      assert(/revert|AccessControl|Unauthorized/i.test(err.message));
    }
  });

  it("pauses and resumes batch registration (emergency stop)", async () => {
    // Pause → registerBatch must revert.
    await registry.pause({ from: manufacturer });
    assert.equal(await registry.paused(), true);
    try {
      await registry.registerBatch(BATCH_ID, root, COUNT, { from: manufacturer });
      assert.fail("registerBatch should revert while paused");
    } catch (err) {
      assert(/revert|EnforcedPause|paused/i.test(err.message), err.message);
    }

    // Unpause → registerBatch works again.
    await registry.unpause({ from: manufacturer });
    assert.equal(await registry.paused(), false);
    const receipt = await registry.registerBatch(BATCH_ID, root, COUNT, {
      from: manufacturer
    });
    assert(receipt.logs.find((l) => l.event === "BatchRegistered"));
  });

  it("keeps verification available while paused", async () => {
    await registry.registerBatch(BATCH_ID, root, COUNT, { from: manufacturer });
    await registry.pause({ from: manufacturer });

    const target = products[7];
    const leaf = hashProduct(target);
    const proof = tree.getHexProof(leaf);
    // Verification must still work during a pause (reading truth is not blocked).
    assert.equal(
      await registry.verifyProductView.call(BATCH_ID, proof, leaf),
      true,
      "verification should remain available while paused"
    );
  });

  it("prevents a non-pauser from pausing", async () => {
    try {
      await registry.pause({ from: stranger });
      assert.fail("non-pauser should not be able to pause");
    } catch (err) {
      assert(/revert|AccessControl|Unauthorized/i.test(err.message));
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
    const tampered = { ...original, serial: "SN-FAKE-9999" };
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
      serial: "SN-FORGED-0001",
      sku: "SKF-6205-2RS",
      batch_id: BATCH_ID,
      manufactured_at: "2023-11-14T22:14:20.000Z"
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

  it("verifies genuine + rejects tampered for an ODD-sized batch (promote convention)", async () => {
    // 5 leaves forces a promoted lonely node at level 0 (index 4). This proves
    // OpenZeppelin's MerkleProof.verify is compatible with our promote convention.
    const ODD_ID = "BATCH-ODD-5";
    const oddProducts = makeBatch(ODD_ID, 5);
    const oddLeaves = oddProducts.map(hashProduct);
    const oddTree = buildTree(oddLeaves);
    const oddRoot = oddTree.getHexRoot();

    await registry.registerBatch(ODD_ID, oddRoot, 5, { from: manufacturer });

    // The promoted lonely product (last index) must still verify on-chain.
    const target = oddProducts[4];
    const leaf = hashProduct(target);
    const proof = oddTree.getHexProof(leaf);
    assert.equal(
      await registry.verifyProductView.call(ODD_ID, proof, leaf),
      true,
      "promoted odd node should verify VALID on-chain"
    );

    // Tampering it must fail.
    const tamperedLeaf = hashProduct({ ...target, serial: "SN-FAKE-9999" });
    assert.equal(
      await registry.verifyProductView.call(ODD_ID, proof, tamperedLeaf),
      false,
      "tampered odd node must be INVALID"
    );
  });

  it("verifies a SINGLE-leaf batch on-chain (root == leaf, empty proof)", async () => {
    // A batch of one: the root IS the leaf and the proof is empty. OZ's
    // MerkleProof.verify([], root, leaf) returns leaf == root.
    const ONE_ID = "BATCH-ONE";
    const one = makeBatch(ONE_ID, 1);
    const leaf = hashProduct(one[0]);
    const tree = buildTree([leaf]);
    const root = tree.getHexRoot();

    assert.equal(root, leaf, "single-leaf root must equal the leaf");

    await registry.registerBatch(ONE_ID, root, 1, { from: manufacturer });

    // Genuine: empty proof verifies VALID.
    assert.equal(
      await registry.verifyProductView.call(ONE_ID, [], leaf),
      true,
      "single product should verify VALID with an empty proof"
    );

    // Tampered: a different leaf must be INVALID.
    const tamperedLeaf = hashProduct({ ...one[0], serial: "SN-FAKE-0001" });
    assert.equal(
      await registry.verifyProductView.call(ONE_ID, [], tamperedLeaf),
      false,
      "tampered single product must be INVALID"
    );
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
