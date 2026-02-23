from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class QAAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "QAAgent",
            AgentPolicy(
                role="Quality assurance and release confidence",
                non_negotiables=[
                    "Critical path must be tested before release",
                    "No unresolved P0 defects",
                ],
                acceptance_checks=[
                    "Smoke API passed",
                    "UI regression passed",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Test suite: search -> detail -> quote -> booking -> review",
            "Test suite: owner register -> pay subscription -> publish listing",
            "Regression checklist for modal interactions and theme switch",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
