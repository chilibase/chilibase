// used for custom validation of the form (validate method of the FormBase)
export type FormErrorMap = Record<string, string>;

export interface FieldError {
    onChange?: string;
    onBlur?: string;
    form?: string; // sem pride error z FormErrorMap (custom validacia na urovni formulara)
    fieldLabel?: string; // z technickych dovodov si uz pri vytvoreni FieldError sem ulozime label componentu ktory vyprodukoval FieldError
    // (teoreticky mozme mat viacero komponentov na jednej asociacii (SearchButton, Dropdown, ...) a potom je problem spatne najst component podla fieldId)
}

// used internal in lib
export type FieldErrorMap = Record<string, FieldError>;
