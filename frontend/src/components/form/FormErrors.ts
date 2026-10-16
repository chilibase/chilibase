// used for custom validation of the form (validate method of the FormBase)
export type FormErrorMap = Record<string, string>;

export interface FieldError {
    onChange?: string;
    onBlur?: string;
    form?: string; // the error from FormErrorMap goes here (custom validation at the form level)
    fieldLabel?: string; // for technical reasons we store here, already when creating FieldError, the label of the component that produced the FieldError
    // (theoretically we can have several components on one association (SearchButton, Dropdown, ...) and then it is a problem to find the component back by fieldId)
}

// used internal in lib
export type FieldErrorMap = Record<string, FieldError>;
