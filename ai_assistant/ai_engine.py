import requests
import json
import os
from datetime import datetime

class ClaudeEngine:
    """Motor de IA usando Groq API - GRATUITO e SUPER RAPIDO"""
    
    def __init__(self):
        self.knowledge_file = '/opt/lorcgr/ai_assistant/knowledge_base.json'
        # Groq API - gratuito e extremamente rapido
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.api_key = "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"
        # Modelo atualizado (llama-3.3-70b-versatile é o mais novo)
        self.model = "llama-3.3-70b-versatile"
        self._load_knowledge()
    
    def _load_knowledge(self):
        try:
            if os.path.exists(self.knowledge_file):
                with open(self.knowledge_file, 'r') as f:
                    self.knowledge = json.load(f)
            else:
                self.knowledge = {'devices_info': {}, 'solutions_history': [], 'learned_facts': []}
        except:
            self.knowledge = {'devices_info': {}, 'solutions_history': [], 'learned_facts': []}
    
    def _save_knowledge(self):
        try:
            with open(self.knowledge_file, 'w') as f:
                json.dump(self.knowledge, f, indent=2, ensure_ascii=False)
        except: pass
    
    def get_system_prompt(self, context_type=None, context_data=None):
        base = """IMPORTANTE: Voce DEVE responder SEMPRE em PORTUGUES DO BRASIL. Nunca use espanhol ou ingles.

Voce e o assistente de IA do sistema LOR CGR para gerenciamento de redes ISP.

Suas capacidades:
- Analisar e configurar equipamentos Huawei, Mikrotik, Cisco, Linux
- Diagnosticar problemas de rede e conectividade
- Criar scripts para automacao
- Troubleshooting de clientes PPPoE, DHCP, VLAN
- Configuracoes de roteamento OSPF, BGP
- Seguranca de rede e firewall
- Otimizacao de performance

Responda SEMPRE em PORTUGUES DO BRASIL de forma clara e objetiva.
Use blocos de codigo para comandos."""
        
        if context_type == 'device' and context_data:
            base += f"\n\nCONTEXTO - Equipamento: {context_data.get('name')} ({context_data.get('ip')}) - {context_data.get('vendor')}"
        return base
    
    def chat(self, messages, context_type=None, context_data=None, use_tools=True):
        try:
            groq_messages = [{"role": "system", "content": self.get_system_prompt(context_type, context_data)}]
            
            for m in messages[-20:]:
                role = m.get("role", "user")
                content = m.get("content", "")
                if role in ["user", "assistant"]:
                    groq_messages.append({"role": role, "content": content})
            
            payload = {
                "model": self.model,
                "messages": groq_messages,
                "temperature": 0.7,
                "max_tokens": 1024
            }
            
            headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}"
            }
            
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=30)
            
            if response.status_code != 200:
                error_msg = response.text[:200]
                return {'content': f'Erro Groq ({response.status_code}): {error_msg}', 'error': True, 'tool_calls': [], 'tokens': {'input': 0, 'output': 0}}
            
            data = response.json()
            text = data.get('choices', [{}])[0].get('message', {}).get('content', 'Sem resposta')
            
            usage = data.get('usage', {})
            
            if context_data:
                self.knowledge['devices_info'][context_data.get('name', 'x')] = {'last': datetime.now().isoformat()}
                self._save_knowledge()
            
            return {
                'content': text,
                'tool_calls': [],
                'tokens': {
                    'input': usage.get('prompt_tokens', 0),
                    'output': usage.get('completion_tokens', 0)
                }
            }
        except requests.Timeout:
            return {'content': 'Timeout: Groq demorou para responder.', 'error': True, 'tool_calls': [], 'tokens': {'input': 0, 'output': 0}}
        except Exception as e:
            return {'content': f'Erro: {str(e)}', 'error': True, 'tool_calls': [], 'tokens': {'input': 0, 'output': 0}}
    
    def analyze_device(self, device):
        return self.chat(
            [{'role': 'user', 'content': f'Analise o equipamento {device.name} IP {device.ip}'}],
            'device',
            {'name': device.name, 'ip': device.ip, 'vendor': device.vendor}
        )
