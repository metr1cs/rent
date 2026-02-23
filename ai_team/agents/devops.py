from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class DevOpsAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "DevOpsAgent",
            AgentPolicy(
                role="Delivery automation and runtime stability",
                non_negotiables=[
                    "Every merge to main is deployable",
                    "Rollback path documented",
                ],
                acceptance_checks=[
                    "CI build is green",
                    "Post-deploy health checks are green",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Configured pipeline: build -> test -> deploy",
            "Configured runtime restarts and process persistence",
            "Configured post-deploy checks for web and api health",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
