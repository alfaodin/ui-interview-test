import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApiValidationError } from '../../../core/models/api-error.model';

@Component({
  selector: 'app-api-validation-errors',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (errors.length > 0) {

      <div class="alert alert-error">     
          <ul class="api-errors-list">
            @for (error of errors; track error.property) {
              <li class="api-error-item">
                <span class="api-error-field">{{ error.property }}</span>
                <ul class="api-error-constraints">
                  @for (msg of getConstraintMessages(error); track msg) {
                    <li>{{ msg }}</li>
                  }
                </ul>
              </li>
            }
          </ul>
          <button type="button" class="alert-close" (click)="onClearErrors()" aria-label="Close">×</button>
      </div>
    }
  `,
  styles: [`
    .api-errors-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .api-error-item {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
      color: var(--error-red);

      & + .api-error-item {
        margin-top: 0.5rem;
        padding-top: 0.5rem;
        border-top: 1px solid color-mix(in oklch, var(--error-red) 20%, transparent);
      }
    }

    .api-error-field {
      font-weight: 600;
      font-size: 0.8125rem;
      text-transform: capitalize;
      white-space: nowrap;
      flex-shrink: 0;

      &::after {
        content: ':';
      }
    }

    .api-error-constraints {
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: 0.8125rem;

      li + li {
        margin-top: 0.25rem;
      }
    }

    .alert {
      position: relative;
      padding: var(--spacing-md);
      border-radius: var(--radius);
      margin-bottom: var(--spacing-lg);
      display: flex;

      &-error {
        background: var(--error-light);
        border: 1px solid var(--error-red);
        color: var(--error-red);
      }

      &-message {
        font-weight: 500;
      }

      &-close {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: none;
        border: none;
        font-size: 1.5rem;
        line-height: 1;
        cursor: pointer;
        color: inherit;
        opacity: 0.7;
        padding: 0;
        width: 24px;
        height: 24px;

        &:hover {
          opacity: 1;
        }
      }
    }
  `]
})
export class ApiValidationErrorsComponent {
  @Input() errors: ApiValidationError[] = [];
  @Output() clearErrors = new EventEmitter<void>();

  onClearErrors(): void {
    this.clearErrors.emit();
  }

  getConstraintMessages(error: ApiValidationError): string[] {
    return Object.values(error.constraints);
  }
}
