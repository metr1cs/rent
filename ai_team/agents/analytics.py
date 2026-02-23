from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class AnalyticsAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "AnalyticsAgent",
            AgentPolicy(
                role="Metrics and product insight",
                non_negotiables=[
                    "Every critical screen has instrumentation",
                    "North Star and conversion funnel always visible",
                ],
                acceptance_checks=[
                    "Event taxonomy approved",
                    "Dashboard ready for release day",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Event map: search_submitted, venue_opened, quote_requested, booking_sent, review_submitted",
            "Owner event map: owner_registered, owner_subscription_paid, listing_published",
            "Dashboard specs: booking conversion funnel and drop-off points",
        ] + self._enforce_policy()

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs)
