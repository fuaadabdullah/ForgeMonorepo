---
title: Dedicated RAG Goblin for Modular Retrieval-Augmented Generation
project: GoblinOS
status: proposed
owner: @fuaadabdullah
type: feature-idea
created: 2025-10-25
---

## Summary

Propose adding a single, dedicated RAG (Retrieval-Augmented Generation) goblin under `GoblinOS/packages/goblins/rag-agent`.

## Rationale

- Keeps RAG logic modular and testable
- Avoids code duplication across goblins
- Allows Overmind to orchestrate RAG tasks via explicit routing
- Preserves workspace structure and agent composition patterns


## Implementation Notes

- Scaffold `rag-agent` goblin using Forge Guild
- Add minimal contract tests and API documentation in `GoblinOS/docs`
- Overmind delegates RAG tasks to this goblin
- Other goblins compose/call RAG goblin as needed


## Status

- Idea logged for future implementation


---
See workspace instructions for agent and goblin composition rules.
