def theme_context(request):
    """
    Recupera o tema do usuário logado.
    Se der qualquer erro ou não estiver logado, retorna 'dark'.
    """
    theme = 'dark'
    if request.user.is_authenticated:
        try:
            # Tenta pegar do perfil
            if hasattr(request.user, 'profile'):
                theme = request.user.profile.theme
        except:
            pass # Se der erro, mantém 'dark'
            
    return {'user_theme': theme}
