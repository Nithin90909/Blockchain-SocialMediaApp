// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserRegistry.sol";

contract ModerationContract {
    enum VoteType { NONE, FAKE, LEGITIMATE }
    enum ReportStatus { OPEN, RESOLVED_FAKE, RESOLVED_LEGITIMATE }

    struct Report {
        bytes32 postId;
        address reporter;
        string reason;
        ReportStatus status;
        uint256 createdAt;
        uint256 fakesCount;
        uint256 legitimateCount;
    }

    UserRegistry public userRegistry;

    mapping(bytes32 => Report) private reports;
    mapping(bytes32 => mapping(address => VoteType)) private votes;
    bytes32[] private reportIds;

    uint256 public constant VOTE_THRESHOLD = 5;
    uint256 public constant REPUTATION_PENALTY = 10;
    uint256 public constant REPUTATION_REWARD = 5;

    event PostReported(bytes32 indexed reportId, bytes32 indexed postId, address indexed reporter, uint256 timestamp);
    event VoteCast(bytes32 indexed reportId, address indexed voter, VoteType voteType, uint256 timestamp);
    event ReportResolved(bytes32 indexed reportId, ReportStatus status, uint256 timestamp);
    event ReputationUpdated(address indexed user, uint256 newScore, uint256 timestamp);

    constructor(address _userRegistryAddress) {
        userRegistry = UserRegistry(_userRegistryAddress);
    }

    function reportPost(
        bytes32 _reportId,
        bytes32 _postId,
        string calldata _reason
    ) external {
        require(!_reportExists(_reportId), "Report already exists");
        require(bytes(_reason).length > 0, "Reason required");

        reports[_reportId] = Report({
            postId: _postId,
            reporter: msg.sender,
            reason: _reason,
            status: ReportStatus.OPEN,
            createdAt: block.timestamp,
            fakesCount: 0,
            legitimateCount: 0
        });

        reportIds.push(_reportId);
        emit PostReported(_reportId, _postId, msg.sender, block.timestamp);
    }

    function castVote(bytes32 _reportId, VoteType _vote) external {
        require(_reportExists(_reportId), "Report does not exist");
        require(reports[_reportId].status == ReportStatus.OPEN, "Report already resolved");
        require(_vote != VoteType.NONE, "Invalid vote");
        require(votes[_reportId][msg.sender] == VoteType.NONE, "Already voted");

        votes[_reportId][msg.sender] = _vote;

        if (_vote == VoteType.FAKE) {
            reports[_reportId].fakesCount++;
        } else {
            reports[_reportId].legitimateCount++;
        }

        emit VoteCast(_reportId, msg.sender, _vote, block.timestamp);

        _checkResolution(_reportId);
    }

    function _checkResolution(bytes32 _reportId) private {
        Report storage r = reports[_reportId];
        uint256 totalVotes = r.fakesCount + r.legitimateCount;

        if (totalVotes < VOTE_THRESHOLD) return;

        if (r.fakesCount > r.legitimateCount) {
            r.status = ReportStatus.RESOLVED_FAKE;
            _penalizeReputation(r.reporter);
        } else {
            r.status = ReportStatus.RESOLVED_LEGITIMATE;
            _rewardReputation(r.reporter);
        }

        emit ReportResolved(_reportId, r.status, block.timestamp);
    }

    function _penalizeReputation(address _user) private {
        uint256 current = userRegistry.getReputationScore(_user);
        uint256 newScore = current > REPUTATION_PENALTY ? current - REPUTATION_PENALTY : 0;
        userRegistry.updateReputation(_user, newScore);
        emit ReputationUpdated(_user, newScore, block.timestamp);
    }

    function _rewardReputation(address _user) private {
        uint256 current = userRegistry.getReputationScore(_user);
        uint256 newScore = current + REPUTATION_REWARD > 1000 ? 1000 : current + REPUTATION_REWARD;
        userRegistry.updateReputation(_user, newScore);
        emit ReputationUpdated(_user, newScore, block.timestamp);
    }

    function getReport(bytes32 _reportId) external view returns (
        bytes32 postId,
        address reporter,
        string memory reason,
        ReportStatus status,
        uint256 fakesCount,
        uint256 legitimateCount,
        uint256 createdAt
    ) {
        require(_reportExists(_reportId), "Report does not exist");
        Report storage r = reports[_reportId];
        return (r.postId, r.reporter, r.reason, r.status, r.fakesCount, r.legitimateCount, r.createdAt);
    }

    function getReportCount() external view returns (uint256) {
        return reportIds.length;
    }

    function hasVoted(bytes32 _reportId, address _voter) external view returns (bool) {
        return votes[_reportId][_voter] != VoteType.NONE;
    }

    function _reportExists(bytes32 _reportId) private view returns (bool) {
        return reports[_reportId].createdAt != 0;
    }
}
