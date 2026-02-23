import { Router } from '@angular/router';
import { of, throwError, Subject } from 'rxjs';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ProductFormService } from './product-form.service';
import { Product } from '../../../core/models/product.model';
import { ApiError } from '../../../core/models/api-error.model';
import { ProductService } from '../../../core/services/product.service';

describe('ProductFormService', () => {
  let service: ProductFormService;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockProductService: jasmine.SpyObj<ProductService>;
  let destroy$: Subject<void>;

  const mockProduct: Product = {
    id: 'test-id',
    name: 'Test Product',
    description: 'Test Description for product',
    logo: 'https://example.com/logo.png',
    date_release: '2024-01-15',
    date_revision: '2025-01-15'
  };

  beforeEach(() => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockProductService = jasmine.createSpyObj('ProductService', ['create', 'update', 'getById']);

    TestBed.configureTestingModule({
      providers: [
        ProductFormService,
        { provide: Router, useValue: mockRouter },
        { provide: ProductService, useValue: mockProductService }
      ]
    });

    service = TestBed.inject(ProductFormService);
    destroy$ = new Subject<void>();
  });

  afterEach(() => {
    destroy$.next();
    destroy$.complete();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ─── calculateRevisionDate ─────────────────────────────────────────────────

  describe('calculateRevisionDate', () => {
    it('should return a date 1 year after the release date', () => {
      expect(service.calculateRevisionDate('2024-01-15')).toBe('2025-01-15');
    });

    it('should handle mid-year dates', () => {
      expect(service.calculateRevisionDate('2024-06-20')).toBe('2025-06-20');
    });

    it('should handle year boundary', () => {
      expect(service.calculateRevisionDate('2024-12-31')).toBe('2025-12-31');
    });

    it('should handle leap-year dates by rolling to Mar 1 in non-leap years', () => {
      expect(service.calculateRevisionDate('2024-02-29')).toBe('2025-03-01');
    });

    it('should return empty string for empty input', () => {
      expect(service.calculateRevisionDate('')).toBe('');
    });

    it('should return empty string for invalid date strings', () => {
      expect(service.calculateRevisionDate('not-a-date')).toBe('');
    });
  });

  // ─── loadProduct ──────────────────────────────────────────────────────────

  describe('loadProduct', () => {
    it('should load product from API and return it', fakeAsync(() => {
      mockProductService.getById.and.returnValue(of(mockProduct));

      let result: { product?: Product; error?: string } | undefined;
      service.loadProduct('test-id', destroy$).subscribe(r => result = r);

      expect(result?.product).toEqual(mockProduct);
      expect(result?.error).toBeUndefined();
      expect(mockProductService.getById).toHaveBeenCalledWith('test-id');
    }));

    it('should return error string when API call fails', fakeAsync(() => {
      mockProductService.getById.and.returnValue(throwError(() => new Error('Not found')));

      let result: { product?: Product; error?: string } | undefined;
      service.loadProduct('test-id', destroy$).subscribe(r => result = r);

      expect(result?.product).toBeUndefined();
      expect(result?.error).toBe('Error al cargar producto');
    }));

    it('should navigate to /products after a delay on API error', fakeAsync(() => {
      mockProductService.getById.and.returnValue(throwError(() => new Error('Not found')));

      service.loadProduct('test-id', destroy$).subscribe();
      tick(2000);

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
    }));

    it('should return an error when called with an empty product ID', fakeAsync(() => {
      let result: { product?: Product; error?: string } | undefined;
      service.loadProduct('', destroy$).subscribe(r => result = r);

      expect(result?.product).toBeUndefined();
      expect(result?.error).toBe('ID de producto no válido');
      expect(mockProductService.getById).not.toHaveBeenCalled();
    }));
  });

  // ─── save ─────────────────────────────────────────────────────────────────

  describe('save', () => {
    it('should call create when not in edit mode', () => {
      mockProductService.create.and.returnValue(of(mockProduct));

      let result: { success: boolean; error?: string } | undefined;
      service.save(mockProduct, false, undefined, destroy$).subscribe(r => result = r);

      expect(result?.success).toBeTrue();
      expect(mockProductService.create).toHaveBeenCalledWith(mockProduct);
      expect(mockProductService.update).not.toHaveBeenCalled();
    });

    it('should call update when in edit mode', () => {
      mockProductService.update.and.returnValue(of(mockProduct));

      let result: { success: boolean; error?: string } | undefined;
      service.save(mockProduct, true, 'test-id', destroy$).subscribe(r => result = r);

      expect(result?.success).toBeTrue();
      expect(mockProductService.update).toHaveBeenCalledWith('test-id', mockProduct);
      expect(mockProductService.create).not.toHaveBeenCalled();
    });

    it('should navigate to /products on success', () => {
      mockProductService.create.and.returnValue(of(mockProduct));

      service.save(mockProduct, false, undefined, destroy$).subscribe();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
    });

    it('should fall back to create when edit mode is true but no productId', () => {
      mockProductService.create.and.returnValue(of(mockProduct));

      let result: { success: boolean; error?: string } | undefined;
      service.save(mockProduct, true, undefined, destroy$).subscribe(r => result = r);

      expect(result?.success).toBeTrue();
      expect(mockProductService.create).toHaveBeenCalled();
    });

    it('should return success false with error message on create failure', () => {
      mockProductService.create.and.returnValue(throwError(() => ({ message: 'Create failed' })));

      let result: { success: boolean; error?: string } | undefined;
      service.save(mockProduct, false, undefined, destroy$).subscribe(r => result = r);

      expect(result?.success).toBeFalse();
      expect(result?.error).toBe('Create failed');
    });

    it('should return success false with error message on update failure', () => {
      mockProductService.update.and.returnValue(throwError(() => ({ message: 'Update failed' })));

      let result: { success: boolean; error?: string } | undefined;
      service.save(mockProduct, true, 'test-id', destroy$).subscribe(r => result = r);

      expect(result?.success).toBeFalse();
      expect(result?.error).toBe('Update failed');
    });

    it('should use default error message when error has no message property', () => {
      mockProductService.create.and.returnValue(throwError(() => ({})));

      let result: { success: boolean; error?: string } | undefined;
      service.save(mockProduct, false, undefined, destroy$).subscribe(r => result = r);

      expect(result?.success).toBeFalse();
      expect(result?.error).toBe('Error al guardar producto');
    });

    it('should pass through validationErrors from ApiError on 400 failure', () => {
      const apiError = new ApiError('Solicitud inválida', [
        { property: 'name', value: '12345', constraints: { minLength: 'name must be longer than or equal to 6 characters' }, children: [] },
        { property: 'description', value: 'short', constraints: { minLength: 'description must be longer than or equal to 10 characters' }, children: [] }
      ]);
      mockProductService.create.and.returnValue(throwError(() => apiError));

      let result: { success: boolean; error?: string; validationErrors?: any[] } | undefined;
      service.save(mockProduct, false, undefined, destroy$).subscribe(r => result = r);

      expect(result?.success).toBeFalse();
      expect(result?.error).toBe('Solicitud inválida');
      expect(result?.validationErrors?.length).toBe(2);
      expect(result?.validationErrors?.[0].property).toBe('name');
      expect(result?.validationErrors?.[1].property).toBe('description');
    });

    it('should return undefined validationErrors for non-400 errors', () => {
      mockProductService.create.and.returnValue(throwError(() => new Error('Server error')));

      let result: { success: boolean; error?: string; validationErrors?: any[] } | undefined;
      service.save(mockProduct, false, undefined, destroy$).subscribe(r => result = r);

      expect(result?.success).toBeFalse();
      expect(result?.validationErrors).toBeUndefined();
    });
  });

  // ─── getErrorMessage ──────────────────────────────────────────────────────

  describe('getErrorMessage', () => {
    it('should return empty string for null errors', () => {
      expect(service.getErrorMessage(null)).toBe('');
    });

    it('should return empty string for empty errors object', () => {
      expect(service.getErrorMessage({})).toBe('');
    });

    it('should return required message', () => {
      expect(service.getErrorMessage({ required: true })).toBe('Este campo es obligatorio');
    });

    it('should return minlength message with required length', () => {
      expect(service.getErrorMessage({ minlength: { requiredLength: 5, actualLength: 2 } }))
        .toBe('La longitud mínima es 5');
    });

    it('should return maxlength message with required length', () => {
      expect(service.getErrorMessage({ maxlength: { requiredLength: 100, actualLength: 120 } }))
        .toBe('La longitud máxima es 100');
    });

    it('should return pattern message for URL validation', () => {
      expect(service.getErrorMessage({ pattern: { requiredPattern: '^https?:\\/\\/.+' } }))
        .toBe('Por favor ingrese una URL válida (http:// o https://)');
    });

    it('should return minDate message', () => {
      expect(service.getErrorMessage({ minDate: true })).toBe('La fecha debe ser hoy o posterior');
    });

    it('should return idExists message', () => {
      expect(service.getErrorMessage({ idExists: true })).toBe('Este ID ya existe');
    });

    it('should return generic message for unknown error keys', () => {
      expect(service.getErrorMessage({ customError: true })).toBe('Valor inválido');
    });

    it('should prioritise required over other errors when multiple exist', () => {
      expect(service.getErrorMessage({ required: true, minlength: { requiredLength: 5 } }))
        .toBe('Este campo es obligatorio');
    });
  });
});
