import React from "react";
import {TextInput} from "../text-field";
import {Utils} from "../../utils/Utils";
import {localeOption} from "../locale/Locale";

// typ FtsInputValue reprezentuje hodnoty ktore sa daju menit touto komponentou
// tento typ ciastocne zodpoveda typu XFullTextSearch pouzivanom v api
export interface FtsInputValue {
    value: string | null; // null znamena prazdny input, neaplikuje sa full text search podmienka
    matchMode: 'startsWith' | 'contains' | 'endsWith' | 'equals'; // zatial tieto (podmnozina z DataTableFilterMetaData), default bude 'contains'
}

export const FtsInput = (props: {value: FtsInputValue; onChange: (value: FtsInputValue) => void;}) => {

    const onChange = (value: string | null) => {
        props.value.value = value;
        props.onChange({...props.value}); // vyklonujeme aby react zaregistroval, ze sme urobili zmenu
    }

    // TODO - pridat input na zmenu matchMode
    // we use TextInput - we save onChange calls
    return (
        <TextInput value={props.value.value} onChange={onChange} style={{height: '2.5rem', width: Utils.isMobile() ? '7rem' : '17rem'}} className="m-1"
        placeholder={localeOption('searchInAllFields')}/>
    );
}

