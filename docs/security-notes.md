# Security Notes

## Security Posture

RefundIQ is designed as a CPA-assist workflow with sensitive PII in mind. This repository includes security-oriented scaffolding, but production deployment still requires platform hardening, key management, penetration testing, and reviewed operational controls.

## Core Controls

- Supabase Auth for session-backed authentication
- Role-based access control for `client`, `preparer`, and `admin`
- Private document storage with signed URL access only
- Row-level security on case-linked records
- Audit logs for field edits, estimate runs, exports, and document access
- Consent requirement before client uploads
- PII-redacted application logging
- Retention settings controlled through policy/config

## Files At Rest

- Store documents in a private Supabase bucket
- Use object metadata to track checksum, uploader role, and retention policy
- Add application-layer envelope encryption for especially sensitive exports if required by policy
- Restrict file downloads to signed URLs generated only for authorized users

## Session And Auth Guidance

- Use secure, httpOnly cookies
- Require MFA for preparer and admin roles in production
- Limit admin actions behind separate RBAC checks
- Rotate service-role keys and encryption keys regularly

## Logging Guidance

- Never log SSNs, TINs, full addresses, or raw document text
- Log only document IDs, case IDs, hash fingerprints, and status labels
- Redact extracted-field values when logging parse failures

## Retention Guidance

- Add scheduled cleanup for expired documents and stale cases
- Separate operational retention from legal/document-retention requirements
- Log deletion events to audit history

## Human Review Requirement

The application must always preserve a human-preparer review step before final filing or software entry.
