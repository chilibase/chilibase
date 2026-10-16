import React, {type MouseEvent} from "react";
import {Button as PrimeButton, type ButtonProps} from "primereact/button";
import type {IconType} from "primereact/utils";

// button a bit smaller (approximately 30px x 30px) than the classic Button, when used in a datatable it sets a tiny padding in the TD (via css) -> it does not increase the row height
// button with icon (without label) - rename to ButtonMedium?
export const ButtonIconMedium = (props: {icon: IconType<ButtonProps>; onClick: ((event: MouseEvent<HTMLButtonElement>) => void); disabled?: boolean; tooltip?: any;}) => {

    return (
        <PrimeButton icon={props.icon} onClick={props.onClick} disabled={props.disabled}
                className='x-button-icon-medium p-button-sm' tooltip={props.tooltip}/>
    );
}
