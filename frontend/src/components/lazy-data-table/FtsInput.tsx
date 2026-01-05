import React from "react";
import {InputTextBase} from "../input-text";
import {XUtils} from "../XUtils";
import {xLocaleOption} from "../XLocale";

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
    // we use InputTextBase - we save onChange calls
    return (
        <InputTextBase value={props.value.value} onChange={onChange} style={{height: '2.5rem', width: XUtils.isMobile() ? '7rem' : '17rem'}} className="m-1"
        placeholder={xLocaleOption('searchInAllFields')}/>
    );
}

