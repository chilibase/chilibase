import React from "react";
import {TextInput} from "../text-field";
import {Utils} from "../../utils/Utils";
import {localeOption} from "../locale/Locale";

// type FtsInputValue represents values that can be changed by this component
// this type partially corresponds to type XFullTextSearch used in the api
export interface FtsInputValue {
    value: string | null; // null means an empty input, the full text search condition is not applied
    matchMode: 'startsWith' | 'contains' | 'endsWith' | 'equals'; // for now these (subset of DataTableFilterMetaData), default will be 'contains'
}

export const FtsInput = (props: {value: FtsInputValue; onChange: (value: FtsInputValue) => void; width?: string;}) => {

    const onChange = (value: string | null) => {
        props.value.value = value;
        props.onChange({...props.value}); // we clone so that react registers that we made a change
    }

    // TODO - add an input for changing matchMode
    // we use TextInput - we save onChange calls
    return (
        <TextInput value={props.value.value} onChange={onChange} style={{height: '2.5rem', width: props.width ?? (Utils.isMobile() ? '7rem' : '17rem')}} className="m-1"
        placeholder={localeOption('searchInAllFields')}/>
    );
}

