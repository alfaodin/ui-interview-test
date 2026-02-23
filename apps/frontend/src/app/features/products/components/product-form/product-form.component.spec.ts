import { of, throwError } from 'rxjs';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';

import { ProductFormComponent } from './product-form.component';
import { Product } from '../../../../core/models/product.model';
import { ProductFormService } from '../../services/product-form.service';
import { ProductService } from '../../../../core/services/product.service';
import { ApiValidationError } from '../../../../core/models/api-error.model';

describe('ProductFormComponent', () => {
  let component: ProductFormComponent;
  let fixture: ComponentFixture<ProductFormComponent>;
  let mockRouter: jasmine.SpyObj<Router>;
  let mockActivatedRoute: any;
  let mockProductService: jasmine.SpyObj<ProductService>;
  let mockProductFormService: jasmine.SpyObj<ProductFormService>;

  const mockProduct: Product = {
    id: 'test-123',
    name: 'Test Product Name',
    description: 'Test product description here',
    logo: 'https://example.com/logo.png',
    date_release: '2024-01-15',
    date_revision: '2025-01-15'
  };

  beforeEach(async () => {
    mockRouter = jasmine.createSpyObj('Router', ['navigate']);
    mockProductService = jasmine.createSpyObj('ProductService', ['create', 'update', 'getById', 'verifyId']);
    mockProductFormService = jasmine.createSpyObj('ProductFormService', [
      'calculateRevisionDate',
      'loadProduct',
      'save',
      'getErrorMessage'
    ]);

    mockProductService.getById.and.returnValue(of(mockProduct));
    mockProductService.create.and.returnValue(of(mockProduct));
    mockProductService.update.and.returnValue(of(mockProduct));
    mockProductService.verifyId.and.returnValue(of(false));

    mockProductFormService.calculateRevisionDate.and.returnValue('2025-01-15');
    mockProductFormService.loadProduct.and.returnValue(of({ product: mockProduct }));
    mockProductFormService.save.and.returnValue(of({ success: true }));
    mockProductFormService.getErrorMessage.and.returnValue('');

    mockActivatedRoute = {
      snapshot: {
        paramMap: { get: jasmine.createSpy('get').and.returnValue(null) }
      }
    };

    await TestBed.configureTestingModule({
      imports: [ProductFormComponent, ReactiveFormsModule],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ProductService, useValue: mockProductService }
      ]
    })
    .overrideComponent(ProductFormComponent, {
      set: {
        providers: [{ provide: ProductFormService, useValue: mockProductFormService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProductFormComponent);
    component = fixture.componentInstance;
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize in create mode when no id parameter', () => {
      fixture.detectChanges();

      expect(component.isEditMode).toBeFalse();
      expect(component.currentProductId).toBeUndefined();
    });

    it('should initialize in edit mode when id parameter exists', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue('test-123');

      fixture.detectChanges();

      expect(component.isEditMode).toBeTrue();
      expect(component.currentProductId).toBe('test-123');
      expect(mockProductFormService.loadProduct).toHaveBeenCalledWith('test-123', jasmine.any(Object));
    });

    it('should set async validator on id field in create mode', () => {
      mockProductService.verifyId.and.returnValue(of(false));

      fixture.detectChanges();

      expect(component.productForm.get('id')?.asyncValidator).toBeDefined();
    });

    it('should not set async validator on id field in edit mode', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue('test-123');

      fixture.detectChanges();

      expect(component.productForm.get('id')?.asyncValidator).toBeNull();
    });
  });

  describe('Form Structure', () => {
    beforeEach(() => fixture.detectChanges());

    it('should have all required form controls', () => {
      expect(component.productForm.get('id')).toBeTruthy();
      expect(component.productForm.get('name')).toBeTruthy();
      expect(component.productForm.get('description')).toBeTruthy();
      expect(component.productForm.get('logo')).toBeTruthy();
      expect(component.productForm.get('date_release')).toBeTruthy();
      expect(component.productForm.get('date_revision')).toBeTruthy();
    });

    it('should mark form as invalid when empty', () => {
      expect(component.productForm.valid).toBeFalse();
    });

    it('should have date_revision disabled by default', () => {
      expect(component.productForm.get('date_revision')?.disabled).toBeTrue();
    });

    it('should have updateOn: change for id field', () => {
      expect(component.productForm.get('id')?.updateOn).toBe('change');
    });
  });

  describe('Form Validation', () => {
    beforeEach(() => fixture.detectChanges());

    it('should validate id field requirements', fakeAsync(() => {
      const id = component.productForm.get('id');

      id?.setValue('');
      expect(id?.hasError('required')).toBeTrue();

      id?.setValue('ab');
      expect(id?.hasError('minlength')).toBeTrue();

      id?.setValue('a'.repeat(11));
      expect(id?.hasError('maxlength')).toBeTrue();

      id?.setValue('valid-id');
      tick(500);
      expect(id?.valid).toBeTrue();
    }));

    it('should validate name field requirements', () => {
      const name = component.productForm.get('name');

      name?.setValue('');
      expect(name?.hasError('required')).toBeTrue();

      name?.setValue('abcd');
      expect(name?.hasError('minlength')).toBeTrue();

      name?.setValue('Valid Product Name');
      expect(name?.valid).toBeTrue();
    });

    it('should validate logo field as URL', () => {
      const logo = component.productForm.get('logo');

      logo?.setValue('not-a-url');
      expect(logo?.hasError('pattern')).toBeTrue();

      logo?.setValue('https://example.com/logo.png');
      expect(logo?.valid).toBeTrue();
    });
  });

  describe('Date auto-calculation', () => {
    beforeEach(() => fixture.detectChanges());

    it('should call calculateRevisionDate when date_release changes', () => {
      component.productForm.get('date_release')?.setValue('2024-01-15');

      expect(mockProductFormService.calculateRevisionDate).toHaveBeenCalledWith('2024-01-15');
    });

    it('should patch date_revision with the calculated date', () => {
      mockProductFormService.calculateRevisionDate.and.returnValue('2025-06-20');

      component.productForm.get('date_release')?.setValue('2024-06-20');

      expect(component.productForm.get('date_revision')?.value).toBe('2025-06-20');
    });

    it('should not patch date_revision when calculateRevisionDate returns empty string', () => {
      mockProductFormService.calculateRevisionDate.and.returnValue('');

      component.productForm.get('date_release')?.setValue('');

      expect(component.productForm.get('date_revision')?.value).toBe('');
    });
  });

  describe('loadProduct (edit mode)', () => {
    it('should populate form with product returned by service', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue('test-123');

      fixture.detectChanges();

      expect(component.productForm.get('name')?.value).toBe(mockProduct.name);
      expect(component.productForm.get('id')?.disabled).toBeTrue();
    });

    it('should set error message when service returns an error', () => {
      mockActivatedRoute.snapshot.paramMap.get.and.returnValue('test-123');
      mockProductFormService.loadProduct.and.returnValue(of({ error: 'Error al cargar producto' }));

      fixture.detectChanges();

      expect(component.errorMessage).toBe('Error al cargar producto');
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      fixture.detectChanges();
      component.productForm.patchValue({
        id: mockProduct.id,
        name: mockProduct.name,
        description: mockProduct.description,
        logo: mockProduct.logo,
        date_release: mockProduct.date_release as string,
        date_revision: mockProduct.date_revision as string
      });
    });

    it('should guard against double submission', () => {
      component.isSubmitting = true;

      component.onSubmit();

      expect(mockProductFormService.save).not.toHaveBeenCalled();
    });

    it('should mark all as touched and not call save when form is invalid', () => {
      // Clear async validators so the form resolves to INVALID (not PENDING)
      component.productForm.get('id')?.clearAsyncValidators();
      component.productForm.get('id')?.updateValueAndValidity();
      component.productForm.patchValue({ name: '' });
      spyOn(component.productForm, 'markAllAsTouched');

      component.onSubmit();

      expect(component.productForm.markAllAsTouched).toHaveBeenCalled();
      expect(mockProductFormService.save).not.toHaveBeenCalled();
    });

    it('should call service save with a mapped Product (not FormGroup)', () => {
      component.onSubmit();

      const [product, isEditMode, productId] = mockProductFormService.save.calls.mostRecent().args;
      expect(product).toEqual(jasmine.objectContaining({
        id: mockProduct.id,
        name: mockProduct.name,
        description: mockProduct.description,
        logo: mockProduct.logo
      }));
      expect(isEditMode).toBeFalse();
      expect(productId).toBeUndefined();
    });

    it('should pass correct edit mode flags in edit mode', () => {
      component.isEditMode = true;
      component.currentProductId = 'test-123';

      component.onSubmit();

      const [, isEditMode, productId] = mockProductFormService.save.calls.mostRecent().args;
      expect(isEditMode).toBeTrue();
      expect(productId).toBe('test-123');
    });

    it('should set isSubmitting to true when submitting', () => {
      component.onSubmit();

      expect(component.isSubmitting).toBeTrue();
    });

    it('should clear errorMessage before submitting', () => {
      component.errorMessage = 'Previous error';

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });

    it('should set errorMessage and reset isSubmitting on save failure', () => {
      mockProductFormService.save.and.returnValue(of({ success: false, error: 'Save failed' }));

      component.onSubmit();

      expect(component.errorMessage).toBe('Save failed');
      expect(component.isSubmitting).toBeFalse();
    });

    it('should use default error message when error property is undefined', () => {
      mockProductFormService.save.and.returnValue(of({ success: false, error: undefined }));

      component.onSubmit();

      expect(component.errorMessage).toBe('Error al guardar producto');
    });
  });

  describe('onReset', () => {
    beforeEach(() => fixture.detectChanges());

    it('should reset form in create mode', () => {
      component.productForm.patchValue({ id: 'x', name: 'test name here' });

      component.onReset();

      expect(component.productForm.get('id')?.value).toBeNull();
      expect(component.productForm.get('name')?.value).toBeNull();
    });

    it('should clear error message in create mode', () => {
      component.errorMessage = 'Some error';

      component.onReset();

      expect(component.errorMessage).toBe('');
    });

    it('should reload product in edit mode via loadProduct', () => {
      component.isEditMode = true;
      component.currentProductId = 'test-123';
      mockProductFormService.loadProduct.calls.reset();

      component.onReset();

      expect(mockProductFormService.loadProduct).toHaveBeenCalledWith('test-123', jasmine.any(Object));
    });
  });

  describe('onCancel', () => {
    it('should navigate to products list', () => {
      fixture.detectChanges();

      component.onCancel();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/products']);
    });
  });

  describe('hasError', () => {
    beforeEach(() => fixture.detectChanges());

    it('should return false for a non-existent field', () => {
      expect(component.hasError('nonexistent')).toBeFalse();
    });

    it('should return false for an untouched invalid field', () => {
      const name = component.productForm.get('name');
      name?.setValue('');
      name?.markAsUntouched();

      expect(component.hasError('name')).toBeFalse();
    });

    it('should return true for a touched invalid field', () => {
      const name = component.productForm.get('name');
      name?.setValue('');
      name?.markAsTouched();

      expect(component.hasError('name')).toBeTrue();
    });

    it('should check for a specific error type', () => {
      const name = component.productForm.get('name');
      name?.setValue('abc');
      name?.markAsTouched();

      expect(component.hasError('name', 'minlength')).toBeTrue();
      expect(component.hasError('name', 'required')).toBeFalse();
    });
  });

  describe('getErrorMessage', () => {
    beforeEach(() => fixture.detectChanges());

    it('should pass field errors to service and return the result', () => {
      mockProductFormService.getErrorMessage.and.returnValue('Test error');
      component.productForm.get('name')?.setValue('');

      const result = component.getErrorMessage('name');

      expect(mockProductFormService.getErrorMessage)
        .toHaveBeenCalledWith(component.productForm.get('name')?.errors ?? null);
      expect(result).toBe('Test error');
    });

    it('should pass null to service when field has no errors', () => {
      component.productForm.get('name')?.setValue('Valid Product Name');

      component.getErrorMessage('name');

      expect(mockProductFormService.getErrorMessage).toHaveBeenCalledWith(null);
    });
  });

  describe('API validation errors', () => {
    const mockApiErrors: ApiValidationError[] = [
      { property: 'name', value: '12345', constraints: { minLength: 'name must be longer than or equal to 6 characters' }, children: [] },
      { property: 'description', value: 'short', constraints: { minLength: 'description must be longer than or equal to 10 characters' }, children: [] }
    ];

    beforeEach(() => fixture.detectChanges());

    it('should populate apiValidationErrors from service result on save failure', () => {
      mockProductFormService.save.and.returnValue(of({ success: false, error: 'Solicitud inválida', validationErrors: mockApiErrors }));
      component.productForm.patchValue({
        id: 'test-123', name: 'Test Product Name', description: 'Test product description here',
        logo: 'https://example.com/logo.png', date_release: '2024-01-15', date_revision: '2025-01-15'
      });

      component.onSubmit();

      expect(component.apiValidationErrors).toEqual(mockApiErrors);
    });

    it('hasApiFieldError should return true when property matches', () => {
      component.apiValidationErrors = mockApiErrors;

      expect(component.hasApiFieldError('name')).toBeTrue();
      expect(component.hasApiFieldError('description')).toBeTrue();
      expect(component.hasApiFieldError('logo')).toBeFalse();
    });

    it('getApiFieldErrorMessages should return constraint messages for the field', () => {
      component.apiValidationErrors = mockApiErrors;

      expect(component.getApiFieldErrorMessages('name')).toEqual(['name must be longer than or equal to 6 characters']);
      expect(component.getApiFieldErrorMessages('description')).toEqual(['description must be longer than or equal to 10 characters']);
    });

    it('getApiFieldErrorMessages should return empty array when field has no API errors', () => {
      component.apiValidationErrors = mockApiErrors;

      expect(component.getApiFieldErrorMessages('logo')).toEqual([]);
    });

    it('clearErrors should reset both errorMessage and apiValidationErrors', () => {
      component.errorMessage = 'Some error';
      component.apiValidationErrors = mockApiErrors;

      component.clearErrors();

      expect(component.errorMessage).toBe('');
      expect(component.apiValidationErrors).toEqual([]);
    });

    it('onSubmit should clear apiValidationErrors before submitting', () => {
      component.apiValidationErrors = mockApiErrors;
      component.productForm.patchValue({
        id: 'test-123', name: 'Test Product Name', description: 'Test product description here',
        logo: 'https://example.com/logo.png', date_release: '2024-01-15', date_revision: '2025-01-15'
      });

      component.onSubmit();

      // save returns success:true by default, so apiValidationErrors stays empty after clear
      expect(component.apiValidationErrors).toEqual([]);
    });
  });

  describe('Component Cleanup', () => {
    it('should complete destroy$ on destroy', () => {
      fixture.detectChanges();
      spyOn(component['destroy$'], 'next');
      spyOn(component['destroy$'], 'complete');

      fixture.destroy();

      expect(component['destroy$'].next).toHaveBeenCalled();
      expect(component['destroy$'].complete).toHaveBeenCalled();
    });
  });
});
