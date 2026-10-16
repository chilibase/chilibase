import React from "react";
import {Dropdown, type DropdownChangeEvent} from "primereact/dropdown";
import type {OptionalCustomFilter} from "./LazyDataTable";

// dropdown for optional custom filter (ocf)
export const OcfDropdown = (props: {
    optionalCustomFilters: OptionalCustomFilter[];
    value: OptionalCustomFilter | undefined;
    onChange: (value: OptionalCustomFilter | undefined) => void;
    className?: string;
}) => {

    const onChange = (e: DropdownChangeEvent) => {
        let value: any | undefined;
        // special null item has label === ""
        if (e.value.label === "") {
            value = undefined;
        }
        else {
            value = e.value;
        }
        props.onChange(value);
    }

    // we add an empty item
    // we add the item into a copy of the list, otherwise the "item" in props.optionalCustomFilters "multiplies"
    let options: any[] = [...props.optionalCustomFilters];
    options.splice(0, 0, {label: ""});

    return (
        <Dropdown options={options} dataKey="label" optionLabel="label" value={props.value} onChange={onChange} className={props.className}/>
    );
}