import { expect } from "chai";
import { ethers } from "hardhat";
import { PostRegistry } from "../typechain-types";

describe("PostRegistry", function () {
  let postRegistry: PostRegistry;
  let owner: any;
  let addr1: any;
  let addr2: any;

  const samplePostId = ethers.keccak256(ethers.toUtf8Bytes("post-1"));
  const sampleHash = ethers.keccak256(ethers.toUtf8Bytes("Hello world content"));

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("PostRegistry");
    postRegistry = await Factory.deploy();
    await postRegistry.waitForDeployment();
  });

  describe("Post Creation", function () {
    it("should create a public post", async function () {
      await postRegistry.connect(addr1).createPost(samplePostId, sampleHash, 0);
      const post = await postRegistry.getPost(samplePostId);
      expect(post.owner).to.equal(addr1.address);
      expect(post.contentHash).to.equal(sampleHash);
      expect(post.visibility).to.equal(0); // PUBLIC
    });

    it("should reject duplicate post ID", async function () {
      await postRegistry.connect(addr1).createPost(samplePostId, sampleHash, 0);
      await expect(
        postRegistry.connect(addr2).createPost(samplePostId, sampleHash, 0)
      ).to.be.revertedWith("Post ID already exists");
    });

    it("should increment total posts", async function () {
      await postRegistry.connect(addr1).createPost(samplePostId, sampleHash, 0);
      expect(await postRegistry.totalPosts()).to.equal(1);
    });
  });

  describe("Access Control", function () {
    const privatePostId = ethers.keccak256(ethers.toUtf8Bytes("private-post"));

    beforeEach(async function () {
      await postRegistry.connect(addr1).createPost(privatePostId, sampleHash, 2); // PRIVATE
    });

    it("should deny access to private post by default", async function () {
      const access = await postRegistry.canAccess(privatePostId, addr2.address);
      expect(access).to.be.false;
    });

    it("should grant access to specific viewer", async function () {
      await postRegistry.connect(addr1).grantAccess(privatePostId, addr2.address);
      const access = await postRegistry.canAccess(privatePostId, addr2.address);
      expect(access).to.be.true;
    });

    it("should revoke previously granted access", async function () {
      await postRegistry.connect(addr1).grantAccess(privatePostId, addr2.address);
      await postRegistry.connect(addr1).revokeAccess(privatePostId, addr2.address);
      const access = await postRegistry.canAccess(privatePostId, addr2.address);
      expect(access).to.be.false;
    });

    it("should allow owner to always access their post", async function () {
      const access = await postRegistry.canAccess(privatePostId, addr1.address);
      expect(access).to.be.true;
    });
  });

  describe("Integrity Verification", function () {
    it("should verify matching content hash", async function () {
      await postRegistry.connect(addr1).createPost(samplePostId, sampleHash, 0);
      const valid = await postRegistry.verifyPostIntegrity(samplePostId, sampleHash);
      expect(valid).to.be.true;
    });

    it("should reject non-matching content hash", async function () {
      await postRegistry.connect(addr1).createPost(samplePostId, sampleHash, 0);
      const fakeHash = ethers.keccak256(ethers.toUtf8Bytes("tampered content"));
      const valid = await postRegistry.verifyPostIntegrity(samplePostId, fakeHash);
      expect(valid).to.be.false;
    });
  });
});
