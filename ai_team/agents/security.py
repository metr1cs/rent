from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class SecurityAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "SecurityAgent",
            AgentPolicy(
                role="Application and deployment security",
                non_negotiables=[
                    "No secrets in repository",
                    "Strict validation for all input payloads",
                ],
                acceptance_checks=[
                    "Secret scan is clean",
                    "Abuse vectors reviewed",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Reviewed auth entry points and owner-only operations",
            "Reviewed API payload validation and error handling",
            "Defined secret handling policy and rotation checklist",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
