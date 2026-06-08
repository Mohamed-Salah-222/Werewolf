# Phases

> Execution plan — rough order, may shift as unknowns become known.

## Phase 1: Discovery
- [ ] Audit all existing socket code (both client & server)
- [ ] Document current architecture → [[Reference/Current Socket Architecture]]
- [ ] Catalog all current socket events → [[Ideas/Socket Event Catalog]]
- [ ] Fill [[Discovery/Unknowns & Questions]] as we go

## Phase 2: Design
- [ ] Define the socket event mental model (what's an event? what's not?)
- [ ] Design privilege system → [[Ideas/Privilege Model]]
- [ ] Design state store architecture → [[Ideas/State Store Design]]
- [ ] Define target architecture → [[Reference/Target Socket Architecture]]
- [ ] Get buy-in / review before coding

## Phase 3: Server Refactor
- [ ] Implement new server-side socket handler structure
- [ ] Implement privilege system
- [ ] Route all events through new system
- [ ] Write unit tests for socket handlers

## Phase 4: Client Refactor
- [ ] Refactor client socket connection code
- [ ] Remove old socket code
- [ ] Connect frontend to new state store
- [ ] Write client socket tests

## Phase 5: Integration & Feature Tests
- [ ] End-to-end socket tests
- [ ] Feature tests for game flows
- [ ] Manual QA pass

---

## Retrospective (to fill after)
- What did we miss?
- What was harder than expected?
- What would we do differently?
