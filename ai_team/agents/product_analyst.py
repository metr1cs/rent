from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class ProductAnalystAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "ProductAnalystAgent",
            AgentPolicy(
                role="Product analytics and funnel optimization",
                non_negotiables=[
                    "All core funnel events must be measurable",
                    "Recommendations must be based on real metrics",
                ],
                acceptance_checks=[
                    "Funnel dashboard contains conversion ratios",
                    "At least one growth hypothesis is validated",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Mapped funnel events: home_view -> venue_view -> lead_submit",
            "Prepared KPI set: CTR, lead conversion, owner response SLA",
            "Proposed A/B hypotheses for search and listing cards",
        ] + self._enforce_policy()
        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
