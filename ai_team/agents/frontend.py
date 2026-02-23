from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class FrontendAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "FrontendAgent",
            AgentPolicy(
                role="Client application implementation",
                non_negotiables=[
                    "No blocking UI during data fetches",
                    "Theme switch persistence in localStorage",
                ],
                acceptance_checks=[
                    "Modal flow works end-to-end",
                    "Layout stable on mobile",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Implemented search/filter/sort flow",
            "Implemented premium cards and modal workflows",
            "Implemented theme switch and responsive breakpoints",
        ] + self._enforce_policy()

        handoff = {
            "qa": "Run UI regression and core flow tests",
            "analytics": "Instrument conversion events",
        }

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs, handoff=handoff)
