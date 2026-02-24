from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class SREAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "SREAgent",
            AgentPolicy(
                role="Reliability, monitoring and incident response",
                non_negotiables=[
                    "Every production service has health checks and runbook",
                    "Error budget and alert thresholds are defined",
                ],
                acceptance_checks=[
                    "Monitoring hooks and logs are configured",
                    "Recovery actions are documented",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Prepared reliability checklist: uptime, latency, error-rate",
            "Defined production runbook for API and notifier jobs",
            "Added recommendations for backup and rollback controls",
        ] + self._enforce_policy()
        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
