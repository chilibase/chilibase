// pouzivane na custom validaciu na urovni formulara
// TODO - should be replaced with FormErrorMap, if it is possible
export interface XErrors {
    [name: string]: string;
}

// TODO - rename to FormError (Error is javascript global identifier), file rename also to FormError.ts and move to dir form
export interface XError {
    onChange?: string;
    onBlur?: string;
    form?: string; // sem pride error z XErrors (custom validacia na urovni formulara)
    fieldLabel?: string; // z technickych dovodov si uz pri vytvoreni XError sem ulozime label componentu ktory vyprodukoval XError
    // (teoreticky mozme mat viacero komponentov na jednej asociacii (SearchButton, Dropdown, ...) a potom je problem spatne najst component podla fieldId)
}

// pouzivane v lib-ke
// TODO - rename to FormErrorMap
export interface XErrorMap {
    [name: string]: XError;
}