import React, { useState, useEffect } from 'react';
import { DecisionCategory, DecisionType } from '../../types/scenario';
import { DecisionSubmission } from '../../types/decision';
import './DecisionForm.css';

interface DecisionFormProps {
  category: DecisionCategory;
  onSubmit: (values: Record<string, any>) => void;
  initialValues?: Record<string, any>;
  constraints?: Record<string, any>;
}

const DecisionForm: React.FC<DecisionFormProps> = ({
  category,
  onSubmit,
  initialValues = {},
  constraints,
}) => {
  const [values, setValues] = useState<Record<string, any>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [changeCount, setChangeCount] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleChange = (field: string, value: any) => {
    setValues((prev) => {
      const newValues = { ...prev, [field]: value };
      setChangeCount((prev) => prev + 1);
      return newValues;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (category.constraints) {
      for (const constraint of category.constraints) {
        const value = values[constraint.field];
        
        if (constraint.type === 'required' && (value === undefined || value === null || value === '')) {
          newErrors[constraint.field] = constraint.message || `${constraint.field} is required`;
        } else if (constraint.type === 'min' && value < constraint.value) {
          newErrors[constraint.field] = constraint.message || `${constraint.field} must be at least ${constraint.value}`;
        } else if (constraint.type === 'max' && value > constraint.value) {
          newErrors[constraint.field] = constraint.message || `${constraint.field} must be at most ${constraint.value}`;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) {
      return;
    }

    const timeSpent = Date.now() - startTime;
    onSubmit({
      values,
      timeSpent,
      intermediateChanges: changeCount,
    });
  };

  const renderInput = (option: any) => {
    const fieldName = option.id || option.label.toLowerCase().replace(/\s+/g, '_');
    const currentValue = values[fieldName] ?? option.value;

    switch (option.type || 'text') {
      case 'number':
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleChange(fieldName, parseFloat(e.target.value) || 0)}
            className={errors[fieldName] ? 'error' : ''}
          />
        );
      case 'select':
        return (
          <select
            value={currentValue}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className={errors[fieldName] ? 'error' : ''}
          >
            {option.options?.map((opt: any) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'range':
        return (
          <input
            type="range"
            min={option.min || 0}
            max={option.max || 100}
            value={currentValue}
            onChange={(e) => handleChange(fieldName, parseFloat(e.target.value))}
            className={errors[fieldName] ? 'error' : ''}
          />
        );
      default:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleChange(fieldName, e.target.value)}
            className={errors[fieldName] ? 'error' : ''}
          />
        );
    }
  };

  return (
    <form className="decision-form" onSubmit={handleSubmit}>
      <div className="decision-form-header">
        <h3>{category.name}</h3>
        {category.description && <p>{category.description}</p>}
      </div>

      <div className="decision-form-fields">
        {category.options.map((option) => {
          const fieldName = option.id || option.label.toLowerCase().replace(/\s+/g, '_');
          return (
            <div key={option.id} className="form-field">
              <label>
                {option.label}
                {option.description && <span className="field-description">{option.description}</span>}
              </label>
              {renderInput(option)}
              {errors[fieldName] && <span className="error-message">{errors[fieldName]}</span>}
              {option.cost !== undefined && (
                <span className="field-cost">Cost: ${option.cost.toLocaleString()}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="decision-form-actions">
        <button type="submit" className="btn-primary">
          Submit Decision
        </button>
        <span className="change-count">Changes: {changeCount}</span>
      </div>
    </form>
  );
};

export default DecisionForm;