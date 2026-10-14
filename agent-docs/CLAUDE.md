# Agent documentation

`agent-docs/CLAUDE.md` is the only file at the top level of `agent-docs/`.
Other agent notes go in these places:

- `ideas/` holds parked proposals, one per file, each in a subfolder named for
  what the proposal waits on. `waiting-on-a-number/` holds proposals that wait
  on a measurement to decide whether to build them. Each file has `name:` and
  `description:` frontmatter; write the description as the sentence that would
  make someone pick the idea up. Once a proposal has a verdict, turn it into an
  ADR if the decision deserves a record, or delete it. To change a proposal's
  status, move its file to another folder.
- For an idea we tried and declined, write a sentence with the measurement in a
  comment at the code that would retry it. Don't start a folder of rejected
  ideas.
- Leave the record of what a session did, and in which commits, to git.

Cite a doc by its path, so that after a move a grep finds every reference. A doc
that needs a "State as of \<date\>" line should be split into the places above.
