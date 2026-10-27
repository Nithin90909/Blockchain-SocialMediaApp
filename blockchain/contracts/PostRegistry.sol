// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract PostRegistry {
    enum Visibility { PUBLIC, FOLLOWERS_ONLY, PRIVATE }

    struct Post {
        bytes32 contentHash;
        address owner;
        Visibility visibility;
        uint256 createdAt;
        bool exists;
    }

    mapping(bytes32 => Post) private posts;
    mapping(address => bytes32[]) private userPosts;
    mapping(bytes32 => mapping(address => bool)) private accessList;

    uint256 public totalPosts;

    event PostCreated(
        bytes32 indexed postId,
        address indexed owner,
        bytes32 contentHash,
        Visibility visibility,
        uint256 timestamp
    );

    event VisibilityChanged(bytes32 indexed postId, Visibility newVisibility, uint256 timestamp);
    event AccessGranted(bytes32 indexed postId, address indexed viewer, uint256 timestamp);
    event AccessRevoked(bytes32 indexed postId, address indexed viewer, uint256 timestamp);

    modifier onlyPostOwner(bytes32 _postId) {
        require(posts[_postId].exists, "Post does not exist");
        require(posts[_postId].owner == msg.sender, "Not the post owner");
        _;
    }

    function createPost(
        bytes32 _postId,
        bytes32 _contentHash,
        Visibility _visibility
    ) external {
        require(!posts[_postId].exists, "Post ID already exists");

        posts[_postId] = Post({
            contentHash: _contentHash,
            owner: msg.sender,
            visibility: _visibility,
            createdAt: block.timestamp,
            exists: true
        });

        userPosts[msg.sender].push(_postId);
        totalPosts++;

        emit PostCreated(_postId, msg.sender, _contentHash, _visibility, block.timestamp);
    }

    function getPost(bytes32 _postId) external view returns (
        bytes32 contentHash,
        address owner,
        Visibility visibility,
        uint256 createdAt
    ) {
        require(posts[_postId].exists, "Post does not exist");
        Post storage p = posts[_postId];
        return (p.contentHash, p.owner, p.visibility, p.createdAt);
    }

    function canAccess(bytes32 _postId, address _viewer) external view returns (bool) {
        Post storage p = posts[_postId];
        if (!p.exists) return false;
        if (p.visibility == Visibility.PUBLIC) return true;
        if (p.owner == _viewer) return true;
        return accessList[_postId][_viewer];
    }

    function grantAccess(bytes32 _postId, address _viewer) external onlyPostOwner(_postId) {
        accessList[_postId][_viewer] = true;
        emit AccessGranted(_postId, _viewer, block.timestamp);
    }

    function revokeAccess(bytes32 _postId, address _viewer) external onlyPostOwner(_postId) {
        accessList[_postId][_viewer] = false;
        emit AccessRevoked(_postId, _viewer, block.timestamp);
    }

    function changeVisibility(bytes32 _postId, Visibility _newVisibility) external onlyPostOwner(_postId) {
        posts[_postId].visibility = _newVisibility;
        emit VisibilityChanged(_postId, _newVisibility, block.timestamp);
    }

    function getUserPostCount(address _user) external view returns (uint256) {
        return userPosts[_user].length;
    }

    function getUserPostAtIndex(address _user, uint256 _index) external view returns (bytes32) {
        require(_index < userPosts[_user].length, "Index out of bounds");
        return userPosts[_user][_index];
    }

    function verifyPostIntegrity(bytes32 _postId, bytes32 _contentHash) external view returns (bool) {
        require(posts[_postId].exists, "Post does not exist");
        return posts[_postId].contentHash == _contentHash;
    }
}
