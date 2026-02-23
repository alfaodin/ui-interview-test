import { Router } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { ValidationErrors } from '@angular/forms';
import { takeUntil } from 'rxjs/operators';
import { Injectable, inject } from '@angular/core';

import { Product } from '../../../core/models/product.model';
import { ApiError, ApiValidationError } from '../../../core/models/api-error.model';
import { ProductService } from '../../../core/services/product.service';
import { parseDate, formatDateForInput, addYears } from '../../../core/utils/date.utils';


@Injectable({
  providedIn: 'any'
})
export class ProductFormService {
  private readonly router = inject(Router);
  private readonly productService = inject(ProductService);

  calculateRevisionDate(releaseDate: string): string {
    const date = parseDate(releaseDate);
    return date ? formatDateForInput(addYears(date, 1)) : '';
  }

  loadProduct(
    currentProductId: string,
    destroy$: Subject<void>
  ): Observable<{ product?: Product; error?: string }> {
    if (!currentProductId) {
      return new Observable(observer => {
        observer.next({ error: 'ID de producto no válido' });
        observer.complete();
      });
    }
    return new Observable(observer => {
      this.productService.getById(currentProductId)
        .pipe(takeUntil(destroy$))
        .subscribe({
          next: (product) => {
            observer.next({ product });
            observer.complete();
          },
          error: () => {
            observer.next({ error: 'Error al cargar producto' });
            observer.complete();
            setTimeout(() => this.router.navigate(['/products']), 2000);
          }
        });
    });
  }

  save(
    product: Product,
    isEditMode: boolean,
    currentProductId: string | undefined,
    destroy$: Subject<void>
  ): Observable<{ success: boolean; error?: string; validationErrors?: ApiValidationError[] }> {
    return new Observable(observer => {
      const request$ = isEditMode && currentProductId
        ? this.productService.update(currentProductId, product)
        : this.productService.create(product);

      request$.pipe(takeUntil(destroy$)).subscribe({
        next: () => {
          observer.next({ success: true });
          observer.complete();
          this.router.navigate(['/products']);
        },
        error: (err: ApiError | Error) => {
          observer.next({
            success: false,
            error: err.message || 'Error al guardar producto',
            validationErrors: (err as ApiError).validationErrors
          });
          observer.complete();
        }
      });
    });
  }

  getErrorMessage(errors: ValidationErrors | null): string {
    if (!errors || Object.keys(errors).length === 0) return '';

    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['minlength']) return `La longitud mínima es ${errors['minlength'].requiredLength}`;
    if (errors['maxlength']) return `La longitud máxima es ${errors['maxlength'].requiredLength}`;
    if (errors['pattern']) return 'Por favor ingrese una URL válida (http:// o https://)';
    if (errors['minDate']) return `La fecha debe ser hoy o posterior`;
    if (errors['idExists']) return 'Este ID ya existe';

    return 'Valor inválido';
  }
}
