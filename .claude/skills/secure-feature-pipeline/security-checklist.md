# Security Analysis Checklist

Use this checklist during the **brainstorm step** to identify security concerns before writing the spec.

## OWASP Top 10 Relevance

For each item, assess if the new feature introduces or is affected by:

| # | Vulnerability | Relevant? | Notes |
|---|--------------|-----------|-------|
| A01 | Broken Access Control | | Can users access other dealerships' data? |
| A02 | Cryptographic Failures | | Are we storing/transmitting sensitive data? |
| A03 | Injection | | Does this accept user input that hits DB/shell/HTML? |
| A04 | Insecure Design | | Are there flaws in the business logic? |
| A05 | Security Misconfiguration | | New configs, endpoints, or defaults? |
| A06 | Vulnerable Components | | New dependencies introduced? |
| A07 | Authentication Failures | | Does this affect login/session/token flows? |
| A08 | Data Integrity Failures | | Can data be tampered with? |
| A09 | Logging Failures | | Are security events properly logged? |
| A10 | SSRF | | Does this make server-side requests based on user input? |

## Inventory-Specific Concerns

| Concern | Question | Assessment |
|---------|----------|------------|
| Dealership data isolation | Can one dealership view/modify another's vehicles? | |
| Stock date manipulation | Can stocked_at dates be backdated to avoid aging flags? | |
| Action integrity | Can vehicle actions be modified/deleted (should be append-only)? | |
| Price manipulation | Can vehicle prices be set to negative or unreasonable values? | |
| Bulk operations | Can mass updates corrupt data or bypass validation? | |
| Aging stock computation | Can the aging threshold (90 days) be bypassed or manipulated? | |
| Audit trail | Are all vehicle actions logged with who/when? | |
| VIN uniqueness | Can duplicate VINs be inserted for different vehicles? | |

## Encryption & Data Protection

| Concern | Question | Assessment |
|---------|----------|------------|
| **TLS in transit** | Are all client-server communications over HTTPS/TLS? No mixed content? | |
| **Database encryption** | Is PostgreSQL configured with SSL connections? | |
| **Sensitive fields** | Are any passwords/tokens stored securely (hashed, not plaintext)? | |
| **API keys** | Are all API keys and secrets in environment variables, not code? | |
| **Client-side storage** | Is sensitive data stored in localStorage/sessionStorage appropriately? | |

## Compliance & Data Governance

| Concern | Question | Assessment |
|---------|----------|------------|
| **Data retention** | How long is vehicle and action data kept? Is there a retention policy? | |
| **Data export** | Can dealership managers export their inventory data? | |
| **Audit logging** | Are vehicle actions logged with sufficient detail for review? | |
| **Data minimization** | Does the feature collect only necessary data? | |
| **Multi-tenancy** | Is dealership data properly isolated at the database level? | |

## Authorization Matrix

For each operation in the feature, define who can do what:

| Operation | Dealership Manager | Other Dealership | Unauthenticated | Notes |
|-----------|-------------------|-----------------|-----------------|-------|
| Create | | | | |
| Read | | | | |
| Update | | | | |
| Delete | | | | |
| List | | | | |

## Data Classification

| Data Field | Sensitivity | Protection Required |
|------------|------------|-------------------|
| | Public / Internal / Confidential / Restricted | |

## External Dependency Risk Assessment

### Third-Party API Trust Assessment

*This application is currently self-contained with no external API dependencies. If external integrations are added in the future, assess each one here.*

| External Service | Data Exchanged | Trust Level | Failure Impact | Compromise Impact | Mitigations |
|-----------------|----------------|-------------|----------------|-------------------|-------------|
| PostgreSQL | All domain data | High (primary store) | Application down | Full data breach | Connection encryption, parameterized queries, backup strategy |

### Package/Dependency Assessment

