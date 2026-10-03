# assets/i18n

Translation files for ngx-translate, loaded at runtime from `assets/i18n/<lang>.json` by `provideTranslateHttpLoader` (configured in `app.module.ts`).

| File      | Language                               |
| --------- | -------------------------------------- |
| `de.json` | German (default and fallback language) |
| `en.json` | English                                |

Keys are nested by feature (`auth`, `login`, `title`, `journey`, `collection`, `filter-blocks`, `filter-block`, `datafile`, `browseJourney`, `createUpdateDatafile`, `viewAllDatafiles`, `map`, `upload`, `threejs`, …) and used as `{{ 'title.upload' | translate }}` or `translate.instant('…')`. The language is switched in the header (`shared/header`) and stored in `localStorage['language']`.

Original author: Florian Jäger (translation, PR #79).

Gotchas: keep both files in sync; a missing key is rendered as the key itself. Filter operation labels are built dynamically (`filter-block.operation-<op>` lower-cased).
