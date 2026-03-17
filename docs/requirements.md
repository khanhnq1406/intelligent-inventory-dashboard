# Intelligent Inventory Dashboard

## Domain: Supply

**Task:** Build an Intelligent Inventory Dashboard to give dealership managers a real-time overview of their vehicle stock.

---

## Core Requirements

1. **Inventory Visualization** — Display a filterable list of all vehicles in a dealership's inventory (e.g., filter by make, model, age).
2. **Aging Stock Identification** — Automatically identify and prominently display "aging stock" (vehicles in inventory for >90 days).
3. **Actionable Insights** — Allow a manager to log and persist a status or proposed action for each aging vehicle (e.g., "Price Reduction Planned").

---

## Part 1: System Design

> Use C4 architecture if needed.

Produce a System Design Document that outlines the architectural plan. The document should include:

- An architecture diagram
- A brief description of each component's role
- An explanation of the data flow
- A list of chosen technologies with justifications
- Strategy for observability (e.g., logging, metrics, tracing)
- A dedicated section describing how GenAI was used to assist in the design phase

---

## Part 2: Service Implementation

### Tech Stack

| Layer    | Technology |
| -------- | ---------- |
| Backend  | **Golang** (RESTful API + persistent database) |
| Frontend | **Next.js** (web application) |

> Goal: Find the best framework to generate common types/data structures shared between frontend and backend.

### Implementation Guidelines

- **Backend:** Expose a RESTful API and use a persistent database.
- **Frontend:** Build a web application that demonstrates the full user experience.
- **Build for the Future:** Design and implementation should consider:
  - Scalability
  - Performance
  - Reliability
  - Maintainability
  - Observability

---

## Deliverables & Submission

1. **System Design Document** — Architectural plan.
2. **Working Code** — A Git repository containing the service implementation:
   - `README.md` with clear instructions on how to build, run, and test the application
   - A dedicated section in the README for the **Collaboration Narrative** (high-level strategy for guiding development, process for verifying and refining output, and how final code quality was ensured)
   - A suite of tests that validate the core business logic
