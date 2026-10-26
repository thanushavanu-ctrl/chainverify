import { expect } from "chai";
import { ethers } from "hardhat";
import { IdentityRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("IdentityRegistry Smart Contract", function () {
  let identityRegistry: IdentityRegistry;
  let admin: SignerWithAddress;
  let verifier: SignerWithAddress;
  let user: SignerWithAddress;
  let unauthorized: SignerWithAddress;

  const testIdentifier = "did:chainverify:usr_a7f98e10b2345c";
  const testCommitment = ethers.keccak256(ethers.toUtf8Bytes("identity_profile_payload_1"));

  beforeEach(async function () {
    [admin, verifier, user, unauthorized] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("IdentityRegistry");
    identityRegistry = await Factory.deploy(admin.address);
    await identityRegistry.waitForDeployment();

    // Grant VERIFIER_ROLE to verifier
    const verifierRole = await identityRegistry.VERIFIER_ROLE();
    await identityRegistry.connect(admin).grantRole(verifierRole, verifier.address);
  });

  describe("Deployment and Access Control", function () {
    it("should assign DEFAULT_ADMIN_ROLE and VERIFIER_ROLE to deployer", async function () {
      const adminRole = await identityRegistry.DEFAULT_ADMIN_ROLE();
      const verifierRole = await identityRegistry.VERIFIER_ROLE();

      expect(await identityRegistry.hasRole(adminRole, admin.address)).to.be.true;
      expect(await identityRegistry.hasRole(verifierRole, admin.address)).to.be.true;
      expect(await identityRegistry.hasRole(verifierRole, verifier.address)).to.be.true;
      expect(await identityRegistry.hasRole(verifierRole, unauthorized.address)).to.be.false;
    });
  });

  describe("Identity Registration", function () {
    it("should successfully register an identity with Pending status", async function () {
      const tx = await identityRegistry.connect(user).registerIdentity(testIdentifier, testCommitment);
      await expect(tx)
        .to.emit(identityRegistry, "IdentityRegistered")
        .withArgs(testIdentifier, testCommitment, user.address, (val: any) => val > 0);

      const record = await identityRegistry.getIdentity(testIdentifier);
      expect(record.identifier).to.equal(testIdentifier);
      expect(record.commitmentHash).to.equal(testCommitment);
      expect(record.status).to.equal(1); // 1 = Pending
      expect(record.registrant).to.equal(user.address);

      expect(await identityRegistry.isVerified(testIdentifier)).to.be.false;

      const metrics = await identityRegistry.getMetrics();
      expect(metrics.registered).to.equal(1);
      expect(metrics.pending).to.equal(1);
    });

    it("should reject duplicate registration of the same identifier", async function () {
      await identityRegistry.connect(user).registerIdentity(testIdentifier, testCommitment);
      await expect(
        identityRegistry.connect(user).registerIdentity(testIdentifier, testCommitment)
      ).to.be.revertedWithCustomError(identityRegistry, "IdentityAlreadyRegistered");
    });

    it("should reject empty identifier", async function () {
      await expect(
        identityRegistry.connect(user).registerIdentity("", testCommitment)
      ).to.be.revertedWithCustomError(identityRegistry, "EmptyIdentifier");
    });
  });

  describe("Identity Verification & Approval", function () {
    beforeEach(async function () {
      await identityRegistry.connect(user).registerIdentity(testIdentifier, testCommitment);
    });

    it("should allow an authorized verifier to approve an identity", async function () {
      const tx = await identityRegistry.connect(verifier).approveIdentity(testIdentifier);
      await expect(tx)
        .to.emit(identityRegistry, "IdentityApproved")
        .withArgs(testIdentifier, verifier.address, (val: any) => val > 0);

      const record = await identityRegistry.getIdentity(testIdentifier);
      expect(record.status).to.equal(2); // 2 = Verified
      expect(await identityRegistry.isVerified(testIdentifier)).to.be.true;

      const metrics = await identityRegistry.getMetrics();
      expect(metrics.verified).to.equal(1);
      expect(metrics.pending).to.equal(0);
    });

    it("should reject approval attempts by unauthorized accounts", async function () {
      await expect(
        identityRegistry.connect(unauthorized).approveIdentity(testIdentifier)
      ).to.be.revertedWithCustomError(identityRegistry, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Identity Rejection", function () {
    beforeEach(async function () {
      await identityRegistry.connect(user).registerIdentity(testIdentifier, testCommitment);
    });

    it("should allow a verifier to reject with a reason", async function () {
      const reason = "ID document expired";
      const tx = await identityRegistry.connect(verifier).rejectIdentity(testIdentifier, reason);

      await expect(tx)
        .to.emit(identityRegistry, "IdentityRejected")
        .withArgs(testIdentifier, verifier.address, reason, (val: any) => val > 0);

      const record = await identityRegistry.getIdentity(testIdentifier);
      expect(record.status).to.equal(3); // 3 = Rejected
      expect(record.statusReason).to.equal(reason);
      expect(await identityRegistry.isVerified(testIdentifier)).to.be.false;

      const metrics = await identityRegistry.getMetrics();
      expect(metrics.rejected).to.equal(1);
      expect(metrics.pending).to.equal(0);
    });
  });

  describe("Identity Revocation", function () {
    beforeEach(async function () {
      await identityRegistry.connect(user).registerIdentity(testIdentifier, testCommitment);
      await identityRegistry.connect(verifier).approveIdentity(testIdentifier);
    });

    it("should allow verifier to revoke a verified identity", async function () {
      const reason = "Compromised credentials detected";
      const tx = await identityRegistry.connect(verifier).revokeIdentity(testIdentifier, reason);

      await expect(tx)
        .to.emit(identityRegistry, "IdentityRevoked")
        .withArgs(testIdentifier, verifier.address, reason, (val: any) => val > 0);

      const record = await identityRegistry.getIdentity(testIdentifier);
      expect(record.status).to.equal(4); // 4 = Revoked
      expect(await identityRegistry.isVerified(testIdentifier)).to.be.false;

      const metrics = await identityRegistry.getMetrics();
      expect(metrics.verified).to.equal(0);
      expect(metrics.revoked).to.equal(1);
    });

    it("should prevent revoking an unverified identity", async function () {
      const id2 = "did:chainverify:usr_second";
      await identityRegistry.connect(user).registerIdentity(id2, testCommitment);

      await expect(
        identityRegistry.connect(verifier).revokeIdentity(id2, "Not verified yet")
      ).to.be.revertedWithCustomError(identityRegistry, "InvalidStatusTransition");
    });
  });
});
