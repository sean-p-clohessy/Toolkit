# Riverside OS Lab

Level 5 Unit 50 Operating Systems: self-guided Weeks 6 and 7, with six original teaching investigations.

## Start a session

- Week 6: https://edutools.uk/os/#week6
- Week 7: https://edutools.uk/os/#week7
- Teaching resources, lecture decks and offline download: `resources.html`.
- Learner instructions: `self-guided.html`.

Each week allows approximately two hours, including a five-minute break. Each investigation has Learn & predict, Experiment, and Explain & review stages. Numbered runs, hints, worked debriefs, a glossary and primary references support independent use. Each week ends with five feedback questions and an evidence-based reflection.

## Completion and evidence

Each investigation records 100 practice points after all required experiments, a correct conclusion, an explanation of at least 80 characters and three self-review checks. Each week additionally requires all five knowledge questions correct, a reflection of at least 120 characters, and reflection self-review. These are completion gates, not automatic marking of prose or Pearson assessment grades.

Progress, notes, model settings and traces save in this browser's localStorage. Export progress creates a JSON backup; Import progress replaces the current local record after confirmation. Session report downloads readable text or prints to PDF. Use a name or alias and submit evidence through the normal course process. There is no teacher dashboard, learner account, cross-device sync or authenticated score table. Private browsing, storage restrictions or cleared browser data can remove local work; export before leaving.

Earlier progress files remain importable. Notes and traces are retained; older completion points need the new required experiments and self-review checks. Unreadable saved records are preserved until the learner chooses recovery or a fresh start.

## Technical notes

Static HTML/CSS/JavaScript, no runtime dependencies, analytics or network calls for core activities. Themes (DOS, XP, Windows 7, Linux/Ubuntu) change appearance only. All models are illustrative, deterministic teaching simulations, not an OS emulator or real operating-system commands. Academic references and model limitations are included in the app.

Serve `index.html` with any static server, or deploy main branch / root with GitHub Pages. For direct offline opening use `Riverside_OS_Lab_Offline.html`; it embeds all application CSS and JavaScript, including the installation and command-workshop modules. Rebuild the offline file whenever those sources change. External reading and lecture downloads still require internet unless separately downloaded. Browser handling of local-file storage varies; JSON export is the portable backup.

Keyboard navigation, native form controls, visible focus, responsive layouts and a printable evidence report are provided. Model checks cover interleavings, deadlock, batch arithmetic, access control, buffer conservation and deadline/memory constraints. The complete self-guided route, export/import validation and saved model replay were checked on 12 November 2026.

## Week 8 installation simulator

Open `index.html#week8`. Original XP-style and FreeDOS-style guided setup screens rehearse legacy BIOS boot media, partition choice, formatting, copy, restart and first use. No OS software is executed. Copy sequences take about eight seconds, with instant/skip controls and reduced-motion support. VER, DIR, MD LAB, CD LAB, CD \, HELP and CLS run in a limited command model.

Installer decisions and commands share the existing progress backup and evidence report. Week 6–7 scores are separate and unchanged. Each installation can be restarted independently. No credentials, product keys or disk permissions are requested.

New modules: `installer.js` (validated event replay, teaching content, rendering) and `installer.css` (scoped retro computer screens). Regenerate the offline file before publication.

## Week 8 command workshop

Open `index.html#commands`, or continue from installation checks. Nine guided sections cover the prompt, paths, folder/text creation, copying/renaming, moving/deleting, searching, attributes, system inspection and an independent handover. Each provides worked examples, a separate task, hints and practical-result/concept checks. Allow roughly 75–90 minutes depending on experience; this is a planning estimate, not a completion timer. Free practice has a separate disk.

`command-model.js` is a deterministic interpreter for a documented subset of commands; it never executes host commands. `command-lab.js` provides instruction, validation, replay, view and report; `commands.css` styles the workshop. Each environment and section has independent saved command history, from which files are replayed. Undo and per-section reset are available. XP/DOS machine outputs are fixed illustrations, not device measurements. Command help lists all supported commands/switches and model boundaries.

The formatting screen introduces disks, partitions, file systems, FAT and NTFS before the choice. NTFS supports the XP scenario; the DOS teaching route uses FAT16. Existing Weeks 6–8 progress remains compatible. Rebuild the offline file and publish all changed modules together.

## EduTools publication

This folder is published as https://edutools.uk/os/ by the Toolkit repository. The source application is maintained in https://github.com/sean-p-clohessy/riverside-os-lab. Refresh the whole os folder together when publishing a new version, including the generated offline HTML and lecture resources. Toolkit deploys its repository root; no domain or workflow change is required.

Progress is scoped to the site origin. To transfer earlier work from the github.io address, export progress there and import that JSON at edutools.uk/os/. The original site remains available.
