# journey/continue-journey-dialog

`ContinueJourneyDialogComponent`: dialog opened by `JourneyService.saveJourney()`.

- Data: the current `Journey` (prefills title, description, tags).
- Title is required, min. 3 characters (error keys `continueJourneyDialog.requiredError` / `minLengthError`).
- Tags are edited as Material chips.
- `confirm()` closes with `{ title, description, tags }`; `cancel()` closes without result (nothing is saved).

Gotcha: the selector is `app-input-dialog`, the same as `shared/input-dialog`; both are only opened through `MatDialog`, never used as elements.
