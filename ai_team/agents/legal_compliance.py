from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class LegalComplianceAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "LegalComplianceAgent",
            AgentPolicy(
                role="Legal and personal data compliance",
                non_negotiables=[
                    "Privacy and data processing disclosures are present",
                    "User notifications must avoid unsafe data leakage",
                ],
                acceptance_checks=[
                    "Legal documents are linked in user-facing UI",
                    "Compliance risks are tracked with mitigation notes",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Checked privacy policy coverage for user and owner flows",
            "Prepared compliance checklist for telemetry and notifications",
            "Flagged legal tasks for next production milestone",
        ] + self._enforce_policy()
        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
