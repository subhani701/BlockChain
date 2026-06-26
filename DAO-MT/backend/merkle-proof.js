"use strict";
// Builds a Merkle proof for a serial, re-using the shared ../lib/merkle.js.
const { buildTree, getHexProof, leafFor, SERIALS_BY_BATCH } = require("../lib/merkle");

function getProof(batchKey, serial) {
  const serials = SERIALS_BY_BATCH[batchKey] || [];
  const inTree = serials.includes(serial);
  const tree = buildTree(serials);
  const proof = inTree ? getHexProof(tree, serial) : [];
  const leaf = "0x" + leafFor(serial).toString("hex");
  return { leaf, proof, inTree };
}

module.exports = { getProof };
