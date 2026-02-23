import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';

import { Product } from '../../../../core/models/product.model';
import { ApiValidationError } from '../../../../core/models/api-error.model';
import { formatDateForInput } from '../../../../core/utils/date.utils';
import { ProductFormService } from '../../services/product-form.service';
import { ProductService } from '../../../../core/services/product.service';
import { productIdValidator } from '../../../../core/validators/product-id.validator';
import { ApiValidationErrorsComponent } from '../../../../shared/components/api-validation-errors/api-validation-errors.component';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ApiValidationErrorsComponent],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss']
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly productService = inject(ProductService);
  private readonly productFormService = inject(ProductFormService);

  private readonly destroy$ = new Subject<void>();

  isEditMode = false;
  isSubmitting = false;
  errorMessage = '';
  currentProductId?: string;
  apiValidationErrors: ApiValidationError[] = [];

  productForm = new FormGroup({
    id: new FormControl('', {
      validators: [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(10)
      ],
      updateOn: 'change'
    }),
    name: new FormControl('', [
      Validators.required,
      Validators.minLength(5),
      Validators.maxLength(100)
    ]),
    description: new FormControl('', [
      Validators.required,
      Validators.minLength(10),
      Validators.maxLength(200)
    ]),
    logo: new FormControl('', [
      Validators.required,
      Validators.pattern(/^https?:\/\/.+/)
    ]),
    date_release: new FormControl('', [Validators.required]),
    date_revision: new FormControl({ value: '', disabled: true }, [Validators.required])
  });

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');

    if (productId) {
      this.isEditMode = true;
      this.currentProductId = productId;
      this.loadProductForEdit();
    } else {
      const idControl = this.productForm.get('id');
      idControl?.setAsyncValidators(productIdValidator(this.productService));
      idControl?.updateValueAndValidity();
    }

    this.setupDateAutoCalculation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDateAutoCalculation(): void {
    this.productForm.get('date_release')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(releaseDate => {
        if (releaseDate) {
          const revisionDate = this.productFormService.calculateRevisionDate(releaseDate);
          if (revisionDate) {
            this.productForm.patchValue({ date_revision: revisionDate }, { emitEvent: false });
          }
        }
      });
  }

  private loadProductForEdit(): void {
    if (!this.currentProductId) return;

    this.productFormService.loadProduct(this.currentProductId, this.destroy$)
      .subscribe(({ product, error }) => {
        if (product) this.populateForm(product);
        if (error) this.errorMessage = error;
      });
  }

  private populateForm(product: Product): void {
    this.productForm.patchValue({
      id: product.id,
      name: product.name,
      description: product.description,
      logo: product.logo,
      date_release: formatDateForInput(product.date_release),
      date_revision: formatDateForInput(product.date_revision)
    });
    this.productForm.get('id')?.disable();
  }

  onSubmit(): void {
    if (this.isSubmitting) return;

    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.clearErrors();

    const raw = this.productForm.getRawValue();
    const product: Product = {
      id: raw.id || '',
      name: raw.name || '',
      description: raw.description || '',
      logo: raw.logo || '',
      date_release: raw.date_release || '',
      date_revision: raw.date_revision || ''
    };

    this.productFormService.save(product, this.isEditMode, this.currentProductId, this.destroy$)
      .subscribe(result => {
        if (!result.success) {
          this.errorMessage = result.error || 'Error al guardar producto';
          this.apiValidationErrors = result.validationErrors ?? [];
          this.isSubmitting = false;
        }
      });
  }

  onReset(): void {
    if (this.isEditMode && this.currentProductId) {
      this.loadProductForEdit();
    } else {
      this.productForm.reset();
      this.clearErrors();
    }
  }

  onCancel(): void {
    this.router.navigate(['/products']);
  }

  clearErrors(): void {
    this.errorMessage = '';
    this.apiValidationErrors = [];
  }

  hasError(fieldName: string, errorType?: string): boolean {
    const field = this.productForm.get(fieldName);
    if (!field) return false;

    if (errorType) return !!(field.hasError(errorType) && (field.dirty || field.touched));
    return !!(field.invalid && (field.dirty || field.touched));
  }

  hasApiFieldError(fieldName: string): boolean {
    return this.apiValidationErrors.some(e => e.property === fieldName);
  }

  getApiFieldErrorMessages(fieldName: string): string[] {
    const err = this.apiValidationErrors.find(e => e.property === fieldName);
    return err ? Object.values(err.constraints) : [];
  }

  getErrorMessage(fieldName: string): string {
    const field = this.productForm.get(fieldName);
    return this.productFormService.getErrorMessage(field?.errors ?? null);
  }
}
