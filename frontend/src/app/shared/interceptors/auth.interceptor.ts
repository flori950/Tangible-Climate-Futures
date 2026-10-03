import { Injectable, inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, switchMap, take } from 'rxjs';
import { Auth, idToken } from '@angular/fire/auth';
import { BACKEND_API_URL } from '../service/api.service';

/**
 * Adds the Firebase ID token of the logged-in user as `Authorization: Bearer`
 * header to requests against the backend API. Other requests (translation
 * files, Nominatim geocoding, ...) are passed through untouched, so the token
 * never leaks to third parties and asset loading does not wait for Firebase.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthInterceptor implements HttpInterceptor {
  private readonly auth = inject(Auth);
  readonly idToken$ = idToken(this.auth);

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    if (!request.url.startsWith(BACKEND_API_URL)) {
      return next.handle(request);
    }
    return this.idToken$.pipe(
      take(1),
      switchMap((idToken: string | null) => {
        if (idToken) {
          const authReq = request.clone({
            setHeaders: {
              Authorization: `Bearer ${idToken}`,
            },
          });
          return next.handle(authReq);
        } else {
          // If there's no idToken, proceed with the original request
          return next.handle(request);
        }
      })
    );
  }
}
