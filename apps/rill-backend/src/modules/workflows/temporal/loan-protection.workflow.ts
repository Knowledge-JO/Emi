// TODO: The reference durable workflow:
//   START → Monitor → Wait → Check
//                              ├── HF > 1.3 ──▶ WAIT
//                              └── HF < 1.3 ──▶ Execute → Verify → COMPLETE
// Workflow code must stay deterministic: no direct I/O, no Date.now(), no random — everything
// external goes through an activity. Re-check that the Altana session is still valid and unexpired
// before each execute; a multi-day workflow will outlive short sessions.
