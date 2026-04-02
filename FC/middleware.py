from django.utils import timezone
from django.conf import settings
from django.shortcuts import redirect
from django.urls import reverse
import datetime

class SessionTimeoutMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Check if user is authenticated via session (not Django's auth system)
        if request.session.get('user_authenticated'):
            if not any(request.path.startswith(p) for p in ['/static/', '/media/']):
                last_activity = request.session.get('last_activity')
                
                if last_activity:
                    last_activity = datetime.datetime.fromisoformat(last_activity)
                    time_since_last_activity = (timezone.now() - last_activity).total_seconds()
                    
                    if time_since_last_activity > settings.SESSION_COOKIE_AGE:
                        request.session.flush()
                        response = redirect(reverse('fc:login'))
                        for cookie in request.COOKIES:
                            response.delete_cookie(cookie)
                        return response
                
                request.session['last_activity'] = timezone.now().isoformat()

        response = self.get_response(request)
        return response
