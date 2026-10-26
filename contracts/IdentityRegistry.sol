// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title IdentityRegistry
 * @dev Secure, tamper-evident decentralized registry for pseudonymous digital identities.
 * Stores only pseudonymous identifiers (e.g., DIDs) and cryptographic commitment hashes.
 * Never stores plain-text passwords, personal details, or sensitive credentials on-chain.
 */
contract IdentityRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    enum IdentityStatus {
        None,
        Pending,
        Verified,
        Rejected,
        Revoked
    }

    struct IdentityRecord {
        string identifier;
        bytes32 commitmentHash;
        IdentityStatus status;
        uint256 registeredAt;
        uint256 updatedAt;
        address registrant;
        address updatedBy;
        string statusReason;
    }

    // Mapping from pseudonymous identifier to record
    mapping(string => IdentityRecord) private _identities;

    // Array of all identifiers for query/explorer purposes
    string[] private _identifierList;

    // Mapping to check existence
    mapping(string => bool) private _isRegistered;

    // Counters for analytics
    uint256 public totalRegistered;
    uint256 public totalVerified;
    uint256 public totalPending;
    uint256 public totalRejected;
    uint256 public totalRevoked;

    // Events
    event IdentityRegistered(
        string indexed identifier,
        bytes32 commitmentHash,
        address indexed registrant,
        uint256 timestamp
    );

    event IdentityApproved(
        string indexed identifier,
        address indexed verifier,
        uint256 timestamp
    );

    event IdentityRejected(
        string indexed identifier,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );

    event IdentityRevoked(
        string indexed identifier,
        address indexed verifier,
        string reason,
        uint256 timestamp
    );

    // Custom Errors
    error IdentityAlreadyRegistered(string identifier);
    error IdentityNotFound(string identifier);
    error InvalidStatusTransition(IdentityStatus current, IdentityStatus target);
    error EmptyIdentifier();

    constructor(address defaultAdmin) {
        address admin = defaultAdmin == address(0) ? msg.sender : defaultAdmin;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
    }

    /**
     * @dev Register a new pseudonymous identity record.
     * @param identifier Unique pseudonymous identifier (e.g., "did:chainverify:<hash>")
     * @param commitmentHash Cryptographic commitment of the identity profile
     */
    function registerIdentity(
        string calldata identifier,
        bytes32 commitmentHash
    ) external nonReentrant {
        if (bytes(identifier).length == 0) revert EmptyIdentifier();
        if (_isRegistered[identifier]) revert IdentityAlreadyRegistered(identifier);

        _identities[identifier] = IdentityRecord({
            identifier: identifier,
            commitmentHash: commitmentHash,
            status: IdentityStatus.Pending,
            registeredAt: block.timestamp,
            updatedAt: block.timestamp,
            registrant: msg.sender,
            updatedBy: msg.sender,
            statusReason: "Initial registration pending verification"
        });

        _identifierList.push(identifier);
        _isRegistered[identifier] = true;

        totalRegistered += 1;
        totalPending += 1;

        emit IdentityRegistered(identifier, commitmentHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Approve an identity verification request.
     * Only authorized verifiers or admins can call this function.
     */
    function approveIdentity(
        string calldata identifier
    ) external onlyRole(VERIFIER_ROLE) nonReentrant {
        if (!_isRegistered[identifier]) revert IdentityNotFound(identifier);
        IdentityRecord storage record = _identities[identifier];

        if (record.status == IdentityStatus.Verified) {
            revert InvalidStatusTransition(record.status, IdentityStatus.Verified);
        }

        if (record.status == IdentityStatus.Pending) {
            totalPending -= 1;
        } else if (record.status == IdentityStatus.Rejected) {
            totalRejected -= 1;
        } else if (record.status == IdentityStatus.Revoked) {
            totalRevoked -= 1;
        }

        record.status = IdentityStatus.Verified;
        record.updatedAt = block.timestamp;
        record.updatedBy = msg.sender;
        record.statusReason = "Identity verification approved by authorized verifier";

        totalVerified += 1;

        emit IdentityApproved(identifier, msg.sender, block.timestamp);
    }

    /**
     * @dev Reject an identity verification request with reason.
     * Only authorized verifiers or admins can call this function.
     */
    function rejectIdentity(
        string calldata identifier,
        string calldata reason
    ) external onlyRole(VERIFIER_ROLE) nonReentrant {
        if (!_isRegistered[identifier]) revert IdentityNotFound(identifier);
        IdentityRecord storage record = _identities[identifier];

        if (record.status == IdentityStatus.Pending) {
            totalPending -= 1;
        } else if (record.status == IdentityStatus.Verified) {
            totalVerified -= 1;
        }

        record.status = IdentityStatus.Rejected;
        record.updatedAt = block.timestamp;
        record.updatedBy = msg.sender;
        record.statusReason = bytes(reason).length > 0 ? reason : "Identity verification rejected";

        totalRejected += 1;

        emit IdentityRejected(identifier, msg.sender, record.statusReason, block.timestamp);
    }

    /**
     * @dev Revoke a previously verified identity.
     * Only authorized verifiers or admins can call this function.
     */
    function revokeIdentity(
        string calldata identifier,
        string calldata reason
    ) external onlyRole(VERIFIER_ROLE) nonReentrant {
        if (!_isRegistered[identifier]) revert IdentityNotFound(identifier);
        IdentityRecord storage record = _identities[identifier];

        if (record.status != IdentityStatus.Verified) {
            revert InvalidStatusTransition(record.status, IdentityStatus.Revoked);
        }

        totalVerified -= 1;
        totalRevoked += 1;

        record.status = IdentityStatus.Revoked;
        record.updatedAt = block.timestamp;
        record.updatedBy = msg.sender;
        record.statusReason = bytes(reason).length > 0 ? reason : "Identity revoked by authorized administrator";

        emit IdentityRevoked(identifier, msg.sender, record.statusReason, block.timestamp);
    }

    /**
     * @dev Check if an identifier is currently verified.
     */
    function isVerified(string calldata identifier) external view returns (bool) {
        return _identities[identifier].status == IdentityStatus.Verified;
    }

    /**
     * @dev Read full record for an identifier.
     */
    function getIdentity(
        string calldata identifier
    ) external view returns (IdentityRecord memory) {
        if (!_isRegistered[identifier]) revert IdentityNotFound(identifier);
        return _identities[identifier];
    }

    /**
     * @dev Returns total number of registered identifiers.
     */
    function getIdentifierCount() external view returns (uint256) {
        return _identifierList.length;
    }

    /**
     * @dev Returns list of all registered identifiers.
     */
    function getAllIdentifiers() external view returns (string[] memory) {
        return _identifierList;
    }

    /**
     * @dev Aggregated metrics for dashboards and explorer.
     */
    function getMetrics()
        external
        view
        returns (
            uint256 registered,
            uint256 verified,
            uint256 pending,
            uint256 rejected,
            uint256 revoked
        )
    {
        return (
            totalRegistered,
            totalVerified,
            totalPending,
            totalRejected,
            totalRevoked
        );
    }
}
