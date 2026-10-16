import React, {type CSSProperties} from "react";
import {InputNumber, type InputNumberChangeEvent} from "primereact/inputnumber";

// wrapper for InputNumber component - for now simplified like this, we use it only for filter items
export const NumberInput = (props: {id?: string; value: number | null; onChange: (value: number | null) => void; readOnly?: boolean;
                                            useGrouping?: boolean; fractionDigits?: number; min?: number; max?: number; size?: number;
                                            className?: string; inputStyle?: CSSProperties;}) => {

    const onChange = (e: InputNumberChangeEvent) => {
        // from InputNumber comes e.value - type number or null
        props.onChange(e.value);
    }

    // we convert null to undefined (supposedly InputNumber does not want null)
    return (
        <InputNumber id={props.id} value={props.value !== null ? props.value : undefined} onChange={onChange} readOnly={props.readOnly} mode="decimal" locale="de-DE"
                     useGrouping={props.useGrouping} minFractionDigits={props.fractionDigits} maxFractionDigits={props.fractionDigits} min={props.min} max={props.max} size={props.size}
                     className={props.className} inputStyle={props.inputStyle}/>
    );
}
