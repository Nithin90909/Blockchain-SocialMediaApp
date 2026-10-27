import { expect } from "chai";
import { ethers } from "hardhat";
import { UserRegistry } from "../typechain-types";

describe("UserRegistry", function () {
  let userRegistry: UserRegistry;
  let owner: any;
  let addr1: any;
  let addr2: any;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("UserRegistry");
    userRegistry = await Factory.deploy();
    await userRegistry.waitForDeployment();
  });

  describe("Registration", function () {
    it("should register a new user", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      const user = await userRegistry.getUser(addr1.address);
      expect(user.username).to.equal("alice");
      expect(user.reputationScore).to.equal(100);
      expect(user.exists).to.be.true;
    });

    it("should reject duplicate registration", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      await expect(
        userRegistry.connect(addr1).registerUser("alice2")
      ).to.be.revertedWith("User already registered");
    });

    it("should reject duplicate username", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      await expect(
        userRegistry.connect(addr2).registerUser("alice")
      ).to.be.revertedWith("Username taken");
    });

    it("should reject empty username", async function () {
      await expect(
        userRegistry.connect(addr1).registerUser("")
      ).to.be.revertedWith("Invalid username length");
    });
  });

  describe("Reputation", function () {
    it("should update reputation score", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      await userRegistry.updateReputation(addr1.address, 200);
      const score = await userRegistry.getReputationScore(addr1.address);
      expect(score).to.equal(200);
    });

    it("should reject score above maximum", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      await expect(
        userRegistry.updateReputation(addr1.address, 1001)
      ).to.be.revertedWith("Score exceeds maximum");
    });
  });

  describe("Queries", function () {
    it("should resolve username to address", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      const resolved = await userRegistry.resolveUsername("alice");
      expect(resolved).to.equal(addr1.address);
    });

    it("should return correct user count", async function () {
      await userRegistry.connect(addr1).registerUser("alice");
      await userRegistry.connect(addr2).registerUser("bob");
      expect(await userRegistry.getUserCount()).to.equal(2);
    });
  });
});
