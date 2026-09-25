# KIT Friend

A personal CRM for keeping in touch with people on a schedule.

## Language

**Contact**:
A person the user wants to stay in touch with, belonging to exactly one user.
_Avoid_: friend (a Friend is a Category), person

**Category**:
The kind of relationship a Contact is: Family, Friend, Work or Other. Sets the default interval and the AI summary's framing.

**Interval**:
How many days may pass between Touches before a Contact is due.

**Due status**:
Whether a Contact is overdue, due today or ok, from the last Touch (or creation) plus the Interval, counted in whole UTC days.

**Contact roster**:
One user's Contacts with their Due status, in due order: overdue, then today, then ok, each by earliest due date.

**Touch**:
The user recording that they just got in touch with a Contact, optionally with a note. Resets the Contact's due date.
_Avoid_: check-in, contact (as a verb)

A Touch can be undone right after it is recorded: the last Touch goes back to what it was and the note saved with it is dropped.

**Interaction**:
A saved note from a Touch.

**Relationship memory**:
The AI-maintained summary, key topics and follow-up questions for a Contact, updated from each Touch's note.
_Avoid_: AI summary (that's only one part of it), briefing

**Digest**:
The daily list of overdue, due-today and upcoming Contacts, shown on the digest page and sent by email.
