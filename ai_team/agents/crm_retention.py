from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class CRMRetentionAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "CRMRetentionAgent",
            AgentPolicy(
                role="Retention flows, reminders and lifecycle messaging",
                non_negotiables=[
                    "Reminder scenarios are explicit and measurable",
                    "Retention messages must be timely and actionable",
                ],
                acceptance_checks=[
                    "Dunning flow includes 3-day and 1-day reminders",
                    "Debtor notifications can be triggered in batch mode",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Defined reminder strategy: D-3, D-1 and overdue notifications",
            "Prepared retention messaging templates for Telegram channel",
            "Added lifecycle focus for owner billing health",
        ] + self._enforce_policy()
        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
