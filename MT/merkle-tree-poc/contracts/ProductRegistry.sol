// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// OpenZeppelin's audited Merkle proof verification library.
// It exposes `MerkleProof.verify(proof, root, leaf)` which recomputes the
// root from a leaf + its sibling proof and compares it to the stored root.
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
// AccessControl provides role-based authorization: a DEFAULT_ADMIN_ROLE that can
// grant/revoke roles, and a REGISTRAR_ROLE that may register batches. This
// replaces single-owner Ownable so multiple manufacturers can be authorized and
// governance (a multisig / DAO admin) can manage them. Anyone may still *verify*
// a product (verification is a pure read and costs no gas when called off-chain).
import "@openzeppelin/contracts/access/AccessControl.sol";
// Pausable provides an emergency circuit-breaker: a PAUSER_ROLE can halt new
// batch registrations (e.g. if a registrar key is compromised). Verification is
// intentionally NOT pausable — reading provenance truth must remain available.
import "@openzeppelin/contracts/utils/Pausable.sol";

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
contract ProductRegistry is AccessControl, Pausable {
    /// @notice Role allowed to register batches (the "manufacturer(s)").
    /// @dev Admins (DEFAULT_ADMIN_ROLE) can grant/revoke this role.
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    /// @notice Role allowed to pause/unpause new batch registrations.
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    /**
     * @dev On-chain record for one manufacturing batch.
     *      Note we store the MERKLE ROOT, not the products themselves.
     */
    struct Batch {
        // NOTE: the human-readable batchId is the mapping KEY, so we do not store
        // it again in the struct (gas: avoids a redundant string SSTORE — 3.4).
        bytes32 merkleRoot;    // Current Merkle root (latest version).
        uint256 totalProducts; // Products committed under the current root.
        uint256 createdAt;     // Timestamp of the first registration.
        uint256 updatedAt;     // Timestamp of the last (re)registration/supersede.
        uint256 version;       // 1 on register; incremented on each supersede.
        bool exists;           // Sentinel so we can distinguish "empty" from "set".
    }

    /// @notice batchId => Batch record.
    mapping(string => Batch) private batches;

    /// @notice Ordered list of every registered batchId (handy for enumeration).
    string[] private batchIds;

    /// @notice Emitted when a manufacturer registers a new batch root (version 1).
    event BatchRegistered(
        string indexed batchId,
        bytes32 merkleRoot,
        uint256 totalProducts,
        uint256 createdAt
    );

    /// @notice Emitted when an existing batch's root is superseded (corrected).
    /// @dev The full version history is reconstructable from these logs; the
    ///      previous root is never overwritten silently.
    event BatchSuperseded(
        string indexed batchId,
        bytes32 oldRoot,
        bytes32 newRoot,
        uint256 totalProducts,
        uint256 version
    );

    /// @notice Emitted whenever a product is verified against a batch.
    /// @param valid true if the Merkle proof was valid for the stored root.
    event ProductVerified(
        string indexed batchId,
        bytes32 leaf,
        bool valid
    );

    /**
     * @param admin The initial admin, granted DEFAULT_ADMIN_ROLE (can grant/revoke
     *        roles) and REGISTRAR_ROLE (can register batches). Passed in by the
     *        migration script (the deployer account). In production this should be
     *        a multisig / DAO executor address.
     */
    constructor(address admin) {
        require(admin != address(0), "ProductRegistry: admin is the zero address");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(REGISTRAR_ROLE, admin);
        _grantRole(PAUSER_ROLE, admin);
    }

    /// @notice Halt new batch registrations (emergency stop). Verification is
    ///         unaffected. Only PAUSER_ROLE.
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    /// @notice Resume batch registrations. Only PAUSER_ROLE.
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    /**
     * @notice Register a batch by committing its Merkle Root on-chain.
     * @dev Only accounts with REGISTRAR_ROLE may call this. Reverts if the batch
     *      already exists or inputs are empty.
     * @param batchId       Unique human-readable id, e.g. "BATCH-001".
     * @param merkleRoot    Root computed off-chain from all product leaves.
     * @param totalProducts Number of products committed under the root.
     */
    function registerBatch(
        string calldata batchId,
        bytes32 merkleRoot,
        uint256 totalProducts
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        require(bytes(batchId).length > 0, "ProductRegistry: empty batchId");
        require(merkleRoot != bytes32(0), "ProductRegistry: empty merkleRoot");
        require(totalProducts > 0, "ProductRegistry: totalProducts must be > 0");
        require(!batches[batchId].exists, "ProductRegistry: batch already exists");

        batches[batchId] = Batch({
            merkleRoot: merkleRoot,
            totalProducts: totalProducts,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            version: 1,
            exists: true
        });
        batchIds.push(batchId);

        emit BatchRegistered(batchId, merkleRoot, totalProducts, block.timestamp);
    }

    /**
     * @notice Supersede an existing batch's Merkle root with a corrected one,
     *         preserving history (version increments; the change is logged).
     * @dev Only REGISTRAR_ROLE, only when not paused. Reverts if the batch does
     *      not exist or the new root is empty/unchanged. Verification always uses
     *      the CURRENT (latest) root, so old products stop verifying once superseded.
     * @param batchId       The existing batch to update.
     * @param newMerkleRoot The corrected root (must differ from the current one).
     * @param totalProducts Number of products under the new root.
     */
    function supersedeBatch(
        string calldata batchId,
        bytes32 newMerkleRoot,
        uint256 totalProducts
    ) external onlyRole(REGISTRAR_ROLE) whenNotPaused {
        Batch storage b = batches[batchId];
        require(b.exists, "ProductRegistry: unknown batch");
        require(newMerkleRoot != bytes32(0), "ProductRegistry: empty merkleRoot");
        require(totalProducts > 0, "ProductRegistry: totalProducts must be > 0");
        require(newMerkleRoot != b.merkleRoot, "ProductRegistry: root unchanged");

        bytes32 oldRoot = b.merkleRoot;
        b.merkleRoot = newMerkleRoot;
        b.totalProducts = totalProducts;
        b.updatedAt = block.timestamp;
        b.version += 1;

        emit BatchSuperseded(batchId, oldRoot, newMerkleRoot, totalProducts, b.version);
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
            uint256 createdAt,
            uint256 updatedAt,
            uint256 version
        )
    {
        Batch storage b = batches[batchId];
        require(b.exists, "ProductRegistry: unknown batch");
        // `id` is echoed from the argument (no longer stored in the struct — 3.4).
        return (batchId, b.merkleRoot, b.totalProducts, b.createdAt, b.updatedAt, b.version);
    }

    /**
     * @notice Verify that a product (represented by its `leaf`) belongs to a
     *         registered batch, using a Merkle `proof`.
     * @dev This function EMITS an event, so it is a state-changing transaction
     *      (useful for an auditable on-chain trail). For a free, read-only
     *      check use {verifyProductView} instead.
     *
     *      The leaf MUST be computed exactly as (off-chain, see shared/hash.ts):
     *        keccak256(utf8(JSON.stringify({serial, sku, batch_id, manufactured_at})))
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
