# Content-fit rubric (scoring a real generated course)

Use this when a course was generated with the **real** model. Open the course on a desktop and on a phone,
keep the source files next to it, and give each criterion a score from 1 to 5. Write one line of evidence
per score (a lecture and section, or "none found").

**Do not score the number of different block kinds or widgets.** A good course uses whatever fits the
material; variety for its own sake is not quality.

| # | Criterion | 1 means | 5 means |
| --- | --- | --- | --- |
| 1 | **Source coverage** | Whole topics or many pages of the material are missing | Every topic and page with real content appears somewhere |
| 2 | **Correct language** | Course in the wrong language, or mixed within lectures | The language the material (or the person) asked for, throughout |
| 3 | **Forms fit the content** | Comparisons as prose, procedures as walls of text, formulas in sentences | Tables where things are compared, steps for procedures, formula blocks for maths, recall cards for vocabulary or definitions, widgets only where they teach something |
| 4 | **Nothing invented** | Facts, numbers or examples that are not in the material | Every claim traceable to its source page; uncertainty stated as a note |
| 5 | **Custom exercises** | A custom exercise that breaks, does nothing, or replaces a widget that would have done | None where not needed; where present, it runs, teaches the idea and reports completion |
| 6 | **Readable on a phone** | Sideways scrolling, cut-off tables or formulas, tiny text | Comfortable to read and use at 375 px |

## How to record a run

For each of the five fixtures in `playground-template/tests/fixtures/eval/` write: date, model, cost of the
run, the six scores with evidence, and the weakest point. Improve **prompts** for weak points, never the
validators, and never loosen a check to make a weak course pass.
