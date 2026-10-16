import {InputText} from "primereact/inputtext";
import React, {type CSSProperties, useState, type FocusEvent} from "react";
import {intervalAsUI, intervalFromUI} from "../../common/UtilsConversions";
import type {IPostgresInterval} from "../../utils/types";
import {Utils} from "../../utils/Utils";

// for now it supports only hours and minutes - TODO - add seconds too, but through some switch
export const IntervalInput = (props: {
    id?: string;
    value: IPostgresInterval | null;
    onChange: (value: IPostgresInterval | null) => void;
    readOnly?: boolean;
    error?: string;
    style?: CSSProperties | undefined;
}) => {

    // true if the user is typing a value but the value cannot yet be converted to a correct interval (we cannot create IPostgresInterval yet)
    // false if we already have a correct value in the input - then we call props.onChange and send it IPostgresInterval
    const [inputChanged, setInputChanged] = useState<boolean>(false);
    // used only if inputChanged === true; the changed value in the input is stored here
    const [inputValueState, setInputValueState] = useState<string | undefined>(undefined);

    const onChange = (e: any) => {
        // conversion to IPostgresInterval will be done in onBlur
        setInputChanged(true);
        setInputValueState(e.target.value);
    }

    const onBlur = (e: FocusEvent<HTMLInputElement>) => {
        // optimization - we test only if inputChanged === true
        if (inputChanged) {
            // convert e.target.value (e.g. 10:29) into IPostgresInterval (e.g. {hours: 10, minutes: 29})
            let valueInterval: IPostgresInterval | null | undefined = intervalFromUI(e.target.value);
            if (valueInterval === undefined) {
                // the user left the input and left an invalid value there - we write the value null, so we do not have to check the field during validation
                valueInterval = null;
            }
            props.onChange(valueInterval);
            setInputChanged(false);
            setInputValueState(undefined); // for the sake of order
        }
    }

    const getInputValue = (): string => {
        let inputValue: string;
        if (inputChanged) {
            inputValue = inputValueState!;
        }
        else {
            inputValue = intervalAsUI(props.value);
        }
        return inputValue;
    }

    // remark - width:'3.5rem' is default, can be overriden by value from props.style, if needed
    return (
        <InputText id={props.id} value={getInputValue()} onChange={onChange} onBlur={onBlur}
                   readOnly={props.readOnly} {...Utils.createTooltipOrErrorProps(props.error)} style={{width:'3.5rem', ...props.style}}/>
    );
}
