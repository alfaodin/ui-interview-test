import { catchError, throwError } from 'rxjs';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { ApiError, ApiValidationError } from '../models/api-error.model';

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = `Ocurrió un error inesperado`;

      if (error.error instanceof ErrorEvent) {
        // Client-side or network error
        errorMessage = `Error de red: ${error.error.message}:message:`;
        console.error('Client-side error:', error.error.message);
      } else {
        // Server-side error
        console.error(
          `Server returned code ${error.status}, ` +
          `body was: ${JSON.stringify(error.error)}`
        );

        // Map common HTTP status codes to user-friendly messages
        switch (error.status) {
          case 400: {
            const validationErrors = error.error?.errors as ApiValidationError[] | undefined;
            errorMessage = error.error?.message || `Solicitud inválida. Por favor verifique su entrada.`;
            return throwError(() => new ApiError(errorMessage, validationErrors));
          }
          case 404:
            errorMessage = `Producto no encontrado.`;
            break;
          case 409:
            errorMessage = `Ya existe un producto con este ID.`;
            break;
          case 500:
            errorMessage = `Error del servidor. Por favor intente más tarde.`;
            break;
          case 503:
            errorMessage = `Servicio temporalmente no disponible. Por favor intente más tarde.`;
            break;
          case 0:
            errorMessage = `No se puede conectar al servidor. Por favor verifique su conexión a internet.`;
            break;
          default:
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else {
              const statusText = error.statusText || `Error desconocido`;
              errorMessage = `Error ${error.status}:status:: ${statusText}:statusText:`;
            }
        }
      }

      // Log to console for debugging
      console.error('HTTP Error:', errorMessage);

      // Return error with user-friendly message
      return throwError(() => new Error(errorMessage));
    })
  );
};
