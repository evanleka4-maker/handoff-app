# Evan · Sprint 3 learning journal
Project: Handoff (github.com/evanleka4-maker/handoff-app) | Dates: Oct 15 to Oct 29, 2026 (journal due Nov 3)
AI starting point: [kickoff evidence brief](https://github.com/evanleka4-maker/handoff-app/blob/afa8805bb9d733e7b84d12204c10e0cd9ce31115/journal/evan/sprint-3/ai-brief-2026-10-15T174202Z.md) (snapshot of 2026-10-15T17:42:02Z, Claude). Later AI suggestions are linked under "Evidence and AI use."

Everything below this line is written by Evan. The assistant has not filled in any section.

## Original goals and test thresholds
<!-- Evan's words from kickoff, preserved as typed. -->

**Longer-term goal (Oct 15, 2026):** Find a pain point that I can solve for operators that my competition doesn't already, and have results of genuine interest from operators.

**Decision or challenge this sprint, and what is uncertain (Oct 15, 2026):** Most operators already have software that Handoff Provides, so I'm trying to learn about the challenges that operators are facing that I could solve. What's uncertain is if there is enough value that I could add to garner interest.

**Who I can reach and what they do now (Oct 15, 2026):** I can reach small and large operators around Athens by physically walking into leasing offices. They currently use other platforms like Entrata and their respective resident portals to handle leasing and maintenance.

**Smallest test (Oct 15, 2026):** I can ask operators to rank the most painful things about august turnover and how they track which units are ready

**Persist, pivot or stop threshold (Oct 15, 2026):** I would persist if I found a real market for what Handoff currently provides (seeing multiple operators mention their need for the service), pivot if there's a common pain point that I can solve that many operators mention about August, and stop if there is no common pain point that isn't already being solved by competetors.

**Where AI helps and what I will personally verify (Oct 15, 2026):** AI does the coding and helps with advice. I will be able to explain how Handoff works and what value it can provide to operators. I will also be able to know how operators react to questions and the general sense of the potential of Handoff

**Meaningful progress by the end of the sprint (Oct 15, 2026):** Progress would be having a list of at least 5 operators telling me what their biggest pain point is and that I have logged

*Evan's note (Oct 15, 2026): will come back after the kickoff questions to make these answers more specific.*

## Dated changes to the plan
<!-- Evan's words and reasons. Add dated entries; do not rewrite the original goals. -->

**Oct 15, 2026, threshold, how many operators make a pain point "common":** 3 because that would be around half

**Oct 15, 2026, threshold, what counts as "already solved by competitors":** let's go with they name a tool and it works cleanly for their problems

**Oct 15, 2026, mix of small and large operators among the five:** It should be a mixture. at least 2 small because these are the operators that I am focused on, but don't want to ignore large who have more resources and experience

**Oct 15, 2026, what counts as "genuine interest":** They would have to follow up on emails asking to learn more or agree to a demo

## Hypothesis → Build → Measure → Learn
<!-- Evan's account. Separate what he observed from what he interpreted. -->

**Nov 3, 2026, what I set out to test and what I built:** This sprint I set out to test which pain point operators truly have that their current software doesn't focus on and then built and tested the new communication features on Handoff that helps with coordination between the different teams that are involved during move-in season. Multiple leasing operators mentioned that the biggest pain point they had during move-in season was the physical labor side and communication between teams involved, including cleaning, maintenance, and leasing. The demo build demonstrated that units were ready once all three teams had confirmed that they had done their work for that unit, and showed how when an inspection failed the unit was marked as not ready and the appropriate team was notified along with the reason why the inspection failed, thus blocking the unit from being ready until the issue was solved.

**Nov 3, 2026, what I observed:** What I observed was that communication/coordination is a common pain point during the hectic move-in period, as mentioned by multiple leasing offices.

**Nov 3, 2026, what I think it means:** What I think this really means is that most operators have the software they need to solve most of their issues, but lack the standardized communication tool that can confirm the work is done between teams.

## My AI/technical learning and verification
<!-- Evan's decision, how he checked it, and what is still limited. -->

**Oct 15, 2026, one thing AI builds and how I check it:** AI would add legally binding signature platform. I would test it myself by adding my signature

**Nov 3, 2026, what AI built and how I checked it:** AI built the entire Handoff software from the readiness board to the resident status card. I checked to make sure it worked by going through a couple test demos by myself to make sure everything worked the way it is supposed to. What I have yet to include and check is a legally-binding signature addition to Handoff.

## Learning check
Question: In your demo, what makes Unit 101 flip from Ready to Blocked, and why does it matter for the person managing the property?
My answer: In my demo, unit 101 flips from “Ready” to “Blocked” when Maya, the fake tenant reported that water was leaking under her sink. The app auto-sorted the complaint to the plumber, and the unit got blocked because there was an issue outstanding. This matters to the property manager because they are able to see which units are ready and which units are blocked, along with seeing who is responsible for fixing the issue for the units that are blocked. It also helps them figure out which blocked units have more priority to fix based on which issue is reported.

*Note on AI use: before answering, Evan asked the assistant to confirm the facts of the demo scenario (that Maya's leak report is what blocked Unit 101). The assistant confirmed those facts. The explanation of why it matters is Evan's own.*

## Muddiest point and next step
<!-- Evan's uncertainty. Private details can go through the private route instead. -->

**Nov 3, 2026:** My muddiest point about Handoff is willingness-to-pay. I believe that the software is good and performs as advertised, but I will need to find out if operators actually want this.

## Feedback I used or questioned
<!-- Links plus Evan's interpretation and response. -->

**Nov 3, 2026:** People mentioned they liked my project, but there was no real major feedback that I was able to use

## Next goal
<!-- Evan's words. -->

**Nov 3, 2026:** My goal for sprint 4 is to test if operators want this and would pay for it.

## Evidence and AI use
<!-- Links to tests, observations, commits, issues, important prompts and workflows, and AI briefs. -->
- AI brief (kickoff): [ai-brief-2026-10-15T174202Z.md](https://github.com/evanleka4-maker/handoff-app/blob/afa8805bb9d733e7b84d12204c10e0cd9ce31115/journal/evan/sprint-3/ai-brief-2026-10-15T174202Z.md)
- AI suggestions shown for the smallest-test question: [ai-brief-2026-10-15T175849Z-q4-options.md](https://github.com/evanleka4-maker/handoff-app/blob/afa8805bb9d733e7b84d12204c10e0cd9ce31115/journal/evan/sprint-3/ai-brief-2026-10-15T175849Z-q4-options.md)
- AI suggestions shown for what counts as "already solved": [ai-brief-2026-10-15T181503Z-solved-definition.md](https://github.com/evanleka4-maker/handoff-app/blob/afa8805bb9d733e7b84d12204c10e0cd9ce31115/journal/evan/sprint-3/ai-brief-2026-10-15T181503Z-solved-definition.md)
- AI demo plan and build summary (Oct 29): [ai-brief-2026-10-29-demo-plan.md](https://github.com/evanleka4-maker/handoff-app/blob/52afc0f799838f289476a4df70a1f50760a49400/journal/evan/sprint-3/ai-brief-2026-10-29-demo-plan.md)
- Code for the readiness board, resident status card and synthetic demo data (written by AI at Evan's request): [commit f42d6a2](https://github.com/evanleka4-maker/handoff-app/commit/f42d6a2a446841e70fb3f4f0cbb978cc531b3c50)
- Live demo: https://handoff-app-production-6ee2.up.railway.app (synthetic data)
- Notes from the two in-person conversations on Oct 12 (The Maxxen and Rambler Athens) are in the class Claude project, not in this repository.
