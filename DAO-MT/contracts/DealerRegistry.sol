// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title DealerRegistry - on-chain authorization status for dealers
contract DealerRegistry is Ownable {
    enum Status { None, Authorized, UnderReview, Warned, Suspended, Blacklisted }

    mapping(bytes32 => Status) public dealerStatus; // dealerId => status
    address public dao;

    event DealerStatusChanged(bytes32 indexed dealerId, Status status, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    modifier onlyDaoOrOwner() {
        require(msg.sender == dao || msg.sender == owner(), "not dao/owner");
        _;
    }

    function setDao(address _dao) external onlyOwner {
        dao = _dao;
    }

    function registerDealer(bytes32 dealerId) external onlyOwner {
        dealerStatus[dealerId] = Status.Authorized;
        emit DealerStatusChanged(dealerId, Status.Authorized, block.timestamp);
    }

    function setStatus(bytes32 dealerId, Status s) external onlyDaoOrOwner {
        dealerStatus[dealerId] = s;
        emit DealerStatusChanged(dealerId, s, block.timestamp);
    }
}
