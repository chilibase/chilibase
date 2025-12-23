import React from "react";
import {MultilineRenderType} from "./LazyDataTable";
import {SelectButton, SelectButtonChangeEvent} from "primereact/selectbutton";

interface Option {
    icon: string;
    value: MultilineRenderType;
}

export const MultilineSwitch = (props: {
    value: MultilineRenderType;
    onChange: (value: MultilineRenderType) => void;
    className?: string;
}) => {

    const options: Option[] = [
        {icon: 'pi pi-minus', value: 'singleLine'},
        {icon: 'pi pi-bars', value: 'fewLines'},
        {icon: 'pi pi-align-justify', value: 'allLines'}
    ];

    const itemTemplate = (option: Option) => {
        return <i className={option.icon}></i>;
    }

    return (
        <SelectButton value={props.value} onChange={(e: SelectButtonChangeEvent) => props.onChange(e.value)}
                      options={options} optionValue="value" itemTemplate={itemTemplate} allowEmpty={false} className={props.className}/>
    );
}
