from ai_team.agents.analytics import AnalyticsAgent
from ai_team.agents.backend import BackendAgent
from ai_team.agents.crm_retention import CRMRetentionAgent
from ai_team.agents.design import DesignAgent
from ai_team.agents.decision import DecisionAgent
from ai_team.agents.devops import DevOpsAgent
from ai_team.agents.frontend import FrontendAgent
from ai_team.agents.growth import GrowthAgent
from ai_team.agents.legal_compliance import LegalComplianceAgent
from ai_team.agents.product_manager import ProductManagerAgent
from ai_team.agents.product_analyst import ProductAnalystAgent
from ai_team.agents.qa import QAAgent
from ai_team.agents.qa_automation import QAAutomationAgent
from ai_team.agents.security import SecurityAgent
from ai_team.agents.sre import SREAgent
from ai_team.agents.support import SupportOpsAgent
from ai_team.agents.tech_lead import TechLeadAgent


class AgentRegistry:
    def __init__(self) -> None:
        self.pm = ProductManagerAgent()
        self.tech_lead = TechLeadAgent()
        self.design = DesignAgent()
        self.frontend = FrontendAgent()
        self.backend = BackendAgent()
        self.qa = QAAgent()
        self.qa_automation = QAAutomationAgent()
        self.devops = DevOpsAgent()
        self.sre = SREAgent()
        self.security = SecurityAgent()
        self.growth = GrowthAgent()
        self.analytics = AnalyticsAgent()
        self.product_analyst = ProductAnalystAgent()
        self.legal = LegalComplianceAgent()
        self.crm_retention = CRMRetentionAgent()
        self.support = SupportOpsAgent()
        self.decision = DecisionAgent()
