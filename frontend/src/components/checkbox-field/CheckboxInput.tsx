import React, {type CSSProperties} from "react";
import {TriStateCheckbox, type TriStateCheckboxChangeEvent} from "primereact/tristatecheckbox";
import {Checkbox, type CheckboxChangeEvent} from "primereact/checkbox";
import {Utils} from "../../utils/Utils";

export const CheckboxInput = (props: {
    id?: string;
    value: boolean | null;
    onChange: (value: boolean | null) => void;
    readOnly?: boolean;
    isNotNull?: boolean;
    tooltip?: string;
    error?: string;
    style?: CSSProperties | undefined;
}) => {

    const checkboxOnChange = (e: CheckboxChangeEvent) => {
        props.onChange(e.checked ?? false);
    }

    const triStateCheckboxChange = (e: TriStateCheckboxChangeEvent) => {
        // for blank value comes empty string "" (bug in primereact?)
        let newValue: boolean | null = null;
        if (typeof e.value !== 'string') {
            newValue = e.value ?? null;
        }
        // when clicking TriStateCheckbox, newValue comes cyclically: true -> false -> null
        // if we have a not null attribute, on a null value we jump straight to true
        // TODO - we will use it when we remove Checkbox and keep only TriStateCheckbox
        // if (props.isNotNull) {
        //     if (newValue === null) {
        //         newValue = true;
        //     }
        // }
        props.onChange(newValue);
    }

    return (
        // for not null attributes we use a standard checkbox so that for false we have an empty white checkbox
        // TODO - change the icons on TriStateCheckbox so that it fits nicely, then we can remove Checkbox
        props.isNotNull ?
            <Checkbox id={props.id} checked={props.value ?? false} onChange={checkboxOnChange}
                      disabled={props.readOnly} style={props.style} {...Utils.createTooltipOrErrorProps(props.error, props.tooltip)}/>
            : <TriStateCheckbox id={props.id} value={props.value} onChange={triStateCheckboxChange}
                                disabled={props.readOnly} style={props.style} {...Utils.createTooltipOrErrorProps(props.error, props.tooltip)}/>
    );
}
