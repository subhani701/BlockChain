// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin's audited Merkle verification library. This is the SAME climb
// you did by hand in Step 3 (hash leaf with each sibling, sorted, up to root)
// — but written by experts, gas-optimized, and security-audited.
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/**
 * @title ProductRegistry
 * @notice Stores ONLY the 32-byte Merkle root of each batch on-chain, and
 *         verifies individual products against it using a Merkle proof.
 *
 *         This is the on-chain twin of our JavaScript scripts:
 *           - registerBatch() stores the root (like Step 2's output)
 *           - verifyProduct() checks a leaf + proof (like Step 3 / Step 4)
 */
contract ProductRegistry {
    // One record per batch. Note we store the ROOT, never the products.
    struct Batch {
        bytes32 merkleRoot;    // the 32-byte seal over the whole batch
        uint256 totalProducts; // how many products are under this root
        uint256 createdAt;     // block timestamp when registered
        bool exists;           // lets us tell "registered" from "empty"
    }

    // batchId (e.g. "BATCH-001") => its Batch record.
    mapping(string => Batch) private batches;

    // Emitted when a manufacturer commits a batch root on-chain.
    event BatchRegistered(string batchId, bytes32 merkleRoot, uint256 totalProducts);

    /**
     * Store a batch's Merkle root. In a real system you'd guard this so only
     * the manufacturer can call it (OpenZeppelin's Ownable / AccessControl) —
     * we'll keep it open here to stay focused on the Merkle part.
     */
    function registerBatch(
        string calldata batchId,
        bytes32 merkleRoot,
        uint256 totalProducts
    ) external {
        require(!batches[batchId].exists, "batch already exists");
        require(merkleRoot != bytes32(0), "empty root");

        batches[batchId] = Batch({
            merkleRoot: merkleRoot,
            totalProducts: totalProducts,
            createdAt: block.timestamp,
            exists: true
        });

        emit BatchRegistered(batchId, merkleRoot, totalProducts);
    }

    /// Read back a stored root (handy for the UI / sanity checks).
    function getRoot(string calldata batchId) external view returns (bytes32) {
        require(batches[batchId].exists, "unknown batch");
        return batches[batchId].merkleRoot;
    }

    /**
     * THE HEART OF THE CONTRACT.
     * Given a product's leaf + its proof, rebuild the root and compare it to
     * the stored root. Returns true (genuine) or false (fake/tampered).
     *
     * `view` = read-only, costs no gas when called off-chain. Identical inputs
     * and output to tree.verify(proof, leaf, root) from Steps 3 & 4.
     */
    function verifyProduct(
        string calldata batchId,
        bytes32[] calldata proof,
        bytes32 leaf
    ) external view returns (bool) {
        require(batches[batchId].exists, "unknown batch");
        return MerkleProof.verify(proof, batches[batchId].merkleRoot, leaf);
    }
}
