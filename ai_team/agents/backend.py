from ai_team.base import Agent, AgentPolicy
from ai_team.models import Task, TaskResult


class BackendAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            "BackendAgent",
            AgentPolicy(
                role="Domain and API implementation",
                non_negotiables=[
                    "Owner publish action allowed only with active subscription",
                    "Payload validation on every mutable endpoint",
                ],
                acceptance_checks=[
                    "Health endpoint available",
                    "API responses stable for web client",
                ],
            ),
        )

    def run(self, task: Task) -> TaskResult:
        outputs = [
            "Implemented owner register/subscription/publish rules",
            "Implemented venues list/reviews and booking quote endpoints",
            "Implemented health and smoke-testable contracts",
        ] + self._enforce_policy()

        handoff = {
            "qa": "Validate business rules and error codes",
            "security": "Review auth and validation surface",
        }

        return TaskResult(stage=task.stage, agent=self.name, outputs=outputs, handoff=handoff)