| Concern | Question | Assessment |
|---------|----------|------------|
| New Go modules | Any new backend dependencies? License compatible? Security advisories? | |
| New npm packages | Any new frontend dependencies? Are they maintained? Known vulnerabilities? | |
| Transitive dependencies | Do new packages pull in risky transitive dependencies? | |
| Supply chain | Are packages pinned to exact versions? Lock files committed? | |

### Failure Mode Analysis

| Service | Failure Scenario | Application Behavior | User Impact |
|---------|------------------|---------------------|-------------|
| PostgreSQL down | Connection refused | All operations fail | Full outage — show error page |
| Backend down | API timeout/5xx | Frontend shows errors | Cannot view/manage inventory |
| Frontend build broken | Static assets fail | Blank page | Cannot access dashboard |

## Input Validation Requirements

| Input | Type | Constraints | Server-side Validation |
|-------|------|------------|----------------------|
| VIN | string | Exactly 17 alphanumeric characters | required |
| Price | decimal | Positive, reasonable range (e.g., 0-10,000,000) | required |
| Year | integer | 1900-current year+1 | required |
| Make/Model | string | Max length, alphanumeric + common chars | required |
| Status | enum | Known values only (e.g., available, sold, pending) | required |
| stocked_at | date | Must be past date, reasonable range | required |
| Action type | enum | Known values only | required |
| Action notes | string | Max length, sanitized for XSS | required |
| Dealership ID | UUID | Valid UUID format | required |
| Page/page_size | integer | Positive, max page_size limit (e.g., 100) | required |

## Data Flow Diagram (DFD) — REQUIRED Before STRIDE

**Draw a DFD before applying STRIDE.** STRIDE applied without data flows is ad-hoc and misses threats at boundary crossings.

### How to Create the DFD

Map every data flow for the feature using this template:

```
[Source] --( data description )--> [Trust Boundary] --( validated data )--> [Destination]
```

**DFD Elements:**

| Element | Symbol | Example |
|---------|--------|---------|
| External entity | Rectangle | Dealership Manager, Browser |
| Process | Circle/Rounded | Vehicle Handler, Inventory Service |
| Data store | Parallel lines | PostgreSQL |
| Data flow | Arrow with label | "vehicle data", "action log entry" |
| **Trust boundary** | **Dashed line** | **Internet <-> App, App <-> DB** |

**DFD Template (fill for your feature):**

```markdown
### Data Flows

| # | Source | Data | Trust Boundary Crossed? | Destination | Notes |
|---|--------|------|------------------------|-------------|-------|
| 1 | Manager (browser) | Form input | Yes: Internet -> App | REST Handler | Untrusted input |
| 2 | REST Handler | Parsed request | No (same tier) | Service Layer | Validated by handler |
| 3 | Service Layer | Domain model | Yes: App -> DB | PostgreSQL | pgx parameterized |

### Trust Boundaries in This Feature

| Boundary | Crossed By | Security Control Required |
|----------|-----------|--------------------------|
| Internet -> Application | User requests | Input validation + middleware |
| Application -> Database | Queries | Parameterized queries (pgx), dealership scope check |
```

**Apply STRIDE to each trust boundary crossing** (not just to the feature as a whole):

## Threat Modeling (STRIDE per Trust Boundary)

For **each trust boundary crossing** identified in the DFD above, apply STRIDE:

| Data Flow # | Boundary | Threat | Description | Applies? | Mitigation |
|-------------|----------|--------|------------|----------|------------|
| | Internet -> App | **S**poofing | Can identity be faked? | | |
| | Internet -> App | **T**ampering | Can request data be modified? | | |
| | Internet -> App | **R**epudiation | Can actions be denied later? | | |
| | Internet -> App | **I**nfo Disclosure | Can error messages leak internals? | | |
| | Internet -> App | **D**oS | Can the endpoint be overwhelmed? | | |
| | Internet -> App | **E**levation | Can a user gain higher access? | | |
| | App -> DB | **T**ampering | Can SQL injection modify data? | | |
| | App -> DB | **I**nfo Disclosure | Can queries leak other dealerships' data? | | |
