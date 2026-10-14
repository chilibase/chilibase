import React, {type CSSProperties, type MouseEvent} from "react";
import {Button as PrimeButton, type ButtonProps} from "primereact/button";
import type {IconType} from "primereact/utils";

export const Button = (props: {
    label?: string;
    icon?: IconType<ButtonProps>;
    onClick: ((event: MouseEvent<HTMLButtonElement>) => void);
    disabled?: boolean;
    style?: CSSProperties;
}) => {

    // zatial iba pridany class x-button, aby sme vedeli nastavit margin "m-1" (0.25rem)
    return (
        <PrimeButton label={props.label} icon={props.icon} onClick={props.onClick} disabled={props.disabled} className="m-1" style={props.style}/>
    );
}
