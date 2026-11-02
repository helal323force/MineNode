# Security Specification - MineNode

## Data Invariants
1. **User Ownership**: A BotProfile or Feature must belong to the user who created it (userId == request.auth.uid).
2. **Admin Supremacy**: Admins can read/write any document to moderate the platform.
3. **Public Exposure**: Only 'approved' features with 'isPublic: true' are readable by other users.
4. **Immutable Identities**: userId and email fields cannot be changed after creation.
5. **Role Integrity**: Only admins can modify user roles or limits.
6. **Activity Transparency**: Activity logs are write-only by the system (Admin SDK) and readable by the owner or admin.

## The "Dirty Dozen" Payloads (Expect: PERMISSION_DENIED)

### 1. Identity Spoofing (Create Bot as someone else)
- **Target**: `/botProfiles/malicious-bot`
- **Payload**: `{ "userId": "victim-uid", "name": "Fake", ... }`
- **User**: `attacker-uid`

### 2. Privilege Escalation (Self-promote to Admin)
- **Target**: `/users/attacker-uid`
- **Payload**: `{ "role": "admin" }`
- **User**: `attacker-uid`

### 3. Resource Poisoning (Giant Hostname)
- **Target**: `/botProfiles/bot-123`
- **Payload**: `{ "serverHost": "A".repeat(2000), ... }`
- **User**: `attacker-uid`

### 4. Shadow Field Injection (Setting Verified Status)
- **Target**: `/features/feat-123`
- **Payload**: `{ "status": "approved", "isPublic": true, ... }`
- **User**: `attacker-uid` (non-admin)

### 5. Orphaned Write (Bot without User)
- **Target**: `/botProfiles/bot-123`
- **Payload**: `{ "userId": "non-existent-user", ... }`
- **User**: `attacker-uid`

### 6. State Shortcutting (Bypass Moderation)
- **Target**: `/features/feat-123`
- **Payload**: `{ "status": "approved" }` (on update)
- **User**: `attacker-uid`

### 7. Denial of Wallet (Giant JSON in details)
- **Target**: `/activityLogs/log-123`
- **Payload**: `{ "details": "B".repeat(50000), ... }`
- **User**: `attacker-uid`

### 8. PII Leak (Reading another user's profile)
- **Target**: `/users/victim-uid`
- **Action**: `get`
- **User**: `attacker-uid`

### 9. Illegal Feature Execution (Setting malformed permissions)
- **Target**: `/features/feat-123`
- **Payload**: `{ "permissions": ["root", "shell", "rm-rf"], ... }`
- **User**: `attacker-uid`

### 10. Timestamp Fraud (Forging createdAt)
- **Target**: `/botProfiles/bot-123`
- **Payload**: `{ "createdAt": "2020-01-01T00:00:00Z", ... }`
- **User**: `attacker-uid`

### 11. Immutable Field Update (Changing userId)
- **Target**: `/botProfiles/bot-123`
- **Payload**: `{ "userId": "new-uid" }`
- **User**: `attacker-uid`

### 12. Unauthorized List Scraping (Fetching all private features)
- **Target**: `/features`
- **Action**: `list`
- **User**: `attacker-uid` (should only see own or public approved)
