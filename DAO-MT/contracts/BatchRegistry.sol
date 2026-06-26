// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title BatchRegistry - anchors batch Merkle roots and verifies parts
contract BatchRegistry is Ownable {
    mapping(bytes32 => bytes32) public batchRoots; // batchId => merkleRoot

    event BatchAnchored(bytes32 indexed batchId, bytes32 root, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function anchorBatch(bytes32 batchId, bytes32 root) external onlyOwner {
        batchRoots[batchId] = root;
        emit BatchAnchored(batchId, root, block.timestamp);
    }

    function isAnchored(bytes32 batchId) external view returns (bool) {
        return batchRoots[batchId] != bytes32(0);
    }

    function verifyPart(bytes32 batchId, string calldata serial, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        bytes32 leaf = keccak256(abi.encodePacked(serial));
        return MerkleProof.verify(proof, batchRoots[batchId], leaf);
    }
}
