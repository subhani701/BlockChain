// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin's audited Merkle proof verification library.
// It exposes `MerkleProof.verify(proof, root, leaf)` which recomputes the
// root from a leaf + its sibling proof and compares it to the stored root.
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
// Ownable restricts batch registration to the contract deployer (the
// "manufacturer"). Anyone may still *verify* a product (verification is a
// pure read and costs no gas when called off-chain).
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  ProductRegistry
 * @author Merkle Tree PoC
 * @notice Anti-counterfeit / provenance registry.
 *
 *         Instead of storing thousands of individual products on-chain (which
 *         would be enormously expensive), a manufacturer:
 *
 *           1. Hashes every product into a "leaf".
 *           2. Builds a Merkle Tree off-chain from those leaves.
 *           3. Stores ONLY the 32-byte Merkle Root on-chain (this contract).
 *
 *         Later, anyone can prove a single product belongs to a registered
 *         batch by supplying that product's leaf + a short Merkle Proof. The
 *         contract recomputes the root and checks it matches what was stored.
 *
 *         Cost: O(1) storage per batch regardless of batch size.
 *         Proof size: O(log2(n)) hashes per product.
 */
contract ProductRegistry is Ownable {
    /**
     * @dev On-chain record for one manufacturing batch.
     *      Note we store the MERKLE ROOT, not the products themselves.
     */
    struct Batch {
        string batchId;        // Human-readable batch identifier, e.g. "BATCH-001".
        bytes32 merkleRoot;    // Root of the Merkle Tree built from product leaves.
        uint256 totalProducts; // How many products are committed under this root.
        uint256 createdAt;     // Block timestamp when the batch was registered.
        bool exists;           // Sentinel so we can distinguish "empty" from "set".
    }

    /// @notice batchId => Batch record.
    mapping(string => Batch) private batches;

    /// @notice Ordered list of every registered batchId (handy for enumeration).
    string[] private batchIds;

    /// @notice Emitted when a manufacturer registers a new batch root.
    event BatchRegistered(
        string indexed batchId,
        bytes32 merkleRoot,
        uint256 totalProducts,
        uint256 createdAt
    );

    /// @notice Emitted whenever a product is verified against a batch.
    /// @param valid true if the Merkle proof was valid for the stored root.
    event ProductVerified(
        string indexed batchId,
        bytes32 leaf,
        bool valid
    );

    /**
     * @param initialOwner The manufacturer address allowed to register batches.
     *        Passed in by the migration script (we use the deployer account).
     */
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @notice Register a batch by committing its Merkle Root on-chain.
     * @dev Only the owner (manufacturer) may call this. Reverts if the batch
     *      already exists or inputs are empty.
     * @param batchId       Unique human-readable id, e.g. "BATCH-001".
     * @param merkleRoot    Root computed off-chain from all product leaves.
     * @param totalProducts Number of products committed under the root.
     */
    function registerBatch(
        string calldata batchId,
        bytes32 merkleRoot,
        uint256 totalProducts
    ) external onlyOwner {
        require(bytes(batchId).length > 0, "ProductRegistry: empty batchId");
        require(merkleRoot != bytes32(0), "ProductRegistry: empty merkleRoot");
        require(totalProducts > 0, "ProductRegistry: totalProducts must be > 0");
        require(!batches[batchId].exists, "ProductRegistry: batch already exists");

        batches[batchId] = Batch({
            batchId: batchId,
            merkleRoot: merkleRoot,
            totalProducts: totalProducts,
            createdAt: block.timestamp,
            exists: true
        });
        batchIds.push(batchId);

        emit BatchRegistered(batchId, merkleRoot, totalProducts, block.timestamp);
    }

    /**
     * @notice Read a stored batch record.
     * @dev Reverts if the batch was never registered.
     */
    function getBatch(string calldata batchId)
        external
        view
        returns (
            string memory id,
            bytes32 merkleRoot,
            uint256 totalProducts,
            uint256 createdAt
        )
    {
        Batch storage b = batches[batchId];
        require(b.exists, "ProductRegistry: unknown batch");
        return (b.batchId, b.merkleRoot, b.totalProducts, b.createdAt);
    }

    /**
     * @notice Verify that a product (represented by its `leaf`) belongs to a
     *         registered batch, using a Merkle `proof`.
     * @dev This function EMITS an event, so it is a state-changing transaction
     *      (useful for an auditable on-chain trail). For a free, read-only
     *      check use {verifyProductView} instead.
     *
     *      The leaf MUST be computed exactly as:
     *        keccak256(abi.encodePacked(productId, serialNumber, batchId, manufactureDate))
     *      and the tree MUST be built with sorted sibling pairs (merkletreejs
     *      `sortPairs: true`) so it matches OpenZeppelin's hashing convention.
     *
     * @param batchId The batch to verify against.
     * @param proof   Array of sibling hashes from leaf up to the root.
     * @param leaf    The keccak256 leaf hash of the product being checked.
     * @return valid  True if the proof reconstructs the stored Merkle root.
     */
    function verifyProduct(
        string calldata batchId,
        bytes32[] calldata proof,
        bytes32 leaf
    ) external returns (bool valid) {
        Batch storage b = batches[batchId];
        require(b.exists, "ProductRegistry: unknown batch");

        valid = MerkleProof.verify(proof, b.merkleRoot, leaf);
        emit ProductVerified(batchId, leaf, valid);
    }

    /**
     * @notice Gas-free read-only variant of {verifyProduct} (no event).
     *         Call this from a backend/frontend with `.call()` to verify
     *         without spending gas.
     */
    function verifyProductView(
        string calldata batchId,
        bytes32[] calldata proof,
        bytes32 leaf
    ) external view returns (bool) {
        Batch storage b = batches[batchId];
        require(b.exists, "ProductRegistry: unknown batch");
        return MerkleProof.verify(proof, b.merkleRoot, leaf);
    }

    /// @notice Total number of registered batches.
    function batchCount() external view returns (uint256) {
        return batchIds.length;
    }

    /// @notice Return a batchId by index (for enumeration / dashboards).
    function batchIdAt(uint256 index) external view returns (string memory) {
        require(index < batchIds.length, "ProductRegistry: index out of range");
        return batchIds[index];
    }
}
