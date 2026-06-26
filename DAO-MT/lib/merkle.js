"use strict";
// Shared Merkle module (CommonJS) used by the Truffle migration AND the backend.
// Leaf = keccak256(raw UTF-8 serial string) -> matches Solidity keccak256(abi.encodePacked(serial)).
// Tree uses sortPairs:true to match OpenZeppelin MerkleProof.verify.

const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const SERIALS_BY_BATCH = {
  "BATCH-2026-001": [
    "SN-88421-A",
    "SN-88421-B",
    "SN-88422-C",
    "SN-88423-D",
    "SN-88424-E",
    "SN-88425-F",
    "SN-88426-G",
    "SN-88427-H",
  ],
};

function leafFor(serial) {
  return keccak256(serial); // Buffer
}

function buildTree(serials) {
  const leaves = serials.map((s) => keccak256(s));
  return new MerkleTree(leaves, keccak256, { sortPairs: true });
}

function getRoot(tree) {
  return "0x" + tree.getRoot().toString("hex");
}

function getHexProof(tree, serial) {
  return tree.getHexProof(keccak256(serial));
}

// bytes32 id from a name/string: keccak256(abi.encodePacked(name))
function idFor(name) {
  return "0x" + keccak256(name).toString("hex");
}

module.exports = { SERIALS_BY_BATCH, leafFor, buildTree, getRoot, getHexProof, idFor };
