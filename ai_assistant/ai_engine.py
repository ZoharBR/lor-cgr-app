import requests
import json
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

class ClaudeEngine:
    """Motor de IA usando Groq API"""
    
    def __init__(self):
        self.knowledge_file = "/opt/lorcgr/ai_assistant/knowledge_base.json"
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.api_key = os.getenv("GROQ_API_KEY", "")
        self.model = "llama-3.3-70b-versatile"
        self._load_knowledge()
    
    def _load_knowledge(self):
        try:
            if os.path.exists(self.knowledge_file):
                with open(self.knowledge_file, "r") as f:
                    self.knowledge = json.load(f)
            else:
                self.knowledge = {"devices_info": {}, "solutions_history": [], "learned_facts": []}
        except:
            self.knowledge = {"devices_info": {}, "solutions_history": [], "learned_facts": []}
    
    def _save_knowledge(self):
        try:
            with open(self.knowledge_file, "w") as f:
                json.dump(self.knowledge, f, indent=2, ensure_ascii=False)
        except: pass
    
    def get_system_prompt(self, context_type=None, context_data=None):
        base = "IMPORTANTE: Voce DEVE responder SEMPRE em PORTUGUES DO BRASIL. Voce e o assistente de IA do sistema LOR CGR para gerenciamento de redes ISP. Suas capacidades: Analisar e configurar equipamentos Huawei, Mikrotik, Cisco, Linux. Diagnosticar problemas de rede. Criar scripts para automacao. Troubleshooting de clientes PPPoE, DHCP, VLAN. Responda de forma clara e objetiva em PORTUGUES DO BRASIL."
        if context_type == "device" and context_data:
            name = context_data.get("name", "")
            ip = context_data.get("ip", "")
            base = base + " CONTEXTO - Equipamento: " + name + " (" + ip + ")"
        return base
    
    def chat(self, messages, context_type=None, context_data=None, use_tools=True):
        try:
            groq_messages = [{"role": "system", "content": self.get_system_prompt(context_type, context_data)}]
            for m in messages[-20:]:
                role = m.get("role", "user")
                content = m.get("content", "")
                if role in ["user", "assistant"]:
                    groq_messages.append({"role": role, "content": content})
            payload = {"model": self.model, "messages": groq_messages, "temperature": 0.7, "max_tokens": 1024}
            headers = {"Content-Type": "application/json", "Authorization": "Bearer " + self.api_key}
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=30)
            if response.status_code != 200:
                return {"content": "Erro Groq (" + str(response.status_code) + ")", "error": True, "tool_calls": [], "tokens": {"input": 0, "output": 0}}
            data = response.json()
            text = data.get("choices", [{}])[0].get("message", {}).get("content", "Sem resposta")
            usage = data.get("usage", {})
            return {"content": text, "tool_calls": [], "tokens": {"input": usage.get("prompt_tokens", 0), "output": usage.get("completion_tokens", 0)}}
        except Exception as e:
            return {"content": "Erro: " + str(e), "error": True, "tool_calls": [], "tokens": {"input": 0, "output": 0}}
    
    def analyze_device(self, device):
        return self.chat([{"role": "user", "content": "Analise: " + device.name}], "device", {"name": device.name, "ip": device.ip, "vendor": device.vendor})
