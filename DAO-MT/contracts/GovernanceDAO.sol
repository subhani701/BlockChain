// SPDX-License-Identifier: MIT
pragma solidity ^0.8.21;

interface IDealerRegistry {
    // NOTE: enum order MUST match DealerRegistry.Status
    enum Status { None, Authorized, UnderReview, Warned, Suspended, Blacklisted }
    function setStatus(bytes32 dealerId, Status s) external;
}

/// @title GovernanceDAO - propose/vote/finalize/execute enforcement on dealers
contract GovernanceDAO {
    enum Action { Warn, Suspend, Blacklist, Reinstate }
    enum ProposalStatus { Open, Passed, Failed, Executed }

    struct Proposal {
        bytes32 dealerId;
        Action action;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 quorum;
        ProposalStatus status;
        mapping(address => bool) voted;
    }

    IDealerRegistry public registry;
    uint256 public proposalCount;
    mapping(uint256 => Proposal) private proposals;

    event ProposalOpened(uint256 indexed id, bytes32 indexed dealerId, uint8 action, uint256 quorum);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 forVotes, uint256 againstVotes);
    event ProposalFinalized(uint256 indexed id, uint8 status);
    event ProposalExecuted(uint256 indexed id, bytes32 indexed dealerId, uint8 newStatus);

    constructor(address _registry) {
        registry = IDealerRegistry(_registry);
    }

    function openProposal(bytes32 dealerId, Action action, uint256 quorum) external returns (uint256 id) {
        id = proposalCount++;
        Proposal storage p = proposals[id];
        p.dealerId = dealerId;
        p.action = action;
        p.quorum = quorum;
        p.status = ProposalStatus.Open;
        emit ProposalOpened(id, dealerId, uint8(action), quorum);
    }

    function vote(uint256 id, bool support) external {
        require(id < proposalCount, "no proposal");
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.Open, "not open");
        require(!p.voted[msg.sender], "already voted");
        p.voted[msg.sender] = true;
        if (support) p.forVotes++;
        else p.againstVotes++;
        emit Voted(id, msg.sender, support, p.forVotes, p.againstVotes);
    }

    function finalize(uint256 id) external {
        require(id < proposalCount, "no proposal");
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.Open, "not open");
        if (p.forVotes >= p.quorum && p.forVotes > p.againstVotes) {
            p.status = ProposalStatus.Passed;
        } else {
            p.status = ProposalStatus.Failed;
        }
        emit ProposalFinalized(id, uint8(p.status));
    }

    function executeProposal(uint256 id) external {
        require(id < proposalCount, "no proposal");
        Proposal storage p = proposals[id];
        require(p.status == ProposalStatus.Passed, "not passed");

        IDealerRegistry.Status newStatus;
        if (p.action == Action.Warn) newStatus = IDealerRegistry.Status.Warned;
        else if (p.action == Action.Suspend) newStatus = IDealerRegistry.Status.Suspended;
        else if (p.action == Action.Blacklist) newStatus = IDealerRegistry.Status.Blacklisted;
        else newStatus = IDealerRegistry.Status.Authorized; // Reinstate

        registry.setStatus(p.dealerId, newStatus);
        p.status = ProposalStatus.Executed;
        emit ProposalExecuted(id, p.dealerId, uint8(newStatus));
    }

    function hasVoted(uint256 id, address voter) external view returns (bool) {
        return proposals[id].voted[voter];
    }

    /// @dev struct holds a mapping, so expose fields via an explicit view
    function getProposal(uint256 id)
        external
        view
        returns (
            bytes32 dealerId,
            uint8 action,
            uint256 forVotes,
            uint256 againstVotes,
            uint256 quorum,
            uint8 status
        )
    {
        Proposal storage p = proposals[id];
        return (p.dealerId, uint8(p.action), p.forVotes, p.againstVotes, p.quorum, uint8(p.status));
    }
}
