# Security Specification

## Data Invariants
1. Users can only read and write their own profile and certificate configurations.
2. A Certificate configuration (`templates`) cannot exist without a valid ownerId that matches the user's UID.

## The "Dirty Dozen" Payloads
1. Cross-user read: User A attempts to read User B's template.
2. Cross-user write: User A attempts to overwrite User B's template.
3. Identity Spoofing: User A attempts to create a template with `ownerId` set to User B.
4. Unauthenticated read: Anonymous user tries to read templates.
5. Unauthenticated write: Anonymous user tries to write a template.
6. Schema Violation: Missing `ownerId` on create.
7. Schema Violation: `logoImg` is not a string.
8. Schema Violation: `title` exceeds maximum size.
9. Denial of Wallet: Array of `grades` exceeds 20 items.
10. Update Integrity: User attempts to modify `ownerId` during update.
11. ID Poisoning: User tries to use a template ID with 200 characters.
12. PII Leak: Unauthenticated user accesses User Profile data.
