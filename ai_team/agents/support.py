from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class SupportOpsAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "SupportOpsAgent",
            AgentPolicy(
                role="Operational quality and user support",
                non_negotiables=[
                    "SLA for booking issues must be defined",
                    "Escalation path for payment and cancellation issues",
                ],
                acceptance_checks=[
                    "Support macros and playbooks are ready",
                    "Dispute process documented",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Support flows: booking failure, refund inquiry, owner payout issue",
            "SLA matrix by incident severity",
            "Escalation matrix to tech team and decision maker",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
