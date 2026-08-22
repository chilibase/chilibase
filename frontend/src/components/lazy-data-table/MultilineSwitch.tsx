import React from "react";
import {MultilineRenderType} from "./LazyDataTable";
import {SelectButton, SelectButtonChangeEvent} from "primereact/selectbutton";
import {Utils} from "../../utils/Utils";

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

    // for mobile version we use p-button-icon-only -> the buttons are smaller
    return (
        <SelectButton value={props.value} onChange={(e: SelectButtonChangeEvent) => props.onChange(e.value)}
                      options={options} optionValue="value" itemTemplate={itemTemplate} allowEmpty={false} className={props.className}
                      pt={Utils.isMobile() ? {button: {className: 'p-button-icon-only'}} : undefined}/>
    );
}
