from django.db import models

class PhpipamSettings(models.Model):
    name = models.CharField(max_length=50, default="Servidor Principal")
    url = models.URLField(help_text="Ex: http://45.71.243.138/api/")
    app_id = models.CharField(max_length=100, help_text="O App ID criado no PHPIPAM")
    api_token = models.CharField(max_length=255, help_text="App Code / Token")
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"Configuração PHPIPAM: {self.name}"

    class Meta:
        verbose_name = "Configuração PHPIPAM"
        verbose_name_plural = "Configurações PHPIPAM"
