import React, {useState, type CSSProperties, type ChangeEvent, type FocusEvent} from "react";
import {
    stringAsUI,
    stringFromUI
} from "../../common/UtilsConversions";
import {Utils} from "../../utils/Utils";
import {InputText} from "primereact/inputtext";

// for optimization - it writes the typed text into its own state variable and calls onChange only from onBlur
// used for filter element in LazyDataTable - if there was many rows/columns in datatable, typing in filter was slow (if setState was called after every character change)

export const TextInput = (props: {
    id?: string;
    value: string | null;
    onChange: (value: string | null) => void;
    readOnly?: boolean;
    maxLength?: number;
    size?: string | number;
    placeholder?: string;
    className?: string;
    style?: CSSProperties;
    error?: string; // error message, if we want to mark the field as invalid
}) => {

    // true if the user is typing a value
    // false if the user has finished typing (onBlur was called) - we take the value "from above" (from prop.value)
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // used only if inputChanged === true; the changed value in the input is stored here
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        // normally e.value comes from Calendar - type Date or null
        // type Date comes if the user filled in a valid date, null (typeof e.value returns "object") comes if the user deleted the date
        // or the date is still incomplete (the user is just entering the date)
        // we set keepInvalid={true} -> an invalid string will come (typeof e.value returns "string")
        // in addition we turned off parsing to a date (method parseDateTime), so "string" always comes and we do the conversion in onBlur

        //const value: string | null = stringFromUI(e.target.value);

        setInputChanged(true);
        setInputValueState(e.target.value); // always a string
    }

    const onBlur = (e: FocusEvent<HTMLInputElement>) => {
        if (inputChanged) {
            // note: e.target.value and inputValueState contain the same string value
            const value: string | null = stringFromUI(e.target.value);
            props.onChange(value);
            setInputChanged(false);
            setInputValueState(undefined); // for the sake of order
        }
    }

    const getInputValue = (): any => {
        let inputValue: any;
        if (inputChanged) {
            inputValue = inputValueState!; // always a string
        }
        else {
            inputValue = stringAsUI(props.value);
        }
        return inputValue;
    }

    return (
        <InputText id={props.id} value={getInputValue()} onChange={onChange} onBlur={onBlur}
                   readOnly={props.readOnly} maxLength={props.maxLength} size={props.size} className={props.className} style={props.style}
                   {...Utils.createTooltipOrErrorProps(props.error)} placeholder={props.placeholder}/>
    );
}
