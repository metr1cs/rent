from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class QAAutomationAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "QAAutomationAgent",
            AgentPolicy(
                role="Automated quality checks and regression",
                non_negotiables=[
                    "Critical user journeys are covered by automated tests",
                    "Regression suite is mandatory before release",
                ],
                acceptance_checks=[
                    "Smoke tests pass on API and web",
                    "No flaky tests in release gate",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Defined automated checks for search, detail and lead flow",
            "Defined owner flow automation: auth -> manage requests",
            "Prepared regression gate for release branch",
        ] + self._enforce_policy()
        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
