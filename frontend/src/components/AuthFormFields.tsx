import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react";

function IconEyeVisible() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEyeHidden() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path
        d="M3 3l18 18M10.58 10.58a3 3 0 1 0 4.24 4.24M9.88 5.09A10.14 10.14 0 0 1 12 5c7 0 10 7 10 7a18.77 18.77 0 0 1-2.84 3.56M6.36 6.36A18.77 18.77 0 0 0 2 12s3 7 10 7a9.53 9.53 0 0 0 3.44-.44"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type FieldBase = {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
};

type AuthTextFieldProps = FieldBase &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
    id?: string;
  };

export function AuthTextField({
  label,
  required,
  error,
  hint,
  id,
  ...inputProps
}: AuthTextFieldProps) {
  const uid = useId();
  const fieldId = id ?? `auth-field-${uid}`;
  const describedBy =
    error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={`auth-field-group${error ? " auth-field-group--invalid" : ""}`}>
      <label className="auth-field-label" htmlFor={fieldId}>
        <span className="auth-field-label-text">
          {label}
          {required ? (
            <abbr className="auth-required-mark" title="Champ obligatoire">
              *
            </abbr>
          ) : null}
        </span>
      </label>
      <input
        id={fieldId}
        {...inputProps}
        className={`auth-input auth-input-pro${error ? " auth-input-invalid" : ""}`}
        aria-invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={describedBy}
      />
      {error ? (
        <p id={`${fieldId}-err`} className="auth-field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="auth-helper">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type AuthPasswordFieldProps = FieldBase & {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  maxLength?: number;
  name?: string;
  disabled?: boolean;
};

export function AuthPasswordField({
  label,
  required,
  error,
  hint,
  id,
  value,
  onChange,
  autoComplete = "current-password",
  maxLength = 128,
  name,
  disabled,
}: AuthPasswordFieldProps) {
  const uid = useId();
  const fieldId = id ?? `auth-pw-${uid}`;
  const [visible, setVisible] = useState(false);
  const describedBy =
    error ? `${fieldId}-err` : hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={`auth-field-group${error ? " auth-field-group--invalid" : ""}`}>
      <label className="auth-field-label" htmlFor={fieldId}>
        <span className="auth-field-label-text">
          {label}
          {required ? (
            <abbr className="auth-required-mark" title="Champ obligatoire">
              *
            </abbr>
          ) : null}
        </span>
      </label>
      <div className="auth-password-wrap">
        <input
          id={fieldId}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          maxLength={maxLength}
          autoComplete={autoComplete}
          disabled={disabled}
          className={`auth-input auth-input-pro auth-input--with-toggle${error ? " auth-input-invalid" : ""}`}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={describedBy}
        />
        <button
          type="button"
          className="auth-password-toggle"
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <IconEyeVisible /> : <IconEyeHidden />}
        </button>
      </div>
      {error ? (
        <p id={`${fieldId}-err`} className="auth-field-error" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${fieldId}-hint`} className="auth-helper">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Bloc optionnel : titre + contenu (ex. case à cocher politique) */
export function AuthFieldFooter({ children, error }: { children: ReactNode; error?: string }) {
  return (
    <div className={`auth-field-footer${error ? " auth-field-group--invalid" : ""}`}>
      {children}
      {error ? (
        <p className="auth-field-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
